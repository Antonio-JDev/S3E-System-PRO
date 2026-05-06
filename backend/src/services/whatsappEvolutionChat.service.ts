/**
 * Chamadas ao Chat Controller (e utilitários de grupo) da Evolution API v2.
 * @see https://doc.evolution-api.com/v2/api-reference/chat-controller
 */
import { canonicalWhatsappChatId, waJidToDigits } from '../utils/whatsappChat.util';
import type { WhatsappProviderContactRow, WhatsappProviderGroupRow } from './whatsappProvider.service';

const baseUrl = (): string =>
  (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(/\/$/, '');
const instanceName = (): string => process.env.WHATSAPP_PROVIDER_SESSION || 'default';
const apiKey = (): string => process.env.WHATSAPP_PROVIDER_API_KEY || '';

function jsonHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  const k = apiKey();
  if (k) h.apikey = k;
  return h;
}

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const k = apiKey();
  if (k) h.apikey = k;
  return h;
}

async function ensureInstance(): Promise<void> {
  const { initWhatsappProviderInstance } = await import('./whatsappProvider.service');
  await initWhatsappProviderInstance();
}

async function evPost(path: string, body?: unknown): Promise<Response> {
  await ensureInstance();
  return fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: body !== undefined ? JSON.stringify(body) : '{}'
  });
}

