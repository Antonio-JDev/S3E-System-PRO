import { Prisma } from '@prisma/client';
import type { ChatMessage } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getSocketServer } from '../lib/socket';
import {
  canonicalWhatsappChatId,
  digitsOnly,
  formatOutboundPrefix,
  inferStoredMediaType,
  peerChatIdFromPayload,
  storageChatIdVariants,
  waJidToDigits
} from '../utils/whatsappChat.util';
import { resolveWhatsappProviderInternalFetchUrl } from '../utils/whatsappMediaUrl.util';
import {
  archiveWhatsappProviderChat,
  deleteWhatsappProviderChat,
  deleteWhatsappProviderChatMessage,
  editWhatsappProviderChatMessage,
  sendWhatsappProviderMedia,
  sendWhatsappProviderText,
  unarchiveWhatsappProviderChat,
  type WhatsappProviderMediaType
} from './whatsappProvider.service';
import { PDFOrcamentoService } from './pdfOrcamento.service';
import {
  buildMarcaDaguaFromPdfCustomization,
  resolveMarcaDaguaFromUserTemplate
} from '../utils/orcamentoPdfPersonalization.util';

export interface WhatsappProviderMessagePayload {
  id?: string | number;
  from: string;
  to: string;
  /** Em grupos: JID do participante que enviou (ex.: ...@s.whatsapp.net). */
  participant?: string;
  fromMe: boolean;
  body?: string;
  timestamp: number;
  /** Provedor: 0 pendente, 1 servidor, 2 entregue no aparelho, 3 lida, 4 reproduzida (mídia). */
  ack?: number;
  hasMedia?: boolean;
  mediaUrl?: string;
  mediaMimetype?: string;
  mediaFilename?: string;
  /** Id de mídia no payload do provedor (objeto media). */
  providerMediaId?: string | null;
  mediaFileSize?: number | null;
  mediaType?: string | null;
}

export interface WhatsappProviderWebhookBody {
  event: string;
  session?: string;
  payload: WhatsappProviderMessagePayload;
}

export function toSocketDto(m: ChatMessage) {
  return {
    id: m.id,
    chatId: canonicalWhatsappChatId(m.chatId),
    content: m.content,
    fromMe: m.fromMe,
    timestamp: m.timestamp.toISOString(),
    clienteId: m.clienteId,
    contatoLeadId: m.contatoLeadId,
    providerMessageId: m.providerMessageId,
    ack: m.ack ?? null,
    participant: m.participant ?? null,
    hasMedia: m.hasMedia,
    mediaUrl: m.mediaUrl ? rewriteProviderMediaUrl(m.mediaUrl) : null,
    mediaMimetype: m.mediaMimetype,
    mediaFilename: m.mediaFilename,
    mediaType: m.mediaType ?? null,
    fileSize: m.fileSize ?? null,
    mimeType: m.mediaMimetype ?? null,
    fileName: m.mediaFilename ?? null,
    providerMediaId: m.providerMediaId ?? null
  };
}

function emitUnreadCountUpdated(): void {
  try {
    getSocketServer().emit('update_unread_count', { at: Date.now() });
  } catch {
    // ignore (bootstrap/testes)
  }
}

function rewriteProviderMediaUrl(url: string): string {
  const providerBase = (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(
    /\/$/,
    ''
  );
  const pub = process.env.WHATSAPP_PROVIDER_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (pub && url.startsWith(providerBase)) {
    return pub + url.slice(providerBase.length);
  }
  return url;
}

function emitWhatsAppMessage(m: ChatMessage): void {
  try {
    getSocketServer().emit('whatsapp:message', toSocketDto(m));
  } catch {
    // Servidor ainda não subiu io (testes / bootstrap)
  }
}

function emitWhatsAppMessageDeleted(payload: { id: string; chatId: string }): void {
  try {
    getSocketServer().emit('whatsapp:message:deleted', payload);
  } catch {
    // ignore
  }
}

function emitWhatsAppMessageEdited(m: ChatMessage): void {
  try {
    getSocketServer().emit('whatsapp:message:edited', toSocketDto(m));
  } catch {
    // ignore
  }
}

function emitWhatsAppMessageAck(payload: { id: string; chatId: string; ack: number | null }): void {
  try {
    getSocketServer().emit('whatsapp:message:ack', {
      id: payload.id,
      chatId: canonicalWhatsappChatId(payload.chatId),
      ack: payload.ack
    });
  } catch {
    // ignore
  }
}

function emitWhatsAppChatRemoved(chatId: string): void {
  try {
    getSocketServer().emit('whatsapp:chat:removed', { chatId: canonicalWhatsappChatId(chatId) });
  } catch {
    // ignore
  }
}

function emitWhatsAppChatArchived(chatId: string, archived: boolean): void {
  try {
    getSocketServer().emit('whatsapp:chat:archived', {
      chatId: canonicalWhatsappChatId(chatId),
      archived
    });
  } catch {
    // ignore
  }
}

function emitWhatsAppPresence(payload: {
  session: string | null;
  chatId: string;
  presences: unknown;
}): void {
  try {
    getSocketServer().emit('whatsapp:presence', payload);
  } catch {
    // ignore
  }
}

function emitWhatsAppChatMeta(payload: {
  chatId: string;
  displayName: string | null;
  profilePictureUrl: string | null;
}): void {
  try {
    getSocketServer().emit('whatsapp:chat:meta', {
      chatId: canonicalWhatsappChatId(payload.chatId),
      displayName: payload.displayName,
      profilePictureUrl: payload.profilePictureUrl
    });
  } catch {
    // ignore
  }
}

/** Evento `connection.update` da Evolution — painel reage sem polling. */
export function emitWhatsappProviderConnectionStatus(payload: {
  disconnected: boolean;
  state: string | null;
  session: string | null;
}): void {
  try {
    getSocketServer().emit('whatsapp:connection:status', payload);
  } catch {
    // ignore
  }
}

function phoneVariantsFromChatId(chatId: string): Set<string> {
  const phone = waJidToDigits(chatId);
  const v = new Set<string>([phone]);
  if (phone.startsWith('55')) v.add(phone.slice(2));
  else v.add(`55${phone}`);
  return v;
}

export async function resolveClienteIdForChat(chatId: string): Promise<string | null> {
  const variants = phoneVariantsFromChatId(chatId);
  const rows = await prisma.cliente.findMany({
    where: { telefone: { not: null } },
    select: { id: true, telefone: true }
  });
  for (const c of rows) {
    const t = digitsOnly(c.telefone || '');
    if (!t) continue;
    for (const phone of variants) {
      if (t === phone || t.endsWith(phone.slice(-10)) || phone.endsWith(t.slice(-10))) {
        return c.id;
      }
    }
  }
  return null;
}

export async function resolveContatoLeadIdForChat(chatId: string): Promise<string | null> {
  const variants = phoneVariantsFromChatId(chatId);
  const leads = await prisma.contatoLead.findMany({
    where: { whatsapp: { not: null } },
    select: { id: true, whatsapp: true }
  });
  for (const lead of leads) {
    const w = digitsOnly(lead.whatsapp || '');
    if (!w) continue;
    for (const phone of variants) {
      if (w === phone || w.endsWith(phone.slice(-10)) || phone.endsWith(w.slice(-10))) {
        return lead.id;
      }
    }
  }
  return null;
}

function phonesMatch(a: string, b: string): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const a10 = da.slice(-10);
  const b10 = db.slice(-10);
  return Boolean(a10 && b10 && (a10 === b10 || da.endsWith(b10) || db.endsWith(a10)));
}

