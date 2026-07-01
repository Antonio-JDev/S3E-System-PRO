import { canonicalWhatsappChatId, digitsOnly, waJidToDigits } from '../utils/whatsappChat.util';
import { normalizeUserFilename } from '../utils/filename.util';
import { resolveWhatsappProviderInternalFetchUrl } from '../utils/whatsappMediaUrl.util';
import {
  chatIdToEvolutionNumber,
  evolutionMediaType,
  isEvolutionProviderKind,
  isEvolutionGoKind,
  parseEvolutionMessageId
} from './whatsappProvider.evolution';
import * as EvoChat from './whatsappEvolutionChat.service';
import {
  evolutionGoCreateInstance,
  evolutionGoInstanceQr,
  evolutionGoInstanceReconnect,
  evolutionGoInstanceStatus,
  evolutionGoProxyRequest
} from './whatsappEvolutionGoBridge';
import { recordWhatsappChatIdentity, resolvePreferredChatIdForOutbound } from './whatsappIdentity.service';
import { persistContatoS3eJidAndInteraction, refreshContatoS3eFromWhatsappNumbers } from './contatosS3e.service';
import { withWhatsappSendLock } from './whatsappSendQueue.service';

const baseUrl = (): string =>
  (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(/\/$/, '');
const session = (): string => process.env.WHATSAPP_PROVIDER_SESSION || 'default';
const apiKey = (): string => process.env.WHATSAPP_PROVIDER_API_KEY || '';
const evolutionAutoRetryCooldownMs = (): number => {
  const raw = Number(process.env.WHATSAPP_PROVIDER_AUTO_RETRY_COOLDOWN_MS || 180000);
  if (!Number.isFinite(raw) || raw < 0) return 180000;
  return Math.trunc(raw);
};
const evolutionLastAutoRetryAt = new Map<string, number>();

/**
 * Cooldown global para auto-reconexão do provedor (Evolution Go). Evita loop
 * quando o webhook reporta `Disconnected` em cascata ou quando o whatsmeow
 * dispara várias notificações próximas.
 */
const EVO_GO_RECONNECT_COOLDOWN_MS = 60_000;
let lastEvoGoReconnectAt = 0;
let evoGoReconnectInFlight: Promise<boolean> | null = null;

/**
 * Pede à Evolution Go para refazer o link WebSocket com o WhatsApp sem
 * invalidar a sessão. Idempotente e com cooldown — chama no máximo 1x por
 * minuto e nunca em paralelo. Retorna `true` se a chamada foi feita (não
 * indica sucesso do reconnect — o webhook `Connected` virá depois).
 *
 * Usado em dois pontos:
 *  1. Quando recebemos o webhook `connection.update` com `state=close`
 *     (vindo de `Disconnected`/`LoggedOut`/`StreamReplaced` da EvoGo).
 *  2. Como ferramenta manual exposta via rota interna (debug/CRM).
 */
export async function requestEvoGoReconnect(reason: string): Promise<boolean> {
  if (!isEvolutionGoKind()) return false;
  if (evoGoReconnectInFlight) {
    await evoGoReconnectInFlight;
    return false;
  }
  const now = Date.now();
  if (now - lastEvoGoReconnectAt < EVO_GO_RECONNECT_COOLDOWN_MS) {
    return false;
  }
  lastEvoGoReconnectAt = now;
  evoGoReconnectInFlight = (async (): Promise<boolean> => {
    try {
      console.warn('[WA-RECONNECT] disparando /instance/reconnect (motivo:', reason, ')');
      const res = await evolutionGoInstanceReconnect();
      const t = await res.text().catch(() => '');
      console.warn('[WA-RECONNECT] status=%d body=%s', res.status, t.slice(0, 200));
      if (res.ok) {
        // Após reconexão, limpa o cache negativo de fotos para dar uma
        // nova chance — fotos que falharam por IQ-timeout passam a vir.
        profilePictureNullCache.clear();
        console.warn('[WA-RECONNECT] cache negativo de fotos limpo (%d entradas zeradas)', 0);
      }
      return res.ok;
    } catch (e) {
      console.warn('[WA-RECONNECT] falhou:', e);
      return false;
    } finally {
      evoGoReconnectInFlight = null;
    }
  })();
  return evoGoReconnectInFlight;
}

/**
 * Evolution v2 pode validar presença e delay como obrigatórios em envios.
 * Mantemos defaults seguros e permitimos sobrescrever por env.
 */
function evolutionSendPresence(): string {
  const raw = process.env.WHATSAPP_PROVIDER_SEND_PRESENCE?.trim().toLowerCase();
  // valores comuns aceitos pela Evolution/Baileys
  if (raw === 'composing' || raw === 'paused' || raw === 'recording') return raw;
  return 'composing';
}

function evolutionSendDelayMs(): number {
  const raw = Number(process.env.WHATSAPP_PROVIDER_SEND_DELAY_MS ?? 1200);
  if (!Number.isFinite(raw) || raw < 0) return 1200;
  return Math.trunc(raw);
}

/** Opcional: URL de documentação de envio do provedor (ex.: variável de ambiente). */
const PROVIDER_DOCS_SEND_HINT =
  process.env.WHATSAPP_PROVIDER_DOCS_SEND_URL?.trim() ||
  'consulte a documentação do seu provedor WhatsApp (envio de mídia).';

function appendProviderSendDoc(msg: string): string {
  if (msg.includes(PROVIDER_DOCS_SEND_HINT)) return msg;
  return `${msg}\n\n${PROVIDER_DOCS_SEND_HINT}`;
}

/** Se WHATSAPP_PROVIDER_BASE_URL for interno (Docker) e o browser precisar carregar a imagem, defina WHATSAPP_PROVIDER_PUBLIC_URL (ex.: http://localhost:3333). */
function rewriteProviderUrlForClient(u: string): string {
  const pub = process.env.WHATSAPP_PROVIDER_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (!pub) return u;
  const internal = baseUrl();
  if (u.startsWith(internal)) {
    return pub + u.slice(internal.length);
  }
  return u;
}

/** Grupo retornado por GET /api/{session}/groups (campos variam por motor; subject é o nome). */
export interface WhatsappProviderGroupRow {
  id: string;
  subject?: string;
  name?: string;
  title?: string;
  groupMetadata?: { subject?: string };
}

/** Unifica payload de provedores legados para id JID + nome exibível. */
function normalizeProviderGroupPayload(raw: unknown): WhatsappProviderGroupRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let idRaw = '';
  if (typeof o.id === 'string') idRaw = o.id.trim();
  else if (typeof o.id === 'number' && !Number.isNaN(o.id)) idRaw = String(o.id);
  if (!idRaw) return null;

  let id = idRaw;
  if (!id.toLowerCase().endsWith('@g.us')) {
    const digitsOnly = idRaw.replace(/\D/g, '');
    if (digitsOnly.length >= 10) id = `${digitsOnly}@g.us`;
    else return null;
  }

  const gm = o.groupMetadata;
  let gmSub = '';
  if (gm && typeof gm === 'object') {
    const gms = (gm as Record<string, unknown>).subject;
    if (typeof gms === 'string') gmSub = gms.trim();
  }

  const subject =
    (typeof o.subject === 'string' && o.subject.trim()) ||
    (typeof o.title === 'string' && o.title.trim()) ||
    gmSub ||
    (typeof o.name === 'string' && o.name.trim()) ||
    undefined;
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : undefined;

  return { id, subject, name };
}

/** Linha retornada por GET /api/contacts/all e GET /api/contacts. */
export interface WhatsappProviderContactRow {
  id: string;
  number?: string;
  name?: string;
  pushname?: string;
  shortName?: string;
  isMe?: boolean;
  isGroup?: boolean;
  isWAContact?: boolean;
  isMyContact?: boolean;
  isBlocked?: boolean;
}

