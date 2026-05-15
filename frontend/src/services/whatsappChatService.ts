import { toast } from 'sonner';
import { getBackendUrl } from '../config/api';
import type { ApiResponse } from './axiosApi';
import { axiosApiService } from './axiosApi';

const BASE = '/api/whatsapp';

/**
 * Proxy autenticado do Chat Controller da Evolution API v2 (mesmos paths/campos do Postman).
 * Requer `WHATSAPP_PROVIDER_KIND=evolution` no backend; caso contrário a API retorna 400.
 * @see https://doc.evolution-api.com/v2/api-reference/chat-controller
 */
export const WHATSAPP_EVOLUTION_CHAT_BASE = `${BASE}/evolution/chat` as const;

/** Proxy Evolution — Profile settings (doc v2 /chat/updateProfile* …) */
export const WHATSAPP_EVOLUTION_PROFILE_BASE = `${BASE}/evolution/profile` as const;

/** Chave de mensagem (Baileys / Evolution) — usada em vários bodies. */
export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

/** POST …/mark-messages-read — array de chaves ou objetos com `key` conforme a versão da Evolution. */
export type EvolutionReadMessageEntry = EvolutionMessageKey | { key: EvolutionMessageKey };

/** POST …/mark-chat-unread */
export interface EvolutionMarkChatUnreadBody {
  /** remoteJid do chat */
  chat: string;
  /** Última mensagem (algumas builds aceitam objeto; outras aceitam array). */
  lastMessage: Record<string, unknown> | Array<Record<string, unknown>>;
}

/** POST …/archive — espelha `archiveChat` da Evolution v2. */
export interface EvolutionArchiveChatBody {
  chat: string;
  archive: boolean;
  lastMessage: { key: EvolutionMessageKey };
}

/** DELETE …/delete-for-everyone */
export interface EvolutionDeleteForEveryoneBody {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  participant?: string;
}

/** POST …/update-message */
export interface EvolutionUpdateMessageBody {
  number: number;
  text: string;
  key: EvolutionMessageKey;
}

/** POST …/send-presence */
export interface EvolutionSendPresenceBody {
  number: string;
  options: { delay: number; presence: 'composing' | 'recording'; number: string };
}

/** POST …/block-status */
export interface EvolutionBlockStatusBody {
  number: string;
  status: 'block' | 'unblock';
}

/** POST …/profile-picture — `number` é o JID (ex.: 5511999999999@s.whatsapp.net). */
export interface EvolutionFetchProfilePictureBody {
  number: string;
}

/** POST …/evolution/profile/privacy — mesmo contrato OpenAPI Evolution v2. */
export interface EvolutionPrivacySettingsBody {
  readreceipts: 'all' | 'none';
  profile: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  status: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  online: 'all' | 'match_last_seen';
  last: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  groupadd: 'all' | 'contacts' | 'contact_blacklist';
}

export interface WhatsappChatPreview {
  chatId: string;
  lastContent: string;
  lastAt: string;
  lastFromMe: boolean;
  /** Ack do provedor na última mensagem sua (lista). */
  lastAck?: number | null;
  /** Mensagens do cliente não lidas por este usuário (persistido no backend). */
  unreadCount: number;
  /** Conversa fixada no topo (persistida no backend por usuário). */
  pinned?: boolean;
  /** Conversa favoritada (persistida no backend por usuário). */
  favorite?: boolean;
  /** Nome no CRM (lead ou cliente), quando houver cadastro com o mesmo número. */
  contactName?: string | null;
  /** Nome WhatsApp (pushname / agenda) persistido no servidor após abrir a conversa. */
  providerCachedName?: string | null;
  /** Nome da agenda S3E (`contatos_s3e.nome_agenda`) — fonte de máxima prioridade. */
  agendaS3eName?: string | null;
  /**
   * Telefone real do contato vindo da agenda S3E / mapa de identidades.
   * Crítico para conversas em `@lid` (cujo JID não carrega o telefone) —
   * sem este campo o frontend fica sem saber qual número exibir.
   */
  phoneNumberFromS3e?: string | null;
  /** Foto de perfil (última URL obtida no provedor), persistida no servidor. */
  cachedProfilePictureUrl?: string | null;
}

export interface WhatsappConnectionStatus {
  connected: boolean;
  reachable: boolean;
  sessionStatus: string | null;
  dashboardUrl: string;
}