async function evDeleteWithBody(path: string, body: unknown): Promise<Response> {
  await ensureInstance();
  return fetch(`${baseUrl()}${path}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
    body: JSON.stringify(body)
  });
}

async function evGet(path: string): Promise<Response> {
  await ensureInstance();
  return fetch(`${baseUrl()}${path}`, { headers: getHeaders() });
}

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const inner = o.data ?? o.contacts ?? o.chats ?? o.groups ?? o.messages ?? o.records;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

function unwrapObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>;
  }
  return o;
}

export function mapEvolutionContactRow(raw: unknown): WhatsappProviderContactRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  // IMPORTANTE (Evolution): `id` pode ser um identificador interno (ex.: cmoa...8012980),
  // e NÃO o JID do WhatsApp. Para abrir chat/enviar mensagem, precisamos do JID real.
  // Então priorizamos `remoteJid`/`jid` e deixamos `id` como fallback.
  const remoteJid = typeof o.remoteJid === 'string' ? o.remoteJid.trim() : '';
  const jid = typeof o.jid === 'string' ? o.jid.trim() : '';
  const internalId = typeof o.id === 'string' ? o.id.trim() : '';
  const id = remoteJid || jid || internalId;
  if (!id) return null;
  const pushname = (typeof o.pushName === 'string' && o.pushName) || (typeof o.pushname === 'string' && o.pushname);
  const name =
    (typeof o.name === 'string' && o.name) ||
    (typeof o.notify === 'string' && o.notify) ||
    (typeof o.verifiedName === 'string' && o.verifiedName);
  const numberFromPayload = typeof o.number === 'string' ? o.number.trim() : '';
  const resolvedDigits =
    numberFromPayload ||
    waJidToDigits(remoteJid || jid || id);
  return {
    id: canonicalWhatsappChatId(id),
    number: resolvedDigits,
    name: name || undefined,
    pushname: pushname || undefined,
    shortName: undefined,
    isMe: o.isMe === true,
    isGroup: id.includes('@g.us'),
    isWAContact: o.isWAContact !== false,
    isMyContact: o.isMyContact === true,
    isBlocked: o.isBlocked === true
  };
}

export function mapEvolutionGroupRow(raw: unknown): WhatsappProviderGroupRow | null {
  const o = unwrapObject(raw);
  if (!o) return null;
  const idRaw =
    (typeof o.id === 'string' && o.id.trim()) ||
    (typeof o.jid === 'string' && o.jid.trim()) ||
    (typeof o.groupJid === 'string' && o.groupJid.trim()) ||
    (typeof o.remoteJid === 'string' && o.remoteJid.trim()) ||
    '';
  if (!idRaw) return null;
  const id = idRaw.includes('@g.us') ? idRaw : `${idRaw.replace(/\D/g, '')}@g.us`;
  if (!id.includes('@g.us')) return null;
  const gm =
    o.groupMetadata && typeof o.groupMetadata === 'object'
      ? (o.groupMetadata as Record<string, unknown>)
      : null;
  const gmSub = typeof gm?.subject === 'string' ? gm.subject.trim() : '';
  const subject =
    (typeof o.subject === 'string' && o.subject.trim()) ||
    (typeof o.name === 'string' && o.name.trim()) ||
    (typeof o.title === 'string' && o.title.trim()) ||
    gmSub ||
    undefined;
  return {
    id,
    subject,
    name: subject,
    groupMetadata: subject ? { subject } : undefined
  };
}

/** POST /chat/whatsappNumbers/{instance} */
export async function evolutionWhatsappNumbers(numbers: string[]): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/whatsappNumbers/${inst}`, { numbers });
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution whatsappNumbers: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/findContacts/{instance} */
export async function evolutionFindContacts(where: Record<string, unknown>): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/findContacts/${inst}`, { where });
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution findContacts: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/findChats/{instance} */
export async function evolutionFindChats(body: Record<string, unknown> = {}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/findChats/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution findChats: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/findMessages/{instance} */
export async function evolutionFindMessages(body: Record<string, unknown>): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/findMessages/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution findMessages: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/findStatusMessage/{instance} */
export async function evolutionFindStatusMessage(body: Record<string, unknown>): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/findStatusMessage/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution findStatusMessage: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/markMessageAsRead/{instance} */
export async function evolutionMarkMessageAsRead(readMessages: unknown[]): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/markMessageAsRead/${inst}`, { readMessages });
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution markMessageAsRead: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/markChatUnread/{instance} */
export async function evolutionMarkChatUnread(body: {
  lastMessage: Array<Record<string, unknown>>;
  chat: string;
}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/markChatUnread/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution markChatUnread: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/archiveChat/{instance} */
export async function evolutionArchiveChat(body: {
  lastMessage: { key: { remoteJid: string; fromMe: boolean; id: string } };
  archive: boolean;
  chat: string;
}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/archiveChat/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution archiveChat: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** DELETE /chat/deleteMessageForEveryone/{instance} */
export async function evolutionDeleteMessageForEveryone(body: {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  participant?: string;
}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const payload: Record<string, unknown> = {
    id: body.id,
    remoteJid: body.remoteJid,
    fromMe: body.fromMe
  };
  if (body.participant && body.participant.length > 0) {
    payload.participant = body.participant;
  }
  const res = await evDeleteWithBody(`/chat/deleteMessageForEveryone/${inst}`, payload);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution deleteMessageForEveryone: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/updateMessage/{instance} */
export async function evolutionUpdateMessage(body: {
  /** Telefone com DDI (somente dígitos) */
  number: number;
  text: string;
  key: { remoteJid: string; fromMe: boolean; id: string };
}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/updateMessage/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution updateMessage: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/sendPresence/{instance} */
export async function evolutionSendPresence(body: {
  number: string;
  options: { delay: number; presence: 'composing' | 'recording'; number: string };
}): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/sendPresence/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution sendPresence: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /message/updateBlockStatus/{instance} (documentação Evolution: Chat Controller) */
export async function evolutionUpdateBlockStatus(body: { number: string; status: 'block' | 'unblock' }): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/message/updateBlockStatus/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution updateBlockStatus: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** POST /chat/fetchProfilePictureUrl/{instance} */
export async function evolutionFetchProfilePictureUrl(numberJid: string): Promise<{ profilePictureUrl?: string | null }> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/fetchProfilePictureUrl/${inst}`, { number: numberJid.trim() });
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution fetchProfilePictureUrl: HTTP ${res.status} ${t}`);
  const data = JSON.parse(t) as Record<string, unknown>;
  const u = data.profilePictureUrl ?? data.profilePictureURL;
  return { profilePictureUrl: typeof u === 'string' ? u : null };
}

/** POST /chat/getBase64FromMediaMessage/{instance} */
export async function evolutionGetBase64FromMediaMessage(body: Record<string, unknown>): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/getBase64FromMediaMessage/${inst}`, body);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution getBase64FromMediaMessage: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** GET /group/fetchAllGroups/{instance} */
export async function evolutionFetchAllGroups(getParticipants = false): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evGet(`/group/fetchAllGroups/${inst}?getParticipants=${getParticipants ? 'true' : 'false'}`);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution fetchAllGroups: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** GET /group/findGroupInfos/{instance} */
export async function evolutionFindGroupByJid(groupJid: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const q = encodeURIComponent(groupJid.trim());
  const res = await evGet(`/group/findGroupInfos/${inst}?groupJid=${q}`);
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution findGroupInfos: HTTP ${res.status} ${t}`);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

/** DELETE /instance/logout/{instance} */
export async function evolutionLogoutInstance(): Promise<void> {
  const inst = encodeURIComponent(instanceName());
  const res = await fetch(`${baseUrl()}/instance/logout/${inst}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Evolution logout: HTTP ${res.status} ${t || res.statusText}`);
  }
}