/** Parâmetros de GET /api/contacts/all (paginação + ordenação). */
export interface FetchWhatsappProviderContactsParams {
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'name';
  sortOrder?: 'asc' | 'desc';
}

function providerApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = apiKey();
  if (key) {
    if (isEvolutionProviderKind()) {
      headers.apikey = key;
    } else {
      headers['X-Api-Key'] = key;
    }
  }
  return headers;
}

function providerJsonHeaders(): Record<string, string> {
  return {
    ...providerApiHeaders(),
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

/**
 * Helper: dispara um POST em rota da Evolution.
 *
 * Quando `WHATSAPP_PROVIDER_KIND=evolution-go`, roteia pelo `evolutionGoProxyRequest`,
 * que traduz o path estilo v2 (`/message/sendText/{inst}`, `/message/sendMedia/{inst}`,
 * etc.) para o endpoint correto da Evolution Go (`/send/text`, `/send/media`). Sem isso,
 * a EvoGo devolve 404 porque os paths v2 não existem nela.
 *
 * Para Evolution v2 (Node/Baileys), faz `fetch` direto.
 *
 * O caller passa o body como objeto (Record), NÃO pré-serializado, porque o bridge
 * precisa inspecionar campos para mapear o payload.
 */
async function evolutionApiPost(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  if (isEvolutionGoKind()) {
    return evolutionGoProxyRequest('POST', path, body);
  }
  return fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: providerJsonHeaders(),
    body: JSON.stringify(body)
  });
}

/**
 * Evolution exige base64 cru (sem prefixo data:*;base64,). Aceita MIME com charset, ex.:
 * data:application/pdf;base64,... ou data:application/pdf;charset=UTF-8;base64,...
 */
function stripDataUrlBase64(b64: string): string {
  const trimmed = (b64 || '').trim();
  const lower = trimmed.slice(0, 40).toLowerCase();
  if (lower.startsWith('data:')) {
    const idx = trimmed.indexOf('base64,');
    if (idx !== -1) {
      return trimmed.slice(idx + 'base64,'.length).replace(/\s/g, '');
    }
  }
  return trimmed.replace(/\s/g, '');
}

/** GET /instance/connectionState/{instance} — Evolution API v2. Evolution Go: GET /instance/status. */
export async function checkConnectionState(instance: string): Promise<{
  reachable: boolean;
  state: string | null;
  notFound: boolean;
  raw?: unknown;
}> {
  const name = (instance || '').trim();
  if (!name) {
    return { reachable: false, state: null, notFound: false };
  }

  if (isEvolutionGoKind()) {
    try {
      const res = await evolutionGoInstanceStatus();
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 404) {
        return { reachable: true, state: null, notFound: true, raw: text };
      }
      if (!res.ok) {
        return { reachable: true, state: null, notFound: false, raw: text };
      }
      let data: unknown = null;
      try {
        data = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        data = null;
      }
      const st = parseEvolutionGoConnectionStateFromBody(data);
      return { reachable: true, state: st, notFound: false, raw: data };
    } catch {
      return { reachable: false, state: null, notFound: false };
    }
  }

  const url = `${baseUrl()}/instance/connectionState/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    const text = await res.text().catch(() => '');
    // Evolution v2 às vezes responde 400 (não só 404) quando a instância ainda não foi criada.
    if (res.status === 404) {
      return { reachable: true, state: null, notFound: true };
    }
    if (res.status === 400 && /does not exist/i.test(text)) {
      return { reachable: true, state: null, notFound: true };
    }
    if (!res.ok) {
      return { reachable: true, state: null, notFound: false };
    }
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = null;
    }
    const st = parseEvolutionConnectionStateFromBody(data);
    return { reachable: true, state: st, notFound: false, raw: data };
  } catch {
    return { reachable: false, state: null, notFound: false };
  }
}

function parseEvolutionGoConnectionStateFromBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const d =
    o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : o;
  const loggedIn = d.loggedIn === true || d.LoggedIn === true;
  const connected = d.connected === true || d.Connected === true;
  if (loggedIn) return 'open';
  if (connected) return 'connecting';
  const st = typeof d.state === 'string' ? d.state : typeof d.State === 'string' ? d.State : '';
  if (st.trim()) return st.trim();
  return 'close';
}

function parseEvolutionConnectionStateFromBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (typeof o.state === 'string' && o.state.trim()) return o.state.trim();
  const inst = o.instance;
  if (inst && typeof inst === 'object') {
    const s = (inst as Record<string, unknown>).state;
    if (typeof s === 'string' && s.trim()) return s.trim();
  }
  return null;
}

async function createEvolutionInstance(instanceName: string): Promise<void> {
  if (isEvolutionGoKind()) {
    const res = await evolutionGoCreateInstance();
    if (res.status === 403 || res.status === 409) {
      return;
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Evolution Go: criar instância falhou: HTTP ${res.status} ${t || res.statusText}`);
    }
    return;
  }

  const integration =
    process.env.WHATSAPP_PROVIDER_INTEGRATION?.trim() || 'WHATSAPP-BAILEYS';
  const url = `${baseUrl()}/instance/create`;
  const body: Record<string, unknown> = {
    instanceName,
    integration,
    qrcode: process.env.WHATSAPP_PROVIDER_QRCODE_ON_CREATE !== 'false'
  };
  const token = process.env.WHATSAPP_PROVIDER_INSTANCE_TOKEN?.trim();
  if (token) body.token = token;

  const res = await fetch(url, {
    method: 'POST',
    headers: providerJsonHeaders(),
    body: JSON.stringify(body)
  });
  if (res.status === 403 || res.status === 409) {
    return;
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Evolution: criar instância falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

async function ensureEvolutionInstanceReady(): Promise<void> {
  const inst = session();
  const conn = await checkConnectionState(inst);
  if (conn.notFound) {
    await createEvolutionInstance(inst);
    return;
  }
  if (!conn.reachable) {
    throw new Error('Evolution API inacessível. Verifique WHATSAPP_PROVIDER_BASE_URL.');
  }
  const st = (conn.state || '').trim().toLowerCase();
  const needsAutoRecover =
    st === 'error' || st === 'refused' || st === 'close' || st === 'closed' || st === 'logout';
  if (!needsAutoRecover) return;

  const now = Date.now();
  const last = evolutionLastAutoRetryAt.get(inst) || 0;
  const cooldown = evolutionAutoRetryCooldownMs();
  if (now - last < cooldown) {
    return;
  }

  evolutionLastAutoRetryAt.set(inst, now);
  try {
    await createEvolutionInstance(inst);
  } catch {
    /* ignore: tentativa automatica com cooldown */
  }
}

/**
 * Antes de enviar mensagens na Evolution: garante que a instância exista (POST /instance/create se 404).
 * Com WHATSAPP_PROVIDER_KIND=evolution.
 */
export async function initWhatsappProviderInstance(): Promise<void> {
  if (!isEvolutionProviderKind()) return;
  await ensureEvolutionInstanceReady();
}

/** Estado da sessão no provedor (para o CRM mostrar online/offline e QR). */
export async function fetchWhatsappProviderSessionStatus(): Promise<{
  reachable: boolean;
  connected: boolean;
  status: string | null;
}> {
  if (isEvolutionProviderKind()) {
    const conn = await checkConnectionState(session());
    if (!conn.reachable) {
      return { reachable: false, connected: false, status: null };
    }
    const st = conn.state || '';
    const lower = st.toLowerCase();
    const connected = lower === 'open';
    return { reachable: true, connected, status: st || null };
  }

  const name = session();
  const url = `${baseUrl()}/api/sessions/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) {
      return { reachable: true, connected: false, status: null };
    }
    const data = (await res.json()) as Record<string, unknown>;
    const st =
      (typeof data.status === 'string' && data.status) ||
      (typeof data.state === 'string' && data.state) ||
      '';
    const connected = st === 'WORKING' || st === 'CONNECTED' || st === 'READY';
    return { reachable: true, connected, status: st || null };
  } catch {
    return { reachable: false, connected: false, status: null };
  }
}

export interface WhatsappProviderConnectionQr {
  base64: string | null;
  code: string | null;
  pairingCode: string | null;
  count: number | null;
  message: string | null;
  statusCode: number | null;
}

/** Gera/obtém QR da sessão atual no provedor (Evolution API v2 ou Evolution Go). */
export async function fetchWhatsappProviderConnectionQr(): Promise<WhatsappProviderConnectionQr> {
  if (!isEvolutionProviderKind()) {
    return {
      base64: null,
      code: null,
      pairingCode: null,
      count: null,
      message: 'Exibição de QR inline disponível apenas para provedor Evolution (não WAHA).',
      statusCode: 400
    };
  }

  await ensureEvolutionInstanceReady();
  const inst = session().trim();

  if (isEvolutionGoKind()) {
    const res = await evolutionGoInstanceQr();
    const text = await res.text().catch(() => '');
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const details = text || res.statusText || 'falha ao obter QR';
      throw new Error(`Provedor WhatsApp (Evolution Go): QR falhou: HTTP ${res.status} ${details}`);
    }
    const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const inner =
      root.data && typeof root.data === 'object' && !Array.isArray(root.data)
        ? (root.data as Record<string, unknown>)
        : root;
    const qrcode =
      typeof inner.qrcode === 'string'
        ? inner.qrcode
        : typeof inner.Qrcode === 'string'
          ? inner.Qrcode
          : '';
    const code =
      typeof inner.code === 'string' ? inner.code : typeof inner.Code === 'string' ? inner.Code : '';
    const parts = qrcode.includes('|') ? qrcode.split('|') : [qrcode, code].filter(Boolean);
    const b64 = parts[0]?.trim() || null;
    const codePart = parts[1]?.trim() || (code || null);
    return {
      base64: b64,
      code: codePart,
      pairingCode: null,
      count: null,
      message: null,
      statusCode: res.status
    };
  }

  const url = `${baseUrl()}/instance/connect/${encodeURIComponent(inst)}`;
  const res = await fetch(url, { headers: providerApiHeaders() });
  const text = await res.text().catch(() => '');

  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const details = text || res.statusText || 'falha ao obter QR';
    throw new Error(`Provedor WhatsApp (Evolution): connect falhou: HTTP ${res.status} ${details}`);
  }

  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const nestedQr =
    obj.qrcode && typeof obj.qrcode === 'object' ? (obj.qrcode as Record<string, unknown>) : null;

  const pickString = (v: unknown): string | null =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

  const pickNumber = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;

  return {
    base64: pickString(obj.base64) ?? (nestedQr ? pickString(nestedQr.base64) : null),
    code: pickString(obj.code) ?? (nestedQr ? pickString(nestedQr.code) : null),
    pairingCode: pickString(obj.pairingCode) ?? (nestedQr ? pickString(nestedQr.pairingCode) : null),
    count: pickNumber(obj.count) ?? (nestedQr ? pickNumber(nestedQr.count) : null),
    message: pickString(obj.message),
    statusCode: pickNumber(obj.statusCode)
  };
}

/** Tamanho máximo de cada página na API WAHA; totais maiores são agregados em loop. */
const WAHA_CONTACTS_PAGE_SIZE = 5000;
/** Teto de segurança para agenda / busca (evita loop infinito ou payloads absurdos). */
export const WHATSAPP_AGENDA_CONTACTS_HARD_CAP = 150_000;

/** Lista de contatos da sessão (agenda WhatsApp no provedor). */
export async function fetchWhatsappProviderContactsAll(
  params?: FetchWhatsappProviderContactsParams
): Promise<WhatsappProviderContactRow[]> {
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionFetchContactsForCrm(params);
  }
  const s = session();
  const requested = params?.limit ?? 500;
  const maxTotal = Math.min(Math.max(1, requested), WHATSAPP_AGENDA_CONTACTS_HARD_CAP);
  const startOffset = Math.max(0, params?.offset ?? 0);
  const sortBy = params?.sortBy === 'id' ? 'id' : 'name';
  const sortOrder = params?.sortOrder === 'desc' ? 'desc' : 'asc';

  const fetchPage = async (lim: number, off: number): Promise<WhatsappProviderContactRow[]> => {
    const url = `${baseUrl()}/api/contacts/all?session=${encodeURIComponent(s)}&limit=${lim}&offset=${off}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    try {
      const res = await fetch(url, { headers: providerApiHeaders() });
      if (!res.ok) return [];
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? (data as WhatsappProviderContactRow[]) : [];
    } catch {
      return [];
    }
  };

  const aggregated: WhatsappProviderContactRow[] = [];
  let off = startOffset;
  while (aggregated.length < maxTotal) {
    const chunk = Math.min(WAHA_CONTACTS_PAGE_SIZE, maxTotal - aggregated.length);
    const batch = await fetchPage(chunk, off);
    if (!batch.length) break;
    aggregated.push(...batch);
    if (batch.length < chunk) break;
    off += batch.length;
  }
  return aggregated;
}