export interface WhatsappConnectionQr {
  base64: string | null;
  code: string | null;
  pairingCode: string | null;
  count: number | null;
  message: string | null;
  statusCode: number | null;
}

/** Contato retornado pelo provedor (GET /api/contacts/all). */
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

/** Query de paginação + ordenação para a agenda de contatos. */
export interface FetchWhatsappProviderContactsQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'name';
  sortOrder?: 'asc' | 'desc';
  /** Ignora cache de 90s no backend e busca direto no provedor. */
  refresh?: boolean;
}

/** Grupo retornado por GET /api/{session}/groups. */
export interface WhatsappProviderGroupRow {
  id: string;
  subject?: string;
  name?: string;
  title?: string;
  groupMetadata?: { subject?: string };
}

export interface WhatsappMessageDto {
  id: string;
  chatId: string;
  content: string;
  fromMe: boolean;
  timestamp: string;
  clienteId?: string | null;
  contatoLeadId?: string | null;
  /** Presente quando o provedor informou o id (edição/exclusão no app). */
  providerMessageId?: string | null;
  /** Em grupos: JID do participante que enviou a mensagem (ex.: ...@s.whatsapp.net). */
  participant?: string | null;
  /** 0–1 enviado, 2 entregue no aparelho, 3+ lida */
  ack?: number | null;
  hasMedia?: boolean;
  mediaUrl?: string | null;
  /** image | video | audio | document */
  mediaType?: string | null;
  mediaMimetype?: string | null;
  mediaFilename?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  providerMediaId?: string | null;
  /**
   * Emoji da reação ativa nesta mensagem (ex.: '👍', '❤️'). `null`/ausente
   * quando não há reação. Atualizado em tempo real pelo socket
   * `whatsapp:message:reaction`.
   */
  reaction?: string | null;
}

export function fetchWhatsappChats() {
  return axiosApiService.get<WhatsappChatPreview[]>(`${BASE}/chats`);
}

export function fetchWhatsappArchivedChats() {
  return axiosApiService.get<WhatsappChatPreview[]>(`${BASE}/chats/archived`);
}

export function postWhatsappUnarchive(chatId: string) {
  return axiosApiService.post<void>(`${BASE}/conversations/unarchive`, { chatId });
}

export function postWhatsappMarkAllRead() {
  return axiosApiService.post<void>(`${BASE}/mark-all-read`, {});
}

export function fetchWhatsappUnreadCount() {
  return axiosApiService.get<{ total: number }>(`${BASE}/unread-count`);
}

export interface WhatsappSessionProfilePayload {
  sessionProfile: Record<string, unknown> | null;
  profilePictureUrl: string | null;
  whatsappId: string | null;
}

export function fetchWhatsappSessionProfile() {
  return axiosApiService.get<WhatsappSessionProfilePayload>(`${BASE}/session-profile`);
}

export function fetchWhatsappConnectionStatus() {
  return axiosApiService.get<WhatsappConnectionStatus>(`${BASE}/connection-status`);
}

export function fetchWhatsappConnectionQr() {
  return axiosApiService.get<WhatsappConnectionQr>(`${BASE}/connection-qr`);
}

/** Encerra a sessão no provedor (POST /api/sessions/.../logout). É preciso escanear o QR de novo. */
export function postWhatsappProviderLogout() {
  return axiosApiService.post<void>(`${BASE}/logout-session`, {});
}

export function fetchWhatsappProviderContacts(
  params?: FetchWhatsappProviderContactsQuery,
  requestConfig?: { timeout?: number }
) {
  const q: Record<string, string | number> = {};
  if (params?.limit != null) q.limit = params.limit;
  if (params?.offset != null) q.offset = params.offset;
  if (params?.sortBy) q.sortBy = params.sortBy;
  if (params?.sortOrder) q.sortOrder = params.sortOrder;
  if (params?.refresh) q.refresh = '1';
  return axiosApiService.get<WhatsappProviderContactRow[]>(
    `${BASE}/provider-contacts`,
    Object.keys(q).length ? q : undefined,
    requestConfig
  );
}

/** Busca contatos salvos na agenda do WhatsApp (nome, pushname, número, JID). Parâmetro `query` ou `q`. */
export function fetchWhatsappProviderContactsSearch(search: string) {
  const q = (search || '').trim();
  return axiosApiService.get<WhatsappProviderContactRow[]>(
    `${BASE}/provider-contacts/search`,
    { query: q },
    { timeout: 120_000 }
  );
}