/** POST /instance/setPresence/{instance} */
export async function evolutionSetInstancePresence(
  presence: 'available' | 'unavailable'
): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/instance/setPresence/${inst}`, { presence });
  return parseEvolutionJson(res, 'instance/setPresence');
}

// ——— Integração com tipos do CRM (usado por whatsappProvider.service) ———

export async function evolutionCheckPhoneExists(
  phoneRaw: string
): Promise<{ numberExists: boolean; chatId: string | null }> {
  const digits = phoneRaw.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Informe o telefone com DDD (e DDI 55 se aplicável).');
  }
  const data = await evolutionWhatsappNumbers([digits]);
  const arr = unwrapArray(data);
  const first = arr[0] as Record<string, unknown> | undefined;
  if (!first) {
    return { numberExists: false, chatId: null };
  }
  const exists = first.exists === true;
  const jid =
    (typeof first.jid === 'string' && first.jid) ||
    (typeof first.remoteJid === 'string' && first.remoteJid) ||
    null;
  return {
    numberExists: exists,
    chatId: jid && jid.length > 0 ? jid : null
  };
}

export async function evolutionFetchContactsForCrm(params?: {
  limit?: number;
  offset?: number;
}): Promise<WhatsappProviderContactRow[]> {
  const raw = await evolutionFindContacts({ where: {} });
  const arr = unwrapArray(raw);
  const out: WhatsappProviderContactRow[] = [];
  for (const item of arr) {
    const row = mapEvolutionContactRow(item);
    if (row) out.push(row);
  }
  const offset = Math.max(0, params?.offset ?? 0);
  const limit = Math.min(Math.max(1, params?.limit ?? 500), 2000);
  return out.slice(offset, offset + limit);
}

export async function evolutionFetchContactById(contactId: string): Promise<WhatsappProviderContactRow | null> {
  const trimmed = contactId.trim();
  let raw = await evolutionFindContacts({ where: { id: trimmed } });
  let arr = unwrapArray(raw);
  if (arr.length === 0 && trimmed.includes('@')) {
    raw = await evolutionFindContacts({ where: { remoteJid: trimmed } });
    arr = unwrapArray(raw);
  }
  return mapEvolutionContactRow(arr[0]);
}

export async function evolutionProfilePictureForContact(contactId: string): Promise<string | null> {
  const jid = canonicalWhatsappChatId(contactId).trim();
  const r = await evolutionFetchProfilePictureUrl(jid);
  const u = r.profilePictureUrl;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

export async function evolutionFetchGroupsForCrm(): Promise<WhatsappProviderGroupRow[]> {
  const data = await evolutionFetchAllGroups(false);
  const arr = unwrapArray(data);
  const out: WhatsappProviderGroupRow[] = [];
  for (const item of arr) {
    const row = mapEvolutionGroupRow(item);
    if (row) out.push(row);
  }
  return out;
}

export async function evolutionFetchGroupById(groupId: string): Promise<WhatsappProviderGroupRow | null> {
  try {
    const raw = await evolutionFindGroupByJid(groupId.trim());
    return mapEvolutionGroupRow(raw);
  } catch {
    return null;
  }
}

export async function evolutionGroupPictureUrl(groupId: string): Promise<string | null> {
  const raw = await evolutionFindGroupByJid(groupId.trim());
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const u = o.pictureUrl ?? o.profilePictureUrl;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

export async function evolutionArchiveChatForCrm(
  chatId: string,
  archive: boolean,
  last?: { providerMessageId: string; fromMe: boolean } | null
): Promise<void> {
  const remoteJid = canonicalWhatsappChatId(chatId);
  const key = {
    remoteJid,
    fromMe: last?.fromMe ?? false,
    id: last?.providerMessageId?.trim() || '0'
  };
  await evolutionArchiveChat({
    lastMessage: { key },
    archive,
    chat: remoteJid
  });
}

export async function evolutionSubscribePresenceTyping(chatId: string): Promise<void> {
  const rawLower = (chatId || '').trim().toLowerCase();
  if (rawLower.endsWith('@lid')) {
    return;
  }
  const canonical = canonicalWhatsappChatId(chatId);
  const lower = canonical.toLowerCase();
  // Presença em chats 1:1 apenas; grupos/newsletter/lid podem falhar no sendPresence.
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter') || lower.endsWith('@lid')) {
    return;
  }
  const digits = waJidToDigits(canonical);
  const num = digits || chatId.replace(/\D/g, '');
  if (!num || num.length < 8) {
    return;
  }
  await evolutionSendPresence({
    number: num,
    options: {
      delay: 1200,
      presence: 'composing',
      number: num
    }
  });
}

export async function evolutionEditMessageForCrm(
  chatId: string,
  providerMessageId: string,
  text: string,
  fromMe = true
): Promise<void> {
  const remoteJid = canonicalWhatsappChatId(chatId);
  const digits = waJidToDigits(remoteJid);
  if (!digits || !/^\d+$/.test(digits)) {
    throw new Error('Não foi possível determinar o número do destinatário para edição da mensagem');
  }
  const numberAsInt = Number.parseInt(digits, 10);
  if (!Number.isFinite(numberAsInt)) {
    throw new Error('Número inválido para edição da mensagem');
  }
  await evolutionUpdateMessage({
    number: numberAsInt,
    text,
    key: { remoteJid, fromMe, id: providerMessageId.trim() }
  });
}

export async function evolutionDeleteMessageForEveryoneCrm(
  chatId: string,
  providerMessageId: string,
  fromMe: boolean
): Promise<void> {
  const remoteJid = canonicalWhatsappChatId(chatId);
  await evolutionDeleteMessageForEveryone({
    id: providerMessageId.trim(),
    remoteJid,
    fromMe
  });
}

/** GET /instance/fetchInstances — perfil / dono da sessão */
export async function evolutionFetchInstanceProfile(): Promise<Record<string, unknown> | null> {
  const n = encodeURIComponent(instanceName());
  const res = await evGet(`/instance/fetchInstances?instanceName=${n}`);
  const t = await res.text();
  if (!res.ok) return null;
  try {
    const data = JSON.parse(t) as Record<string, unknown>;
    const resp = data.response;
    if (Array.isArray(resp) && resp[0] && typeof resp[0] === 'object') {
      const row = resp[0] as Record<string, unknown>;
      const inst = row.instance && typeof row.instance === 'object' ? (row.instance as Record<string, unknown>) : row;
      return inst as Record<string, unknown>;
    }
    if (resp && typeof resp === 'object') return resp as Record<string, unknown>;
    return data;
  } catch {
    return null;
  }
}

function parseEvolutionJson(res: Response, label: string): Promise<unknown> {
  return res.text().then((t) => {
    if (!res.ok) throw new Error(`Evolution ${label}: HTTP ${res.status} ${t}`);
    try {
      return t ? (JSON.parse(t) as unknown) : null;
    } catch {
      return t;
    }
  });
}

/** POST /chat/fetchProfile/{instance} — perfil público de um número */
export async function evolutionFetchProfile(number: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/fetchProfile/${inst}`, { number: number.trim() });
  return parseEvolutionJson(res, 'fetchProfile');
}