function normalizeAgendaSearchText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function whatsappAgendaContactMatchesQuery(row: WhatsappProviderContactRow, normText: string, queryDigits: string): boolean {
  const blob = normalizeAgendaSearchText(
    [row.name, row.pushname, row.shortName, row.number, row.id].filter(Boolean).join(' ')
  );
  if (normText.length > 0 && blob.includes(normText)) return true;
  if (queryDigits.length >= 2) {
    const rowDigits = digitsOnly(`${row.number || ''}${row.id || ''}`);
    if (rowDigits.includes(queryDigits)) return true;
  }
  return false;
}

const WHATSAPP_AGENDA_SEARCH_MAX_RESULTS = 8000;

/** Busca na agenda do aparelho (nome / pushname / número / JID), via lista completa em memória. */
export async function searchWhatsappProviderContactsAgenda(queryRaw: string): Promise<WhatsappProviderContactRow[]> {
  const t = (queryRaw || '').trim();
  if (!t) return [];
  const normText = normalizeAgendaSearchText(t);
  const queryDigits = digitsOnly(t);
  const all = await fetchWhatsappProviderContactsAll({
    limit: WHATSAPP_AGENDA_CONTACTS_HARD_CAP,
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const out: WhatsappProviderContactRow[] = [];
  for (const row of all) {
    if (whatsappAgendaContactMatchesQuery(row, normText, queryDigits)) out.push(row);
    if (out.length >= WHATSAPP_AGENDA_SEARCH_MAX_RESULTS) break;
  }
  return out;
}

/** GET /api/contacts/check-exists — útil antes de enviar para número novo (ex.: BR e dígito 9). */
export async function checkWhatsappProviderPhoneExists(
  phoneRaw: string
): Promise<{ numberExists: boolean; chatId: string | null }> {
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionCheckPhoneExists(phoneRaw);
  }
  const phone = phoneRaw.replace(/\D/g, '');
  if (!phone) {
    throw new Error('Informe o telefone com DDD (e DDI 55 se aplicável).');
  }
  const s = session();
  const url = `${baseUrl()}/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(s)}`;
  const res = await fetch(url, { headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: check-exists falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
  const data = (await res.json()) as { numberExists?: boolean; chatId?: string };
  return {
    numberExists: Boolean(data.numberExists),
    chatId: typeof data.chatId === 'string' && data.chatId.length > 0 ? data.chatId : null
  };
}

/** Detalhe de um contato por id JID ou dígitos. */
export async function fetchWhatsappProviderContactById(
  contactId: string
): Promise<WhatsappProviderContactRow | null> {
  if (!contactId.trim()) return null;
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionFetchContactById(contactId);
  }
  const s = session();
  const q = encodeURIComponent(contactId.trim());
  const url = `${baseUrl()}/api/contacts?contactId=${q}&session=${encodeURIComponent(s)}`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data || typeof data !== 'object' || !data.id) return null;
    return data as unknown as WhatsappProviderContactRow;
  } catch {
    return null;
  }
}