/** GET /api/contacts/check-exists — número cadastrado no WhatsApp e JID canônico (recomendado no BR antes de novo chat). */
export function checkWhatsappProviderPhoneExists(phone: string) {
  return axiosApiService.get<{ numberExists: boolean; chatId: string | null }>(`${BASE}/contacts/check-exists`, {
    phone,
  });
}

export function fetchWhatsappProviderGroups(params?: { refresh?: boolean }) {
  const q: Record<string, string> = {};
  if (params?.refresh) q.refresh = '1';
  return axiosApiService.get<WhatsappProviderGroupRow[]>(
    `${BASE}/provider-groups`,
    Object.keys(q).length ? q : undefined,
    { timeout: 60_000 }
  );
}

export function fetchWhatsappProviderProfilePicture(chatId: string) {
  return axiosApiService.get<{ url: string | null }>(`${BASE}/profile-picture`, { chatId });
}

export function fetchWhatsappProviderContactMeta(chatId: string) {
  return axiosApiService.get<{
    contact: WhatsappProviderContactRow | null;
    group?: WhatsappProviderGroupRow | null;
    profilePictureUrl: string | null;
    /** Nome da agenda S3E (`contatos_s3e.nome_agenda`), prioridade sobre pushname do provedor. */
    nomeAgendaS3e?: string | null;
    /**
     * Telefone real do contato salvo (`contatos_s3e.numero` ou
     * `whatsapp_chat_identities.phone_digits`). Backend usa esse valor para
     * exibir o número correto quando o `chatId` é um `@lid`.
     */
    numeroContatoS3e?: string | null;
  }>(`${BASE}/contact-meta`, { chatId });
}

/**
 * Resolve nomes dos participantes de um grupo via cache local do backend
 * (sem hit no provider). Alimentado organicamente pelo webhook a cada
 * nova mensagem do grupo. Idempotente e barato.
 */
export interface WhatsappGroupParticipantCacheRow {
  jid: string;
  canonicalJid: string;
  digits: string;
  displayName: string | null;
}
export function fetchWhatsappGroupParticipantCache(chatId: string) {
  return axiosApiService.get<WhatsappGroupParticipantCacheRow[]>(`${BASE}/group-participants-cache`, {
    chatId
  });
}

/** Atualiza o cache (nome/foto) persistido no backend para a lista do CRM. */
export function postWhatsappUpsertContactCache(params: {
  chatId: string;
  displayName: string | null;
  profilePictureUrl: string | null;
}) {
  return axiosApiService.post<void>(`${BASE}/contact-cache`, params);
}

/**
 * Apaga todas as linhas de `whatsapp_contact_cache` (nomes/fotos persistidos do WhatsApp).
 * Por padrão **não** regrava o CRM na mesma tabela — isso evita o nome “errado” voltar na hora.
 * Use `rebuildFromCrm: true` só se quiser popular o cache de novo a partir de Cliente/Lead.
 */
export function deleteWhatsappContactCacheAll(opts?: { rebuildFromCrm?: boolean }) {
  const params = opts?.rebuildFromCrm ? { rebuild: '1' } : undefined;
  return axiosApiService.delete<{ deleted: number; rebuilt: number }>(`${BASE}/contact-cache`, { params });
}

/** Resolve JID ativo (LID vs número) para abrir conversa a partir do telefone (Funil). */
export function fetchWhatsappResolveOpenChat(phone: string) {
  return axiosApiService.get<{ chatId: string; numberExists: boolean; titleHint: string | null }>(
    `${BASE}/chats/resolve-open`,
    { phone }
  );
}

/** JID/número a passar nas rotas Evolution fetch-profile (evita @lid inválido). */
export function fetchWhatsappProfileFetchTarget(chatId: string) {
  return axiosApiService.get<{ target: string; resolvedChatId: string }>(`${BASE}/profile-fetch-target`, {
    chatId
  });
}

export function fetchWhatsappMessages(chatId: string) {
  return axiosApiService.get<WhatsappMessageDto[]>(`${BASE}/messages`, { chatId });
}

export function sendWhatsappMessage(chatId: string, text: string) {
  return axiosApiService.post<WhatsappMessageDto>(`${BASE}/send`, { chatId, text });
}

