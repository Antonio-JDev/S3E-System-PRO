import { createHash } from 'crypto';
import { Readable } from 'stream';
import multer from 'multer';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import {
  archiveWhatsappConversation,
  clearAllWhatsappContactCache,
  rebuildWhatsappContactCacheFromCrm,
  deleteChatMessageById,
  deleteChatMessageForMe,
  deleteWhatsappConversation,
  editChatMessageById,
  forwardWhatsappMessagesFromUser,
  getWhatsappActionsContext,
  listArchivedChatPreviews,
  listChatPreviews,
  listMessagesForChat,
  linkWhatsappChatToCliente,
  unlinkWhatsappChatFromCliente,
  getWhatsappOrcamentoStatusUpdateMode,
  setWhatsappOrcamentoStatusUpdateMode,
  getMessageMediaDiagnostics,
  markAllWhatsappChatsRead,
  markChatRead,
  persistWhatsappContactCache,
  sendOrcamentoPdfToWhatsappChat,
  sendChatMessageFromUser,
  sendMediaMessageFromUser,
  setWhatsappConversationFavorite,
  setWhatsappConversationPinned,
  toSocketDto,
  unarchiveWhatsappConversation,
  type WhatsappOrcamentoStatusMode
} from '../services/whatsappChat.service';
import { resolveOpenWhatsappChatFromPhone, resolvePreferredChatIdForOutbound } from '../services/whatsappIdentity.service';
import { findContatoS3eNomeAgendaForChat } from '../services/contatosS3e.service';
import { chatIdToEvolutionNumber } from '../services/whatsappProvider.evolution';
import {
  fetchWhatsappProviderSessionStatus,
  fetchWhatsappProviderConnectionQr,
  fetchWhatsappProviderSessionMe,
  fetchWhatsappProviderProfilePictureUrl,
  fetchWhatsappProviderContactsAll,
  searchWhatsappProviderContactsAgenda,
  fetchWhatsappProviderGroupsAll,
  fetchWhatsappProviderGroupById,
  findWhatsappProviderContactInList,
  findWhatsappProviderGroupInList,
  resolveWhatsappProviderContactForChat,
  fetchWhatsappProviderProfilePictureUrlForChat,
  fetchWhatsappProviderGroupPictureUrl,
  subscribeWhatsappProviderChatPresence,
  fetchWhatsappProviderMediaWithRange,
  fetchWhatsappProviderMessageDownloadMedia,
  logoutWhatsappProviderSession,
  checkWhatsappProviderPhoneExists,
  sendWhatsappProviderReaction,
  type WhatsappProviderContactRow,
  type WhatsappProviderGroupRow,
  type WhatsappProviderMediaType
} from '../services/whatsappProvider.service';
import {
  canonicalWhatsappChatId,
  normalizeAudioContentType,
  storageChatIdVariants,
  waJidToDigits
} from '../utils/whatsappChat.util';
import {
  parseFilenameFromMediaUrl,
  resolveWhatsappProviderInternalFetchUrl,
  sanitizeDownloadFilename
} from '../utils/whatsappMediaUrl.util';
import { buildContentDisposition } from '../utils/filename.util';
import {
  isLocalInboundMediaUrl,
  resolveLocalInboundMediaPath
} from '../services/whatsappInboundMedia.service';
import { toStickerWebpFromBuffer } from '../utils/whatsappSticker.util';
import { createReadStream } from 'node:fs';
import { stat as fsStat } from 'node:fs/promises';

function providerContactRowDisplayName(c: WhatsappProviderContactRow | null): string | null {
  if (!c) return null;
  const t = (c.name || c.pushname || c.shortName || '').trim();
  return t || null;
}

function providerGroupRowDisplayName(g: WhatsappProviderGroupRow | null): string | null {
  if (!g) return null;
  const gm = g.groupMetadata?.subject?.trim();
  const t = (g.subject || g.name || g.title || gm || '').trim();
  return t || null;
}

type ProviderCache<T> = { at: number; rows: T[]; refreshPromise?: Promise<void> | null };
let providerContactsCache: ProviderCache<WhatsappProviderContactRow> | null = null;
let providerGroupsCache: ProviderCache<WhatsappProviderGroupRow> | null = null;
/**
 * TTL alto para reduzir tráfego no provedor (Evolution).
 * O frontend pode forçar refresh com `?refresh=1` quando o usuário pedir.
 */
const PROVIDER_CONTACTS_TTL_MS = 10 * 60_000; // 10 min
const PROVIDER_GROUPS_TTL_MS = 10 * 60_000; // 10 min

const CHAT_MESSAGE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const whatsappSendFileMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

