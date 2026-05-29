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
  stripOutboundPrefixForEdit,
  storageChatIdVariants,
  waJidToDigits
} from '../utils/whatsappChat.util';
import { resolveWhatsappProviderInternalFetchUrl } from '../utils/whatsappMediaUrl.util';
import {
  archiveWhatsappProviderChat,
  deleteWhatsappProviderChat,
  deleteWhatsappProviderChatMessage,
  editWhatsappProviderChatMessage,
  fetchWhatsappProviderGroupById,
  fetchWhatsappProviderGroupPictureUrl,
  fetchWhatsappProviderMediaWithRange,
  fetchWhatsappProviderMessageDownloadMedia,
  sendWhatsappProviderMedia,
  sendWhatsappProviderText,
  unarchiveWhatsappProviderChat,
  type WhatsappProviderGroupRow,
  type WhatsappProviderMediaType
} from './whatsappProvider.service';
import { PDFOrcamentoService } from './pdfOrcamento.service';
import {
  buildMarcaDaguaFromPdfCustomization,
  resolveMarcaDaguaFromUserTemplate
} from '../utils/orcamentoPdfPersonalization.util';
import { shouldPromoteOrcamentoToEnviadoOnWhatsappPdf } from '../utils/orcamentoStatus.util';
import { normalizeStoredMediaFilename, normalizeUserFilename } from '../utils/filename.util';
import {
  expandedStorageChatIdVariants,
  loadWhatsappChatIdentities,
  mergeKeyForChatPreviewRow,
  normalizePhoneDigitsKey,
  recordWhatsappChatIdentity,
  resolvePhoneDigitKeysForChat,
  resolvePreferredChatIdForOutbound
} from './whatsappIdentity.service';
import { upsertContatoS3eFromInboundMessage } from './contatosS3e.service';
import * as EvoChat from './whatsappEvolutionChat.service';
import { isEvolutionProviderKind } from './whatsappProvider.evolution';
import { withWhatsappSendLock } from './whatsappSendQueue.service';
import {
  isLocalInboundMediaUrl,
  saveInboundMediaBase64ToDisk
} from './whatsappInboundMedia.service';

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
  /**
   * Mídia recebida inline no webhook (base64).
   *
   * A Evolution Go com `WEBHOOK_FILES=true` (default) entrega o conteúdo
   * binário da mídia direto no payload — não há URL pública para buscar
   * depois (a `imageMessage.url` é o endpoint criptografado do WhatsApp e
   * exige `mediaKey`/`directPath` para descriptografar, o que nem o nosso
   * backend nem a EvoGo fazem após o webhook). Quando este campo vem
   * preenchido, o service persiste em disco
   * (`/app/uploads/whatsapp-inbound/{messageId}.{ext}`) e seta
   * `mediaUrl = local-inbound:{messageId}.{ext}` na linha — o
   * `getWhatsappMediaById` detecta esse prefixo e serve do disco.
   */
  mediaBase64?: string;
  /** Alguns motores (Evolution/Baileys) mandam nome do contato no webhook da mensagem. */
  pushName?: string;
  pushname?: string;
  notify?: string;
  name?: string;
  verifiedName?: string;
}

export interface WhatsappProviderWebhookBody {
  event: string;
  session?: string;
  payload: WhatsappProviderMessagePayload;
}