export type WhatsappProviderMediaType = 'image' | 'voice' | 'video' | 'file';

export interface SendMediaPayload {
  chatId: string;
  mediaType: WhatsappProviderMediaType;
  base64Data: string;
  mimetype: string;
  filename?: string;
  caption?: string;
}

export function sendWhatsappMedia(payload: SendMediaPayload) {
  return axiosApiService.post<WhatsappMessageDto>(`${BASE}/send-media`, payload);
}

/** Multipart (até ~50 MB) — preferível a base64 para PDFs/vídeos grandes. */
export async function postWhatsappSendFile(params: {
  chatId: string;
  file: File;
  caption?: string;
}): Promise<{ success: boolean; data?: WhatsappMessageDto; error?: string }> {
  const backend = getBackendUrl();
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const fd = new FormData();
  fd.append('chatId', params.chatId);
  fd.append('file', params.file);
  if (params.caption?.trim()) fd.append('caption', params.caption.trim());
  const headers: Record<string, string> = {};
  if (token && token !== 'null' && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(`${backend}${BASE}/send-file`, {
    method: 'POST',
    headers,
    body: fd,
  });
  const raw = await r.text();
  let data: { success?: boolean; data?: WhatsappMessageDto; error?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    return {
      success: false,
      error:
        raw?.slice(0, 400) ||
        `Resposta inválida do servidor (HTTP ${r.status}). Verifique o backend e o limite de upload.`
    };
  }
  if (!r.ok || !data.success) {
    return { success: false, error: data.error || `HTTP ${r.status}` };
  }
  return { success: true, data: data.data };
}

/** Resposta do GET …/messages/:id/media-diagnostics (suporte: URL guardada, proxy, fallback pelo id). */
export interface WhatsappMessageMediaDiagnostics {
  found: boolean;
  messageId?: string;
  chatId?: string;
  hasMedia?: boolean;
  mediaUrl?: string | null;
  providerMessageId?: string | null;
  mediaMimetype?: string | null;
  mediaFilename?: string | null;
  internalUrlResolved?: string | null;
  checks: {
    hasStoredUrl: boolean;
    urlRecognizedByProxy: boolean;
    canTryDownloadByMessageId: boolean;
  };
  hints: string[];
  docReceive: string;
  docSend: string;
}

export function fetchWhatsappMessageMediaDiagnostics(messageId: string) {
  return axiosApiService.get<WhatsappMessageMediaDiagnostics>(
    `${BASE}/messages/${encodeURIComponent(messageId)}/media-diagnostics`
  );
}

export function deleteWhatsappMessage(messageId: string) {
  return axiosApiService.delete<{ chatId: string; id: string }>(`${BASE}/messages/${encodeURIComponent(messageId)}`);
}

export function deleteWhatsappMessageForMe(messageId: string) {
  return axiosApiService.delete<{ chatId: string; id: string }>(`${BASE}/messages/${encodeURIComponent(messageId)}/for-me`);
}

export function editWhatsappMessage(messageId: string, text: string) {
  return axiosApiService.put<WhatsappMessageDto>(`${BASE}/messages/${encodeURIComponent(messageId)}`, { text });
}

export function postWhatsappForwardMessages(params: { targetChatId: string; messageIds: string[] }) {
  return axiosApiService.post<{ forwardedCount: number }>(`${BASE}/messages/forward`, params);
}

/**
 * Retorna a URL de proxy para carregar mídia pelo backend
 * (evita o browser acessar a URL interna do provedor diretamente).
 */
export function whatsappProviderMediaProxyUrl(mediaUrl: string, downloadName?: string): string {
  const backend = getBackendUrl();
  let q = `url=${encodeURIComponent(mediaUrl)}`;
  const n = downloadName?.trim();
  if (n) q += `&filename=${encodeURIComponent(n)}`;
  return `${backend}${BASE}/media-proxy?${q}`;
}

/** URL do proxy por URL original do provedor forçando download explícito. */
export function whatsappProviderMediaProxyDownloadUrl(mediaUrl: string, downloadName?: string): string {
  const inline = whatsappProviderMediaProxyUrl(mediaUrl, downloadName);
  return inline.includes('?') ? `${inline}&download=1` : `${inline}?download=1`;
}

function whatsappMessageMediaUrlByMode(messageId: string, mode: 'inline' | 'download'): string {
  const backend = getBackendUrl();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const params = new URLSearchParams();
  if (token && token !== 'null' && token !== 'undefined') {
    params.set('token', token);
  }
  if (mode === 'download') {
    params.set('download', '1');
  }
  const q = params.toString() ? `?${params.toString()}` : '';
  return `${backend}${BASE}/media/${encodeURIComponent(messageId)}${q}`;
}

/** Stream autenticado inline por id da mensagem (Range / vídeo 206). */
export function whatsappMessageMediaInlineUrl(messageId: string): string {
  return whatsappMessageMediaUrlByMode(messageId, 'inline');
}

/** Stream autenticado com header de download por id da mensagem. */
export function whatsappMessageMediaDownloadUrl(messageId: string): string {
  return whatsappMessageMediaUrlByMode(messageId, 'download');
}

/** Compatibilidade retroativa (download opcional). */
export function whatsappMessageMediaUrl(messageId: string, download = false): string {
  return download ? whatsappMessageMediaDownloadUrl(messageId) : whatsappMessageMediaInlineUrl(messageId);
}

/** Marca a conversa como lida no servidor (contagem de não lidas por usuário). */
export function postWhatsappMarkRead(chatId: string) {
  return axiosApiService.post<void>(`${BASE}/mark-read`, { chatId });
}

/**
 * Reage a uma mensagem com um emoji (ex.: ✅, 👍, ❤️).
 *
 *  - Passe uma string vazia em `emoji` para REMOVER a reação enviada antes.
 *  - O backend resolve `chatId` e `providerMessageId` a partir do `messageId`
 *    interno (UUID em `chat_messages.id`) — você só precisa do id que já vem
 *    em `WhatsappMessageDto.id`.
 *  - Envio passa pela fila global (anti-ban), serializado com `sendText`/
 *    `sendMedia` mas sem o jitter de 2-5s (reaction é interação leve).
 */
export function reactToWhatsappMessage(messageId: string, emoji: string) {
  return axiosApiService.post<void>(
    `${BASE}/messages/${encodeURIComponent(messageId)}/react`,
    { emoji }
  );
}

export function deleteWhatsappConversation(chatId: string) {
  return axiosApiService.delete<void>(`${BASE}/conversations`, { params: { chatId } });
}

export function archiveWhatsappConversation(chatId: string) {
  return axiosApiService.post<void>(`${BASE}/conversations/archive`, { chatId });
}

export function postWhatsappPinConversation(chatId: string, pinned: boolean) {
  return axiosApiService.post<void>(`${BASE}/conversations/pin`, { chatId, pinned });
}

export function postWhatsappFavoriteConversation(chatId: string, favorite: boolean) {
  return axiosApiService.post<void>(`${BASE}/conversations/favorite`, { chatId, favorite });
}

export function postWhatsappSubscribePresence(chatId: string) {
  return axiosApiService.post<void>(`${BASE}/presence/subscribe`, {}, { params: { chatId } });
}

export type WhatsappOrcamentoStatusMode = 'manual' | 'automatic';

export interface WhatsappActionsContextOrcamento {
  id: string;
  numeroSequencial: number;
  titulo: string;
  status: string;
  updatedAt: string;
  clienteId: string;
  contatoLeadId?: string | null;
}

export interface WhatsappActionsContextData {
  chatId: string;
  phone: string;
  contactName?: string | null;
  lead?: {
    id: string;
    nome: string;
    whatsapp?: string | null;
    status: string;
    etapa: number;
    clienteId?: string | null;
  } | null;
  cliente?: {
    id: string;
    nome: string;
    telefone?: string | null;
    cpfCnpj?: string | null;
  } | null;
  pipelineStatus: string;
  orcamentos: WhatsappActionsContextOrcamento[];
  statusUpdateMode: WhatsappOrcamentoStatusMode;
}

export function fetchWhatsappActionsContext(chatId: string) {
  return axiosApiService.get<WhatsappActionsContextData>(`${BASE}/actions/context`, { chatId });
}

export function postWhatsappLinkCliente(chatId: string, clienteId: string) {
  return axiosApiService.post<void>(`${BASE}/actions/link-cliente`, { chatId, clienteId });
}

export function postWhatsappUnlinkCliente(chatId: string) {
  return axiosApiService.post<void>(`${BASE}/actions/unlink-cliente`, { chatId });
}

export function fetchWhatsappOrcamentoStatusMode() {
  return axiosApiService.get<{ mode: WhatsappOrcamentoStatusMode }>(`${BASE}/actions/orcamento-status-mode`);
}

export function putWhatsappOrcamentoStatusMode(mode: WhatsappOrcamentoStatusMode) {
  return axiosApiService.put<{ mode: WhatsappOrcamentoStatusMode }>(`${BASE}/actions/orcamento-status-mode`, { mode });
}

export function postWhatsappSendOrcamentoPdf(params: {
  chatId: string;
  orcamentoId: string;
  mode?: WhatsappOrcamentoStatusMode;
  /** Mesmo JSON do modal de PDF (ex.: `localStorage` `pdf_customization_temp`) — opcional. */
  pdfCustomization?: Record<string, unknown>;
  /**
   * PDF já renderizado no frontend (PrintRenderer) como base64 (cru ou data URL).
   * Quando presente, o backend NÃO gera o PDF; apenas envia via provedor.
   */
  pdfBase64?: string;
  /** Nome do ficheiro no WhatsApp (opcional). */
  pdfFilename?: string;
}) {
  return axiosApiService.post<{
    message: WhatsappMessageDto;
    statusUpdated: boolean;
    mode: WhatsappOrcamentoStatusMode;
  }>(`${BASE}/actions/send-orcamento-pdf`, params);
}

// ——— Evolution API v2 — Chat Controller (proxy backend) ———

export function postEvolutionWhatsappNumbers(numbers: string[]): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/whatsapp-numbers`, { numbers });
}

/** Body: `{ where: { … } }` — filtros Prisma-like da Evolution (ex.: `remoteJid`, `id`). Se omitir, o backend envia `where: {}`. */
export function postEvolutionFindContacts(body?: { where?: Record<string, unknown> }): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/find-contacts`, body ?? {});
}

