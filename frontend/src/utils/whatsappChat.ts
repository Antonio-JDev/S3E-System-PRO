import { maskTelefoneBr, onlyDigits } from './masks';

/** Converte número cadastrado para JID WhatsApp (ex.: 5511999999999@c.us) */
export function toWhatsappChatId(phone: string): string {
  let d = onlyDigits(phone);
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return `${d}@c.us`;
}

export function waJidToDigits(jid: string): string {
  return onlyDigits((jid || '').split('@')[0] || jid);
}

/**
 * DM: `55...@c.us`. Grupos/newsletter preservam sufixo.
 * `@lid` deve ser preservado (evita colisão de cache e “vazamento” de nomes entre chats).
 */
export function canonicalWhatsappChatId(jid: string): string {
  const raw = (jid || '').trim();
  if (!raw) return jid;
  const lower = raw.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return raw;
  }
  if (lower.endsWith('@lid')) {
    return raw;
  }
  const localPart = raw.split('@')[0] || '';
  const d0 = onlyDigits(localPart);
  if (!d0) return raw;
  let d = d0;
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return `${d}@c.us`;
}

export function chatIdToDisplayLabel(chatId: string): string {
  const d = onlyDigits(chatId.split('@')[0] || chatId);
  return d || chatId;
}

function repairUtf8MojibakeLatin1Chunk(chunk: string): string {
  if (!chunk) return chunk;
  try {
    const bytes = new Uint8Array(chunk.length);
    for (let i = 0; i < chunk.length; i += 1) {
      bytes[i] = chunk.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded !== chunk ? decoded : chunk;
  } catch {
    return chunk;
  }
}

/**
 * Corrige mojibake típico: bytes UTF-8 foram interpretados como Latin-1 (ex.: "LocalizaÃ§Ã£o" → "Localização").
 * Processa por trechos: emoji e caracteres BMP > U+00FF ficam intactos; só trechos "Latin-1" são candidatos ao decode.
 * Assim legendas como "📎 Arquivo — …LocalizaÃ§Ã£o.pdf" continuam corrigindo o nome do arquivo.
 */
export function repairUtf8Mojibake(s: string): string {
  if (!s || typeof s !== 'string') return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        out += s.slice(i, i + 2);
        i += 2;
        continue;
      }
    }
    if (c > 0xff) {
      out += s[i];
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < s.length) {
      const cc = s.charCodeAt(j);
      if (cc >= 0xd800 && cc <= 0xdbff && j + 1 < s.length) {
        const c2 = s.charCodeAt(j + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) break;
      }
      if (cc > 0xff) break;
      j += 1;
    }
    out += repairUtf8MojibakeLatin1Chunk(s.slice(i, j));
    i = j;
  }
  return out;
}

/** NFC + mojibake + separadores de path — nomes de arquivo antes do multipart (alinhado ao backend). */
export function normalizeUploadFilename(name: string): string {
  let s = (name || '').trim();
  if (!s) return s;
  s = repairUtf8Mojibake(s);
  try {
    s = s.normalize('NFC');
  } catch {
    /* ignore */
  }
  return s.replace(/[/\\]/g, '_');
}

/** Garante `File.name` em UTF-8 correto para o `FormData` (acentos). */
export function fileWithNormalizedUploadName(file: File): File {
  const n = normalizeUploadFilename(file.name);
  if (!n || n === file.name) return file;
  return new File([file], n, { type: file.type, lastModified: file.lastModified });
}

/** Chat de grupo WhatsApp (`...@g.us`). */
export function isWhatsappGroupChatId(chatId: string): boolean {
  return (chatId || '').trim().toLowerCase().endsWith('@g.us');
}

/** ID do grupo encurtado para subtítulo / lista (evita linha longa de dígitos). */
export function shortGroupIdLabel(chatId: string): string {
  const raw = (chatId || '').split('@')[0] || '';
  const d = onlyDigits(raw);
  if (!d) return (chatId || '').trim() || 'Grupo';
  if (d.length <= 15) return d;
  return `…${d.slice(-10)}`;
}