function mimetypeToProviderMediaType(mimetype: string, originalname: string): WhatsappProviderMediaType {
  const m = mimetype.toLowerCase();
  const ext = (originalname || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/') || ext.endsWith('.ogg') || ext.endsWith('.opus')) return 'voice';
  return 'file';
}

function isTruthyQueryFlag(v: unknown): boolean {
  return typeof v === 'string' && (v === '1' || v.toLowerCase() === 'true');
}

function stripDataUrlPrefix(b64: string): string {
  const trimmed = (b64 || '').trim();
  const idx = trimmed.indexOf('base64,');
  if (trimmed.toLowerCase().startsWith('data:') && idx >= 0) {
    return trimmed.slice(idx + 'base64,'.length).replace(/\s/g, '');
  }
  return trimmed.replace(/\s/g, '');
}

async function refreshProviderContactsCache(): Promise<void> {
  const now = Date.now();
  const rows = await fetchWhatsappProviderContactsAll({ limit: 500, sortBy: 'name', sortOrder: 'asc' });
  providerContactsCache = { at: now, rows, refreshPromise: null };
}

async function getCachedProviderContacts(params?: { refresh?: boolean }): Promise<WhatsappProviderContactRow[]> {
  const now = Date.now();
  const forceRefresh = Boolean(params?.refresh);

  if (!providerContactsCache) {
    await refreshProviderContactsCache();
  }
  if (!providerContactsCache) return [];

  if (forceRefresh) {
    await refreshProviderContactsCache();
    if (!providerContactsCache) return [];
    return providerContactsCache.rows;
  }

  const age = now - providerContactsCache.at;
  if (age < PROVIDER_CONTACTS_TTL_MS) return providerContactsCache.rows;

  // stale-while-revalidate: devolve stale e atualiza em background
  if (!providerContactsCache.refreshPromise) {
    providerContactsCache.refreshPromise = refreshProviderContactsCache().catch((e) => {
      console.error('refreshProviderContactsCache', e);
      if (providerContactsCache) providerContactsCache.refreshPromise = null;
    });
  }
  return providerContactsCache.rows;
}

async function refreshProviderGroupsCache(): Promise<void> {
  const now = Date.now();
  const rows = await fetchWhatsappProviderGroupsAll();
  providerGroupsCache = { at: now, rows, refreshPromise: null };
}

async function getCachedProviderGroups(params?: { refresh?: boolean }): Promise<WhatsappProviderGroupRow[]> {
  const now = Date.now();
  const forceRefresh = Boolean(params?.refresh);

  if (!providerGroupsCache) {
    await refreshProviderGroupsCache();
  }
  if (!providerGroupsCache) return [];

  if (forceRefresh) {
    await refreshProviderGroupsCache();
    if (!providerGroupsCache) return [];
    return providerGroupsCache.rows;
  }

  const age = now - providerGroupsCache.at;
  if (age < PROVIDER_GROUPS_TTL_MS) return providerGroupsCache.rows;

  if (!providerGroupsCache.refreshPromise) {
    providerGroupsCache.refreshPromise = refreshProviderGroupsCache().catch((e) => {
      console.error('refreshProviderGroupsCache', e);
      if (providerGroupsCache) providerGroupsCache.refreshPromise = null;
    });
  }
  return providerGroupsCache.rows;
}

export async function getWhatsappChats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const data = await listChatPreviews(userId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappChats', e);
    res.status(500).json({ success: false, error: 'Erro ao listar conversas' });
  }
}

export async function getWhatsappActionsContextController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const data = await getWhatsappActionsContext(userId, chatId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappActionsContextController', e);
    res.status(500).json({ success: false, error: 'Erro ao carregar ações do contato' });
  }
}

export async function postWhatsappLinkCliente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    const clienteId = typeof req.body?.clienteId === 'string' ? req.body.clienteId.trim() : '';
    if (!chatId || !clienteId) {
      res.status(400).json({ success: false, error: 'chatId e clienteId são obrigatórios' });
      return;
    }
    await linkWhatsappChatToCliente(chatId, clienteId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappLinkCliente', e);
    const message = e instanceof Error ? e.message : 'Erro ao vincular contato ao cliente';
    const status = message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

export async function postWhatsappUnlinkCliente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await unlinkWhatsappChatFromCliente(chatId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappUnlinkCliente', e);
    const message = e instanceof Error ? e.message : 'Erro ao desvincular contato do cliente';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getWhatsappOrcamentoStatusModeController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const mode = await getWhatsappOrcamentoStatusUpdateMode(userId);
    res.json({ success: true, data: { mode } });
  } catch (e) {
    console.error('getWhatsappOrcamentoStatusModeController', e);
    res.status(500).json({ success: false, error: 'Erro ao buscar configuração de status do orçamento' });
  }
}

export async function putWhatsappOrcamentoStatusModeController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const modeRaw = typeof req.body?.mode === 'string' ? req.body.mode.trim() : '';
    if (modeRaw !== 'manual' && modeRaw !== 'automatic') {
      res.status(400).json({ success: false, error: 'mode deve ser "manual" ou "automatic"' });
      return;
    }
    const mode = await setWhatsappOrcamentoStatusUpdateMode(userId, modeRaw as WhatsappOrcamentoStatusMode);
    res.json({ success: true, data: { mode } });
  } catch (e) {
    console.error('putWhatsappOrcamentoStatusModeController', e);
    res.status(500).json({ success: false, error: 'Erro ao salvar configuração de status do orçamento' });
  }
}

export async function postWhatsappSendOrcamentoPdf(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    const orcamentoId = typeof req.body?.orcamentoId === 'string' ? req.body.orcamentoId.trim() : '';
    const modeRaw = typeof req.body?.mode === 'string' ? req.body.mode.trim() : '';
    if (!chatId || !orcamentoId) {
      res.status(400).json({ success: false, error: 'chatId e orcamentoId são obrigatórios' });
      return;
    }
    if (modeRaw && modeRaw !== 'manual' && modeRaw !== 'automatic') {
      res.status(400).json({ success: false, error: 'mode deve ser "manual" ou "automatic"' });
      return;
    }
    const rawPdfCustomization = (req.body as Record<string, unknown>)?.pdfCustomization;
    let pdfCustomization: unknown = undefined;
    if (rawPdfCustomization != null && typeof rawPdfCustomization === 'object' && !Array.isArray(rawPdfCustomization)) {
      pdfCustomization = rawPdfCustomization;
    } else if (typeof rawPdfCustomization === 'string' && rawPdfCustomization.trim()) {
      try {
        const parsed = JSON.parse(rawPdfCustomization) as unknown;
        if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          pdfCustomization = parsed;
        }
      } catch {
        // ignora JSON inválido
      }
    }
    const result = await sendOrcamentoPdfToWhatsappChat({
      chatId,
      orcamentoId,
      userId,
      userName: req.user?.name || null,
      updateStatusMode: modeRaw ? (modeRaw as WhatsappOrcamentoStatusMode) : undefined,
      pdfCustomization
    });
    res.status(200).json({
      success: true,
      data: {
        message: toSocketDto(result.message),
        statusUpdated: result.statusUpdated,
        mode: result.finalMode,
        leadId: result.leadId,
        numeroSequencial: result.numeroSequencial
      }
    });
  } catch (e) {
    console.error('postWhatsappSendOrcamentoPdf', e);
    const message = e instanceof Error ? e.message : 'Erro ao enviar PDF do orçamento';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getWhatsappArchivedChats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const data = await listArchivedChatPreviews(userId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappArchivedChats', e);
    res.status(500).json({ success: false, error: 'Erro ao listar conversas arquivadas' });
  }
}