async function findLeadForChat(chatId: string): Promise<{
  id: string;
  nome: string;
  whatsapp: string | null;
  status: string;
  etapa: number;
  clienteId: string | null;
  cliente: { id: string; nome: string; telefone: string | null; cpfCnpj: string | null } | null;
} | null> {
  const variants = phoneVariantsFromChatId(chatId);
  const leads = await prisma.contatoLead.findMany({
    where: { whatsapp: { not: null } },
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      status: true,
      etapa: true,
      clienteId: true,
      cliente: { select: { id: true, nome: true, telefone: true, cpfCnpj: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  for (const lead of leads) {
    const w = digitsOnly(lead.whatsapp || '');
    if (!w) continue;
    for (const phone of variants) {
      if (phonesMatch(w, phone)) {
        return lead;
      }
    }
  }
  return null;
}

async function findClienteForChat(chatId: string): Promise<{
  id: string;
  nome: string;
  telefone: string | null;
  cpfCnpj: string | null;
} | null> {
  const variants = phoneVariantsFromChatId(chatId);
  const rows = await prisma.cliente.findMany({
    where: { telefone: { not: null } },
    select: { id: true, nome: true, telefone: true, cpfCnpj: true }
  });
  for (const c of rows) {
    const t = digitsOnly(c.telefone || '');
    if (!t) continue;
    for (const phone of variants) {
      if (phonesMatch(t, phone)) {
        return c;
      }
    }
  }
  return null;
}

export type WhatsappOrcamentoStatusMode = 'manual' | 'automatic';

export interface WhatsappActionsOrcamentoInfo {
  id: string;
  numeroSequencial: number;
  titulo: string;
  status: string;
  updatedAt: string;
  clienteId: string;
  contatoLeadId: string | null;
}

export interface WhatsappActionsContext {
  chatId: string;
  phone: string;
  contactName: string | null;
  lead: {
    id: string;
    nome: string;
    whatsapp: string | null;
    status: string;
    etapa: number;
    clienteId: string | null;
  } | null;
  cliente: {
    id: string;
    nome: string;
    telefone: string | null;
    cpfCnpj: string | null;
  } | null;
  pipelineStatus: string;
  orcamentos: WhatsappActionsOrcamentoInfo[];
  statusUpdateMode: WhatsappOrcamentoStatusMode;
}

function parseWhatsappOrcamentoStatusMode(raw: unknown): WhatsappOrcamentoStatusMode {
  return raw === 'automatic' ? 'automatic' : 'manual';
}

function isPendenteStatus(status: string): boolean {
  const v = (status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return v.includes('pendente') || v.includes('rascunho');
}

async function resolveOutboundDisplayName(userId: string, fallbackName?: string | null): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, setor: true }
  });
  const name = (user?.name || fallbackName || 'Usuário').trim() || 'Usuário';
  const setor = (user?.setor || '').trim();
  return setor ? `${name} - ${setor}` : name;
}

export async function getWhatsappOrcamentoStatusUpdateMode(userId: string): Promise<WhatsappOrcamentoStatusMode> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });
  const prefs = (row?.preferences as Record<string, unknown>) || {};
  return parseWhatsappOrcamentoStatusMode(prefs.whatsappOrcamentoStatusUpdateMode);
}

export async function setWhatsappOrcamentoStatusUpdateMode(
  userId: string,
  mode: WhatsappOrcamentoStatusMode
): Promise<WhatsappOrcamentoStatusMode> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });
  const current = (row?.preferences as Record<string, unknown>) || {};
  const next = {
    ...current,
    whatsappOrcamentoStatusUpdateMode: mode
  };
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: next }
  });
  return mode;
}

export async function getWhatsappActionsContext(userId: string, chatIdRaw: string): Promise<WhatsappActionsContext> {
  const chatId = canonicalWhatsappChatId(chatIdRaw);
  const phone = waJidToDigits(chatId);
  const [leadFound, clienteFromPhone, cache, statusUpdateMode] = await Promise.all([
    findLeadForChat(chatId),
    findClienteForChat(chatId),
    prisma.whatsappContactCache.findUnique({ where: { chatId } }),
    getWhatsappOrcamentoStatusUpdateMode(userId)
  ]);

  let cliente = leadFound?.cliente ?? clienteFromPhone ?? null;
  if (leadFound?.clienteId && !cliente) {
    const c = await prisma.cliente.findUnique({
      where: { id: leadFound.clienteId },
      select: { id: true, nome: true, telefone: true, cpfCnpj: true }
    });
    if (c) cliente = c;
  }

  const whereOr: Prisma.OrcamentoWhereInput[] = [];
  if (leadFound?.id) whereOr.push({ contatoLeadId: leadFound.id });
  if (cliente?.id) whereOr.push({ clienteId: cliente.id });
  const orcamentosRows = whereOr.length
    ? await prisma.orcamento.findMany({
        where: { OR: whereOr },
        select: {
          id: true,
          numeroSequencial: true,
          titulo: true,
          status: true,
          updatedAt: true,
          clienteId: true,
          contatoLeadId: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 25
      })
    : [];
  const orcamentos: WhatsappActionsOrcamentoInfo[] = orcamentosRows.map((o) => ({
    id: o.id,
    numeroSequencial: o.numeroSequencial,
    titulo: o.titulo,
    status: o.status,
    updatedAt: o.updatedAt.toISOString(),
    clienteId: o.clienteId,
    contatoLeadId: o.contatoLeadId
  }));
  const pipelineStatus = orcamentos.length ? orcamentos[0].status : 'Sem orçamento';

  return {
    chatId,
    phone,
    contactName: cache?.displayName || leadFound?.nome || cliente?.nome || null,
    lead: leadFound
      ? {
          id: leadFound.id,
          nome: leadFound.nome,
          whatsapp: leadFound.whatsapp,
          status: leadFound.status,
          etapa: leadFound.etapa,
          clienteId: leadFound.clienteId
        }
      : null,
    cliente: cliente
      ? {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          cpfCnpj: cliente.cpfCnpj
        }
      : null,
    pipelineStatus,
    orcamentos,
    statusUpdateMode
  };
}

export async function linkWhatsappChatToCliente(chatIdRaw: string, clienteId: string): Promise<void> {
  const chatId = canonicalWhatsappChatId(chatIdRaw);
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true }
  });
  if (!cliente) {
    throw new Error('Cliente não encontrado');
  }
  const lead = await findLeadForChat(chatId);
  if (lead) {
    await prisma.contatoLead.update({
      where: { id: lead.id },
      data: {
        clienteId: cliente.id,
        status: lead.status === 'NAO_ATENDE' ? lead.status : 'CONVERTIDO',
        etapa: Math.max(lead.etapa || 1, 3)
      }
    });
    return;
  }

  const phone = waJidToDigits(chatId);
  const cached = await prisma.whatsappContactCache.findUnique({ where: { chatId } });
  await prisma.contatoLead.create({
    data: {
      nome: cached?.displayName || cliente.nome,
      whatsapp: phone || null,
      status: 'CONVERTIDO',
      etapa: 3,
      clienteId: cliente.id
    }
  });
}