/** POST /chat/fetchBusinessProfile/{instance} */
export async function evolutionFetchBusinessProfile(number: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/fetchBusinessProfile/${inst}`, { number: number.trim() });
  return parseEvolutionJson(res, 'fetchBusinessProfile');
}

/** POST /chat/updateProfileName/{instance} — nome da própria conta conectada */
export async function evolutionUpdateSessionProfileName(name: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/updateProfileName/${inst}`, { name: name.trim() });
  return parseEvolutionJson(res, 'updateProfileName');
}

/** POST /chat/updateProfileStatus/{instance} — recado (status) */
export async function evolutionUpdateSessionProfileStatus(status: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/updateProfileStatus/${inst}`, { status: status.trim() });
  return parseEvolutionJson(res, 'updateProfileStatus');
}

/**
 * POST /chat/updateProfilePicture/{instance}
 * `picture`: URL pública ou base64 (conforme versão da Evolution).
 */
export async function evolutionUpdateSessionProfilePicture(picture: string): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/updateProfilePicture/${inst}`, { picture: picture.trim() });
  return parseEvolutionJson(res, 'updateProfilePicture');
}

/** DELETE /chat/removeProfilePicture/{instance} */
export async function evolutionRemoveSessionProfilePicture(): Promise<unknown> {
  await ensureInstance();
  const inst = encodeURIComponent(instanceName());
  const res = await fetch(`${baseUrl()}/chat/removeProfilePicture/${inst}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return parseEvolutionJson(res, 'removeProfilePicture');
}

/** GET /chat/fetchPrivacySettings/{instance} */
export async function evolutionFetchPrivacySettings(): Promise<unknown> {
  await ensureInstance();
  const inst = encodeURIComponent(instanceName());
  const res = await fetch(`${baseUrl()}/chat/fetchPrivacySettings/${inst}`, { headers: getHeaders() });
  return parseEvolutionJson(res, 'fetchPrivacySettings');
}

/** Corpo conforme OpenAPI Evolution v2 — updatePrivacySettings */
export interface EvolutionPrivacySettingsBody {
  readreceipts: 'all' | 'none';
  profile: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  status: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  online: 'all' | 'match_last_seen';
  last: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  groupadd: 'all' | 'contacts' | 'contact_blacklist';
}

/** POST /chat/updatePrivacySettings/{instance} */
export async function evolutionUpdatePrivacySettings(body: EvolutionPrivacySettingsBody): Promise<unknown> {
  const inst = encodeURIComponent(instanceName());
  const res = await evPost(`/chat/updatePrivacySettings/${inst}`, body);
  return parseEvolutionJson(res, 'updatePrivacySettings');
}

// ═══════════════════════════════════════════════════════════════
//  Message Controller — POST /message/send*/{instance}
// ═══════════════════════════════════════════════════════════════

function inst(): string { return encodeURIComponent(instanceName()); }

/** POST /message/sendText/{instance} */
export async function evolutionSendText(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendText/${inst()}`, body);
  return parseEvolutionJson(res, 'sendText');
}