export async function postWhatsappUnarchive(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await unarchiveWhatsappConversation(userId, chatId);
    providerContactsCache = null;
    providerGroupsCache = null;
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappUnarchive', e);
    res.status(500).json({ success: false, error: 'Erro ao desarquivar conversa' });
  }
}

export async function postWhatsappMarkAllRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    await markAllWhatsappChatsRead(userId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappMarkAllRead', e);
    res.status(500).json({ success: false, error: 'Erro ao marcar conversas como lidas' });
  }
}

export async function getWhatsappSessionProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const me = await fetchWhatsappProviderSessionMe();
    let wid: string | null = null;
    if (me) {
      if (typeof me.id === 'string') wid = me.id;
      else if (typeof me.wid === 'string') wid = me.wid;
      else {
        const nested = me.me;
        if (nested && typeof nested === 'object' && typeof (nested as Record<string, unknown>).id === 'string') {
          wid = String((nested as Record<string, unknown>).id);
        }
      }
    }
    let profilePictureUrl: string | null = null;
    if (wid?.length) {
      profilePictureUrl = await fetchWhatsappProviderProfilePictureUrl(wid);
    }
    res.json({
      success: true,
      data: {
        sessionProfile: me,
        profilePictureUrl,
        whatsappId: wid
      }
    });
  } catch (e) {
    console.error('getWhatsappSessionProfile', e);
    res.status(500).json({ success: false, error: 'Erro ao obter perfil da sessão WhatsApp' });
  }
}

export async function postWhatsappMarkRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await markChatRead(userId, chatId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappMarkRead', e);
    res.status(500).json({ success: false, error: 'Erro ao marcar como lida' });
  }
}

export async function getWhatsappUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const previews = await listChatPreviews(userId);
    const total = previews.reduce((s, r) => s + (Number.isFinite(r.unreadCount) ? r.unreadCount : 0), 0);
    res.json({ success: true, data: { total } });
  } catch (e) {
    console.error('getWhatsappUnreadCount', e);
    res.status(500).json({ success: false, error: 'Erro ao calcular não lidas' });
  }
}

export async function getWhatsappMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const take = Math.min(Number(req.query.take) || 100, 500);
    const rows = await listMessagesForChat(chatId, take);
    res.json({ success: true, data: rows.map(toSocketDto) });
  } catch (e) {
    console.error('getWhatsappMessages', e);
    res.status(500).json({ success: false, error: 'Erro ao carregar mensagens' });
  }
}

/** Diagnóstico de mídia (BD + reescrita de URL do provedor) — ver `hints`. */
export async function getWhatsappMessageMediaDiagnostics(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const messageId = typeof req.params.messageId === 'string' ? req.params.messageId.trim() : '';
    if (!messageId) {
      res.status(400).json({ success: false, error: 'messageId é obrigatório' });
      return;
    }
    const data = await getMessageMediaDiagnostics(messageId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappMessageMediaDiagnostics', e);
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro ao diagnosticar mídia' });
  }
}

export async function getWhatsappConnectionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const s = await fetchWhatsappProviderSessionStatus();
    const dashboardUrl =
      process.env.WHATSAPP_PROVIDER_DASHBOARD_PUBLIC_URL?.trim() ||
      'http://localhost:3333/manager';
    res.json({
      success: true,
      data: {
        connected: s.connected,
        reachable: s.reachable,
        sessionStatus: s.status,
        dashboardUrl
      }
    });
  } catch (e) {
    console.error('getWhatsappConnectionStatus', e);
    res.status(500).json({ success: false, error: 'Erro ao consultar o provedor WhatsApp' });
  }
}

export async function getWhatsappConnectionQr(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const data = await fetchWhatsappProviderConnectionQr();
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappConnectionQr', e);
    const msg = e instanceof Error ? e.message : 'Erro ao obter QR code do provedor WhatsApp';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function postWhatsappProviderLogout(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    await logoutWhatsappProviderSession();
    providerContactsCache = null;
    providerGroupsCache = null;
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappProviderLogout', e);
    const msg = e instanceof Error ? e.message : 'Erro ao desconectar o WhatsApp';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getWhatsappProviderContactsIndex(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 150_000);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const sortBy = req.query.sortBy === 'id' ? 'id' : 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const refresh = isTruthyQueryFlag(req.query.refresh);
    const useCache =
      limit === 500 &&
      offset === 0 &&
      sortBy === 'name' &&
      sortOrder === 'asc' &&
      !refresh;

    const rows = useCache
      ? await getCachedProviderContacts({ refresh })
      : await fetchWhatsappProviderContactsAll({ limit, offset, sortBy, sortOrder });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getWhatsappProviderContactsIndex', e);
    res.status(500).json({ success: false, error: 'Erro ao listar contatos do provedor' });
  }
}

/** Busca na agenda do WhatsApp (contatos salvos no aparelho) por nome ou número. */
export async function getWhatsappProviderContactsSearch(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const raw =
      typeof req.query.query === 'string'
        ? req.query.query
        : typeof req.query.q === 'string'
          ? req.query.q
          : '';
    const q = raw.trim();
    if (!q) {
      res.status(400).json({ success: false, error: 'Informe query ou q (nome ou número)' });
      return;
    }
    const rows = await searchWhatsappProviderContactsAgenda(q);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getWhatsappProviderContactsSearch', e);
    res.status(500).json({ success: false, error: 'Erro ao buscar contatos na agenda do WhatsApp' });
  }
}