/** URL da foto de perfil (cache no provedor). */
export async function fetchWhatsappProviderProfilePictureUrl(contactId: string): Promise<string | null> {
  if (!contactId.trim()) return null;
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionProfilePictureForContact(contactId);
  }
  const s = session();
  const q = encodeURIComponent(contactId.trim());
  const url = `${baseUrl()}/api/contacts/profile-picture?contactId=${q}&session=${encodeURIComponent(s)}`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const u = data.profilePictureURL ?? data.profilePictureUrl;
    if (typeof u !== 'string' || !u.length) return null;
    return rewriteProviderUrlForClient(u);
  } catch {
    return null;
  }
}

/** Lista de grupos da sessão (sem participantes — payload menor). */
export async function fetchWhatsappProviderGroupsAll(): Promise<WhatsappProviderGroupRow[]> {
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionFetchGroupsForCrm();
  }
  const s = session();
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/groups?limit=500&offset=0&sortBy=subject&sortOrder=asc&exclude=participants`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    const out: WhatsappProviderGroupRow[] = [];
    for (const item of data) {
      const row = normalizeProviderGroupPayload(item);
      if (row) out.push(row);
    }
    return out;
  } catch {
    return [];
  }
}

/** Detalhe de um grupo por id (ex.: 123@g.us). */
export async function fetchWhatsappProviderGroupById(
  groupId: string
): Promise<WhatsappProviderGroupRow | null> {
  const g = groupId.trim();
  if (!g.toLowerCase().endsWith('@g.us')) return null;
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionFetchGroupById(g);
  }
  const s = session();
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/groups/${encodeURIComponent(g)}`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const payload =
      data && typeof data === 'object'
        ? { ...(data as Record<string, unknown>), id: (data as Record<string, unknown>).id ?? g }
        : { id: g };
    return normalizeProviderGroupPayload(payload) ?? normalizeProviderGroupPayload({ id: g });
  } catch {
    return null;
  }
}