/** POST /message/sendStatus/{instance} (stories) */
export async function evolutionSendStatus(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendStatus/${inst()}`, body);
  return parseEvolutionJson(res, 'sendStatus');
}

/** POST /message/sendMedia/{instance} */
export async function evolutionSendMediaMsg(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendMedia/${inst()}`, body);
  return parseEvolutionJson(res, 'sendMedia');
}

/** POST /message/sendWhatsAppAudio/{instance} */
export async function evolutionSendWhatsAppAudio(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendWhatsAppAudio/${inst()}`, body);
  return parseEvolutionJson(res, 'sendWhatsAppAudio');
}

/** POST /message/sendSticker/{instance} */
export async function evolutionSendSticker(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendSticker/${inst()}`, body);
  return parseEvolutionJson(res, 'sendSticker');
}

/** POST /message/sendLocation/{instance} */
export async function evolutionSendLocation(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendLocation/${inst()}`, body);
  return parseEvolutionJson(res, 'sendLocation');
}

/** POST /message/sendContact/{instance} */
export async function evolutionSendContact(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendContact/${inst()}`, body);
  return parseEvolutionJson(res, 'sendContact');
}

/** POST /message/sendReaction/{instance} */
export async function evolutionSendReaction(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendReaction/${inst()}`, body);
  return parseEvolutionJson(res, 'sendReaction');
}

/** POST /message/sendPoll/{instance} */
export async function evolutionSendPoll(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendPoll/${inst()}`, body);
  return parseEvolutionJson(res, 'sendPoll');
}

/** POST /message/sendList/{instance} */
export async function evolutionSendList(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/message/sendList/${inst()}`, body);
  return parseEvolutionJson(res, 'sendList');
}

// ═══════════════════════════════════════════════════════════════
//  Group Controller — /group/*/{instance}
// ═══════════════════════════════════════════════════════════════

/** POST /group/create/{instance} — body: { subject, description?, participants[] } */
export async function evolutionGroupCreate(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/group/create/${inst()}`, body);
  return parseEvolutionJson(res, 'group/create');
}