export async function getWhatsappProviderCheckPhone(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
    if (!phone.replace(/\D/g, '').length) {
      res.status(400).json({ success: false, error: 'Informe o telefone (DDI + DDD + número, ex.: 5511999999999)' });
      return;
    }
    const data = await checkWhatsappProviderPhoneExists(phone);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappProviderCheckPhone', e);
    const msg = e instanceof Error ? e.message : 'Erro ao verificar número';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getWhatsappProviderGroupsIndex(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const refresh = isTruthyQueryFlag(req.query.refresh);
    const rows = await getCachedProviderGroups({ refresh });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getWhatsappProviderGroupsIndex', e);
    res.status(500).json({ success: false, error: 'Erro ao listar grupos do provedor' });
  }
}

export async function getWhatsappProviderProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const url = await fetchWhatsappProviderProfilePictureUrlForChat(chatId);
    res.json({ success: true, data: { url } });
  } catch (e) {
    console.error('getWhatsappProviderProfilePicture', e);
    res.status(500).json({ success: false, error: 'Erro ao obter foto do contato' });
  }
}

/** Imagem da foto de perfil (cache em disco; browser não acessa CDN do WhatsApp). */
export async function getWhatsappProfilePictureImageController(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const { getWhatsappProfilePictureImage } = await import('../services/whatsappProfilePictureImage.service');
    const img = await getWhatsappProfilePictureImage(chatId);
    if (!img) {
      res.status(404).end();
      return;
    }
    const etag = `"${createHash('sha256').update(img.etag).digest('hex').slice(0, 32)}"`;
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('ETag', etag);
    res.send(img.buffer);
  } catch (e) {
    console.error('getWhatsappProfilePictureImageController', e);
    res.status(500).json({ success: false, error: 'Erro ao carregar foto do contato' });
  }
}

export async function getWhatsappProviderContactMeta(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }

    if (chatId.toLowerCase().endsWith('@g.us')) {
      const rows = await getCachedProviderGroups();
      let group: WhatsappProviderGroupRow | null = findWhatsappProviderGroupInList(rows, chatId) ?? null;
      if (!group) {
        group = await fetchWhatsappProviderGroupById(chatId);
      }
      const profilePictureUrl = await fetchWhatsappProviderGroupPictureUrl(chatId);
      try {
        await persistWhatsappContactCache({
          chatId,
          displayName: providerGroupRowDisplayName(group),
          profilePictureUrl
        });
      } catch {
        /* cache opcional */
      }
      res.json({
        success: true,
        data: { contact: null, group, profilePictureUrl }
      });
      return;
    }

    const rows = await getCachedProviderContacts();
    let contact: WhatsappProviderContactRow | null = findWhatsappProviderContactInList(rows, chatId) ?? null;
    if (!contact) {
      contact = await resolveWhatsappProviderContactForChat(chatId);
    }
    const profilePictureUrl = await fetchWhatsappProviderProfilePictureUrlForChat(chatId);
    const s3eHit = await findContatoS3eNomeAgendaForChat(chatId);
    try {
      await persistWhatsappContactCache({
        chatId,
        displayName: providerContactRowDisplayName(contact),
        profilePictureUrl
      });
    } catch {
      /* cache opcional */
    }
    res.json({
      success: true,
      data: {
        contact,
        group: null,
        profilePictureUrl,
        nomeAgendaS3e: s3eHit.nomeAgenda,
        numeroContatoS3e: s3eHit.numero
      }
    });
  } catch (e) {
    console.error('getWhatsappProviderContactMeta', e);
    res.status(500).json({ success: false, error: 'Erro ao obter dados do contato' });
  }
}

/**
 * Resolve nomes de participantes de um grupo a partir do **cache local**.
 *
 * Fontes (em ordem de prioridade):
 *  1. `whatsapp_contact_cache.displayName` por JID exato do participante
 *     (alimentado organicamente pelo webhook quando alguém manda mensagem).
 *  2. `contatos_s3e.nomeAgenda` (cruzando por `phone_digits`).
 *  3. Sem hit: fallback `null` (frontend mostra `+digits`).
 *
 * Por que NÃO chamamos o provider aqui:
 *  - `/group/participants` está rate-limited na EvoGo;
 *  - `/group/info` retorna a lista mas é pesado e gera 429 facilmente.
 *  Esta rota é "barata": só leitura no banco. O frontend pode chamá-la em
 *  toda abertura de grupo sem medo de derrubar o provedor.
 */
export async function getWhatsappGroupParticipantNames(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId || !chatId.toLowerCase().endsWith('@g.us')) {
      res.status(400).json({ success: false, error: 'chatId de grupo inválido' });
      return;
    }
    const canon = canonicalWhatsappChatId(chatId);
    const variants = storageChatIdVariants(canon);

    const distinctRows = await prisma.chatMessage.findMany({
      where: {
        chatId: { in: variants },
        participant: { not: null }
      },
      distinct: ['participant'],
      select: { participant: true }
    });
    const participantJids = [
      ...new Set(
        distinctRows
          .map((r) => (r.participant ? r.participant.trim() : ''))
          .filter((j) => j.length > 0)
      )
    ];
    if (participantJids.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    const canonJids = participantJids.map((j) => canonicalWhatsappChatId(j));
    const cacheRows = await prisma.whatsappContactCache.findMany({
      where: { chatId: { in: canonJids } },
      select: { chatId: true, displayName: true }
    });
    const cacheByJid = new Map(cacheRows.map((r) => [r.chatId, r.displayName?.trim() || null]));

    // Cruzamento adicional com agenda S3E pelos dígitos (fonte máxima de prioridade).
    const phoneDigitsList = canonJids
      .map((j) => waJidToDigits(j))
      .filter((d) => d.length >= 10);
    const s3eRows = phoneDigitsList.length
      ? await prisma.contatoS3e.findMany({
          where: { numero: { in: phoneDigitsList } },
          select: { numero: true, nomeAgenda: true }
        })
      : [];
    const s3eByPhone = new Map(s3eRows.map((r) => [r.numero, r.nomeAgenda?.trim() || null]));

    const data = canonJids.map((jid, idx) => {
      const digits = waJidToDigits(jid);
      const agendaName = digits ? s3eByPhone.get(digits) : null;
      const cacheName = cacheByJid.get(jid) ?? null;
      return {
        jid: participantJids[idx],
        canonicalJid: jid,
        digits,
        displayName: (agendaName || cacheName || '').trim() || null
      };
    });

    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappGroupParticipantNames', e);
    res.status(500).json({ success: false, error: 'Erro ao listar participantes' });
  }
}