function normalizeMetaString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

/**
 * Atualiza cache de nome/foto de contatos/chats a partir dos eventos
 * `contacts.update`, `chats.update` e `chats.upsert`.
 *
 * Valida que o chatId seja um JID real (não genérico/vazio) e que
 * haja conversas registradas para ele antes de persistir.
 */
export async function ingestWhatsappProviderChatMetaUpdate(payload: Record<string, unknown>): Promise<void> {
  const rawChatId =
    (typeof payload.chatId === 'string' && payload.chatId) ||
    (typeof payload.remoteJid === 'string' && payload.remoteJid) ||
    (typeof payload.id === 'string' && payload.id) ||
    '';
  const chatId = canonicalWhatsappChatId(rawChatId);
  if (!chatId || chatId === 'status@broadcast') return;

  const digits = waJidToDigits(chatId);
  if (!chatId.includes('@') || (!digits && !chatId.toLowerCase().endsWith('@g.us'))) return;
  if (digits && digits.length < 8) return;

  const displayName =
    normalizeMetaString(payload.displayName) ||
    normalizeMetaString(payload.pushName) ||
    normalizeMetaString(payload.name) ||
    normalizeMetaString(payload.subject) ||
    normalizeMetaString(payload.title) ||
    null;
  const profilePictureUrl =
    normalizeMetaString(payload.profilePictureUrl) ||
    normalizeMetaString(payload.profilePicUrl) ||
    normalizeMetaString(payload.photoUrl) ||
    null;

  if (!displayName && !profilePictureUrl) return;

  const variants = storageChatIdVariants(chatId);
  const hasMessages = await prisma.chatMessage.count({
    where: { chatId: { in: variants } },
    take: 1
  });
  if (!hasMessages) return;

  await persistWhatsappContactCache({
    chatId,
    displayName,
    profilePictureUrl
  });

  emitWhatsAppChatMeta({
    chatId,
    displayName,
    profilePictureUrl
  });
}

function mediaLabel(mimetype?: string, filename?: string): string {
  if (!mimetype) return '📎 Mídia';
  const m = mimetype.toLowerCase();
  if (m.startsWith('image/')) return '📷 Imagem';
  if (m.startsWith('audio/')) return '🎤 Áudio';
  if (m.startsWith('video/')) return '🎥 Vídeo';
  if (m === 'application/pdf') return '📄 PDF';
  if (filename) return `📎 ${filename}`;
  return '📎 Arquivo';
}

function normalizeProviderMessageId(id: unknown): string | null {
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'number' && !Number.isNaN(id)) return String(id);
  return null;
}