/** PUT /group/updateGroupPicture/{instance}?groupJid= — body: { image } */
export async function evolutionGroupUpdatePicture(groupJid: string, image: string): Promise<unknown> {
  await ensureInstance();
  const q = encodeURIComponent(groupJid.trim());
  const res = await fetch(`${baseUrl()}/group/updateGroupPicture/${inst()}?groupJid=${q}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ image })
  });
  return parseEvolutionJson(res, 'group/updateGroupPicture');
}

/** POST /group/updateGroupSubject/{instance}?groupJid= — body: { subject } */
export async function evolutionGroupUpdateSubject(groupJid: string, subject: string): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/updateGroupSubject/${inst()}?groupJid=${q}`, { subject });
  return parseEvolutionJson(res, 'group/updateGroupSubject');
}

/** POST /group/updateGroupDescription/{instance}?groupJid= — body: { description } */
export async function evolutionGroupUpdateDescription(groupJid: string, description: string): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/updateGroupDescription/${inst()}?groupJid=${q}`, { description });
  return parseEvolutionJson(res, 'group/updateGroupDescription');
}

/** GET /group/inviteCode/{instance}?groupJid= */
export async function evolutionGroupFetchInviteCode(groupJid: string): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evGet(`/group/inviteCode/${inst()}?groupJid=${q}`);
  return parseEvolutionJson(res, 'group/inviteCode');
}

/** POST /group/revokeInviteCode/{instance}?groupJid= */
export async function evolutionGroupRevokeInviteCode(groupJid: string): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/revokeInviteCode/${inst()}?groupJid=${q}`);
  return parseEvolutionJson(res, 'group/revokeInviteCode');
}

/** POST /group/sendInvite/{instance} — body: { groupJid, description, numbers[] } */
export async function evolutionGroupSendInvite(body: Record<string, unknown>): Promise<unknown> {
  const res = await evPost(`/group/sendInvite/${inst()}`, body);
  return parseEvolutionJson(res, 'group/sendInvite');
}

/** GET /group/inviteInfo/{instance}?inviteCode= */
export async function evolutionGroupFindByInviteCode(inviteCode: string): Promise<unknown> {
  const q = encodeURIComponent(inviteCode.trim());
  const res = await evGet(`/group/inviteInfo/${inst()}?inviteCode=${q}`);
  return parseEvolutionJson(res, 'group/inviteInfo');
}

/* evolutionFindGroupByJid e evolutionFetchAllGroups já exportados acima */

/** GET /group/participants/{instance}?groupJid= */
export async function evolutionGroupFindMembers(groupJid: string): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evGet(`/group/participants/${inst()}?groupJid=${q}`);
  return parseEvolutionJson(res, 'group/participants');
}

/** POST /group/updateParticipant/{instance}?groupJid= — body: { action, participants[] } */
export async function evolutionGroupUpdateMembers(
  groupJid: string,
  body: { action: 'add' | 'remove' | 'promote' | 'demote'; participants: string[] }
): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/updateParticipant/${inst()}?groupJid=${q}`, body);
  return parseEvolutionJson(res, 'group/updateParticipant');
}

/** POST /group/updateSetting/{instance}?groupJid= — body: { action } */
export async function evolutionGroupUpdateSetting(
  groupJid: string,
  action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/updateSetting/${inst()}?groupJid=${q}`, { action });
  return parseEvolutionJson(res, 'group/updateSetting');
}

/** POST /group/toggleEphemeral/{instance}?groupJid= — body: { expiration } (segundos) */
export async function evolutionGroupToggleEphemeral(groupJid: string, expiration: number): Promise<unknown> {
  const q = encodeURIComponent(groupJid.trim());
  const res = await evPost(`/group/toggleEphemeral/${inst()}?groupJid=${q}`, { expiration });
  return parseEvolutionJson(res, 'group/toggleEphemeral');
}

/** DELETE /group/leaveGroup/{instance}?groupJid= */
export async function evolutionGroupLeave(groupJid: string): Promise<unknown> {
  await ensureInstance();
  const q = encodeURIComponent(groupJid.trim());
  const res = await fetch(`${baseUrl()}/group/leaveGroup/${inst()}?groupJid=${q}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return parseEvolutionJson(res, 'group/leaveGroup');
}