/**
 * Atualiza o cache de nome/foto do contato (whatsapp_contact_cache).
 * Usado quando a Evolution retorna nome/foto mais confiáveis que a agenda/cache do provedor.
 */
export async function postWhatsappUpsertContactCache(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const profilePictureUrl =
      typeof req.body?.profilePictureUrl === 'string' ? req.body.profilePictureUrl.trim() : '';
    await persistWhatsappContactCache({
      chatId,
      displayName: displayName || null,
      profilePictureUrl: profilePictureUrl || null
    });
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappUpsertContactCache', e);
    res.status(500).json({ success: false, error: 'Erro ao atualizar cache do contato' });
  }
}

export async function deleteWhatsappContactCacheAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const rebuildRaw = req.query.rebuild;
    const rebuildFromCrm =
      rebuildRaw === '1' ||
      rebuildRaw === 'true' ||
      (typeof rebuildRaw === 'string' && rebuildRaw.toLowerCase() === 'yes');
    const deleted = await clearAllWhatsappContactCache();
    let rebuilt = 0;
    if (rebuildFromCrm) {
      try {
        rebuilt = await rebuildWhatsappContactCacheFromCrm();
      } catch (rebuildErr) {
        console.error('rebuildWhatsappContactCacheFromCrm após limpar cache', rebuildErr);
      }
    }
    res.json({ success: true, data: { deleted, rebuilt } });
  } catch (e) {
    console.error('deleteWhatsappContactCacheAll', e);
    res.status(500).json({ success: false, error: 'Erro ao limpar cache de contatos' });
  }
}

/** Resolve JID ativo (LID vs PN) a partir do telefone — abrir chat pelo Funil/agenda. */
export async function getWhatsappResolveOpenChat(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
    if (!phone.replace(/\D/g, '').length) {
      res.status(400).json({ success: false, error: 'Informe o telefone' });
      return;
    }
    const data = await resolveOpenWhatsappChatFromPhone(phone);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getWhatsappResolveOpenChat', e);
    const msg = e instanceof Error ? e.message : 'Erro ao resolver conversa';
    res.status(400).json({ success: false, error: msg });
  }
}

/** JID/número a usar nas rotas Evolution fetch-profile (evita Bad Request com @lid cru). */
export async function getWhatsappProfileFetchTarget(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    const resolved = await resolvePreferredChatIdForOutbound(chatId);
    const target = chatIdToEvolutionNumber(canonicalWhatsappChatId(resolved));
    res.json({ success: true, data: { target, resolvedChatId: canonicalWhatsappChatId(resolved) } });
  } catch (e) {
    console.error('getWhatsappProfileFetchTarget', e);
    res.status(500).json({ success: false, error: 'Erro ao resolver JID para perfil' });
  }
}

export async function deleteWhatsappMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const messageId = typeof req.params.messageId === 'string' ? req.params.messageId.trim() : '';
    if (!messageId) {
      res.status(400).json({ success: false, error: 'messageId é obrigatório' });
      return;
    }
    const data = await deleteChatMessageById(messageId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('deleteWhatsappMessage', e);
    const msg = e instanceof Error ? e.message : 'Erro ao excluir mensagem';
    res.status(400).json({ success: false, error: msg });
  }
}

export async function deleteWhatsappMessageForMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const messageId = typeof req.params?.messageId === 'string' ? req.params.messageId.trim() : '';
    if (!messageId) {
      res.status(400).json({ success: false, error: 'messageId é obrigatório' });
      return;
    }
    const data = await deleteChatMessageForMe(messageId);
    res.json({ success: true, data });
  } catch (e) {
    console.error('deleteWhatsappMessageForMe', e);
    const message = e instanceof Error ? e.message : 'Erro ao apagar mensagem';
    res.status(message.includes('não encontrada') ? 404 : 400).json({ success: false, error: message });
  }
}

export async function putWhatsappMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const messageId = typeof req.params.messageId === 'string' ? req.params.messageId.trim() : '';
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    if (!messageId || !text.trim()) {
      res.status(400).json({ success: false, error: 'messageId e text são obrigatórios' });
      return;
    }
    const updated = await editChatMessageById({
      messageId,
      text,
      userId,
      userName: req.user?.name
    });
    res.json({ success: true, data: toSocketDto(updated) });
  } catch (e) {
    console.error('putWhatsappMessage', e);
    const msg = e instanceof Error ? e.message : 'Erro ao editar mensagem';
    res.status(400).json({ success: false, error: msg });
  }
}

/**
 * `POST /api/whatsapp/messages/:messageId/react`
 *
 * Body: `{ emoji: string }` — passe `""` para REMOVER a reação enviada antes.
 *
 * Recebe um `messageId` interno (UUID em `chat_messages.id`) para evitar que o
 * frontend precise lidar com IDs do provedor. O backend resolve `chatId` e
 * `providerMessageId` no DB, e despacha para o `sendWhatsappProviderReaction`
 * — que serializa pelo lock global (anti-ban) com `skipJitter: true`.
 *
 * Limita o emoji a no máx. 16 chars (alguns combos com modificadores tipo
 * `👨‍👩‍👧` ficam grandes em UTF-16; 16 é folgado e não trava bug).
 */