/** Foto do grupo GET /api/{session}/groups/{id}/picture */
export async function fetchWhatsappProviderGroupPictureUrl(groupId: string): Promise<string | null> {
  const g = groupId.trim();
  if (!g.toLowerCase().endsWith('@g.us')) return null;
  if (isEvolutionProviderKind()) {
    // Primeiro tenta `/group/info` (campos `PictureURL`/`pictureUrl`).
    // No EvoGo (whatsmeow) esse endpoint não retorna a foto — caímos no
    // `/chat/fetchProfilePictureUrl` que aceita qualquer JID, incluindo `@g.us`.
    const fromInfo = await EvoChat.evolutionGroupPictureUrl(g);
    if (fromInfo) return fromInfo;
    return fetchWhatsappProviderProfilePictureUrl(g);
  }
  const s = session();
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/groups/${encodeURIComponent(g)}/picture?refresh=false`;
  try {
    const res = await fetch(url, { headers: providerApiHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const u = data.url ?? data.profilePictureURL ?? data.profilePictureUrl;
    if (typeof u !== 'string' || !u.length) return null;
    return rewriteProviderUrlForClient(u);
  } catch {
    return null;
  }
}

export function findWhatsappProviderGroupInList(
  rows: WhatsappProviderGroupRow[],
  chatId: string
): WhatsappProviderGroupRow | undefined {
  const want = chatId.trim().toLowerCase();
  if (!want.endsWith('@g.us')) return undefined;
  const wantDigits = waJidToDigits(want);
  return rows.find((r) => {
    const rid = String(r.id ?? '').trim().toLowerCase();
    if (rid === want) return true;
    if (rid.endsWith('@g.us') && waJidToDigits(rid) === wantDigits) return true;
    const rd = rid.replace(/\D/g, '');
    if (rd && rd === wantDigits) return true;
    return false;
  });
}

export async function resolveWhatsappProviderGroupForChat(
  chatId: string
): Promise<WhatsappProviderGroupRow | null> {
  const canon = canonicalWhatsappChatId(chatId);
  if (!canon.toLowerCase().endsWith('@g.us')) return null;
  const rows = await fetchWhatsappProviderGroupsAll();
  const found = findWhatsappProviderGroupInList(rows, canon);
  if (found?.id) return found;
  return fetchWhatsappProviderGroupById(canon);
}

/**
 * Cache em memória de "este chat não tem foto disponível" para reduzir carga
 * na EvoGo. Muitos contatos têm privacidade ligada (foto não visível para
 * desconhecidos) — sem o cache, cada abertura de chat dispara 3 tentativas de
 * `fetchProfilePictureUrl` e cada uma pode levar até 4s (timeout local), o
 * que somado dá 12s por hover e bloqueia o frontend (timeout 10s).
 *
 * TTL: 5 minutos — suficiente para uma sessão de uso, e curto o bastante para
 * pegar fotos que foram disponibilizadas depois.
 */
/**
 * TTL do cache negativo. Aumentado de 5min → 10min após migração para EvoGo
 * porque o IQ `GetProfilePictureInfo` pode demorar até 75s quando o WhatsApp
 * não responde (foto privada, contato fora da rede, link degradado). Cache
 * mais longo reduz a carga sobre a EvoGo e mantém a UI responsiva.
 */
const PROFILE_PICTURE_NULL_TTL_MS = 10 * 60 * 1000;
const profilePictureNullCache = new Map<string, number>();

function profilePictureNullCacheGet(chatId: string): boolean {
  const k = chatId.trim().toLowerCase();
  const exp = profilePictureNullCache.get(k);
  if (!exp) return false;
  if (Date.now() > exp) {
    profilePictureNullCache.delete(k);
    return false;
  }
  return true;
}

function profilePictureNullCacheSet(chatId: string): void {
  const k = chatId.trim().toLowerCase();
  profilePictureNullCache.set(k, Date.now() + PROFILE_PICTURE_NULL_TTL_MS);
}

/**
 * TTL do cache positivo persistente (em ms). Quando há uma foto já no
 * `whatsapp_contact_cache`, devolvemos sem chamar a EvoGo se a entrada
 * estiver "fresca" — evita um round-trip e blindagem contra o IQ travado
 * (que dispara o cache negativo de 10min). Após 24h tentamos novamente
 * (foto pode ter mudado).
 */
const PROFILE_PICTURE_POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Lookup no cache persistente (banco) para uma `chatId`. Retorna a URL/data
 * URI guardada apenas se for recente (TTL 24h) — datas mais antigas caem no
 * fluxo normal de busca para revalidar.
 */
async function loadCachedProfilePictureUrlForChat(chatId: string): Promise<string | null> {
  try {
    // import lazy para evitar ciclo (whatsappChat.service.ts ↔ whatsappProvider.service.ts)
    const { prisma } = await import('../lib/prisma');
    const canon = canonicalWhatsappChatId(chatId);
    const row = await prisma.whatsappContactCache.findFirst({
      where: { chatId: canon, profilePictureUrl: { not: null } },
      select: { profilePictureUrl: true, updatedAt: true }
    });
    if (!row?.profilePictureUrl) return null;
    const age = Date.now() - new Date(row.updatedAt).getTime();
    if (age > PROFILE_PICTURE_POSITIVE_TTL_MS) return null;
    return row.profilePictureUrl;
  } catch {
    return null;
  }
}

/** Foto: grupo usa endpoint /groups/.../picture; DM usa contatos. */
export async function fetchWhatsappProviderProfilePictureUrlForChat(
  chatId: string
): Promise<string | null> {
  const canon = canonicalWhatsappChatId(chatId);
  if (canon.toLowerCase().endsWith('@g.us')) {
    // Grupos também se beneficiam do cache positivo de 24h: a foto raramente
    // muda, mas cada `/group/info` no EvoGo custa um round-trip + risco de
    // rate-limit quando vários operadores abrem o mesmo grupo.
    const cachedGroup = await loadCachedProfilePictureUrlForChat(canon);
    if (cachedGroup) return cachedGroup;
    return fetchWhatsappProviderGroupPictureUrl(canon);
  }

  // Cache positivo persistente (banco) — protege contra o IQ travado da
  // EvoGo (até 75s). Se já temos uma foto recente, devolvemos sem chamar
  // o provedor. O `contact-meta` continua persistindo o resultado.
  const cached = await loadCachedProfilePictureUrlForChat(canon);
  if (cached) return cached;

  // Cache negativo em memória: se já tentamos buscar nos últimos 10 minutos
  // e falhou (foto privada / contato sem foto / EvoGo timeout), economiza
  // ~3s por hover e mantém a UI fluida.
  if (profilePictureNullCacheGet(canon)) {
    return null;
  }

  // Antes (Evolution v2) tentávamos múltiplas variações (digits/canon/raw)
  // porque cada motor aceita um formato. Com a EvoGo `/user/avatar` aceita
  // tanto `@s.whatsapp.net`/`@lid` quanto número puro, e cada tentativa
  // adiciona ~3s no pior caso (timeout do bridge). Mantemos UMA chamada por
  // chat — se falhar, cache negativo evita retry por 10min.
  let preferredId: string;
  if (canon.toLowerCase().endsWith('@lid')) {
    preferredId = canon;
  } else {
    // Para DMs, usar o JID canonical (EvoGo normaliza internamente).
    preferredId = canon || chatId.trim();
  }
  const found = preferredId ? await fetchWhatsappProviderProfilePictureUrl(preferredId) : null;

  if (!found) {
    profilePictureNullCacheSet(canon);
  }
  return found;
}

/** Localiza contato na lista /api/contacts/all pelo mesmo número (55… / DDD). */
export function findWhatsappProviderContactInList(
  rows: WhatsappProviderContactRow[],
  chatId: string
): WhatsappProviderContactRow | undefined {
  const canon = canonicalWhatsappChatId(chatId);
  const digits = waJidToDigits(canon);
  return rows.find(
    (r) =>
      !r.isGroup &&
      (canonicalWhatsappChatId(r.id) === canon || waJidToDigits(r.id) === digits)
  );
}

/** Enriquece com GET /api/contacts se a lista não trouxer o chat (ex.: número novo). */
export async function resolveWhatsappProviderContactForChat(
  chatId: string
): Promise<WhatsappProviderContactRow | null> {
  const raw = chatId.trim();
  if (raw.toLowerCase().endsWith('@lid')) {
    const direct = await fetchWhatsappProviderContactById(raw);
    if (direct?.id) return direct;
  }
  const canon = canonicalWhatsappChatId(chatId);
  const digits = waJidToDigits(canon);
  for (const id of [digits, canon, raw]) {
    if (!id) continue;
    const c = await fetchWhatsappProviderContactById(id);
    if (c?.id) return c;
  }
  return null;
}

function parseProviderSendTextResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (typeof o.id === 'string' && o.id.length > 0) return o.id;
  if (typeof o.id === 'number' && !Number.isNaN(o.id)) return String(o.id);
  if (typeof o.messageId === 'string' && o.messageId.length > 0) return o.messageId;
  const key = o.key;
  if (key && typeof key === 'object') {
    const k = key as Record<string, unknown>;
    if (typeof k.id === 'string' && k.id.length > 0) return k.id;
    if (typeof k.id === 'number' && !Number.isNaN(k.id)) return String(k.id);
  }
  return null;
}

function parseProviderMediaUrlFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const media = o.media;
  if (media && typeof media === 'object') {
    const u = (media as Record<string, unknown>).url;
    if (typeof u === 'string' && u.length > 0) return u;
  }
  if (typeof o.mediaUrl === 'string' && o.mediaUrl.length > 0) return o.mediaUrl;
  return null;
}

export interface WhatsappProviderSendMediaResult {
  providerMessageId: string | null;
  mediaUrl: string | null;
}

function evolutionSendFailureMayBeInvalidRecipient(status: number, body: string): boolean {
  if (status < 400 || status >= 500) return false;
  const t = (body || '').toLowerCase();
  if (t.includes('"exists":false') || t.includes('"exists": false')) return true;
  if (t.includes('exists') && t.includes('false')) return true;
  if (t.includes('is not on whatsapp') || t.includes('not registered')) return true;
  return false;
}

/** Tenta obter JID ativo via Evolution whatsappNumbers e persiste mapa local. */
async function evolutionRecoverRecipientNumberForSend(firstNumber: string): Promise<string | null> {
  const d = firstNumber.includes('@')
    ? waJidToDigits(firstNumber)
    : String(firstNumber || '').replace(/\D/g, '');
  if (!d || d.length < 10) return null;
  try {
    const { numberExists, chatId, pushName } = await EvoChat.evolutionCheckPhoneExists(d);
    if (numberExists && chatId) {
      await recordWhatsappChatIdentity({
        phoneDigitsKey: d,
        primaryChatId: chatId,
        source: 'send_retry',
        extraJids: [firstNumber]
      });
      await persistContatoS3eJidAndInteraction(d, chatId, pushName);
      return chatIdToEvolutionNumber(canonicalWhatsappChatId(chatId));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Implementação "crua" do envio de texto.
 * NÃO chamar diretamente — use `sendWhatsappProviderText`, que serializa esta
 * função na fila global (whatsappSendQueue) para evitar burst de envios
 * paralelos contra a Evolution Go e race condition na resolução de @lid.
 */
export type WhatsappProviderQuotedOptions = {
  quotedMessageId?: string;
  /** JID do chat onde a mensagem citada existe (default: chatId do envio). */
  quotedRemoteJid?: string;
  /** Se a mensagem citada foi enviada por nós (default: false). */
  quotedFromMe?: boolean;
};

function buildProviderQuotedPayload(
  chatId: string,
  options?: WhatsappProviderQuotedOptions
): Record<string, unknown> | undefined {
  const quotedMessageId = (options?.quotedMessageId || '').trim();
  if (!quotedMessageId) return undefined;
  return {
    key: {
      id: quotedMessageId,
      remoteJid: canonicalWhatsappChatId(options?.quotedRemoteJid || chatId),
      fromMe: options?.quotedFromMe === true
    }
  };
}

async function sendWhatsappProviderTextRaw(
  chatId: string,
  text: string,
  options?: WhatsappProviderQuotedOptions
): Promise<string | null> {
  if (isEvolutionProviderKind()) {
    await ensureEvolutionInstanceReady();
    const inst = session();
    const path = `/message/sendText/${encodeURIComponent(inst)}`;
    await refreshContatoS3eFromWhatsappNumbers(chatId);
    const resolved = await resolvePreferredChatIdForOutbound(chatId);
    let number = chatIdToEvolutionNumber(canonicalWhatsappChatId(resolved));
    const quoted = buildProviderQuotedPayload(canonicalWhatsappChatId(resolved), options);
    const buildBody = (n: string): Record<string, unknown> => {
      const body: Record<string, unknown> = {
        number: n,
        text,
        presence: evolutionSendPresence(),
        delay: evolutionSendDelayMs()
      };
      if (quoted) body.quoted = quoted;
      return body;
    };
    let res = await evolutionApiPost(path, buildBody(number));
    if (!res.ok) {
      let t = await res.text().catch(() => '');
      if (evolutionSendFailureMayBeInvalidRecipient(res.status, t)) {
        const recovered = await evolutionRecoverRecipientNumberForSend(number);
        if (recovered) {
          number = recovered;
          res = await evolutionApiPost(path, buildBody(number));
        }
      }
      if (!res.ok) {
        t = await res.text().catch(() => t);
        throw new Error(`Provedor WhatsApp (Evolution): sendText falhou: HTTP ${res.status} ${t || res.statusText}`);
      }
    }
    const data = (await res.json().catch(() => null)) as unknown;
    return parseEvolutionMessageId(data) ?? parseProviderSendTextResponse(data);
  }

  const res = await fetch(`${baseUrl()}/api/sendText`, {
    method: 'POST',
    headers: providerJsonHeaders(),
    body: JSON.stringify({
      session: session(),
      chatId,
      text
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: sendText falhou: HTTP ${res.status} ${t || res.statusText}`);
  }

  const data = (await res.json().catch(() => null)) as unknown;
  return parseProviderSendTextResponse(data);
}