/** Paginação / filtros conforme documentação da sua build (ex.: `limit`, `cursor`, `where`). */
export function postEvolutionFindChats(body: Record<string, unknown> = {}): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/find-chats`, body);
}

export function postEvolutionFindMessages(body: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/find-messages`, body);
}

export function postEvolutionFindStatusMessage(body: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/find-status-message`, body);
}

/** Sincroniza confirmação de leitura com o WhatsApp (Evolution). Chame só ao abrir a conversa no CRM, não em loops/refetch. */
export function postEvolutionMarkMessagesRead(
  readMessages: EvolutionReadMessageEntry[]
): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/mark-messages-read`, { readMessages });
}

export function postEvolutionMarkChatUnread(body: EvolutionMarkChatUnreadBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/mark-chat-unread`, body);
}

export function postEvolutionArchiveChat(body: EvolutionArchiveChatBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/archive`, body);
}

export function deleteEvolutionMessageForEveryone(
  body: EvolutionDeleteForEveryoneBody
): Promise<ApiResponse<unknown>> {
  return axiosApiService.delete<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/delete-for-everyone`, { data: body });
}

export function postEvolutionUpdateMessage(body: EvolutionUpdateMessageBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/update-message`, body);
}

/** Presença (digitando, online, etc.) — campos exatos dependem da versão; repasse o objeto do Postman. */
export function postEvolutionSendPresence(body: EvolutionSendPresenceBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/send-presence`, body);
}

export function postEvolutionInstanceSetPresence(
  presence: 'available' | 'unavailable'
): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${BASE}/evolution/instance/set-presence`, { presence });
}