export async function postWhatsappReactToMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const messageId = typeof req.params.messageId === 'string' ? req.params.messageId.trim() : '';
    if (!messageId || !CHAT_MESSAGE_UUID_RE.test(messageId)) {
      res.status(400).json({ success: false, error: 'messageId inválido' });
      return;
    }
    const rawEmoji = typeof req.body?.emoji === 'string' ? req.body.emoji : '';
    const emoji = rawEmoji.trim();
    if (emoji.length > 16) {
      res.status(400).json({ success: false, error: 'emoji muito longo' });
      return;
    }
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, providerMessageId: true, fromMe: true }
    });
    if (!message) {
      res.status(404).json({ success: false, error: 'Mensagem não encontrada' });
      return;
    }
    if (!message.providerMessageId) {
      res.status(409).json({
        success: false,
        error: 'Mensagem ainda não foi entregue ao provedor (sem providerMessageId)'
      });
      return;
    }
    await sendWhatsappProviderReaction({
      chatId: message.chatId,
      providerMessageId: message.providerMessageId,
      fromMe: message.fromMe,
      emoji
    });
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappReactToMessage', e);
    const msg = e instanceof Error ? e.message : 'Erro ao reagir à mensagem';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function postWhatsappForwardMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const targetChatId = typeof (req.body as any)?.targetChatId === 'string' ? String((req.body as any).targetChatId).trim() : '';
    const messageIdsRaw = (req.body as any)?.messageIds as unknown;
    const messageIds =
      Array.isArray(messageIdsRaw) ? messageIdsRaw.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean) : [];

    if (!targetChatId) {
      res.status(400).json({ success: false, error: 'targetChatId é obrigatório' });
      return;
    }
    if (!messageIds.length) {
      res.status(400).json({ success: false, error: 'messageIds é obrigatório (array não vazio)' });
      return;
    }
    if (messageIds.length > 50) {
      res.status(400).json({ success: false, error: 'Limite: no máximo 50 mensagens por encaminhamento' });
      return;
    }

    const result = await forwardWhatsappMessagesFromUser({
      userId,
      userName: req.user?.name || null,
      targetChatId,
      messageIds,
    });
    res.status(201).json({ success: true, data: { forwardedCount: result.forwardedCount } });
  } catch (e) {
    console.error('postWhatsappForwardMessages', e);
    const msg = e instanceof Error ? e.message : 'Erro ao encaminhar mensagens';
    res.status(400).json({ success: false, error: msg });
  }
}

/**
 * Proxy autenticado por id da linha `chat_messages` (param :mediaId).
 * Encaminha Range para o provedor quando houver mídia por URL ou por download da mensagem.
 */
export async function getWhatsappMediaById(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const mediaId = typeof req.params.mediaId === 'string' ? req.params.mediaId.trim() : '';
    if (!mediaId || !CHAT_MESSAGE_UUID_RE.test(mediaId)) {
      res.status(400).json({ success: false, error: 'mediaId inválido' });
      return;
    }
    const row = await prisma.chatMessage.findUnique({ where: { id: mediaId } });
    if (!row?.hasMedia) {
      res.status(404).json({ success: false, error: 'Mídia não encontrada' });
      return;
    }
    const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
    const forceDownload = isTruthyQueryFlag(req.query.download);

    // Mídia recebida da Evolution Go (WEBHOOK_FILES=true) foi persistida em
    // disco no momento do webhook. Servimos direto do disco sem chamar o
    // provedor — mais rápido e o provedor não tem mais como recuperar.
    if (row.mediaUrl && isLocalInboundMediaUrl(row.mediaUrl)) {
      const abs = resolveLocalInboundMediaPath(row.mediaUrl);
      if (!abs) {
        res.status(404).json({ success: false, error: 'Mídia local inválida' });
        return;
      }
      let st;
      try {
        st = await fsStat(abs);
      } catch {
        res.status(404).json({ success: false, error: 'Arquivo de mídia não encontrado em disco' });
        return;
      }
      const ct = normalizeAudioContentType(row.mediaMimetype || 'application/octet-stream', row.mediaFilename);
      const docName =
        (row.mediaFilename && row.mediaFilename.trim()) ||
        parseFilenameFromMediaUrl(row.mediaUrl || '') ||
        'arquivo';
      const dispName = sanitizeDownloadFilename(docName, 'arquivo');
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Length', String(st.size));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      if (forceDownload) {
        res.setHeader('Content-Disposition', buildContentDisposition('attachment', dispName, 'arquivo'));
      } else {
        res.setHeader('Content-Disposition', buildContentDisposition('inline', dispName, 'arquivo'));
      }
      // Range simples: serve apenas se solicitado (HTML5 audio/video tags).
      if (rangeHeader) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
          if (start <= end && end < st.size) {
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
            res.setHeader('Content-Length', String(end - start + 1));
            createReadStream(abs, { start, end }).pipe(res);
            return;
          }
        }
      }
      createReadStream(abs).pipe(res);
      return;
    }

    let providerFetchRes: globalThis.Response | null = null;
    if (row.mediaUrl?.trim()) {
      const internal = resolveWhatsappProviderInternalFetchUrl(row.mediaUrl.trim());
      if (internal) {
        const r = await fetchWhatsappProviderMediaWithRange(internal, rangeHeader);
        if (r.ok || r.status === 206) {
          providerFetchRes = r;
        }
      }
    }
    if (!providerFetchRes && row.providerMessageId?.trim()) {
      const variants = storageChatIdVariants(canonicalWhatsappChatId(row.chatId));
      for (const cid of variants) {
        const r = await fetchWhatsappProviderMessageDownloadMedia(cid, row.providerMessageId, rangeHeader);
        if (r.ok || r.status === 206) {
          providerFetchRes = r;
          break;
        }
      }
    }

    if (!providerFetchRes) {
      res.status(502).json({ success: false, error: 'Não foi possível obter a mídia no provedor' });
      return;
    }

    const ct = normalizeAudioContentType(
      providerFetchRes.headers.get('content-type') || row.mediaMimetype,
      row.mediaFilename
    );
    res.status(providerFetchRes.status);
    res.setHeader('Content-Type', ct);
    const docName =
      (row.mediaFilename && row.mediaFilename.trim()) ||
      parseFilenameFromMediaUrl(row.mediaUrl || '') ||
      'arquivo';
    const dispName = sanitizeDownloadFilename(docName, 'arquivo');
    if (forceDownload) {
      res.setHeader('Content-Disposition', buildContentDisposition('attachment', dispName, 'arquivo'));
    } else {
      res.setHeader('Content-Disposition', buildContentDisposition('inline', dispName, 'arquivo'));
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const cr = providerFetchRes.headers.get('content-range');
    if (cr) {
      res.setHeader('Content-Range', cr);
    }
    const ar = providerFetchRes.headers.get('accept-ranges');
    if (ar) {
      res.setHeader('Accept-Ranges', ar);
    }
    const cl = providerFetchRes.headers.get('content-length');
    if (cl) {
      res.setHeader('Content-Length', cl);
    }

    if (providerFetchRes.body) {
      Readable.fromWeb(providerFetchRes.body as import('stream/web').ReadableStream).pipe(res);
      return;
    }

    const buf = Buffer.from(await providerFetchRes.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error('getWhatsappMediaById', e);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Erro ao transmitir mídia' });
    }
  }
}