export type WhatsappProviderMediaType = 'image' | 'voice' | 'video' | 'file' | 'sticker';

export interface WhatsappProviderSendMediaPayload {
  chatId: string;
  type: WhatsappProviderMediaType;
  /** base64-encoded file data */
  base64Data: string;
  mimetype: string;
  filename?: string;
  caption?: string;
  quotedMessageId?: string;
  quotedRemoteJid?: string;
  quotedFromMe?: boolean;
}

function providerEndpointForMediaType(type: WhatsappProviderMediaType): string {
  switch (type) {
    case 'image':
      return '/api/sendImage';
    case 'voice':
      return '/api/sendVoice';
    case 'video':
      return '/api/sendVideo';
    case 'file':
      return '/api/sendFile';
    case 'sticker':
      return '/api/sendFile';
  }
}

/**
 * Implementação "crua" do envio de mídia (sendImage/sendVoice/sendVideo/sendFile).
 * NÃO chamar diretamente — use `sendWhatsappProviderMedia`, que serializa na
 * fila global (whatsappSendQueue) para humanizar o ritmo dos envios.
 *
 * Opcional: WHATSAPP_PROVIDER_SEND_ANY_FILE_PATH (ex. /api/sendAnyFile) — mesmo JSON que sendFile.
 */
async function sendWhatsappProviderMediaRaw(
  payload: WhatsappProviderSendMediaPayload
): Promise<WhatsappProviderSendMediaResult> {
  if (isEvolutionProviderKind()) {
    await ensureEvolutionInstanceReady();
    const inst = session();
    const path = `/message/sendMedia/${encodeURIComponent(inst)}`;
    await refreshContatoS3eFromWhatsappNumbers(payload.chatId);
    const resolved = await resolvePreferredChatIdForOutbound(payload.chatId);
    let number = chatIdToEvolutionNumber(canonicalWhatsappChatId(resolved));
    const base = evolutionMediaType(payload.type);
    const isVoice = payload.type === 'voice';
    const isSticker = payload.type === 'sticker';
    let mimetype = (payload.mimetype && payload.mimetype.trim()) || base.mimetype;
    // Voice (PTT) exige `audio/ogg; codecs=opus` para o iOS exibir o player
    // inline. Se o caller passou só `audio/ogg`, anexa `codecs=opus` automaticamente.
    if (isVoice) {
      const mt = mimetype.toLowerCase();
      if (mt.includes('ogg') && !mt.includes('codecs=opus')) {
        mimetype = 'audio/ogg; codecs=opus';
      }
    }
    if (isSticker) {
      mimetype = 'image/webp';
    }
    const rawName = (payload.filename && payload.filename.trim()) || base.fileName;
    const fileName =
      normalizeUserFilename(rawName, 220) || String(rawName).replace(/[/\\]/g, '_') || base.fileName;
    let mediatype = base.mediatype;
    if (payload.type === 'file' && mimetype.toLowerCase().includes('pdf')) {
      mediatype = 'document';
    }
    const caption = (payload.caption && payload.caption.trim()) || '';
    const quoted = buildProviderQuotedPayload(canonicalWhatsappChatId(resolved), {
      quotedMessageId: payload.quotedMessageId,
      quotedRemoteJid: payload.quotedRemoteJid,
      quotedFromMe: payload.quotedFromMe
    });
    const buildBody = (n: string): Record<string, unknown> => {
      // Voice = nota de voz (PTT). Marcamos explicitamente para que o WhatsApp do
      // destinatário exiba a barra de progresso + foto do perfil (estilo "áudio
      // gravado no celular") em vez do ícone de arquivo .ogg. A presença
      // `recording` faz a EvoGo mostrar "gravando áudio…" durante o `delay`,
      // simulando o operador segurando o botão de gravar.
      const body: Record<string, unknown> = {
        number: n,
        mediatype,
        mimetype,
        caption,
        media: stripDataUrlBase64(payload.base64Data),
        fileName,
        presence: isVoice ? 'recording' : evolutionSendPresence(),
        delay: evolutionSendDelayMs()
      };
      if (isVoice) {
        body.ptt = true;
      }
      if (quoted) body.quoted = quoted;
      return body;
    };

    let res = await evolutionApiPost(path, buildBody(number));
    if (!res.ok) {
      let t = await res.text().catch(() => '');
      if (evolutionSendFailureMayBeInvalidRecipient(res.status, t)) {
        const recovered = await evolutionRecoverRecipientNumberForSend(number);
        if (recovered) {
          number = recovered;
          res = await evolutionApiPost(path, buildBody(number));
        }
      }
      if (!res.ok) {
        t = await res.text().catch(() => t);
        throw new Error(
          appendProviderSendDoc(
            `Provedor WhatsApp (Evolution): sendMedia falhou: HTTP ${res.status} ${t || res.statusText}`
          )
        );
      }
    }
    const data = (await res.json().catch(() => null)) as unknown;
    return {
      providerMessageId: parseEvolutionMessageId(data) ?? parseProviderSendTextResponse(data),
      mediaUrl: parseProviderMediaUrlFromResponse(data)
    };
  }

  const altPath = process.env.WHATSAPP_PROVIDER_SEND_ANY_FILE_PATH?.trim();
  const endpoint =
    payload.type === 'file' && altPath ? altPath : providerEndpointForMediaType(payload.type);
  const headers = providerJsonHeaders();

  const body: Record<string, unknown> = {
    session: session(),
    chatId: payload.chatId,
    file: {
      mimetype: payload.mimetype,
      data: payload.base64Data,
      ...(payload.filename
        ? {
            filename:
              normalizeUserFilename(payload.filename, 220) ||
              String(payload.filename).replace(/[/\\]/g, '_')
          }
        : {})
    }
  };

  if (payload.caption) {
    body.caption = payload.caption;
  }

  if (payload.type === 'voice' || payload.type === 'video') {
    body.convert = true;
  }

  const url = `${baseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let t = await res.text().catch(() => '');
    const lower = t.toLowerCase();
    const isPlusGate422 = res.status === 422 && (lower.includes('plus') || lower.includes('only in plus'));

    // Alguns provedores bloqueiam /api/sendImage por plano/configuração; tenta /api/sendFile.
    if (isPlusGate422 && payload.type === 'image') {
      const fileUrl = `${baseUrl()}/api/sendFile`;
      const fileBody: Record<string, unknown> = { ...body };
      delete fileBody.convert;
      res = await fetch(fileUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(fileBody)
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as unknown;
        return {
          providerMessageId: parseProviderSendTextResponse(data),
          mediaUrl: parseProviderMediaUrlFromResponse(data)
        };
      }
      t = await res.text().catch(() => t);
      throw new Error(
        appendProviderSendDoc(
          'Limitação de plano do provedor para envio de imagem no endpoint padrão. ' +
            'Tentativa alternativa (sendFile) também falhou. ' +
            'Opções: (1) habilitar envio de mídia no plano do provedor; (2) revisar configuração da instância no painel do provedor; ' +
            '(3) enviar como documento quando suportado. ' +
            (t.length > 0 && t.length < 400 ? ` Detalhes: ${t}` : '')
        )
      );
    }

    if (res.status === 422 && payload.type === 'file') {
      if (lower.includes('plus') || lower.includes('only in plus')) {
        throw new Error(
          appendProviderSendDoc(
            'Limitação de plano do provedor para envio de documentos (PDF, Excel, ZIP, etc.). ' +
              'Soluções: (1) habilitar documentos no plano do provedor; ' +
              '(2) revisar configuração da instância no painel do provedor; (3) usar um tipo de mídia suportado.'
          )
        );
      }
      throw new Error(
        appendProviderSendDoc(
          'O provedor recusou o envio deste arquivo (HTTP 422). Documentos podem exigir habilitação específica no plano/configuração do provedor. ' +
            (t.length > 0 && t.length < 500 ? t : '')
        )
      );
    }
    throw new Error(
      appendProviderSendDoc(`Provedor WhatsApp ${endpoint} falhou: HTTP ${res.status} ${t || res.statusText}`)
    );
  }

  const data = (await res.json().catch(() => null)) as unknown;
  return {
    providerMessageId: parseProviderSendTextResponse(data),
    mediaUrl: parseProviderMediaUrlFromResponse(data)
  };
}

/**
 * Envia texto pelo provedor (Evolution Go) DENTRO da fila global.
 *
 * A fila garante:
 *  - Apenas 1 envio rodando por vez no processo (mesmo com 7 operadores
 *    clicando "Enviar" simultaneamente);
 *  - Resolução de @lid (refreshContatoS3eFromWhatsappNumbers + whatsappNumbers)
 *    sem race condition entre threads;
 *  - Jitter aleatório (WHATSAPP_SEND_JITTER_MS_MIN/MAX, default 2-5s) APÓS o
 *    envio — espalha o ritmo para parecer humano;
 *  - O "composing" (digitando) de 1.5s é entregue pelo próprio Evolution Go
 *    via `presence: composing` + `delay` no body (ver evolutionSendPresence/
 *    evolutionSendDelayMs e WHATSAPP_PROVIDER_SEND_DELAY_MS no .env).
 *
 * Retorna o id da mensagem no provedor quando a API informar.
 */
export async function sendWhatsappProviderText(
  chatId: string,
  text: string,
  options?: WhatsappProviderQuotedOptions
): Promise<string | null> {
  return withWhatsappSendLock({ label: 'sendText' }, () =>
    sendWhatsappProviderTextRaw(chatId, text, options)
  );
}

/**
 * Envia mídia pelo provedor (Evolution Go) DENTRO da fila global.
 * Mesma fila/jitter/lock que `sendWhatsappProviderText` — atende texto, mídia,
 * arquivos genéricos e PDFs de orçamento (todos passam por aqui ou por sendText).
 */
export async function sendWhatsappProviderMedia(
  payload: WhatsappProviderSendMediaPayload
): Promise<WhatsappProviderSendMediaResult> {
  return withWhatsappSendLock({ label: 'sendMedia' }, () => sendWhatsappProviderMediaRaw(payload));
}

export interface WhatsappProviderSendReactionPayload {
  /** Chat onde a mensagem original existe (JID canônico, ex.: `5547...@s.whatsapp.net`). */
  chatId: string;
  /** ID da mensagem no provedor a ser reagida (ChatMessage.providerMessageId). */
  providerMessageId: string;
  /** `true` se a mensagem original foi enviada por nós (afeta o `key.fromMe` da API v2). */
  fromMe: boolean;
  /** Em grupos: JID do participante que enviou a mensagem alvo (obrigatório para reagir a mensagens de terceiros). */
  participant?: string | null;
  /**
   * Emoji da reação. Use string vazia `''` para REMOVER a reação anteriormente
   * enviada (semântica oficial do WhatsApp).
   */
  emoji: string;
}

/**
 * Reage a uma mensagem no WhatsApp (✅, ❤️, 👍, etc.) — endpoint
 * `POST /message/react` da Evolution Go.
 *
 * Por que isso entra na fila global (`withWhatsappSendLock`)?
 *  - Reaction não dispara notificação ruidosa no cliente e é considerada
 *    "interação leve" pelo anti-spam, mas SE rodar em paralelo com um
 *    `sendText`/`sendMedia` pode criar race condition na resolução de @lid
 *    (`refreshContatoS3eFromWhatsappNumbers`). A fila resolve isso.
 *  - `skipJitter: true`: NÃO precisa do delay 2-5s pós-job — reaction é
 *    naturalmente esparsa e instantânea. Mas continua serializada.
 *
 * Para REMOVER uma reação enviada anteriormente, passe `emoji: ''`.
 */
export async function sendWhatsappProviderReaction(
  payload: WhatsappProviderSendReactionPayload
): Promise<unknown> {
  const remoteJid = canonicalWhatsappChatId(payload.chatId);
  const messageId = payload.providerMessageId.trim();
  if (!remoteJid || !messageId) {
    throw new Error('sendWhatsappProviderReaction: chatId e providerMessageId são obrigatórios');
  }
  return withWhatsappSendLock({ label: 'sendReaction', skipJitter: true }, async () => {
    const key: Record<string, unknown> = { remoteJid, fromMe: !!payload.fromMe, id: messageId };
    const participant = payload.participant?.trim();
    if (participant) key.participant = participant;
    return EvoChat.evolutionSendReaction({
      key,
      reaction: payload.emoji
    });
  });
}

/** URL pública do provedor → URL interna (Docker) para fetch no backend. */
export function whatsappProviderInternalMediaUrl(clientOrInternalUrl: string): string {
  const resolved = resolveWhatsappProviderInternalFetchUrl(clientOrInternalUrl);
  if (resolved) return resolved;
  const providerBase = baseUrl();
  const pub = process.env.WHATSAPP_PROVIDER_PUBLIC_URL?.trim().replace(/\/$/, '');
  const u = clientOrInternalUrl.trim();
  if (pub && u.startsWith(pub)) {
    return providerBase + u.slice(pub.length);
  }
  return u;
}

/** GET binário (mídia) no provedor com suporte a Range (vídeo 206). */
export async function fetchWhatsappProviderMediaWithRange(
  internalUrl: string,
  rangeHeader?: string
): Promise<Response> {
  const headers: Record<string, string> = { ...providerApiHeaders(), Accept: '*/*' };
  if (rangeHeader) headers['Range'] = rangeHeader;
  return fetch(internalUrl, { headers });
}

/** Baixa mídia da mensagem (downloadMedia=true), com Range opcional. */
export async function fetchWhatsappProviderMessageDownloadMedia(
  chatId: string,
  messageId: string,
  rangeHeader?: string,
  fromMe?: boolean
): Promise<Response> {
  if (isEvolutionProviderKind()) {
    const remoteJid = canonicalWhatsappChatId(chatId);
    const id = messageId.trim();
    const attempts =
      typeof fromMe === 'boolean' ? [fromMe] : [false, true];

    let lastError: Error | null = null;
    for (const attemptFromMe of attempts) {
      try {
        const payload: Record<string, unknown> = {
          message: {
            key: {
              id,
              remoteJid,
              fromMe: attemptFromMe
            }
          },
          convertToMp4: false
        };
        const raw = await EvoChat.evolutionGetBase64FromMediaMessage(payload);
        const parsed = extractEvolutionMediaBinary(raw);
        if (!parsed) {
          lastError = new Error('Evolution não retornou base64 de mídia para a mensagem informada');
          continue;
        }
        return new Response(parsed.buffer, {
          status: 200,
          headers: {
            'content-type': parsed.contentType || 'application/octet-stream',
            'content-length': String(parsed.buffer.length)
          }
        });
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastError ?? new Error('Evolution não retornou base64 de mídia para a mensagem informada');
  }

  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const m = encodeURIComponent(messageId.trim());
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}/messages/${m}?downloadMedia=true`;
  return fetchWhatsappProviderMediaWithRange(url, rangeHeader);
}