function coerceAckValue(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/** message.ack pode trazer só ackName (documentação do provedor). */
function ackNameToNumber(name: string): number | null {
  const u = name.trim().toUpperCase();
  const map: Record<string, number> = {
    ERROR: -1,
    PENDING: 0,
    SERVER: 1,
    DEVICE: 2,
    DELIVERY_ACK: 2,
    READ: 3,
    PLAYED: 4
  };
  return map[u] ?? null;
}

function ackFromProviderAckPayload(payload: Record<string, unknown>): number | null {
  const n = coerceAckValue(payload.ack);
  if (n !== null) return n;
  const an = payload.ackName;
  if (typeof an === 'string' && an.trim()) {
    return ackNameToNumber(an);
  }
  return null;
}

/**
 * Localiza mensagem enviada pelo CRM para aplicar message.ack.
 * Alguns motores enviam id ligeiramente diferente do retorno de sendText — tenta sufixo único.
 */
async function findOutboundMessageForAck(providerMsgId: string): Promise<ChatMessage | null> {
  const exact = await prisma.chatMessage.findUnique({
    where: { providerMessageId: providerMsgId }
  });
  if (exact?.fromMe) return exact;
  if (exact && !exact.fromMe) return null;

  const lastUs = providerMsgId.lastIndexOf('_');
  const suffix = lastUs >= 0 ? providerMsgId.slice(lastUs + 1) : providerMsgId;
  if (suffix.length < 10) return null;

  const byEnd = await prisma.chatMessage.findMany({
    where: {
      fromMe: true,
      providerMessageId: { endsWith: suffix }
    },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  if (byEnd.length === 1) return byEnd[0];
  if (byEnd.length > 1) {
    const hit = byEnd.find((r) => r.providerMessageId === providerMsgId);
    return hit ?? byEnd[0];
  }

  const loose = await prisma.chatMessage.findMany({
    where: {
      fromMe: true,
      providerMessageId: { contains: suffix }
    },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  if (loose.length === 1) return loose[0];
  return null;
}

async function applyAckToOutboundMessage(internalId: string, nextAck: number): Promise<void> {
  if (nextAck < 0) return;
  const row = await prisma.chatMessage.findUnique({ where: { id: internalId } });
  if (!row?.fromMe) return;
  const prev = row.ack ?? 0;
  const next = Math.max(prev, nextAck);
  if (next === prev) return;
  const updated = await prisma.chatMessage.update({
    where: { id: row.id },
    data: { ack: next }
  });
  emitWhatsAppMessageAck({
    id: updated.id,
    chatId: updated.chatId,
    ack: updated.ack ?? null
  });
}

/** Atualiza ticks a partir do webhook `message` (o provedor reenvia a mesma id com ack maior). */
async function applyAckFromMessagePayloadIfNeeded(
  pl: WhatsappProviderMessagePayload,
  internalMessageId: string
): Promise<void> {
  if (!pl.fromMe || typeof pl.ack !== 'number' || Number.isNaN(pl.ack)) return;
  await applyAckToOutboundMessage(internalMessageId, Math.trunc(pl.ack));
}

/** Roteador de webhooks do provedor WhatsApp (mensagem, ack, presença). */
export async function handleWhatsappProviderWebhookEvent(body: {
  event: string;
  session?: string;
  payload: unknown;
}): Promise<void> {
  switch (body.event) {
    case 'message':
    case 'message.any':
      if (!body.payload || typeof body.payload !== 'object') return;
      await ingestWhatsappProviderMessage(body.session, body.payload as WhatsappProviderMessagePayload);
      return;
    case 'message.ack':
      if (!body.payload || typeof body.payload !== 'object') return;
      await ingestWhatsappProviderMessageAck(body.payload as Record<string, unknown>);
      return;
    case 'presence.update':
      if (!body.payload || typeof body.payload !== 'object') return;
      await ingestWhatsappProviderPresenceUpdate(body.session, body.payload as Record<string, unknown>);
      return;
    case 'contacts.update':
    case 'chats.update':
    case 'chats.upsert':
      if (!body.payload || typeof body.payload !== 'object') return;
      await ingestWhatsappProviderChatMetaUpdate(body.payload as Record<string, unknown>);
      return;
    default:
      return;
  }
}

/** @deprecated use handleWhatsappProviderWebhookEvent */
export async function ingestWhatsappProviderWebhook(body: WhatsappProviderWebhookBody): Promise<void> {
  await handleWhatsappProviderWebhookEvent({
    event: body.event,
    session: body.session,
    payload: body.payload
  });
}

async function ingestWhatsappProviderMessage(
  session: string | undefined,
  pl: WhatsappProviderMessagePayload
): Promise<void> {
  if (!pl?.from) {
    return;
  }

  const bodyText = (pl.body || '').trim();
  const hasMedia = !!pl.hasMedia;
  const hasMediaUrl = !!pl.mediaUrl;

  if (!bodyText && !hasMedia && !hasMediaUrl) {
    return;
  }

  let content = bodyText;
  if (hasMedia && !content) {
    content = mediaLabel(pl.mediaMimetype, pl.mediaFilename);
  }

  const chatId = canonicalWhatsappChatId(peerChatIdFromPayload(pl));
  const participant =
    typeof pl.participant === 'string' && pl.participant.trim() ? pl.participant.trim() : undefined;
  const isGroupChat = chatId.toLowerCase().endsWith('@g.us');
  const tsSec = typeof pl.timestamp === 'number' ? pl.timestamp : 0;
  const timestamp = tsSec > 0 ? new Date(tsSec * 1000) : new Date();

  const providerMessageIdFromPayload = normalizeProviderMessageId(pl.id);

  if (providerMessageIdFromPayload) {
    const existingByProvider = await prisma.chatMessage.findUnique({
      where: { providerMessageId: providerMessageIdFromPayload },
      select: { id: true }
    });
    if (existingByProvider) {
      await applyAckFromMessagePayloadIfNeeded(pl, existingByProvider.id);
      return;
    }
  }

  if (pl.fromMe) {
    const variants = storageChatIdVariants(chatId);
    const recentCutoff = new Date(Date.now() - 25_000);
    const echo = await prisma.chatMessage.findFirst({
      where: {
        chatId: { in: variants },
        fromMe: true,
        content,
        createdAt: { gte: recentCutoff }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (echo) {
      if (
        providerMessageIdFromPayload &&
        (!echo.providerMessageId || echo.providerMessageId !== providerMessageIdFromPayload)
      ) {
        try {
          const updated = await prisma.chatMessage.update({
            where: { id: echo.id },
            data: { providerMessageId: providerMessageIdFromPayload }
          });
          emitWhatsAppMessageEdited(updated);
        } catch {
          // conflito de unique em provider_message_id — ignora
        }
      }
      await applyAckFromMessagePayloadIfNeeded(pl, echo.id);
      return;
    }
  }

  const [clienteId, contatoLeadId] = await Promise.all([
    resolveClienteIdForChat(chatId),
    resolveContatoLeadIdForChat(chatId)
  ]);

  try {
    const storedType =
      pl.mediaType?.trim() ||
      (hasMedia && pl.mediaMimetype ? inferStoredMediaType(pl.mediaMimetype, pl.mediaFilename) : null);

    const created = await prisma.chatMessage.create({
      data: {
        content,
        fromMe: !!pl.fromMe,
        timestamp,
        chatId,
        providerMessageId: providerMessageIdFromPayload || undefined,
        session: session || undefined,
        participant: isGroupChat && !pl.fromMe ? participant : undefined,
        hasMedia,
        mediaUrl: pl.mediaUrl || undefined,
        mediaMimetype: pl.mediaMimetype || undefined,
        mediaFilename: pl.mediaFilename || undefined,
        mediaType: storedType || undefined,
        fileSize: typeof pl.mediaFileSize === 'number' ? pl.mediaFileSize : undefined,
        providerMediaId: pl.providerMediaId?.trim() || undefined,
        clienteId: clienteId ?? undefined,
        contatoLeadId: contatoLeadId ?? undefined,
        ack: pl.fromMe ? 1 : null
      }
    });
    emitWhatsAppMessage(created);
    if (!created.fromMe) {
      emitUnreadCountUpdated();
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return;
    }
    throw e;
  }
}

export async function ingestWhatsappProviderMessageAck(payload: Record<string, unknown>): Promise<void> {
  const keyObj = payload.key && typeof payload.key === 'object' ? (payload.key as Record<string, unknown>) : null;
  const idRaw = payload.id ?? keyObj?.id;
  const idStr = normalizeProviderMessageId(idRaw);
  const ack = ackFromProviderAckPayload(payload);
  if (!idStr || ack === null) {
    console.debug('[WA-ACK] ignorado: idStr=%s ack=%s', idStr, ack);
    return;
  }

  console.debug('[WA-ACK] processando providerMsgId=%s ack=%d', idStr, ack);
  let row = await findOutboundMessageForAck(idStr);

  if (!row?.fromMe && keyObj) {
    const jid = typeof keyObj.remoteJid === 'string' ? keyObj.remoteJid.trim() : '';
    if (jid) {
      const chatId = canonicalWhatsappChatId(jid);
      const variants = storageChatIdVariants(chatId);
      row = await prisma.chatMessage.findFirst({
        where: {
          chatId: { in: variants },
          fromMe: true,
          providerMessageId: null,
          createdAt: { gte: new Date(Date.now() - 60_000) }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (row) {
        try {
          await prisma.chatMessage.update({
            where: { id: row.id },
            data: { providerMessageId: idStr }
          });
          row = await prisma.chatMessage.findUnique({ where: { id: row.id } });
          console.debug('[WA-ACK] atribuído providerMessageId=%s à mensagem id=%s', idStr, row?.id);
        } catch {
          row = null;
        }
      }
    }
  }

  if (!row?.fromMe) {
    console.debug('[WA-ACK] mensagem não encontrada para providerMsgId=%s', idStr);
    return;
  }

  const prev = row.ack ?? 0;
  const nextAck = Math.max(prev, ack);
  if (nextAck === prev) {
    return;
  }

  const updated = await prisma.chatMessage.update({
    where: { id: row.id },
    data: { ack: nextAck }
  });
  console.debug('[WA-ACK] atualizado id=%s chatId=%s ack=%d→%d', updated.id, updated.chatId, prev, nextAck);
  emitWhatsAppMessageAck({
    id: updated.id,
    chatId: updated.chatId,
    ack: updated.ack ?? null
  });
}

export async function ingestWhatsappProviderPresenceUpdate(
  session: string | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  const rawId = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!rawId) {
    return;
  }
  const chatId = canonicalWhatsappChatId(rawId);
  emitWhatsAppPresence({
    session: session ?? null,
    chatId,
    presences: payload.presences
  });
}

export interface ChatPreviewRow {
  chatId: string;
  lastContent: string;
  lastAt: string;
  lastFromMe: boolean;
  /** Último ack do provedor na última mensagem (apenas quando lastFromMe). */
  lastAck?: number | null;
  /** Mensagens recebidas (cliente) após lastReadAt deste usuário; 0 = lidas. */
  unreadCount: number;
  /** Nome no CRM (lead ou cliente) para exibir ao lado do número. */
  contactName?: string | null;
  /** Nome WhatsApp (pushname / contatos) persistido após contact-meta. */
  providerCachedName?: string | null;
  /** URL da foto de perfil (última obtida no provedor). */
  cachedProfilePictureUrl?: string | null;
}

function canonicalPhoneDigitsFromChatId(chatId: string): string {
  const d = waJidToDigits(canonicalWhatsappChatId(chatId));
  if (!d) return '';
  if (d.length <= 11 && !d.startsWith('55')) return `55${d}`;
  return d;
}

async function enrichPreviewsWithContactNames(rows: ChatPreviewRow[]): Promise<ChatPreviewRow[]> {
  if (rows.length === 0) return rows;

  const [leads, clientes] = await Promise.all([
    prisma.contatoLead.findMany({
      where: { whatsapp: { not: null } },
      select: { whatsapp: true, nome: true }
    }),
    prisma.cliente.findMany({
      where: { telefone: { not: null } },
      select: { telefone: true, nome: true }
    })
  ]);

  const leadNames = new Map<string, string>();
  for (const l of leads) {
    const d = digitsOnly(l.whatsapp || '');
    if (!d || !l.nome?.trim()) continue;
    let k = d;
    if (k.length <= 11 && !k.startsWith('55')) k = `55${k}`;
    leadNames.set(k, l.nome.trim());
  }

  const clienteNames = new Map<string, string>();
  for (const c of clientes) {
    const d = digitsOnly(c.telefone || '');
    if (!d || !c.nome?.trim()) continue;
    let k = d;
    if (k.length <= 11 && !k.startsWith('55')) k = `55${k}`;
    clienteNames.set(k, c.nome.trim());
  }

  function lookupName(phoneKey: string): string | null {
    const direct = leadNames.get(phoneKey) || clienteNames.get(phoneKey);
    if (direct) return direct;
    if (phoneKey.startsWith('55') && phoneKey.length > 2) {
      const rest = phoneKey.slice(2);
      return leadNames.get(rest) || clienteNames.get(rest) || null;
    }
    const with55 = `55${phoneKey}`;
    return leadNames.get(with55) || clienteNames.get(with55) || null;
  }

  return rows.map((r) => {
    const key = canonicalPhoneDigitsFromChatId(r.chatId);
    const contactName = key ? lookupName(key) : null;
    return { ...r, contactName: contactName ?? null };
  });
}

async function enrichPreviewsWithProviderCache(rows: ChatPreviewRow[]): Promise<ChatPreviewRow[]> {
  if (rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => canonicalWhatsappChatId(r.chatId)))];
  const caches = await prisma.whatsappContactCache.findMany({
    where: { chatId: { in: ids } }
  });
  const byChat = new Map(caches.map((c) => [c.chatId, c]));
  return rows.map((r) => {
    const c = byChat.get(canonicalWhatsappChatId(r.chatId));
    return {
      ...r,
      providerCachedName: c?.displayName?.trim() || null,
      cachedProfilePictureUrl: c?.profilePictureUrl?.trim() || null
    };
  });
}

/** Marca conversa como lida até a última mensagem (por usuário logado). */
export async function markChatRead(userId: string, chatId: string): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  const latest = await prisma.chatMessage.findFirst({
    where: { chatId: { in: variants } },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true }
  });
  const at = latest?.timestamp ?? new Date();

  for (const cid of variants) {
    await prisma.whatsappChatReadState.upsert({
      where: { userId_chatId: { userId, chatId: cid } },
      create: { userId, chatId: cid, lastReadAt: at },
      update: { lastReadAt: at }
    });
  }
  emitUnreadCountUpdated();
}

/** Pré-visualizações mescladas por chatId (antes de filtrar arquivadas). */
export async function listMergedChatPreviews(userId: string): Promise<ChatPreviewRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      chat_id: string;
      last_content: string;
      last_at: Date;
      last_from_me: boolean;
      last_ack: number | null;
      unread_count: bigint | number;
    }>
  >`
    WITH latest AS (
      SELECT DISTINCT ON ("chat_id")
        "chat_id",
        "content" AS last_content,
        "timestamp" AS last_at,
        "from_me" AS last_from_me,
        "ack" AS last_ack
      FROM chat_messages
      ORDER BY "chat_id", "timestamp" DESC
    )
    SELECT
      l.chat_id,
      l.last_content,
      l.last_at,
      l.last_from_me,
      (
        SELECT COUNT(*)::integer
        FROM chat_messages m
        WHERE m.chat_id = l.chat_id
          AND m.from_me = false
          AND m."timestamp" > COALESCE(
            (
              SELECT r.last_read_at
              FROM whatsapp_chat_read_states r
              WHERE r.user_id = ${userId} AND r.chat_id = l.chat_id
            ),
            to_timestamp(0)
          )
      ) AS unread_count
    FROM latest l
    ORDER BY l.last_at DESC
  `;

  const mapped: ChatPreviewRow[] = rows.map((r) => ({
    chatId: r.chat_id,
    lastContent: r.last_content,
    lastAt: r.last_at.toISOString(),
    lastFromMe: r.last_from_me,
    lastAck: r.last_ack == null ? null : Number(r.last_ack),
    unreadCount: Number(r.unread_count)
  }));

  const groups = new Map<string, ChatPreviewRow[]>();
  for (const row of mapped) {
    const key = canonicalWhatsappChatId(row.chatId);
    const g = groups.get(key) ?? [];
    g.push(row);
    groups.set(key, g);
  }

  const merged: ChatPreviewRow[] = [];
  for (const [key, group] of groups) {
    const latest = group.reduce((a, b) =>
      new Date(b.lastAt) > new Date(a.lastAt) ? b : a
    );
    const unreadSum = group.reduce((s, r) => s + r.unreadCount, 0);
    merged.push({
      chatId: key,
      lastContent: latest.lastContent,
      lastAt: latest.lastAt,
      lastFromMe: latest.lastFromMe,
      lastAck: latest.lastAck ?? null,
      unreadCount: unreadSum
    });
  }

  return merged.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

export async function listChatPreviews(userId: string): Promise<ChatPreviewRow[]> {
  const sorted = await listMergedChatPreviews(userId);
  const archivedRows = await prisma.whatsappChatReadState.findMany({
    where: { userId, archived: true },
    select: { chatId: true }
  });
  const archivedCanon = new Set(archivedRows.map((r) => canonicalWhatsappChatId(r.chatId)));
  const visible = sorted.filter((m) => !archivedCanon.has(m.chatId));
  const withCrm = await enrichPreviewsWithContactNames(visible);
  return await enrichPreviewsWithProviderCache(withCrm);
}

/** Conversas marcadas como arquivadas para este usuário no CRM. */
export async function listArchivedChatPreviews(userId: string): Promise<ChatPreviewRow[]> {
  const archivedStates = await prisma.whatsappChatReadState.findMany({
    where: { userId, archived: true },
    select: { chatId: true, lastReadAt: true }
  });
  if (archivedStates.length === 0) return [];

  const lastReadByCanon = new Map<string, Date>();
  for (const s of archivedStates) {
    const c = canonicalWhatsappChatId(s.chatId);
    lastReadByCanon.set(c, s.lastReadAt);
  }

  const archivedCanon = new Set(lastReadByCanon.keys());
  const merged = await listMergedChatPreviews(userId);
  const byChat = new Map(merged.map((m) => [m.chatId, m]));
  const out: ChatPreviewRow[] = [];

  for (const cid of archivedCanon) {
    const existing = byChat.get(cid);
    if (existing) {
      out.push(existing);
    } else {
      const lr = lastReadByCanon.get(cid);
      out.push({
        chatId: cid,
        lastContent: '—',
        lastAt: lr?.toISOString() ?? new Date(0).toISOString(),
        lastFromMe: false,
        lastAck: null,
        unreadCount: 0
      });
    }
  }

  out.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  const withCrm = await enrichPreviewsWithContactNames(out);
  return await enrichPreviewsWithProviderCache(withCrm);
}

/** Persiste nome/foto após GET contact-meta (ou quando quiser atualizar o cache).
 * Não sobrescreve campos existentes com null (evita apagar nomes válidos). */
export async function persistWhatsappContactCache(params: {
  chatId: string;
  displayName: string | null;
  profilePictureUrl: string | null;
}): Promise<void> {
  const cid = canonicalWhatsappChatId(params.chatId);
  const dn = params.displayName?.trim() || null;
  const pic = params.profilePictureUrl?.trim() || null;

  if (!dn && !pic) return;

  const updateData: Record<string, string | null> = {};
  if (dn) updateData.displayName = dn;
  if (pic) updateData.profilePictureUrl = pic;

  await prisma.whatsappContactCache.upsert({
    where: { chatId: cid },
    create: {
      chatId: cid,
      displayName: dn,
      profilePictureUrl: pic
    },
    update: updateData
  });

  // Compatibilidade: se houver caches antigos salvos em variações de chatId (ex.: @lid),
  // mantém os registros alinhados sem criar novas linhas extras.
  const variants = storageChatIdVariants(cid).filter((v) => canonicalWhatsappChatId(v) === cid && v !== cid);
  if (variants.length > 0) {
    await prisma.whatsappContactCache.updateMany({
      where: { chatId: { in: variants } },
      data: updateData
    });
  }
  const saved = await prisma.whatsappContactCache.findUnique({ where: { chatId: cid }, select: { displayName: true, profilePictureUrl: true } });
  emitWhatsAppChatMeta({ chatId: cid, displayName: saved?.displayName ?? dn, profilePictureUrl: saved?.profilePictureUrl ?? pic });
}

/** Remove todo o cache de nomes/fotos de contatos (whatsapp_contact_cache). */
export async function clearAllWhatsappContactCache(): Promise<number> {
  const { count } = await prisma.whatsappContactCache.deleteMany({});
  return count;
}

async function lastProviderMessageSnapshot(
  canonical: string
): Promise<{ providerMessageId: string; fromMe: boolean } | null> {
  const variants = storageChatIdVariants(canonical);
  const last = await prisma.chatMessage.findFirst({
    where: { chatId: { in: variants }, providerMessageId: { not: null } },
    orderBy: { timestamp: 'desc' },
    select: { providerMessageId: true, fromMe: true }
  });
  if (!last?.providerMessageId?.trim()) return null;
  return { providerMessageId: last.providerMessageId.trim(), fromMe: last.fromMe };
}

/** Desarquivar no provedor e voltar a exibir na lista principal. */
export async function unarchiveWhatsappConversation(userId: string, chatId: string): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  try {
    const last = await lastProviderMessageSnapshot(canonical);
    await unarchiveWhatsappProviderChat(canonical, last);
  } catch (e) {
    console.warn('unarchiveWhatsappProviderChat:', e);
  }
  await prisma.whatsappChatReadState.updateMany({
    where: { userId, chatId: { in: variants } },
    data: { archived: false }
  });
  emitWhatsAppChatArchived(canonical, false);
}

/** Marca todas as conversas com mensagens como lidas (até a última mensagem de cada chat). */
export async function markAllWhatsappChatsRead(userId: string): Promise<void> {
  const merged = await listMergedChatPreviews(userId);
  for (const p of merged) {
    await markChatRead(userId, p.chatId);
  }
  emitUnreadCountUpdated();
}

export async function listMessagesForChat(chatId: string, take = 100): Promise<ChatMessage[]> {
  const variants = storageChatIdVariants(canonicalWhatsappChatId(chatId));
  const rows = await prisma.chatMessage.findMany({
    where: { chatId: { in: variants } },
    orderBy: { timestamp: 'desc' },
    take
  });
  return rows.slice().reverse();
}

/** Texto ou URL de documentação — recebimento de mídia (opcional: WHATSAPP_PROVIDER_DOCS_RECEIVE_URL). */
export const WHATSAPP_PROVIDER_DOC_RECEIVE_HINT =
  process.env.WHATSAPP_PROVIDER_DOCS_RECEIVE_URL?.trim() ||
  'Documentação do provedor: recebimento de mídia (media.url, armazenamento).';

/** Texto ou URL de documentação — envio (opcional: WHATSAPP_PROVIDER_DOCS_SEND_URL). */
export const WHATSAPP_PROVIDER_DOC_SEND_HINT =
  process.env.WHATSAPP_PROVIDER_DOCS_SEND_URL?.trim() ||
  'Documentação do provedor: envio (sendImage, sendFile, file.data / file.url).';

export interface MessageMediaDiagnostics {
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

/**
 * Diagnóstico para suporte: confirma se a linha tem URL de mídia, se o proxy consegue resolver,
 * e se ainda dá para tentar GET com downloadMedia pelo id do provedor (ver documentação de recebimento).
 */
export async function getMessageMediaDiagnostics(messageId: string): Promise<MessageMediaDiagnostics> {
  const docReceive = WHATSAPP_PROVIDER_DOC_RECEIVE_HINT;
  const docSend = WHATSAPP_PROVIDER_DOC_SEND_HINT;
  const row = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!row) {
    return {
      found: false,
      checks: {
        hasStoredUrl: false,
        urlRecognizedByProxy: false,
        canTryDownloadByMessageId: false
      },
      hints: ['Nenhuma linha em chat_messages com este id.'],
      docReceive,
      docSend
    };
  }

  const hints: string[] = [];
  const mu = row.mediaUrl?.trim() ?? null;
  let internal: string | null = null;
  if (mu) {
    internal = resolveWhatsappProviderInternalFetchUrl(mu);
    if (!internal) {
      hints.push(
        'O media.url guardado não foi reescrito para o host interno do provedor (WHATSAPP_PROVIDER_BASE_URL). Ajuste WHATSAPP_PROVIDER_BASE_URL / WHATSAPP_PROVIDER_PUBLIC_URL conforme a documentação (media.url no webhook).'
      );
    }
  } else if (row.hasMedia) {
    hints.push(
      'hasMedia=true mas sem media.url — o provedor pode não ter descarregado o ficheiro (armazenamento/config) ou o webhook não trouxe media.url. Ver documentação de recebimento de mídia.'
    );
  }

  const canProviderDownload = Boolean(row.hasMedia && row.providerMessageId?.trim());

  if (row.hasMedia && !mu && row.providerMessageId?.trim()) {
    hints.push(
      'O CRM pode ainda obter binários via GET .../messages/{id}?downloadMedia=true no provedor (rota interna usada em /api/whatsapp/media/:id).'
    );
  }

  if (row.hasMedia && !mu && !row.providerMessageId?.trim()) {
    hints.push('Sem provider_message_id — não há fallback por id do provedor para esta linha.');
  }

  return {
    found: true,
    messageId: row.id,
    chatId: row.chatId,
    hasMedia: row.hasMedia,
    mediaUrl: mu,
    providerMessageId: row.providerMessageId,
    mediaMimetype: row.mediaMimetype,
    mediaFilename: row.mediaFilename,
    internalUrlResolved: internal,
    checks: {
      hasStoredUrl: !!mu,
      urlRecognizedByProxy: !!internal,
      canTryDownloadByMessageId: canProviderDownload
    },
    hints,
    docReceive,
    docSend
  };
}

export async function sendChatMessageFromUser(params: {
  chatId: string;
  text: string;
  userId: string;
  userName?: string | null;
}): Promise<ChatMessage> {
  const chatId = canonicalWhatsappChatId(params.chatId);
  const displayName = await resolveOutboundDisplayName(params.userId, params.userName);
  const fullText = formatOutboundPrefix(displayName || 'Usuário', params.text.trim());
  const providerMsgId = await sendWhatsappProviderText(chatId, fullText);

  const clienteId = await resolveClienteIdForChat(chatId);
  const contatoLeadId = await resolveContatoLeadIdForChat(chatId);

  const created = await prisma.chatMessage.create({
    data: {
      content: fullText,
      fromMe: true,
      timestamp: new Date(),
      chatId,
      providerMessageId: providerMsgId || undefined,
      ack: 1,
      clienteId: clienteId ?? undefined,
      contatoLeadId: contatoLeadId ?? undefined
    }
  });
  emitWhatsAppMessage(created);
  await markChatRead(params.userId, chatId);
  return created;
}

const MEDIA_LABELS: Record<WhatsappProviderMediaType, string> = {
  image: '📷 Imagem',
  voice: '🎤 Áudio',
  video: '🎥 Vídeo',
  file: '📎 Arquivo'
};

export async function sendMediaMessageFromUser(params: {
  chatId: string;
  userId: string;
  userName?: string | null;
  mediaType: WhatsappProviderMediaType;
  base64Data: string;
  mimetype: string;
  filename?: string;
  caption?: string;
  fileSize?: number;
}): Promise<ChatMessage> {
  const chatId = canonicalWhatsappChatId(params.chatId);
  const displayName = await resolveOutboundDisplayName(params.userId, params.userName);

  const captionText = params.caption?.trim()
    ? formatOutboundPrefix(displayName || 'Usuário', params.caption.trim())
    : undefined;

  const sendResult = await sendWhatsappProviderMedia({
    chatId,
    type: params.mediaType,
    base64Data: params.base64Data,
    mimetype: params.mimetype,
    filename: params.filename,
    caption: captionText
  });

  const label = MEDIA_LABELS[params.mediaType];
  const contentForDb = captionText
    ? `${label}\n${captionText}`
    : `${label}${params.filename ? ` — ${params.filename}` : ''}`;

  const clienteId = await resolveClienteIdForChat(chatId);
  const contatoLeadId = await resolveContatoLeadIdForChat(chatId);

  const created = await prisma.chatMessage.create({
    data: {
      content: contentForDb,
      fromMe: true,
      timestamp: new Date(),
      chatId,
      providerMessageId: sendResult.providerMessageId || undefined,
      ack: 1,
      hasMedia: true,
      mediaUrl: sendResult.mediaUrl || undefined,
      mediaMimetype: params.mimetype || undefined,
      mediaFilename: params.filename || undefined,
      mediaType: inferStoredMediaType(params.mimetype || '', params.filename),
      fileSize: typeof params.fileSize === 'number' ? params.fileSize : undefined,
      clienteId: clienteId ?? undefined,
      contatoLeadId: contatoLeadId ?? undefined
    }
  });
  emitWhatsAppMessage(created);
  await markChatRead(params.userId, chatId);
  return created;
}

export async function sendOrcamentoPdfToWhatsappChat(params: {
  chatId: string;
  orcamentoId: string;
  userId: string;
  userName?: string | null;
  updateStatusMode?: WhatsappOrcamentoStatusMode;
  /** Mesmo JSON do modal (localStorage `pdf_customization_temp`) — opcional. */
  pdfCustomization?: unknown;
  /**
   * PDF já renderizado no frontend (PrintRenderer) como base64 (cru ou data URL).
   * Quando presente, o backend NÃO gera o PDF via Puppeteer; apenas envia via provedor.
   */
  pdfBase64?: string;
  /** Nome do ficheiro no WhatsApp (opcional). */
  pdfFilename?: string;
}): Promise<{ message: ChatMessage; statusUpdated: boolean; finalMode: WhatsappOrcamentoStatusMode }> {
  const chatId = canonicalWhatsappChatId(params.chatId);
  const orcamento = await prisma.orcamento.findUnique({
    where: { id: params.orcamentoId },
    select: {
      id: true,
      numeroSequencial: true,
      clienteId: true,
      contatoLeadId: true,
      status: true,
      titulo: true
    }
  });
  if (!orcamento) {
    throw new Error('Orçamento não encontrado');
  }

  const [lead, cliente] = await Promise.all([findLeadForChat(chatId), findClienteForChat(chatId)]);
  const matchesChat =
    (lead?.id && orcamento.contatoLeadId === lead.id) ||
    (lead?.clienteId && orcamento.clienteId === lead.clienteId) ||
    (cliente?.id && orcamento.clienteId === cliente.id);
  if (!matchesChat) {
    throw new Error('Este orçamento não está vinculado ao contato atual do chat');
  }

  const marcaDagua =
    params.pdfCustomization != null
      ? buildMarcaDaguaFromPdfCustomization(params.pdfCustomization)
      : await resolveMarcaDaguaFromUserTemplate(params.userId);

  const stripPdfBase64 = (raw: string): string => {
    const t = (raw || '').trim();
    if (!t) return '';
    if (t.toLowerCase().startsWith('data:')) {
      const idx = t.toLowerCase().indexOf('base64,');
      if (idx >= 0) return t.slice(idx + 'base64,'.length).replace(/\s/g, '');
    }
    return t.replace(/\s/g, '');
  };

  const pdfBuffer = params.pdfBase64?.trim()
    ? Buffer.from(stripPdfBase64(params.pdfBase64), 'base64')
    : await PDFOrcamentoService.gerarPDF(orcamento.id, marcaDagua);

  const filename = (params.pdfFilename && params.pdfFilename.trim())
    ? params.pdfFilename.trim()
    : `Orcamento-${orcamento.numeroSequencial || orcamento.id}.pdf`;
  const message = await sendMediaMessageFromUser({
    chatId,
    userId: params.userId,
    userName: params.userName,
    mediaType: 'file',
    base64Data: pdfBuffer.toString('base64'),
    mimetype: 'application/pdf',
    filename,
    caption: `Segue o orçamento ${orcamento.numeroSequencial || orcamento.id} solicitado via S3E System.`,
    fileSize: pdfBuffer.length
  });

  const finalMode = params.updateStatusMode ?? (await getWhatsappOrcamentoStatusUpdateMode(params.userId));
  let statusUpdated = false;
  // Atualização automática de status só é permitida para orçamentos pendentes.
  if (finalMode === 'automatic' && isPendenteStatus(orcamento.status)) {
    await prisma.orcamento.update({
      where: { id: orcamento.id },
      data: { status: 'Enviado ao Cliente' }
    });
    statusUpdated = true;
  }
  return { message, statusUpdated, finalMode };
}

/** Exclui no provedor e no banco (apenas mensagens suas com providerMessageId). */
export async function deleteChatMessageById(messageId: string): Promise<{ chatId: string; id: string }> {
  const row = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!row) {
    throw new Error('Mensagem não encontrada');
  }
  if (!row.fromMe) {
    throw new Error('Só é possível excluir mensagens enviadas por você');
  }
  if (!row.providerMessageId?.trim()) {
    throw new Error(
      'Mensagem sem ID do WhatsApp. Aguarde sincronização ou envie uma nova mensagem a partir deste painel.'
    );
  }
  await deleteWhatsappProviderChatMessage(row.chatId, row.providerMessageId);
  await prisma.chatMessage.delete({ where: { id: messageId } });
  const chatId = canonicalWhatsappChatId(row.chatId);
  emitWhatsAppMessageDeleted({ id: messageId, chatId });
  return { chatId, id: messageId };
}

/** Edita texto no provedor e no banco (apenas mensagens suas com providerMessageId). */
export async function editChatMessageById(params: {
  messageId: string;
  text: string;
  userId: string;
  userName?: string | null;
}): Promise<ChatMessage> {
  const raw = params.text?.trim() ?? '';
  if (!raw) {
    throw new Error('Texto é obrigatório');
  }
  const row = await prisma.chatMessage.findUnique({ where: { id: params.messageId } });
  if (!row) {
    throw new Error('Mensagem não encontrada');
  }
  if (!row.fromMe) {
    throw new Error('Só é possível editar mensagens enviadas por você');
  }
  if (!row.providerMessageId?.trim()) {
    throw new Error(
      'Mensagem sem ID do WhatsApp. Aguarde sincronização ou envie uma nova mensagem a partir deste painel.'
    );
  }
  const displayName = await resolveOutboundDisplayName(params.userId, params.userName);
  const fullText = formatOutboundPrefix(displayName || 'Usuário', raw);
  const chatId = canonicalWhatsappChatId(row.chatId);
  await editWhatsappProviderChatMessage(chatId, row.providerMessageId, fullText);
  const updated = await prisma.chatMessage.update({
    where: { id: params.messageId },
    data: { content: fullText }
  });
  emitWhatsAppMessageEdited(updated);
  return updated;
}

/** Remove histórico no CRM, estados de leitura e o chat na sessão do provedor. */
export async function deleteWhatsappConversation(chatId: string): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  try {
    await deleteWhatsappProviderChat(canonical);
  } catch (e) {
    console.warn('deleteWhatsappProviderChat:', e);
  }
  await prisma.chatMessage.deleteMany({ where: { chatId: { in: variants } } });
  await prisma.whatsappChatReadState.deleteMany({ where: { chatId: { in: variants } } });
  emitWhatsAppChatRemoved(canonical);
}

/** Arquivar no provedor e ocultar na lista do CRM para este usuário. */
export async function archiveWhatsappConversation(userId: string, chatId: string): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  try {
    const last = await lastProviderMessageSnapshot(canonical);
    await archiveWhatsappProviderChat(canonical, last);
  } catch (e) {
    console.warn('archiveWhatsappProviderChat:', e);
  }
  const at = new Date();
  for (const cid of variants) {
    await prisma.whatsappChatReadState.upsert({
      where: { userId_chatId: { userId, chatId: cid } },
      create: { userId, chatId: cid, lastReadAt: at, archived: true },
      update: { archived: true }
    });
  }
  emitWhatsAppChatArchived(canonical, true);
}