export function postEvolutionBlockStatus(body: EvolutionBlockStatusBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/block-status`, body);
}

export function postEvolutionFetchProfilePicture(
  body: EvolutionFetchProfilePictureBody
): Promise<ApiResponse<{ profilePictureUrl?: string | null }>> {
  return axiosApiService.post<{ profilePictureUrl?: string | null }>(
    `${WHATSAPP_EVOLUTION_CHAT_BASE}/profile-picture`,
    body
  );
}

/** Corpo costuma incluir referência à mensagem de mídia — alinhar ao Postman da sua versão. */
export function postEvolutionMediaBase64(body: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_CHAT_BASE}/media-base64`, body);
}

// ——— Evolution API v2 — Profile settings ———

export function postEvolutionProfileFetchContact(number: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/fetch-contact`, { number });
}

export function postEvolutionProfileFetchBusiness(number: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/fetch-business`, { number });
}

export function postEvolutionProfileUpdateName(name: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/update-name`, { name });
}

export function postEvolutionProfileUpdateStatus(status: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/update-status`, { status });
}

export function postEvolutionProfileUpdatePicture(picture: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/update-picture`, { picture });
}

export function deleteEvolutionProfilePicture(): Promise<ApiResponse<unknown>> {
  return axiosApiService.delete<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/picture`);
}