function readNestedObject(obj: unknown, keys: string[]): unknown {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function coerceNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseDataUriBase64(raw: string): { base64: string; contentType: string | null } {
  const text = raw.trim();
  const m = text.match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return { base64: text, contentType: null };
  return { contentType: m[1]?.trim() || null, base64: m[2]?.trim() || '' };
}

function extractEvolutionMediaBinary(
  data: unknown
): { buffer: Uint8Array; contentType: string | null } | null {
  const base64Candidates: unknown[] = [
    readNestedObject(data, ['base64']),
    readNestedObject(data, ['data', 'base64']),
    readNestedObject(data, ['message', 'base64']),
    readNestedObject(data, ['data', 'message', 'base64']),
    readNestedObject(data, ['body', 'base64']),
    readNestedObject(data, ['body', 'data', 'base64']),
    readNestedObject(data, ['body', 'data', 'message', 'base64']),
    data
  ];
  const mimeCandidates: unknown[] = [
    readNestedObject(data, ['mimetype']),
    readNestedObject(data, ['mimeType']),
    readNestedObject(data, ['data', 'mimetype']),
    readNestedObject(data, ['data', 'mimeType']),
    readNestedObject(data, ['message', 'mimetype']),
    readNestedObject(data, ['message', 'mimeType']),
    readNestedObject(data, ['data', 'message', 'mimetype']),
    readNestedObject(data, ['data', 'message', 'mimeType']),
    readNestedObject(data, ['body', 'mimetype']),
    readNestedObject(data, ['body', 'mimeType']),
    readNestedObject(data, ['body', 'data', 'mimetype']),
    readNestedObject(data, ['body', 'data', 'mimeType']),
    readNestedObject(data, ['body', 'data', 'message', 'mimetype']),
    readNestedObject(data, ['body', 'data', 'message', 'mimeType'])
  ];

  let contentType: string | null = null;
  for (const item of mimeCandidates) {
    const hit = coerceNonEmptyString(item);
    if (hit) {
      contentType = hit;
      break;
    }
  }

  for (const item of base64Candidates) {
    const raw = coerceNonEmptyString(item);
    if (!raw) continue;
    const parsed = parseDataUriBase64(raw);
    const b64 = parsed.base64.replace(/\s/g, '');
    if (!b64) continue;
    try {
      const buf = Buffer.from(b64, 'base64');
      if (buf.length === 0) continue;
      return {
        buffer: buf,
        contentType: contentType || parsed.contentType
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** POST /api/sessions/{name}/logout — encerra a sessão WhatsApp (é preciso escanear o QR de novo). */
export async function logoutWhatsappProviderSession(): Promise<void> {
  if (isEvolutionProviderKind()) {
    await EvoChat.evolutionLogoutInstance();
    return;
  }
  const name = session();
  const url = `${baseUrl()}/api/sessions/${encodeURIComponent(name)}/logout`;
  const headers: Record<string, string> = {
    ...providerApiHeaders(),
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  const res = await fetch(url, { method: 'POST', headers, body: '{}' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: logout falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** DELETE /api/{session}/chats/{chatId}/messages/{messageId} */
export async function deleteWhatsappProviderChatMessage(
  chatId: string,
  providerMessageId: string,
  fromMe = true
): Promise<void> {
  if (isEvolutionProviderKind()) {
    await EvoChat.evolutionDeleteMessageForEveryoneCrm(chatId, providerMessageId, fromMe);
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const m = encodeURIComponent(providerMessageId.trim());
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}/messages/${m}`;
  const res = await fetch(url, { method: 'DELETE', headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: excluir mensagem falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** Inscreve o webhook em atualizações de presença deste chat (recomendado para ver “digitando”). */
export async function subscribeWhatsappProviderChatPresence(chatId: string): Promise<void> {
  if (isEvolutionProviderKind()) {
    try {
      await EvoChat.evolutionSubscribePresenceTyping(chatId);
    } catch (err) {
      // Presença é opcional para UX; não deve quebrar abertura do chat.
      console.warn('subscribeWhatsappProviderChatPresence:evolution', err);
    }
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/presence/${c}/subscribe`;
  const res = await fetch(url, { method: 'POST', headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: subscribe presença falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** DELETE /api/{session}/chats/{chatId} — remove o chat na sessão do provedor */
export async function deleteWhatsappProviderChat(chatId: string): Promise<void> {
  if (isEvolutionProviderKind()) {
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}`;
  const res = await fetch(url, { method: 'DELETE', headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: excluir chat falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** POST /api/{session}/chats/{chatId}/archive */
export async function archiveWhatsappProviderChat(
  chatId: string,
  last?: { providerMessageId: string; fromMe: boolean } | null
): Promise<void> {
  if (isEvolutionProviderKind()) {
    await EvoChat.evolutionArchiveChatForCrm(chatId, true, last ?? null);
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}/archive`;
  const res = await fetch(url, { method: 'POST', headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: arquivar chat falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** POST /api/{session}/chats/{chatId}/unarchive */
export async function unarchiveWhatsappProviderChat(
  chatId: string,
  last?: { providerMessageId: string; fromMe: boolean } | null
): Promise<void> {
  if (isEvolutionProviderKind()) {
    await EvoChat.evolutionArchiveChatForCrm(chatId, false, last ?? null);
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}/unarchive`;
  const res = await fetch(url, { method: 'POST', headers: providerApiHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: desarquivar chat falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** Perfil da sessão WhatsApp (conta conectada). Tenta /me e /profile conforme versão do provedor. */
export async function fetchWhatsappProviderSessionMe(): Promise<Record<string, unknown> | null> {
  if (isEvolutionProviderKind()) {
    return EvoChat.evolutionFetchInstanceProfile();
  }
  const s = session();
  const candidates = [
    `${baseUrl()}/api/sessions/${encodeURIComponent(s)}/me`,
    `${baseUrl()}/api/${encodeURIComponent(s)}/profile`
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: providerApiHeaders() });
      if (res.ok) {
        const data = (await res.json()) as unknown;
        if (data && typeof data === 'object') return data as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/** PUT /api/{session}/chats/{chatId}/messages/{messageId} */
export async function editWhatsappProviderChatMessage(
  chatId: string,
  providerMessageId: string,
  text: string
): Promise<void> {
  if (isEvolutionProviderKind()) {
    await EvoChat.evolutionEditMessageForCrm(chatId, providerMessageId, text, true);
    return;
  }
  const s = session();
  const c = encodeURIComponent(canonicalWhatsappChatId(chatId));
  const m = encodeURIComponent(providerMessageId.trim());
  const url = `${baseUrl()}/api/${encodeURIComponent(s)}/chats/${c}/messages/${m}`;
  const headers: Record<string, string> = {
    ...providerApiHeaders(),
    'Content-Type': 'application/json'
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Provedor WhatsApp: editar mensagem falhou: HTTP ${res.status} ${t || res.statusText}`);
  }
}