function waDebugEnabled(): boolean {
  const raw = (process.env.WHATSAPP_DEBUG_IDS || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function toSocketDto(m: ChatMessage) {
  return {
    id: m.id,
    // Mantém o chatId como chave estável por conversa.
    // `@lid` deve ser preservado; `@s.whatsapp.net` vira `@c.us` para DM.
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
    // `local-inbound:` é um esquema interno (arquivo em disco) — não pode
    // vazar para o frontend, que tentaria usar como URL HTTP. O endpoint
    // `/api/whatsapp/media/:id` resolve o conteúdo pela `m.id`.
    mediaUrl: m.mediaUrl
      ? isLocalInboundMediaUrl(m.mediaUrl)
        ? null
        : rewriteProviderMediaUrl(m.mediaUrl)
      : null,
    mediaMimetype: m.mediaMimetype,
    mediaFilename: m.mediaFilename,
    mediaType: m.mediaType ?? null,
    fileSize: m.fileSize ?? null,
    mimeType: m.mediaMimetype ?? null,
    fileName: m.mediaFilename ?? null,
    providerMediaId: m.providerMediaId ?? null,
    reaction: m.reaction ?? null
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

function emitWhatsAppMessageReaction(payload: {
  id: string;
  chatId: string;
  reaction: string | null;
}): void {
  try {
    getSocketServer().emit('whatsapp:message:reaction', {
      id: payload.id,
      chatId: payload.chatId,
      reaction: payload.reaction
    });
  } catch {
    // ignore: socket pode não estar pronto em testes
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

function emitWhatsAppChatFlags(payload: { chatId: string; pinned?: boolean; favorite?: boolean }): void {
  try {
    getSocketServer().emit('whatsapp:chat:flags', {
      chatId: canonicalWhatsappChatId(payload.chatId),
      pinned: payload.pinned ?? false,
      favorite: payload.favorite ?? false
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

async function buildPhoneMatchVariants(chatId: string): Promise<Set<string>> {
  const keys = await resolvePhoneDigitKeysForChat(chatId);
  const v = new Set<string>();
  for (const phone of keys) {
    if (!phone) continue;
    v.add(phone);
    if (phone.startsWith('55')) v.add(phone.slice(2));
    else v.add(`55${phone}`);
  }
  if (v.size === 0) {
    const phone = waJidToDigits(chatId);
    if (phone) {
      v.add(phone);
      if (phone.startsWith('55')) v.add(phone.slice(2));
      else v.add(`55${phone}`);
    }
  }
  return v;
}

export async function resolveClienteIdForChat(chatId: string): Promise<string | null> {
  const variants = await buildPhoneMatchVariants(chatId);
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
  const variants = await buildPhoneMatchVariants(chatId);
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
  const variants = await buildPhoneMatchVariants(chatId);
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
  const variants = await buildPhoneMatchVariants(chatId);
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

/** Extrai o número sequencial de nomes padrão `Orcamento-123.pdf` (envio WhatsApp / download). */
export function parseOrcamentoNumeroFromPdfFilename(filename: string): number | null {
  if (!filename?.trim()) return null;
  const base = filename.trim().replace(/^.*[/\\]/, '');
  const m =
    /^Orcamento-(\d+)\.pdf$/i.exec(base) ||
    /^orcamento[_\s-]*(\d+)\.pdf$/i.exec(base);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Após envio de PDF de proposta: vincula orçamento ao lead do telefone do chat e move para CONVERTIDO. */
async function syncLeadAfterOrcamentoPdfSent(params: {
  chatIdInput: string;
  chatIdResolved: string;
  orcamentoId: string;
  orcamentoClienteId: string;
  orcamentoContatoLeadId: string | null;
}): Promise<{ leadId: string | null }> {
  const { chatIdInput, chatIdResolved, orcamentoId, orcamentoClienteId, orcamentoContatoLeadId } =
    params;
  const chatInputCanon = canonicalWhatsappChatId(chatIdInput);

  let lead = await findLeadForChat(chatIdInput);
  if (!lead && chatIdResolved !== chatInputCanon) {
    lead = await findLeadForChat(chatIdResolved);
  }
  let cliente = await findClienteForChat(chatIdInput);
  if (!cliente && chatIdResolved !== chatInputCanon) {
    cliente = await findClienteForChat(chatIdResolved);
  }

  const leadClienteId = lead?.clienteId || cliente?.id || orcamentoClienteId || null;

  const linkOrcamentoToLead = async (leadId: string) => {
    if (orcamentoContatoLeadId !== leadId) {
      await prisma.orcamento.update({
        where: { id: orcamentoId },
        data: { contatoLeadId: leadId }
      });
    }
  };

  if (lead?.id) {
    if (lead.status !== 'NAO_ATENDE') {
      await prisma.contatoLead.update({
        where: { id: lead.id },
        data: {
          status: 'CONVERTIDO',
          etapa: Math.max(lead.etapa || 1, 3),
          ...(leadClienteId ? { clienteId: leadClienteId } : {})
        }
      });
    } else if (leadClienteId && lead.clienteId !== leadClienteId) {
      await prisma.contatoLead.update({
        where: { id: lead.id },
        data: { clienteId: leadClienteId }
      });
    }
    await linkOrcamentoToLead(lead.id);
    return { leadId: lead.id };
  }

  const leadByPhoneId =
    (await resolveContatoLeadIdForChat(chatIdResolved)) ||
    (chatIdResolved !== chatInputCanon ? await resolveContatoLeadIdForChat(chatIdInput) : null);

  if (leadByPhoneId) {
    const existingLead = await prisma.contatoLead.findUnique({
      where: { id: leadByPhoneId },
      select: { id: true, status: true, etapa: true, clienteId: true }
    });
    if (existingLead) {
      await prisma.contatoLead.update({
        where: { id: existingLead.id },
        data: {
          ...(existingLead.status !== 'NAO_ATENDE'
            ? { status: 'CONVERTIDO', etapa: Math.max(existingLead.etapa || 1, 3) }
            : {}),
          ...(leadClienteId && existingLead.clienteId !== leadClienteId
            ? { clienteId: leadClienteId }
            : {})
        }
      });
      await linkOrcamentoToLead(existingLead.id);
      return { leadId: existingLead.id };
    }
  }

  const phone = waJidToDigits(chatIdResolved) || waJidToDigits(chatIdInput);
  if (phone) {
    const cached = await prisma.whatsappContactCache.findUnique({ where: { chatId: chatIdResolved } });
    const created = await prisma.contatoLead.create({
      data: {
        nome: cached?.displayName || cliente?.nome || 'Contato WhatsApp',
        whatsapp: phone,
        status: 'CONVERTIDO',
        etapa: 3,
        ...(leadClienteId ? { clienteId: leadClienteId } : {})
      }
    });
    await linkOrcamentoToLead(created.id);
    return { leadId: created.id };
  }

  return { leadId: null };
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
  const phoneKeys = await resolvePhoneDigitKeysForChat(chatIdRaw);
  const phone = phoneKeys[0] || waJidToDigits(chatId);
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

async function resolveWhatsappPhoneForChatLink(chatIdRaw: string, chatId: string): Promise<string> {
  const phoneKeys = await resolvePhoneDigitKeysForChat(chatIdRaw);
  const phone = phoneKeys[0] || waJidToDigits(chatId);
  if (!phone || phone.length < 10) {
    throw new Error(
      'Não foi possível identificar o telefone deste contato. Abra pelo funil com o WhatsApp cadastrado ou aguarde a sincronização do número.'
    );
  }
  return phone;
}

export async function linkWhatsappChatToCliente(chatIdRaw: string, clienteId: string): Promise<void> {
  const chatId = canonicalWhatsappChatId(chatIdRaw);
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, telefone: true }
  });
  if (!cliente) {
    throw new Error('Cliente não encontrado');
  }

  const phone = await resolveWhatsappPhoneForChatLink(chatIdRaw, chatId);

  let lead = await findLeadForChat(chatId);
  if (!lead && chatIdRaw.trim() !== chatId) {
    lead = await findLeadForChat(chatIdRaw);
  }

  if (lead) {
    await prisma.contatoLead.update({
      where: { id: lead.id },
      data: {
        clienteId: cliente.id,
        ...(!lead.whatsapp?.trim() ? { whatsapp: phone } : {})
      }
    });
  } else {
    const leadByPhoneId =
      (await resolveContatoLeadIdForChat(chatId)) ||
      (chatIdRaw.trim() !== chatId ? await resolveContatoLeadIdForChat(chatIdRaw) : null);
    if (leadByPhoneId) {
      await prisma.contatoLead.update({
        where: { id: leadByPhoneId },
        data: { clienteId: cliente.id }
      });
    } else {
      const cache = await prisma.whatsappContactCache.findUnique({ where: { chatId } });
      await prisma.contatoLead.create({
        data: {
          nome: cache?.displayName || cliente.nome,
          whatsapp: phone,
          clienteId: cliente.id,
          status: 'CONVERTIDO',
          etapa: 3
        }
      });
    }
  }

  if (!cliente.telefone?.trim()) {
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { telefone: phone }
    });
  }
}

export async function unlinkWhatsappChatFromCliente(chatIdRaw: string): Promise<void> {
  const chatId = canonicalWhatsappChatId(chatIdRaw);
  let lead = await findLeadForChat(chatId);
  if (!lead && chatIdRaw.trim() !== chatId) {
    lead = await findLeadForChat(chatIdRaw);
  }
  if (!lead?.clienteId) {
    throw new Error(
      'Não há vínculo ativo deste contato com um cliente no funil. Se o nome ainda aparecer, ele pode estar sendo identificado automaticamente pelo telefone cadastrado no cliente.'
    );
  }

  await prisma.contatoLead.update({
    where: { id: lead.id },
    data: { clienteId: null }
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
  if (waDebugEnabled()) {
    console.debug('[WA-META] rawChatId=%s canonical=%s keys=%s', rawChatId, chatId, Object.keys(payload || {}).join(','));
  }
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
  if (filename) {
    const n = normalizeUserFilename(filename);
    return n ? `📎 ${n}` : '📎 Arquivo';
  }
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

/**
 * Aplica uma reação recebida via webhook à mensagem-alvo (busca por
 * `providerMessageId`) e emite o evento socket `whatsapp:message:reaction`
 * para que todos os 7 operadores vejam o emoji em tempo real.
 *
 * Semântica:
 *  - `payload.reaction === ''` → REMOVE a reação anterior (grava `null`).
 *  - `payload.reaction !== ''` → grava o emoji recebido (sobrescreve qualquer
 *    reação anterior — modelo simples de 1 reação ativa por mensagem).
 *
 * Idempotência: se o estado no banco já bate com o payload, NÃO emite socket
 * (evita ruído no front quando o mesmo webhook é reenviado pelo provedor).
 */
export async function applyReactionFromWebhook(payload: {
  targetProviderMessageId: string;
  reaction: string;
}): Promise<void> {
  const providerMessageId = payload.targetProviderMessageId.trim();
  if (!providerMessageId) return;

  const message = await prisma.chatMessage.findUnique({
    where: { providerMessageId },
    select: { id: true, chatId: true, reaction: true }
  });
  if (!message) {
    console.debug('[WA-REACT] mensagem alvo não encontrada providerMessageId=%s', providerMessageId);
    return;
  }

  const nextReaction = payload.reaction.trim() ? payload.reaction : null;
  const previous = message.reaction ?? null;
  if (previous === nextReaction) return; // sem mudança, sem emit

  const updated = await prisma.chatMessage.update({
    where: { id: message.id },
    data: { reaction: nextReaction },
    select: { id: true, chatId: true, reaction: true }
  });

  emitWhatsAppMessageReaction({
    id: updated.id,
    chatId: canonicalWhatsappChatId(updated.chatId),
    reaction: updated.reaction ?? null
  });
}

/** Roteador de webhooks do provedor WhatsApp (mensagem, ack, presença, reação). */
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
    case 'message.reaction':
      if (!body.payload || typeof body.payload !== 'object') return;
      await applyReactionFromWebhook(body.payload as { targetProviderMessageId: string; reaction: string });
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

/**
 * Resolve o nome legível ("subject") a partir do objeto retornado por
 * `fetchWhatsappProviderGroupById`. Mantemos local para evitar acoplamento
 * com o controller (que tem um helper privado idêntico).
 */
function groupRowDisplayNameLocal(g: WhatsappProviderGroupRow | null): string | null {
  if (!g) return null;
  const gm = g.groupMetadata?.subject?.trim();
  const t = (g.subject || g.name || g.title || gm || '').trim();
  return t || null;
}

/**
 * Cooldown em memória para evitar martelar o provider quando várias mensagens
 * do mesmo grupo chegam em sequência (anti-burst). O cooldown é CURTO (30s)
 * porque a fonte de verdade do "já temos isso" é o banco — quando o cache
 * tem nome E foto, simplesmente não chamamos o provider, sem precisar do
 * cooldown em memória.
 */
const groupMetadataSyncCache = new Map<string, number>();
const GROUP_METADATA_SYNC_BURST_MS = 30_000;

async function scheduleGroupMetadataSync(chatId: string): Promise<void> {
  const canon = canonicalWhatsappChatId(chatId);
  if (!canon.toLowerCase().endsWith('@g.us')) return;

  // Atalho via banco: se já temos nome E foto, nada a fazer.
  const cached = await prisma.whatsappContactCache.findUnique({
    where: { chatId: canon },
    select: { displayName: true, profilePictureUrl: true }
  });
  const haveName = !!cached?.displayName?.trim();
  const havePic = !!cached?.profilePictureUrl?.trim();
  if (haveName && havePic) return;

  // Anti-burst: se já tentamos nos últimos 30s, ignora — evita N chamadas
  // ao provider quando o grupo recebe rajada de mensagens.
  const now = Date.now();
  const last = groupMetadataSyncCache.get(canon);
  if (last && now - last < GROUP_METADATA_SYNC_BURST_MS) return;
  groupMetadataSyncCache.set(canon, now);

  try {
    // Só chama o que está faltando — economiza round-trips quando o grupo
    // já tem nome (cenário típico após o primeiro sync) e só falta a foto.
    // Sequencial (não Promise.all): grupos sem foto geram 500 no EvoGo
    // por `item-not-found`, e duas chamadas paralelas para o mesmo grupo
    // tendem a saturar o whatsmeow IQ pool em rajadas longas.
    const group = haveName ? null : await fetchWhatsappProviderGroupById(canon).catch(() => null);
    const pic = havePic ? null : await fetchWhatsappProviderGroupPictureUrl(canon).catch(() => null);
    const displayName = haveName
      ? cached?.displayName?.trim() || null
      : groupRowDisplayNameLocal(group);
    const profilePictureUrl = havePic ? cached?.profilePictureUrl?.trim() || null : pic;

    if (!displayName && !profilePictureUrl) {
      // Provider não trouxe nada novo. Libera cooldown para retry rápido.
      groupMetadataSyncCache.delete(canon);
      return;
    }
    await persistWhatsappContactCache({
      chatId: canon,
      displayName,
      profilePictureUrl
    });
    emitWhatsAppChatMeta({
      chatId: canon,
      displayName,
      profilePictureUrl
    });
  } catch (err) {
    console.warn(
      '[WA-GROUP-SYNC] falha ao sincronizar metadata do grupo %s: %s',
      canon,
      err instanceof Error ? err.message : String(err)
    );
    groupMetadataSyncCache.delete(canon);
  }
}

/**
 * Backfill em background: sincroniza subject+foto dos grupos que já têm
 * histórico mas nunca tiveram cache populado. Roda 1× quando chamado (idempotente
 * via `groupMetadataSyncCache`), com delay entre cada chamada ao provedor para
 * não saturar o EvoGo.
 *
 * Idealmente chamado uma vez no `app.ts` durante o boot, ou via comando admin.
 */
export async function backfillGroupMetadataCache(limit = 30): Promise<{ processed: number }> {
  const rows = await prisma.$queryRaw<Array<{ chat_id: string }>>`
    SELECT DISTINCT m."chat_id"
    FROM chat_messages m
    LEFT JOIN whatsapp_contact_cache c
      ON c."chat_id" = m."chat_id"
    WHERE m."chat_id" LIKE '%@g.us'
      AND (c."chat_id" IS NULL OR c."display_name" IS NULL OR c."profile_picture_url" IS NULL)
    LIMIT ${limit}
  `;
  let processed = 0;
  for (const r of rows) {
    try {
      await scheduleGroupMetadataSync(r.chat_id);
      processed += 1;
      // ~600 ms entre grupos: respeita o jitter natural do EvoGo e evita 429.
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
    } catch {
      // já logado dentro de scheduleGroupMetadataSync
    }
  }
  return { processed };
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

  const vcardInBody = /BEGIN:VCARD/i.test(content);
  /** Cartão de contato: texto vCard no corpo — não persistir como mídia (evita “📎” + ícone no CRM). */
  const persistHasMedia = vcardInBody ? false : hasMedia;
  const persistMediaUrl = vcardInBody ? undefined : pl.mediaUrl || undefined;
  const persistMediaMimetype = vcardInBody ? undefined : pl.mediaMimetype || undefined;
  const persistMediaFilename = vcardInBody ? undefined : normalizeStoredMediaFilename(pl.mediaFilename);
  const persistProviderMediaId = vcardInBody ? undefined : pl.providerMediaId?.trim() || undefined;
  const persistFileSize = vcardInBody ? undefined : typeof pl.mediaFileSize === 'number' ? pl.mediaFileSize : undefined;

  const chatId = canonicalWhatsappChatId(peerChatIdFromPayload(pl));
  if (waDebugEnabled()) {
    console.debug(
      '[WA-MSG] fromMe=%s peer=%s canonical=%s from=%s to=%s participant=%s pushName=%s',
      String(pl.fromMe),
      peerChatIdFromPayload(pl),
      chatId,
      String(pl.from || ''),
      String(pl.to || ''),
      String(pl.participant || ''),
      String((pl.pushName ?? pl.pushname ?? pl.notify ?? pl.verifiedName ?? pl.name) || '')
    );
  }
  const participant =
    typeof pl.participant === 'string' && pl.participant.trim() ? pl.participant.trim() : undefined;
  const isGroupChat = chatId.toLowerCase().endsWith('@g.us');
  const tsSec = typeof pl.timestamp === 'number' ? pl.timestamp : 0;
  const timestamp = tsSec > 0 ? new Date(tsSec * 1000) : new Date();

  // Cache automático de nome a partir do webhook (sem request extra ao provedor).
  // Usa apenas valores não vazios.
  const inboundDisplayName =
    normalizeMetaString(pl.pushName) ||
    normalizeMetaString(pl.pushname) ||
    normalizeMetaString(pl.notify) ||
    normalizeMetaString(pl.verifiedName) ||
    normalizeMetaString(pl.name) ||
    null;

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
    const storedType = vcardInBody
      ? 'contact'
      : pl.mediaType?.trim() ||
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
        hasMedia: persistHasMedia,
        mediaUrl: persistMediaUrl,
        mediaMimetype: persistMediaMimetype,
        mediaFilename: persistMediaFilename,
        mediaType: storedType || undefined,
        fileSize: persistFileSize,
        providerMediaId: persistProviderMediaId,
        clienteId: clienteId ?? undefined,
        contatoLeadId: contatoLeadId ?? undefined,
        ack: pl.fromMe ? 1 : null
      }
    });

    // Evolution Go com `WEBHOOK_FILES=true` entrega o binário inline no
    // webhook (campo `Message.base64`). Como não há URL pública para baixar
    // depois, persistimos em disco AGORA e atualizamos `mediaUrl` para o
    // schema interno `local-inbound:{id}.{ext}` — o `getWhatsappMediaById`
    // detecta esse prefixo e serve direto do disco.
    let finalRow = created;
    if (
      persistHasMedia &&
      typeof pl.mediaBase64 === 'string' &&
      pl.mediaBase64.length > 0 &&
      !isLocalInboundMediaUrl(created.mediaUrl)
    ) {
      try {
        const saved = await saveInboundMediaBase64ToDisk(
          created.id,
          pl.mediaBase64,
          persistMediaMimetype,
          persistMediaFilename ?? undefined
        );
        if (saved) {
          finalRow = await prisma.chatMessage.update({
            where: { id: created.id },
            data: {
              mediaUrl: saved.mediaUrl,
              fileSize: persistFileSize ?? saved.byteLength
            }
          });
        }
      } catch (e) {
        // Não bloquear o webhook por falha de gravação — a mensagem já está
        // persistida; a UI mostra placeholder até reenvio/diagnóstico.
        console.warn('[whatsappChat] falha ao persistir mídia inbound em disco:', e);
      }
    }
    emitWhatsAppMessage(finalRow);
    if (!finalRow.fromMe) {
      emitUnreadCountUpdated();
    }

    // Best-effort: persiste nome do contato no cache quando o webhook trouxe um nome.
    if (!isGroupChat && inboundDisplayName) {
      try {
        await persistWhatsappContactCache({
          chatId,
          displayName: inboundDisplayName,
          profilePictureUrl: null
        });
        emitWhatsAppChatMeta({
          chatId,
          displayName: inboundDisplayName,
          profilePictureUrl: null
        });
      } catch {
        // cache opcional
      }
    }

    // Grupos: aproveita o `pushName` do remetente para construir o cache de
    // "nome do participante" organicamente — cada nova mensagem alimenta o
    // mapa JID-do-participante → nome, sem hit em `/group/participants`
    // (que está rate-limited e não está portado no bridge EvoGo).
    if (isGroupChat && !pl.fromMe && participant && inboundDisplayName) {
      try {
        const participantJid = canonicalWhatsappChatId(participant);
        await persistWhatsappContactCache({
          chatId: participantJid,
          displayName: inboundDisplayName,
          profilePictureUrl: null
        });
      } catch {
        // cache opcional
      }
    }

    // Grupos: dispara em background (com cooldown) a sincronização de subject
    // e foto do grupo. Sem isso, conversas novas ficam mostrando apenas o ID
    // numérico `12036...@g.us` até o operador abrir o painel.
    if (isGroupChat) {
      void scheduleGroupMetadataSync(chatId).catch(() => undefined);
    }

    // Lógica de "Match" de Contatos (S3E):
    //  - Se já existe contato_s3e para esse número: atualiza pushName/jid/ultima_interacao
    //    (sem tocar em nome_agenda, que tem prioridade na UI).
    //  - Se não existe: cria com revisado=false para o operador revisar depois pela tela
    //    "Contatos S3E". Isso elimina o "nome de cache replicado" e mantém histórico.
    if (!isGroupChat && !pl.fromMe) {
      try {
        await upsertContatoS3eFromInboundMessage({
          chatId,
          pushName: inboundDisplayName
        });
      } catch (err) {
        console.warn('[WA-MSG] upsertContatoS3eFromInboundMessage falhou:', err);
      }
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
  /** Conversa fixada no topo (por usuário). */
  pinned?: boolean;
  /** Conversa favoritada (por usuário). */
  favorite?: boolean;
  /** Nome no CRM (lead ou cliente) para exibir ao lado do número. */
  contactName?: string | null;
  /** Nome WhatsApp (pushname / contatos) persistido após contact-meta. */
  providerCachedName?: string | null;
  /** Nome da agenda S3E (`contatos_s3e.nome_agenda`) — prioridade na UI. */
  agendaS3eName?: string | null;
  /**
   * Telefone real do contato vindo da agenda S3E ou do mapa de identidades.
   * Usado pela UI para formatar o número no header quando o `chatId` é
   * um `@lid` (que não carrega o telefone). Sem este campo o frontend cai
   * em `formatPhoneForDisplay(chatId)` e mostra o ID inteiro do LID.
   */
  phoneNumberFromS3e?: string | null;
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

  // Mapa LID/PN → telefone real, usado para conversas em `@lid` cujo JID
  // não carrega o telefone. Sem isso, o frontend cai em `formatPhoneForDisplay`
  // e termina mostrando o número longo do LID (ex.: 214787053113450).
  const identities = await loadWhatsappChatIdentities();
  const phoneByCanonChat = new Map<string, string>();
  for (const ident of identities) {
    const phone = (ident.phoneDigits || '').trim();
    if (!phone) continue;
    const primary = canonicalWhatsappChatId(ident.primaryChatId);
    if (primary) phoneByCanonChat.set(primary, phone);
    if (Array.isArray(ident.aliases)) {
      for (const a of ident.aliases) {
        if (typeof a !== 'string') continue;
        const ac = canonicalWhatsappChatId(a);
        if (ac) phoneByCanonChat.set(ac, phone);
      }
    }
  }

  const resolvePhoneFromChat = (chatId: string): string => {
    const canon = canonicalWhatsappChatId(chatId);
    const isLid = canon.toLowerCase().endsWith('@lid');
    if (isLid) {
      return phoneByCanonChat.get(canon) || '';
    }
    return canonicalPhoneDigitsFromChatId(canon);
  };

  const phoneKeys = [
    ...new Set(
      rows.map((r) => resolvePhoneFromChat(r.chatId)).filter((k) => Boolean(k && k.length >= 10))
    )
  ];
  const contatosRows =
    phoneKeys.length > 0
      ? await prisma.contatoS3e.findMany({
          where: { numero: { in: phoneKeys } },
          select: { numero: true, nomeAgenda: true, jid: true }
        })
      : [];
  const byNumero = new Map(contatosRows.map((c) => [c.numero, c]));
  const byJid = new Map(
    contatosRows.filter((c) => c.jid?.trim()).map((c) => [canonicalWhatsappChatId(c.jid as string), c])
  );

  return rows.map((r) => {
    const canonChat = canonicalWhatsappChatId(r.chatId);
    const c = byChat.get(canonChat);
    const phoneFromMaps = resolvePhoneFromChat(r.chatId);
    const s3e = phoneFromMaps ? byNumero.get(phoneFromMaps) : undefined;
    const s3eByJid = byJid.get(canonChat);
    const agenda = s3e?.nomeAgenda?.trim() || s3eByJid?.nomeAgenda?.trim() || null;
    const cacheName = c?.displayName?.trim() || null;
    return {
      ...r,
      // O `providerCachedName` mantém o legado (alguns componentes ainda
      // checam só este campo). O novo `agendaS3eName` separa as fontes para
      // a UI poder decidir o que mostrar primeiro.
      providerCachedName: agenda || cacheName || null,
      agendaS3eName: agenda,
      phoneNumberFromS3e: s3e?.numero || s3eByJid?.numero || phoneFromMaps || null,
      cachedProfilePictureUrl: c?.profilePictureUrl?.trim() || null
    };
  });
}

type ReadStateFlagsByCanon = Map<string, { archived: boolean; pinned: boolean; favorite: boolean }>;

async function getReadStateFlagsByCanonicalChatId(userId: string, canonChatIds: string[]): Promise<ReadStateFlagsByCanon> {
  const ids = (canonChatIds || []).map((c) => canonicalWhatsappChatId(c)).filter(Boolean);
  if (ids.length === 0) return new Map();

  const variantIds: string[] = [];
  const seen = new Set<string>();
  for (const cid of ids) {
    for (const v of storageChatIdVariants(cid)) {
      const vv = String(v || '').trim();
      if (!vv || seen.has(vv)) continue;
      seen.add(vv);
      variantIds.push(vv);
    }
  }

  const rows = await prisma.whatsappChatReadState.findMany({
    where: { userId, chatId: { in: variantIds } },
    select: { chatId: true, archived: true, pinned: true, favorite: true }
  });

  const out: ReadStateFlagsByCanon = new Map();
  for (const r of rows) {
    const canon = canonicalWhatsappChatId(r.chatId);
    const prev = out.get(canon) ?? { archived: false, pinned: false, favorite: false };
    out.set(canon, {
      archived: prev.archived || !!r.archived,
      pinned: prev.pinned || !!r.pinned,
      favorite: prev.favorite || !!r.favorite
    });
  }
  return out;
}

function applyReadStateFlags(rows: ChatPreviewRow[], flagsByCanon: ReadStateFlagsByCanon): ChatPreviewRow[] {
  return rows.map((r) => {
    const canon = canonicalWhatsappChatId(r.chatId);
    const f = flagsByCanon.get(canon);
    return {
      ...r,
      pinned: f?.pinned ?? false,
      favorite: f?.favorite ?? false
    };
  });
}

/** Marca conversa como lida até a última mensagem (por usuário logado). */
/** Quantas mensagens inbound enviar por chamada `POST /message/markread`. */
const ACK_INBOUND_READS_BATCH = 80;
/** Janela máx. de mensagens inbound a marcar de uma vez (limitar custos quando o chat acumulou muita coisa). */
const ACK_INBOUND_READS_MAX = 400;

/**
 * Marca mensagens INBOUND como lidas no provedor (Evolution Go), refletindo
 * os dois "✓✓ azuis" no celular do destinatário.
 *
 * Estratégia anti-bot:
 *  - Idempotência global: usa a coluna `providerReadAt` em `chat_messages` para
 *    pular mensagens já marcadas — qualquer um dos 7 operadores pode abrir o
 *    mesmo chat sem disparar markread duplicado.
 *  - Tudo serializado pela fila `withWhatsappSendLock` (skipJitter=true: leitura
 *    não precisa de pausa de 2-5s entre jobs, mas continua respeitando a
 *    serialização global pra não bater junto com envios).
 *  - Erro de provedor não quebra o fluxo do CRM (badge de "não lidas" local
 *    é independente).
 *
 * Retorna a quantidade de mensagens efetivamente marcadas como lidas.
 */
export async function acknowledgeInboundReadsOnProvider(chatId: string): Promise<number> {
  if (!isEvolutionProviderKind()) return 0;
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);

  const pending = await prisma.chatMessage.findMany({
    where: {
      chatId: { in: variants },
      fromMe: false,
      providerReadAt: null,
      providerMessageId: { not: null }
    },
    orderBy: { timestamp: 'asc' },
    take: ACK_INBOUND_READS_MAX,
    select: { id: true, providerMessageId: true }
  });
  if (pending.length === 0) return 0;

  const providerIds = pending
    .map((r) => r.providerMessageId)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (providerIds.length === 0) return 0;

  let marked = 0;
  await withWhatsappSendLock({ label: 'markRead', skipJitter: true }, async () => {
    for (let i = 0; i < providerIds.length; i += ACK_INBOUND_READS_BATCH) {
      const slice = providerIds.slice(i, i + ACK_INBOUND_READS_BATCH);
      try {
        await EvoChat.evolutionMarkMessageAsRead(
          slice.map((id) => ({ remoteJid: canonical, id, fromMe: false }))
        );
        await prisma.chatMessage.updateMany({
          where: { providerMessageId: { in: slice } },
          data: { providerReadAt: new Date() }
        });
        marked += slice.length;
      } catch (err) {
        console.warn(
          '[WA-READ] markread falhou para chat %s (%d ids): %s',
          canonical,
          slice.length,
          err instanceof Error ? err.message : String(err)
        );
        break;
      }
    }
  });

  return marked;
}

export async function markChatRead(userId: string, chatId: string): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  // Inclui PN+LID+variantes BR para cobrir TODAS as gravações do mesmo
  // contato. Sem isso, conversas com histórico em ambos `@c.us` e `@lid`
  // ficam com badge "1" travado: o read state zera só uma família, mas o
  // `listMergedChatPreviews` soma os `unread_count` das duas.
  const identities = await loadWhatsappChatIdentities();
  const variants = expandedStorageChatIdVariants(canonical, identities);
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

  // Reflete ✓✓ azul no celular do cliente. Fire-and-forget: não atrasa a resposta
  // HTTP do operador; idempotência global garante que repetir é seguro.
  void acknowledgeInboundReadsOnProvider(canonical).catch((err) => {
    console.warn(
      '[WA-READ] acknowledgeInboundReadsOnProvider falhou para %s: %s',
      canonical,
      err instanceof Error ? err.message : String(err)
    );
  });
}

/** Pré-visualizações mescladas por chatId (antes de filtrar arquivadas). */
export async function listMergedChatPreviews(userId: string): Promise<ChatPreviewRow[]> {
  const identities = await loadWhatsappChatIdentities();

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
    const key = mergeKeyForChatPreviewRow(row.chatId, identities);
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
  const flagsByCanon = await getReadStateFlagsByCanonicalChatId(userId, sorted.map((s) => s.chatId));
  const archivedCanon = new Set<string>();
  for (const [canon, f] of flagsByCanon.entries()) {
    if (f.archived) archivedCanon.add(canon);
  }
  const visible = sorted.filter((m) => !archivedCanon.has(m.chatId));
  const withFlags = applyReadStateFlags(visible, flagsByCanon);
  const withCrm = await enrichPreviewsWithContactNames(withFlags);
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
  const identities = await loadWhatsappChatIdentities();
  const byMergedKey = new Map(merged.map((m) => [mergeKeyForChatPreviewRow(m.chatId, identities), m]));
  const out: ChatPreviewRow[] = [];

  for (const cid of archivedCanon) {
    const mk = mergeKeyForChatPreviewRow(cid, identities);
    const existing = byMergedKey.get(mk);
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
  const flagsByCanon = await getReadStateFlagsByCanonicalChatId(userId, out.map((s) => s.chatId));
  const withFlags = applyReadStateFlags(out, flagsByCanon);
  const withCrm = await enrichPreviewsWithContactNames(withFlags);
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

  const phoneDigitsKey = normalizePhoneDigitsKey(waJidToDigits(cid));
  const storePhone =
    Boolean(phoneDigitsKey) && phoneDigitsKey.length >= 10 && phoneDigitsKey.length <= 15;

  const updateData: Record<string, string | null> = {};
  if (dn) updateData.displayName = dn;
  if (pic) updateData.profilePictureUrl = pic;
  if (storePhone) updateData.phoneDigits = phoneDigitsKey;

  await prisma.whatsappContactCache.upsert({
    where: { chatId: cid },
    create: {
      chatId: cid,
      displayName: dn,
      profilePictureUrl: pic,
      phoneDigits: storePhone ? phoneDigitsKey : null
    },
    update: updateData
  });

  if (storePhone) {
    try {
      await recordWhatsappChatIdentity({
        phoneDigitsKey,
        primaryChatId: cid,
        source: 'contact_cache',
        extraJids: []
      });
    } catch {
      // identidade é best-effort
    }
  }

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

/**
 * Regrava `whatsapp_contact_cache` com nomes do CRM (lead/cliente) por `chat_id`
 * das mensagens existentes. Opcional: chame com `DELETE /contact-cache?rebuild=1`
 * se quiser repopular o cache; o fluxo padrão de “limpar” só apaga a tabela.
 */
export async function rebuildWhatsappContactCacheFromCrm(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ chat_id: string }>>`
    SELECT DISTINCT "chat_id" as chat_id FROM chat_messages
  `;
  if (!rows.length) return 0;

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

  let upserted = 0;
  for (const { chat_id } of rows) {
    const cidRaw = String(chat_id || '').trim();
    if (!cidRaw) continue;
    const low = cidRaw.toLowerCase();
    if (low.endsWith('@g.us') || low.endsWith('@newsletter')) continue;
    const key = canonicalPhoneDigitsFromChatId(cidRaw);
    const name = key ? lookupName(key) : null;
    if (!name?.trim()) continue;
    const cid = canonicalWhatsappChatId(cidRaw);
    const phoneDigitsCol = key || null;
    await prisma.whatsappContactCache.upsert({
      where: { chatId: cid },
      create: { chatId: cid, displayName: name.trim(), profilePictureUrl: null, phoneDigits: phoneDigitsCol },
      update: { displayName: name.trim(), ...(phoneDigitsCol ? { phoneDigits: phoneDigitsCol } : {}) }
    });
    upserted += 1;
  }
  return upserted;
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

/**
 * Lista mensagens consolidadas para o chat. Considera o mapping LID↔PN da
 * tabela `whatsapp_chat_identities`: ao clicar em um chat (seja pelo LID ou
 * pelo PN antigo), todas as mensagens vinculadas a qualquer um dos JIDs
 * conhecidos do mesmo contato aparecem na mesma timeline.
 *
 * Sem esse merge, o histórico fica fragmentado quando o WhatsApp transita
 * de `@s.whatsapp.net`/`@c.us` para `@lid` (mensagens enviadas pelo PN
 * caem em um chat e as recebidas pelo LID caem em outro).
 */
export async function listMessagesForChat(chatId: string, take = 100): Promise<ChatMessage[]> {
  const canon = canonicalWhatsappChatId(chatId);
  const allVariants = new Set<string>(storageChatIdVariants(canon));

  // Anexa aliases da tabela de identidades — pega tanto o caso em que
  // chamamos pelo LID (e precisamos puxar mensagens do PN antigo) quanto
  // o inverso (chamamos pelo PN e o histórico recente está no LID).
  try {
    const identities = await loadWhatsappChatIdentities();
    for (const row of identities) {
      const primary = canonicalWhatsappChatId(row.primaryChatId);
      const aliases = (Array.isArray(row.aliases) ? row.aliases : [])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => canonicalWhatsappChatId(x.trim()));
      const all = [primary, ...aliases];
      if (all.includes(canon)) {
        for (const j of all) allVariants.add(j);
      }
    }
  } catch (err) {
    console.warn('[WA-MSG] loadWhatsappChatIdentities falhou (usando apenas variantes)', err);
  }

  const rows = await prisma.chatMessage.findMany({
    where: { chatId: { in: [...allVariants] } },
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
  const chatId = canonicalWhatsappChatId(await resolvePreferredChatIdForOutbound(params.chatId));
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
  const chatId = canonicalWhatsappChatId(await resolvePreferredChatIdForOutbound(params.chatId));
  const displayName = await resolveOutboundDisplayName(params.userId, params.userName);
  const safeFilename = params.filename?.trim()
    ? normalizeUserFilename(params.filename) || undefined
    : undefined;

  const captionText = params.caption?.trim()
    ? formatOutboundPrefix(displayName || 'Usuário', params.caption.trim())
    : undefined;

  const sendResult = await sendWhatsappProviderMedia({
    chatId,
    type: params.mediaType,
    base64Data: params.base64Data,
    mimetype: params.mimetype,
    filename: safeFilename,
    caption: captionText
  });

  const label = MEDIA_LABELS[params.mediaType];
  const contentForDb = captionText
    ? `${label}\n${captionText}`
    : `${label}${safeFilename ? ` — ${safeFilename}` : ''}`;

  const clienteId = await resolveClienteIdForChat(chatId);
  const contatoLeadId = await resolveContatoLeadIdForChat(chatId);

  // 1ª gravação: cria a linha com `mediaUrl` provisória (`sendResult.mediaUrl`,
  // que para Evolution Go vem vazio — o provedor não persiste mídia outbound).
  let created = await prisma.chatMessage.create({
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
      mediaFilename: safeFilename,
      mediaType: inferStoredMediaType(params.mimetype || '', safeFilename),
      fileSize: typeof params.fileSize === 'number' ? params.fileSize : undefined,
      clienteId: clienteId ?? undefined,
      contatoLeadId: contatoLeadId ?? undefined
    }
  });

  // Persiste o base64 que acabamos de enviar como mídia local. Sem isso, o
  // `getWhatsappMediaById` cai no fallback do provider (que para EvoGo não
  // guarda outbound) e a UI mostra apenas o nome do arquivo sem preview.
  if (!created.mediaUrl) {
    try {
      const saved = await saveInboundMediaBase64ToDisk(
        created.id,
        params.base64Data,
        params.mimetype,
        safeFilename
      );
      if (saved) {
        created = await prisma.chatMessage.update({
          where: { id: created.id },
          data: {
            mediaUrl: saved.mediaUrl,
            fileSize: saved.byteLength
          }
        });
      }
    } catch (e) {
      console.warn(
        '[WA-MEDIA] Falha ao persistir mídia outbound %s no disco: %s',
        created.id,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  emitWhatsAppMessage(created);
  await markChatRead(params.userId, chatId);

  const isPdfFile =
    params.mediaType === 'file' &&
    (params.mimetype?.toLowerCase().includes('pdf') || safeFilename?.toLowerCase().endsWith('.pdf'));
  if (isPdfFile && safeFilename) {
    const numero = parseOrcamentoNumeroFromPdfFilename(safeFilename);
    if (numero != null) {
      try {
        const orc = await prisma.orcamento.findFirst({
          where: { numeroSequencial: numero },
          select: { id: true, clienteId: true, contatoLeadId: true }
        });
        if (orc) {
          await syncLeadAfterOrcamentoPdfSent({
            chatIdInput: params.chatId,
            chatIdResolved: chatId,
            orcamentoId: orc.id,
            orcamentoClienteId: orc.clienteId,
            orcamentoContatoLeadId: orc.contatoLeadId
          });
        }
      } catch (e) {
        console.warn(
          '[WA-PDF] Falha ao sincronizar lead após PDF de orçamento:',
          e instanceof Error ? e.message : String(e)
        );
      }
    }
  }

  return created;
}

function providerMediaTypeFromRow(row: {
  mediaType?: string | null;
  mediaMimetype?: string | null;
  mediaFilename?: string | null;
}): WhatsappProviderMediaType {
  const st = (row.mediaType || '').toLowerCase().trim();
  if (st === 'image') return 'image';
  if (st === 'video') return 'video';
  if (st === 'audio') return 'voice';
  if (st === 'document') return 'file';
  const m = (row.mediaMimetype || '').toLowerCase().trim();
  const fn = (row.mediaFilename || '').toLowerCase().trim();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/') || fn.endsWith('.ogg') || fn.endsWith('.opus') || fn.endsWith('.webm')) return 'voice';
  return 'file';
}

async function readMediaBytesForRow(row: {
  chatId: string;
  mediaUrl?: string | null;
  providerMessageId?: string | null;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const rangeHeader = undefined;
  let res: Response | null = null;
  const mu = (row.mediaUrl || '').trim();
  if (mu) {
    const internal = resolveWhatsappProviderInternalFetchUrl(mu);
    if (internal) {
      const r = await fetchWhatsappProviderMediaWithRange(internal, rangeHeader);
      if (r.ok || r.status === 206) {
        res = r;
      }
    }
  }
  if (!res && (row.providerMessageId || '').trim()) {
    const variants = storageChatIdVariants(canonicalWhatsappChatId(row.chatId));
    for (const cid of variants) {
      const r = await fetchWhatsappProviderMessageDownloadMedia(cid, String(row.providerMessageId).trim(), rangeHeader);
      if (r.ok || r.status === 206) {
        res = r;
        break;
      }
    }
  }
  if (!res) {
    throw new Error('Não foi possível obter a mídia no provedor para encaminhar.');
  }
  const ct = (res.headers.get('content-type') || 'application/octet-stream').trim() || 'application/octet-stream';
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), contentType: ct };
}

function extractForwardableTextFromMessage(row: ChatMessage): string {
  const raw = (row.content || '').trim();
  if (!raw) return '';
  if (row.fromMe) return stripOutboundPrefixForEdit(raw);
  return raw;
}

function extractForwardableCaptionFromMediaContent(rawContent: string): string | undefined {
  const raw = (rawContent || '').trim();
  if (!raw) return undefined;
  const idx = raw.indexOf('\n');
  if (idx < 0) return undefined;
  const after = raw.slice(idx + 1).trim();
  if (!after) return undefined;
  return stripOutboundPrefixForEdit(after);
}

export async function forwardWhatsappMessagesFromUser(params: {
  userId: string;
  userName?: string | null;
  targetChatId: string;
  messageIds: string[];
}): Promise<{ forwardedCount: number }> {
  const targetChatId = canonicalWhatsappChatId(params.targetChatId);
  const messageIds = (params.messageIds || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!targetChatId) throw new Error('targetChatId inválido');
  if (!messageIds.length) throw new Error('messageIds vazio');

  const rows = await prisma.chatMessage.findMany({
    where: { id: { in: messageIds } },
    orderBy: { timestamp: 'asc' },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = messageIds.map((id) => byId.get(id)).filter(Boolean) as ChatMessage[];

  let forwardedCount = 0;
  for (const row of ordered) {
    const hasMedia = Boolean(row.hasMedia || row.mediaUrl || row.providerMessageId);
    if (!hasMedia) {
      const text = extractForwardableTextFromMessage(row);
      if (!text) continue;
      await sendChatMessageFromUser({
        chatId: targetChatId,
        text,
        userId: params.userId,
        userName: params.userName,
      });
      forwardedCount += 1;
      continue;
    }

    const { buffer, contentType } = await readMediaBytesForRow({
      chatId: row.chatId,
      mediaUrl: row.mediaUrl,
      providerMessageId: row.providerMessageId,
    });
    const mediaType = providerMediaTypeFromRow({
      mediaType: row.mediaType,
      mediaMimetype: row.mediaMimetype || contentType,
      mediaFilename: row.mediaFilename,
    });
    const caption = extractForwardableCaptionFromMediaContent(row.content || '');

    await sendMediaMessageFromUser({
      chatId: targetChatId,
      userId: params.userId,
      userName: params.userName,
      mediaType,
      base64Data: buffer.toString('base64'),
      mimetype: (row.mediaMimetype || contentType || 'application/octet-stream').trim() || 'application/octet-stream',
      filename: normalizeUserFilename(row.mediaFilename || '', 220) || undefined,
      caption,
      fileSize: buffer.length,
    });
    forwardedCount += 1;
  }

  return { forwardedCount };
}

const MAX_WHATSAPP_ORCAMENTO_PDF_BYTES = 12 * 1024 * 1024;

export async function sendOrcamentoPdfToWhatsappChat(params: {
  chatId: string;
  orcamentoId: string;
  userId: string;
  userName?: string | null;
  updateStatusMode?: WhatsappOrcamentoStatusMode;
  /** Mesmo JSON do modal (localStorage `pdf_customization_temp`) — opcional. */
  pdfCustomization?: unknown;
}): Promise<{
  message: ChatMessage;
  statusUpdated: boolean;
  finalMode: WhatsappOrcamentoStatusMode;
  leadId: string | null;
  numeroSequencial: number;
}> {
  const chatIdInput = canonicalWhatsappChatId(params.chatId);
  const chatIdResolved = canonicalWhatsappChatId(await resolvePreferredChatIdForOutbound(params.chatId));
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

  let lead = await findLeadForChat(chatIdInput);
  if (!lead && chatIdResolved !== chatIdInput) {
    lead = await findLeadForChat(chatIdResolved);
  }
  let cliente = await findClienteForChat(chatIdInput);
  if (!cliente && chatIdResolved !== chatIdInput) {
    cliente = await findClienteForChat(chatIdResolved);
  }
  const matchesChat =
    (lead?.id && orcamento.contatoLeadId === lead.id) ||
    (lead?.clienteId && orcamento.clienteId === lead.clienteId) ||
    (cliente?.id && orcamento.clienteId === cliente.id);
  const leadMatchesChatPhone = Boolean(lead?.id);
  if (!matchesChat && !leadMatchesChatPhone) {
    throw new Error(
      'Nenhum lead com o WhatsApp deste contato foi encontrado. Cadastre o lead no funil com o mesmo número ou vincule o orçamento ao cliente do chat.'
    );
  }

  const marcaDagua =
    params.pdfCustomization != null
      ? buildMarcaDaguaFromPdfCustomization(params.pdfCustomization)
      : await resolveMarcaDaguaFromUserTemplate(params.userId);
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await PDFOrcamentoService.gerarPDF(orcamento.id, marcaDagua);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[WA-PDF] falha ao gerar PDF no servidor', { orcamentoId: orcamento.id, detail });
    throw new Error(
      `Não foi possível gerar o PDF do orçamento no servidor${detail ? `: ${detail}` : ''}. Verifique se o Chromium/Puppeteer está disponível no backend.`
    );
  }

  if (!pdfBuffer.length) {
    throw new Error('PDF vazio: não foi possível gerar o arquivo do orçamento.');
  }
  if (pdfBuffer.length > MAX_WHATSAPP_ORCAMENTO_PDF_BYTES) {
    throw new Error('PDF excede o tamanho máximo permitido para envio no WhatsApp (12 MB).');
  }
  if (pdfBuffer.length < 500) {
    console.warn('[WA-PDF] buffer suspeito (muito pequeno)', { bytes: pdfBuffer.length, orcamentoId: orcamento.id });
  }

  const defaultPdfName = `Orcamento-${orcamento.numeroSequencial || orcamento.id}.pdf`;
  const filename = normalizeUserFilename(defaultPdfName) || defaultPdfName;
  const message = await sendMediaMessageFromUser({
    chatId: params.chatId,
    userId: params.userId,
    userName: params.userName,
    mediaType: 'file',
    base64Data: pdfBuffer.toString('base64'),
    mimetype: 'application/pdf',
    filename,
    caption: `Segue o orçamento ${orcamento.numeroSequencial || orcamento.id} conforme tratativa enviado via S3E System.`,
    fileSize: pdfBuffer.length
  });

  if (!message.providerMessageId?.trim()) {
    console.warn('[WA-PDF] envio sem providerMessageId (PDF pode ter sido entregue mesmo assim)', {
      internalMessageId: message.id,
      chatId: message.chatId,
      orcamentoId: orcamento.id
    });
  }

  const { leadId: syncedLeadId } = await syncLeadAfterOrcamentoPdfSent({
    chatIdInput,
    chatIdResolved,
    orcamentoId: orcamento.id,
    orcamentoClienteId: orcamento.clienteId,
    orcamentoContatoLeadId: orcamento.contatoLeadId
  });

  const finalMode = params.updateStatusMode ?? (await getWhatsappOrcamentoStatusUpdateMode(params.userId));
  let statusUpdated = false;
  if (shouldPromoteOrcamentoToEnviadoOnWhatsappPdf(orcamento.status)) {
    await prisma.orcamento.update({
      where: { id: orcamento.id },
      data: { status: 'Enviado ao Cliente' }
    });
    statusUpdated = true;
  }
  return {
    message,
    statusUpdated,
    finalMode,
    leadId: syncedLeadId,
    numeroSequencial: orcamento.numeroSequencial
  };
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

/** Remove a mensagem apenas do CRM (não chama o provedor). */
export async function deleteChatMessageForMe(messageId: string): Promise<{ chatId: string; id: string }> {
  const row = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!row) {
    throw new Error('Mensagem não encontrada');
  }
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

export async function setWhatsappConversationPinned(userId: string, chatId: string, pinned: boolean): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  const at = new Date();
  for (const cid of variants) {
    await prisma.whatsappChatReadState.upsert({
      where: { userId_chatId: { userId, chatId: cid } },
      create: { userId, chatId: cid, lastReadAt: at, pinned: !!pinned },
      update: { pinned: !!pinned }
    });
  }
  emitWhatsAppChatFlags({ chatId: canonical, pinned: !!pinned });
}

export async function setWhatsappConversationFavorite(userId: string, chatId: string, favorite: boolean): Promise<void> {
  const canonical = canonicalWhatsappChatId(chatId);
  const variants = storageChatIdVariants(canonical);
  const at = new Date();
  for (const cid of variants) {
    await prisma.whatsappChatReadState.upsert({
      where: { userId_chatId: { userId, chatId: cid } },
      create: { userId, chatId: cid, lastReadAt: at, favorite: !!favorite },
      update: { favorite: !!favorite }
    });
  }
  emitWhatsAppChatFlags({ chatId: canonical, favorite: !!favorite });
}