export function getEvolutionProfilePrivacy(): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/privacy`);
}

export function postEvolutionProfilePrivacy(
  body: EvolutionPrivacySettingsBody
): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_PROFILE_BASE}/privacy`, body);
}

// ═══════════════════════════════════════════════════════════════
//  Evolution Message Controller  — /evolution/message/*
// ═══════════════════════════════════════════════════════════════

export const WHATSAPP_EVOLUTION_MESSAGE_BASE = `${BASE}/evolution/message` as const;

export interface EvolutionSendTextBody {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: { key: { id: string }; message?: { conversation: string } };
}

export interface EvolutionSendStatusBody {
  type: 'text' | 'image' | 'audio';
  content: string;
  caption?: string;
  backgroundColor?: string;
  font?: number;
  allContacts: boolean;
  statusJidList?: string[];
}

export interface EvolutionSendMediaBody {
  number: string;
  media: string;
  mediatype?: 'image' | 'video' | 'document';
  caption?: string;
  fileName?: string;
  delay?: number;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: { key: { id: string }; message?: { conversation: string } };
}

export interface EvolutionSendAudioBody {
  number: string;
  audio: string;
  delay?: number;
}

export interface EvolutionSendStickerBody {
  number: string;
  sticker: string;
  delay?: number;
}

export interface EvolutionSendLocationBody {
  number: string;
  name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: { key: Record<string, unknown>; message?: Record<string, unknown> };
}

export interface EvolutionSendContactBody {
  number: string;
  contact: Array<{
    fullName: string;
    wuid: string;
    phoneNumber: string;
    organization?: string;
    email?: string;
    url?: string;
  }>;
}

export interface EvolutionSendReactionBody {
  key: { remoteJid: string; fromMe: boolean; id: string };
  reaction: string;
}

export interface EvolutionSendPollBody {
  number: string;
  name: string;
  values: string[];
  selectableCount?: number;
}

export interface EvolutionSendListBody {
  number: string;
  title: string;
  description?: string;
  buttonText?: string;
  footerText?: string;
  sections: Array<{
    title: string;
    rows: Array<{ title: string; description?: string; rowId: string }>;
  }>;
}

export function postEvolutionSendText(body: EvolutionSendTextBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-text`, body);
}

export function postEvolutionSendStatus(body: EvolutionSendStatusBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-status`, body);
}

export function postEvolutionSendMedia(body: EvolutionSendMediaBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-media`, body);
}

export function postEvolutionSendAudio(body: EvolutionSendAudioBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-audio`, body);
}

export function postEvolutionSendSticker(body: EvolutionSendStickerBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-sticker`, body);
}

export function postEvolutionSendLocation(body: EvolutionSendLocationBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-location`, body);
}

export function postEvolutionSendContact(body: EvolutionSendContactBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-contact`, body);
}

export function postEvolutionSendReaction(body: EvolutionSendReactionBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-reaction`, body);
}

export function postEvolutionSendPoll(body: EvolutionSendPollBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-poll`, body);
}

export function postEvolutionSendList(body: EvolutionSendListBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_MESSAGE_BASE}/send-list`, body);
}

// ═══════════════════════════════════════════════════════════════
//  Evolution Group Controller  — /evolution/group/*
// ═══════════════════════════════════════════════════════════════

export const WHATSAPP_EVOLUTION_GROUP_BASE = `${BASE}/evolution/group` as const;

export interface EvolutionGroupCreateBody {
  subject: string;
  description?: string;
  participants: string[];
}

export interface EvolutionGroupUpdateMembersBody {
  groupJid: string;
  action: 'add' | 'remove' | 'promote' | 'demote';
  participants: string[];
}

export interface EvolutionGroupSendInviteBody {
  groupJid: string;
  description: string;
  numbers: string[];
}

export function postEvolutionGroupCreate(body: EvolutionGroupCreateBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/create`, body);
}

export function postEvolutionGroupUpdatePicture(groupJid: string, image: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-picture`, { groupJid, image });
}