export async function postWhatsappSendFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const file = req.file;
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
    if (!file || !chatId) {
      res.status(400).json({ success: false, error: 'chatId e arquivo (field file) são obrigatórios' });
      return;
    }
    const wantsSticker =
      req.body?.asSticker === '1' ||
      req.body?.asSticker === 'true' ||
      req.body?.mediaType === 'sticker';
    let mimetype = file.mimetype || 'application/octet-stream';
    let mediaType: WhatsappProviderMediaType = mimetypeToProviderMediaType(mimetype, file.originalname || '');
    let filename = file.originalname || undefined;
    let dataBuffer = file.buffer;
    if (wantsSticker) {
      dataBuffer = await toStickerWebpFromBuffer(file.buffer);
      mimetype = 'image/webp';
      mediaType = 'sticker';
      filename = 'sticker.webp';
    }
    const base64Data = dataBuffer.toString('base64');
    const quotedMessageId =
      typeof req.body?.quotedMessageId === 'string' ? req.body.quotedMessageId.trim() : undefined;
    const created = await sendMediaMessageFromUser({
      chatId,
      userId,
      userName: req.user?.name,
      mediaType,
      base64Data,
      mimetype,
      filename,
      caption: caption || undefined,
      fileSize: dataBuffer.length,
      quotedMessageId
    });
    res.json({ success: true, data: toSocketDto(created) });
  } catch (e) {
    console.error('postWhatsappSendFile', e);
    const msg = e instanceof Error ? e.message : 'Erro ao enviar arquivo';
    const isProviderDocLimit = msg.includes('Limitação de plano do provedor') || msg.includes('HTTP 422');
    res.status(isProviderDocLimit ? 422 : 500).json({ success: false, error: msg });
  }
}

export async function getWhatsappProviderMediaProxy(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const fileUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!fileUrl) {
      res.status(400).json({ success: false, error: 'url é obrigatório' });
      return;
    }
    const internalUrl = resolveWhatsappProviderInternalFetchUrl(fileUrl);
    if (!internalUrl) {
      res.status(400).json({
        success: false,
        error:
          'URL de mídia não reconhecida (esperado caminho tipo /api/files/…, host público em WHATSAPP_PROVIDER_PUBLIC_URL ou host permitido em WHATSAPP_MEDIA_ALLOWED_HOSTS).'
      });
      return;
    }

    const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
    const headers: Record<string, string> = { Accept: '*/*' };
    const providerBase = (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(/\/$/, '');
    const isProviderInternalTarget = internalUrl.startsWith(providerBase);
    if (isProviderInternalTarget) {
      const key = process.env.WHATSAPP_PROVIDER_API_KEY?.trim();
      if (key) {
        headers['X-Api-Key'] = key;
        headers.apikey = key;
      }
    }
    if (rangeHeader) headers['Range'] = rangeHeader;

    const upstream = await fetch(internalUrl, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).json({ success: false, error: 'Provedor WhatsApp retornou erro' });
      return;
    }
    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    const qFilename =
      typeof req.query.filename === 'string' && req.query.filename.trim()
        ? sanitizeDownloadFilename(req.query.filename.trim(), 'arquivo')
        : undefined;
    const wantsAttach = isTruthyQueryFlag(req.query.attachment) || isTruthyQueryFlag(req.query.download);

    res.status(upstream.status);
    res.setHeader('Content-Type', ct);
    if (wantsAttach) {
      const name =
        qFilename ||
        parseFilenameFromMediaUrl(fileUrl) ||
        parseFilenameFromMediaUrl(internalUrl) ||
        'arquivo';
      res.setHeader(
        'Content-Disposition',
        buildContentDisposition('attachment', sanitizeDownloadFilename(name, 'arquivo'), 'arquivo')
      );
    } else {
      const inlineName =
        qFilename ||
        parseFilenameFromMediaUrl(fileUrl) ||
        parseFilenameFromMediaUrl(internalUrl) ||
        'arquivo';
      res.setHeader(
        'Content-Disposition',
        buildContentDisposition('inline', sanitizeDownloadFilename(inlineName, 'arquivo'), 'arquivo')
      );
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    const ar = upstream.headers.get('accept-ranges');
    if (ar) res.setHeader('Accept-Ranges', ar);
    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    if (upstream.body) {
      Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error('getWhatsappProviderMediaProxy', e);
    res.status(500).json({ success: false, error: 'Erro ao buscar mídia' });
  }
}

const ALLOWED_MEDIA_TYPES = new Set(['image', 'voice', 'video', 'file', 'sticker']);
const MAX_BASE64_LENGTH = 50 * 1024 * 1024;