export interface WhatsappGroupLike {
  id: string;
  subject?: string;
  name?: string;
  /** Alguns motores enviam o título do grupo neste campo. */
  title?: string;
  groupMetadata?: { subject?: string };
}

export interface WhatsappContactLike {
  id: string;
  number?: string;
  name?: string;
  pushname?: string;
  shortName?: string;
  isGroup?: boolean;
}

export function findWhatsappGroupInRows<T extends WhatsappGroupLike>(rows: T[], chatId: string): T | undefined {
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

export function whatsappGroupDisplayName(g: WhatsappGroupLike | null | undefined): string {
  if (!g) return '';
  const gm = g.groupMetadata?.subject?.trim();
  const t = (g.subject || g.name || g.title || gm || '').trim();
  return t;
}

/** Dígitos correspondentes a celular/fixo BR (10–11 após normalizar 55). */
function looksLikeBrPhoneDigits(value: string): boolean {
  let d = onlyDigits(value);
  if (!d) return false;
  if (d.startsWith('55') && d.length >= 12 && d.length <= 13) {
    d = d.slice(2);
  }
  return d.length >= 10 && d.length <= 11;
}

/**
 * Telefone legível a partir do contato do provedor (`number` ou JID `@c.us` / `@s.whatsapp.net`).
 * Usado quando o `chatId` é `@lid` e o número real não aparece no JID.
 */
export function formatPhoneForProviderContact(contact: WhatsappContactLike | null | undefined): string {
  if (!contact) return '';
  const numRaw = (contact.number || '').trim();
  if (numRaw) {
    const d = onlyDigits(numRaw);
    if (!d) return '';
    let local = d;
    if (local.startsWith('55') && local.length >= 12 && local.length <= 13) {
      local = local.slice(2);
    }
    if (local.length >= 10 && local.length <= 11) {
      return maskTelefoneBr(local);
    }
    if (d.length >= 10) return `+${d}`;
    return d;
  }
  const id = String(contact.id || '').trim();
  if (!id) return '';
  const low = id.toLowerCase();
  if (low.endsWith('@c.us') || low.endsWith('@s.whatsapp.net')) {
    return formatPhoneForDisplay(id);
  }
  return '';
}

/**
 * Formata um chatId/telefone para exibição amigável.
 *
 * IMPORTANTE — comportamento para `@lid`: o LID NÃO carrega o telefone do
 * contato (é um identificador interno do WhatsApp para privacidade). Mesmo
 * que `local` pareça um número grande, devolver isso ao usuário equivale
 * a "vazar o ID interno" — exatamente o que pediram para eliminar. Quando
 * o LID for o input, retornamos string vazia para o consumidor decidir
 * (cair em "WhatsApp" / nome / telefone vindo de outro lugar). Só
 * formatamos o LID quando o `local` coincidir com um telefone BR
 * válido (caso raríssimo, mas mantemos por segurança).
 */
export function formatPhoneForDisplay(chatId: string): string {
  const raw = (chatId || '').trim();
  const lower = raw.toLowerCase();
  if (lower.endsWith('@lid')) {
    const local = raw.split('@')[0] || '';
    const d = onlyDigits(local);
    let phone = d;
    if (phone.startsWith('55') && phone.length > 11) {
      phone = phone.slice(2);
    }
    if (phone.length >= 10 && phone.length <= 11) {
      return maskTelefoneBr(phone);
    }
    // LID puro (ID interno do WhatsApp) — não expomos na UI.
    return '';
  }
  if (lower.endsWith('@g.us')) {
    return shortGroupIdLabel(raw);
  }
  let d = onlyDigits(raw.split('@')[0] || raw);
  if (d.startsWith('55') && d.length > 11) {
    d = d.slice(2);
  }
  if (d.length >= 10 && d.length <= 11) {
    return maskTelefoneBr(d);
  }
  if (d.length > 0) {
    return d;
  }
  return raw;
}

/**
 * Para envio de mensagens, alguns ambientes não aceitam `@lid`.
 * Quando o LID parecer conter um telefone BR válido, converte para `@c.us`.
 * Caso contrário, mantém o chatId original.
 */
export function resolveOutboundChatId(chatId: string): string {
  const raw = (chatId || '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (!lower.endsWith('@lid')) return raw;
  const local = raw.split('@')[0] || '';
  const d = onlyDigits(local);
  if (!d) return raw;
  let phone = d;
  // `toWhatsappChatId` já faz prefixo 55 quando necessário.
  if (phone.startsWith('55') && phone.length > 13) {
    // Se for um id longo e não “telefone”, não tenta converter.
    return raw;
  }
  // Aceita 10–13 dígitos (com/sem 55).
  const len = phone.length;
  if (len >= 10 && len <= 13) {
    return toWhatsappChatId(phone);
  }
  return raw;
}

/** Dígitos do campo `number` alinhados ao JID BR (55 + local), para match estrito com `waJidToDigits(canonicalChatId)`. */
function contactStoredNumberDigitsForMatch(number: string): string {
  const d0 = onlyDigits(number);
  if (!d0) return '';
  let d = d0;
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return d;
}

export function findWhatsappContactInRows<T extends WhatsappContactLike>(rows: T[], chatId: string): T | undefined {
  const canon = canonicalWhatsappChatId(chatId);
  const digits = waJidToDigits(canon);
  return rows.find((r) => {
    if (r.isGroup) return false;
    const rid = String(r.id ?? '');
    if (canonicalWhatsappChatId(rid) === canon || waJidToDigits(rid) === digits) return true;

    const n = contactStoredNumberDigitsForMatch(String(r.number ?? ''));
    return Boolean(n && digits && n === digits);
  });
}

/** Resposta de contact-meta: zera nome/foto se não bater com o chat ativo (evita “vazar” dados entre conversas). */
export function sanitizeWhatsappContactMetaForChat<
  T extends {
    contact?: WhatsappContactLike | null;
    group?: WhatsappGroupLike | null;
    profilePictureUrl?: string | null;
    nomeAgendaS3e?: string | null;
  }
>(chatId: string, meta: T | null | undefined): T | null | undefined {
  if (!meta || !String(chatId ?? '').trim()) return meta;
  const canon = canonicalWhatsappChatId(chatId);
  if (isWhatsappGroupChatId(chatId)) {
    const g = meta.group;
    if (g && !findWhatsappGroupInRows([g], canon)) {
      return { ...meta, group: null, profilePictureUrl: null };
    }
    return meta;
  }
  const c = meta.contact;
  if (c && !findWhatsappContactInRows([c], canon)) {
    return { ...meta, contact: null, profilePictureUrl: null };
  }
  return meta;
}

export function whatsappContactDisplayName(c: WhatsappContactLike | null | undefined): string {
  if (!c) return '';
  const t = (c.name || c.pushname || c.shortName || '').trim();
  return t;
}

/**
 * Cabeçalho do chat: define o nome e a linha secundária mostrados ao
 * lado da foto. **Política**: nunca exibir o JID (`@c.us`/`@lid`/etc.)
 * na UI; sempre preferir nome de agenda → nomes cacheados → telefone
 * formatado vindo de fontes confiáveis (S3E, provider contact). Quando
 * absolutamente nada está disponível, mostra "WhatsApp" como
 * placeholder neutro em vez do ID bruto.
 */
export function displayNameForChatHeader(params: {
  chatId: string;
  crmName?: string | null;
  /** Nome importado / agenda S3E (`contatos_s3e`), prioridade sobre cache do provedor. */
  agendaS3eName?: string | null;
  /** Nome do WhatsApp cacheado (pushname/notify/verifiedName). */
  cachedProviderName?: string | null;
  providerContactName?: string;
  /** Contato do provedor (meta / agenda): `number` ou JID real quando o chat é `@lid`. */
  providerContact?: WhatsappContactLike | null;
  /**
   * Telefone real do contato (`contatos_s3e.numero` ou
   * `whatsapp_chat_identities.phone_digits`). Usado quando o chatId é
   * `@lid` para evitar mostrar o ID interno do WhatsApp.
   */
  s3ePhoneDigits?: string | null;
  /** Assunto/nome do grupo (GET /api/.../groups). */
  groupName?: string;
  fallbackTitle?: string;
}): { primary: string; secondary: string } {
  if (isWhatsappGroupChatId(params.chatId)) {
    const crm = params.crmName?.trim();
    const grp = params.groupName?.trim();
    const fb = params.fallbackTitle?.trim();
    const sid = shortGroupIdLabel(params.chatId);
    const primary = crm || grp || fb || sid || 'Grupo';
    const secondary = `Grupo · ${sid}`;
    return { primary, secondary };
  }

  const phoneFromChat = formatPhoneForDisplay(params.chatId);
  const phoneFromContact = formatPhoneForProviderContact(params.providerContact ?? null);
  const phoneFromS3e = params.s3ePhoneDigits?.trim()
    ? formatPhoneForDisplay(`${onlyDigits(params.s3ePhoneDigits)}@c.us`)
    : '';
  const isLid = params.chatId.trim().toLowerCase().endsWith('@lid');
  // Telefone "exibível" = S3E (mais confiável) → contato do provider → chatId (só se NÃO for @lid)
  const phoneDisplay = phoneFromS3e || phoneFromContact || (isLid ? '' : phoneFromChat) || '';

  const agenda = params.agendaS3eName?.trim();
  const cached = params.cachedProviderName?.trim();
  const crm = params.crmName?.trim();
  const pn = params.providerContactName?.trim();
  const fb = params.fallbackTitle?.trim();
  const titleDigits = fb ? onlyDigits(fb) : '';
  const chatDigits = waJidToDigits(params.chatId);
  const fbIsJustNumber = Boolean(fb && titleDigits && titleDigits === chatDigits);
  // Em LID, `chatDigits` é o ID interno (não telefone). Não dá pra detectar
  // mismatch comparando com `titleDigits`, então só roda a checagem para PN.
  const fbMismatchNumber =
    !isLid &&
    Boolean(titleDigits) &&
    titleDigits.length >= 8 &&
    chatDigits.length >= 8 &&
    titleDigits !== chatDigits;
  // Prioridade nome: agenda S3E → cache WhatsApp → contato ao vivo → CRM → título fallback → telefone formatado → "WhatsApp"
  const primary =
    agenda ||
    cached ||
    pn ||
    crm ||
    (fb && !fbIsJustNumber && !fbMismatchNumber ? fb : '') ||
    phoneDisplay ||
    'WhatsApp';

  let secondary: string;
  if (primary === phoneDisplay) {
    // O título já é o próprio telefone — segunda linha vira só "WhatsApp".
    secondary = 'WhatsApp';
  } else if (phoneDisplay) {
    secondary = phoneDisplay;
  } else if (isLid) {
    secondary = 'WhatsApp';
  } else {
    secondary = 'WhatsApp';
  }
  return { primary, secondary };
}

/** Remove o prefixo *Nome* das mensagens enviadas pelo CRM (campo de edição). */
export function stripOutboundPrefixForEdit(content: string): string {
  const m = content.match(/^\*[^*]+\*\s*\n\n([\s\S]*)$/);
  return m ? m[1].trim() : content.trim();
}

/** Primeiro nome para lista de conversas (CRM / nome completo). */
export function firstNameOnly(fullName: string): string {
  const t = fullName.trim();
  if (!t) return '';
  return t.split(/\s+/)[0] ?? t;
}

/** Lista de conversas: título (nome) + opcional linha com número, estilo WhatsApp.
 *
 * **Política de exibição**: nunca expor o JID `@lid` nem o ID interno do
 * WhatsApp na lista. Quando não houver nome, o título vira o telefone real
 * (vindo da agenda S3E via `phoneNumberFromS3e` no preview) e, em último
 * caso, um placeholder neutro "WhatsApp" — nunca o número longo do LID.
 */
export function resolveChatPreviewLabels(
  c: {
    chatId: string;
    contactName?: string | null;
    providerCachedName?: string | null;
    /** Nome da agenda S3E injetado pelo backend (`enrichPreviewsWithProviderCache`). */
    agendaS3eName?: string | null;
    /** Telefone real (`contatos_s3e.numero` ou `whatsapp_chat_identities.phone_digits`). */
    phoneNumberFromS3e?: string | null;
  },
  providerContact: WhatsappContactLike | undefined,
  providerGroup: WhatsappGroupLike | undefined
): { listTitle: string; phone: string; showPhoneSub: boolean; avatarLabel: string; headerForChat: string } {
  const isLid = c.chatId.toLowerCase().endsWith('@lid');
  const phoneFromS3e = c.phoneNumberFromS3e?.trim()
    ? formatPhoneForDisplay(`${onlyDigits(c.phoneNumberFromS3e)}@c.us`)
    : '';
  const phoneFromChat = formatPhoneForDisplay(c.chatId);
  // Telefone exibível: nunca vaza o LID — quando o chat é `@lid` e não
  // temos S3E, deixamos vazio (UI cai em "WhatsApp"). Para PN, mostra o
  // telefone normalmente.
  const phone = phoneFromS3e || (isLid ? '' : phoneFromChat);

  const isG = isWhatsappGroupChatId(c.chatId);
  const wn = whatsappContactDisplayName(providerContact);
  const gname = whatsappGroupDisplayName(providerGroup);
  const agenda = (c.agendaS3eName || '').trim();
  const cached = (c.providerCachedName || '').trim();
  // Prioridade lista: agenda S3E → cache WhatsApp → CRM (cliente/lead) → provider ao vivo.
  // Mostramos o NOME COMPLETO (o `truncate` do CSS corta visualmente se passar
  // da largura) — alinha o CRM com o WhatsApp oficial, onde a sidebar exibe
  // "Análise e Desenvolvimento de Sistemas 2024/01" e não apenas "Análise".
  const crmName = (c.contactName || '').trim();
  const namePart = agenda || cached || crmName || (isG ? gname : wn) || '';
  const listTitle = namePart || phone || (isLid ? 'WhatsApp' : phoneFromChat || 'WhatsApp');
  const showPhoneSub = false;
  const avatarLabel = agenda || cached || crmName || (isG ? gname : wn) || phone || 'WA';
  return { listTitle, phone, showPhoneSub, avatarLabel, headerForChat: listTitle };
}

/** Visual dos ticks em mensagens enviadas (ack do provedor: 0–1 um tique, 2 entregue, 3+ lida). */
export type OutboundAckVisual = 'single' | 'double_grey' | 'double_blue';

export function outboundAckVisual(ack: number | null | undefined): OutboundAckVisual {
  const a = ack ?? 0;
  if (a >= 3) return 'double_blue';
  if (a >= 2) return 'double_grey';
  return 'single';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chat date helpers (timezone fix: America/Sao_Paulo)
// ─────────────────────────────────────────────────────────────────────────────

const CHAT_TZ = 'America/Sao_Paulo' as const;

function chatDateParts(date: Date): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat('pt-BR', {
    timeZone: CHAT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  return {
    y: Number.isFinite(y) ? y : date.getUTCFullYear(),
    m: Number.isFinite(m) ? m : date.getUTCMonth() + 1,
    d: Number.isFinite(d) ? d : date.getUTCDate(),
  };
}

function chatDayKey(date: Date): string {
  const p = chatDateParts(date);
  const mm = String(p.m).padStart(2, '0');
  const dd = String(p.d).padStart(2, '0');
  return `${p.y}-${mm}-${dd}`;
}

function chatDaysDiff(a: Date, b: Date): number {
  // Compara por “meia-noite local” do timezone de SP para evitar confusão UTC/Docker.
  const pa = chatDateParts(a);
  const pb = chatDateParts(b);
  const ta = Date.UTC(pa.y, pa.m - 1, pa.d);
  const tb = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((ta - tb) / 86_400_000);
}

export function isSameChatDay(a: string | Date, b: string | Date): boolean {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime())) return false;
  return chatDayKey(da) === chatDayKey(db);
}

export function formatChatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (!Number.isFinite(date.getTime())) return '';

  const now = new Date();
  const diff = chatDaysDiff(now, date); // 0 = hoje, 1 = ontem

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';

  if (diff > 1 && diff < 7) {
    const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: CHAT_TZ, weekday: 'long' }).format(date);
    return weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : '';
  }

  const p = chatDateParts(date);
  const dd = String(p.d).padStart(2, '0');
  const mm = String(p.m).padStart(2, '0');
  return `${dd}/${mm}/${p.y}`;
}