export function postEvolutionGroupUpdateSubject(groupJid: string, subject: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-subject`, { groupJid, subject });
}

export function postEvolutionGroupUpdateDescription(groupJid: string, description: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-description`, { groupJid, description });
}

export function getEvolutionGroupFetchInviteCode(groupJid: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/invite-code?groupJid=${encodeURIComponent(groupJid)}`);
}

export function postEvolutionGroupRevokeInviteCode(groupJid: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/revoke-invite-code`, { groupJid });
}

export function postEvolutionGroupSendInvite(body: EvolutionGroupSendInviteBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/send-invite`, body);
}

export function getEvolutionGroupFindByInvite(inviteCode: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/find-by-invite?inviteCode=${encodeURIComponent(inviteCode)}`);
}

export function getEvolutionGroupFindByJid(groupJid: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/find-by-jid?groupJid=${encodeURIComponent(groupJid)}`);
}

export function getEvolutionGroupFetchAll(getParticipants = false): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/fetch-all?getParticipants=${getParticipants}`);
}

export function getEvolutionGroupFindMembers(groupJid: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.get<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/members?groupJid=${encodeURIComponent(groupJid)}`);
}

export function postEvolutionGroupUpdateMembers(body: EvolutionGroupUpdateMembersBody): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-members`, body);
}

export function postEvolutionGroupUpdateSetting(
  groupJid: string,
  action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/update-setting`, { groupJid, action });
}

export function postEvolutionGroupToggleEphemeral(groupJid: string, expiration: number): Promise<ApiResponse<unknown>> {
  return axiosApiService.post<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/toggle-ephemeral`, { groupJid, expiration });
}

export function deleteEvolutionGroupLeave(groupJid: string): Promise<ApiResponse<unknown>> {
  return axiosApiService.delete<unknown>(`${WHATSAPP_EVOLUTION_GROUP_BASE}/leave?groupJid=${encodeURIComponent(groupJid)}`);
}

const SHOWN_MARKER = '__WHATSAPP_TOAST_SHOWN__';

/** Indica que `toastWhatsappApiError` já exibiu o toast (use no `onError` da mutation para não duplicar). */
export function isWhatsappErrorAlreadyToasted(err: unknown): boolean {
  return err instanceof Error && err.message === SHOWN_MARKER;
}

/**
 * Toast genérico para falhas de API WhatsApp / Evolution (4xx, timeouts, mensagem já apagada, etc.).
 * Não use em fluxos silenciosos (mark-read interno, presença).
 */
export function toastWhatsappApiError(
  res: ApiResponse<unknown>,
  opts?: { titleFallback?: string; silent?: boolean }
): boolean {
  if (res.success) return false;
  if (opts?.silent) return true;

  const raw = (res.error || '').trim();
  const st = res.status;
  const low = `${raw} ${st ?? ''}`.toLowerCase();

  let title = opts?.titleFallback ?? 'Não foi possível concluir';
  let description: string | undefined = raw.length > 0 && raw.length < 220 ? raw : undefined;

  if (
    st === 503 ||
    st === 504 ||
    low.includes('timeout') ||
    low.includes('econn') ||
    low.includes('network') ||
    low.includes('demorou')
  ) {
    title = 'Falha na conexão';
    description = 'O WhatsApp demorou demais ou está indisponível. Tente de novo em instantes.';
  } else if (
    low.includes('delet') ||
    low.includes('revoke') ||
    low.includes('not found') ||
    low.includes('não encontrad') ||
    low.includes('message not found')
  ) {
    title = 'Ops, essa mensagem já foi apagada ou não está mais disponível';
    if (raw.length > 0 && raw.length < 160) description = raw;
  } else if (st === 400 && low.includes('evolution')) {
    title = 'Ação indisponível no provedor Evolution';
    description = raw || undefined;
  } else if (st != null && st >= 400 && st < 500) {
    title = 'Solicitação não aceita';
    description = raw || undefined;
  } else if (st != null && st >= 500) {
    title = 'Erro no servidor WhatsApp';
    description = raw || undefined;
  }

  toast.error(title, description && description !== title ? { description } : undefined);
  return true;
}

/** Lance após `toastWhatsappApiError` para o `onError` da mutation reconhecer e não duplicar toast. */
export function throwAfterWhatsappToast(): never {
  throw new Error(SHOWN_MARKER);
}