export async function postWhatsappSendMedia(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    const mediaType = typeof req.body?.mediaType === 'string' ? req.body.mediaType.trim() : '';
    const base64Data = typeof req.body?.base64Data === 'string' ? req.body.base64Data : '';
    const mimetype = typeof req.body?.mimetype === 'string' ? req.body.mimetype.trim() : '';
    const filename = typeof req.body?.filename === 'string' ? req.body.filename.trim() : undefined;
    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : undefined;

    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      res.status(400).json({ success: false, error: 'mediaType deve ser image, voice, video, file ou sticker' });
      return;
    }
    if (!base64Data || base64Data.length < 100) {
      res.status(400).json({ success: false, error: 'base64Data é obrigatório' });
      return;
    }
    if (base64Data.length > MAX_BASE64_LENGTH) {
      res.status(400).json({ success: false, error: 'Arquivo muito grande (máximo ~37 MB)' });
      return;
    }
    if (!mimetype) {
      res.status(400).json({ success: false, error: 'mimetype é obrigatório' });
      return;
    }

    let normalizedBase64Data = base64Data;
    let normalizedMimetype = mimetype;
    let normalizedFilename = filename;
    if (mediaType === 'sticker') {
      const inputBuffer = Buffer.from(stripDataUrlPrefix(base64Data), 'base64');
      const stickerBuffer = await toStickerWebpFromBuffer(inputBuffer);
      normalizedBase64Data = stickerBuffer.toString('base64');
      normalizedMimetype = 'image/webp';
      normalizedFilename = 'sticker.webp';
    }
    const approxSize = Math.min(Math.floor((normalizedBase64Data.length * 3) / 4), MAX_BASE64_LENGTH);
    const quotedMessageId =
      typeof req.body?.quotedMessageId === 'string' ? req.body.quotedMessageId.trim() : undefined;
    const created = await sendMediaMessageFromUser({
      chatId,
      userId,
      userName: req.user?.name,
      mediaType: mediaType as WhatsappProviderMediaType,
      base64Data: normalizedBase64Data,
      mimetype: normalizedMimetype,
      filename: normalizedFilename,
      caption,
      fileSize: approxSize,
      quotedMessageId
    });
    res.json({ success: true, data: toSocketDto(created) });
  } catch (e) {
    console.error('postWhatsappSendMedia', e);
    const msg = e instanceof Error ? e.message : 'Erro ao enviar mídia';
    const isProviderDocLimit = msg.includes('Limitação de plano do provedor') || msg.includes('HTTP 422');
    res.status(isProviderDocLimit ? 422 : 500).json({ success: false, error: msg });
  }
}

export async function postWhatsappSend(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const quotedMessageId =
      typeof req.body?.quotedMessageId === 'string' ? req.body.quotedMessageId.trim() : undefined;
    if (!chatId || !text) {
      res.status(400).json({ success: false, error: 'chatId e text são obrigatórios' });
      return;
    }
    const created = await sendChatMessageFromUser({
      chatId,
      text,
      userId,
      userName: req.user?.name,
      quotedMessageId
    });
    res.json({ success: true, data: toSocketDto(created) });
  } catch (e) {
    console.error('postWhatsappSend', e);
    const msg = e instanceof Error ? e.message : 'Erro ao enviar';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function deleteWhatsappChatConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    // Compatível com clientes que mandam chatId na query OU no body.
    const chatId =
      (typeof req.query.chatId === 'string' && req.query.chatId.trim()) ||
      (typeof (req.body as any)?.chatId === 'string' && String((req.body as any).chatId).trim()) ||
      '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await deleteWhatsappConversation(chatId);
    res.json({ success: true });
  } catch (e) {
    console.error('deleteWhatsappChatConversation', e);
    res.status(500).json({ success: false, error: 'Erro ao apagar conversa' });
  }
}

export async function postWhatsappSubscribePresence(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof req.query.chatId === 'string' ? req.query.chatId.trim() : '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await subscribeWhatsappProviderChatPresence(chatId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappSubscribePresence', e);
    const msg = e instanceof Error ? e.message : 'Falha não crítica ao inscrever presença';
    res.json({ success: true, warning: msg });
  }
}

export async function postWhatsappArchiveConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    // Compatível com clientes que mandam chatId na query OU no body.
    const chatId =
      (typeof req.query.chatId === 'string' && req.query.chatId.trim()) ||
      (typeof (req.body as any)?.chatId === 'string' && String((req.body as any).chatId).trim()) ||
      '';
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    await archiveWhatsappConversation(userId, chatId);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappArchiveConversation', e);
    res.status(500).json({ success: false, error: 'Erro ao arquivar conversa' });
  }
}

export async function postWhatsappPinConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof (req.body as any)?.chatId === 'string' ? String((req.body as any).chatId).trim() : '';
    const pinned = (req.body as any)?.pinned;
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    if (typeof pinned !== 'boolean') {
      res.status(400).json({ success: false, error: 'pinned deve ser boolean' });
      return;
    }
    await setWhatsappConversationPinned(userId, chatId, pinned);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappPinConversation', e);
    res.status(500).json({ success: false, error: 'Erro ao fixar conversa' });
  }
}

export async function postWhatsappFavoriteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const chatId = typeof (req.body as any)?.chatId === 'string' ? String((req.body as any).chatId).trim() : '';
    const favorite = (req.body as any)?.favorite;
    if (!chatId) {
      res.status(400).json({ success: false, error: 'chatId é obrigatório' });
      return;
    }
    if (typeof favorite !== 'boolean') {
      res.status(400).json({ success: false, error: 'favorite deve ser boolean' });
      return;
    }
    await setWhatsappConversationFavorite(userId, chatId, favorite);
    res.json({ success: true });
  } catch (e) {
    console.error('postWhatsappFavoriteConversation', e);
    res.status(500).json({ success: false, error: 'Erro ao favoritar conversa' });
  }
}
