import { Readable } from 'stream';
import multer from 'multer';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import {
  archiveWhatsappConversation,
  clearAllWhatsappContactCache,
  deleteChatMessageById,
  deleteWhatsappConversation,
  editChatMessageById,
  getWhatsappActionsContext,
  listArchivedChatPreviews,
  listChatPreviews,
  listMessagesForChat,
  linkWhatsappChatToCliente,
  getWhatsappOrcamentoStatusUpdateMode,
  setWhatsappOrcamentoStatusUpdateMode,
  getMessageMediaDiagnostics,
  markAllWhatsappChatsRead,
  markChatRead,
  persistWhatsappContactCache,
  sendOrcamentoPdfToWhatsappChat,
  sendChatMessageFromUser,
  sendMediaMessageFromUser,
  toSocketDto,
  unarchiveWhatsappConversation,
  type WhatsappOrcamentoStatusMode
} from '../services/whatsappChat.service';
import {
  fetchWhatsappProviderSessionStatus,
  fetchWhatsappProviderConnectionQr,
  fetchWhatsappProviderSessionMe,
  fetchWhatsappProviderProfilePictureUrl,
  fetchWhatsappProviderContactsAll,
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
  type WhatsappProviderContactRow,
  type WhatsappProviderGroupRow,
  type WhatsappProviderMediaType
} from '../services/whatsappProvider.service';
import {
  canonicalWhatsappChatId,
  normalizeAudioContentType,
  storageChatIdVariants
} from '../utils/whatsappChat.util';
import {
  parseFilenameFromMediaUrl,
  resolveWhatsappProviderInternalFetchUrl,
  sanitizeDownloadFilename
} from '../utils/whatsappMediaUrl.util';

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

let providerContactsCache: { at: number; rows: WhatsappProviderContactRow[] } | null = null;
let providerGroupsCache: { at: number; rows: WhatsappProviderGroupRow[] } | null = null;
const PROVIDER_CONTACTS_TTL_MS = 90_000;

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

async function getCachedProviderContacts(): Promise<WhatsappProviderContactRow[]> {
  const now = Date.now();
  if (providerContactsCache && now - providerContactsCache.at < PROVIDER_CONTACTS_TTL_MS) {
    return providerContactsCache.rows;
  }
  const rows = await fetchWhatsappProviderContactsAll({ limit: 500, sortBy: 'name', sortOrder: 'asc' });
  providerContactsCache = { at: now, rows };
  return rows;
}

async function getCachedProviderGroups(): Promise<WhatsappProviderGroupRow[]> {
  const now = Date.now();
  if (providerGroupsCache && now - providerGroupsCache.at < PROVIDER_CONTACTS_TTL_MS) {
    return providerGroupsCache.rows;
  }
  const rows = await fetchWhatsappProviderGroupsAll();
  providerGroupsCache = { at: now, rows };
  return rows;
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
      pdfCustomization,
      pdfBase64: typeof (req.body as any)?.pdfBase64 === 'string' ? String((req.body as any).pdfBase64) : undefined,
      pdfFilename: typeof (req.body as any)?.pdfFilename === 'string' ? String((req.body as any).pdfFilename) : undefined
    });
    res.status(201).json({
      success: true,
      data: {
        message: toSocketDto(result.message),
        statusUpdated: result.statusUpdated,
        mode: result.finalMode
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
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 2000);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const sortBy = req.query.sortBy === 'id' ? 'id' : 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const useCache =
      limit === 500 &&
      offset === 0 &&
      sortBy === 'name' &&
      sortOrder === 'asc' &&
      req.query.refresh !== '1' &&
      req.query.refresh !== 'true';

    const rows = useCache
      ? await getCachedProviderContacts()
      : await fetchWhatsappProviderContactsAll({ limit, offset, sortBy, sortOrder });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getWhatsappProviderContactsIndex', e);
    res.status(500).json({ success: false, error: 'Erro ao listar contatos do provedor' });
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
    const rows = await getCachedProviderGroups();
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
      data: { contact, group: null, profilePictureUrl }
    });
  } catch (e) {
    console.error('getWhatsappProviderContactMeta', e);
    res.status(500).json({ success: false, error: 'Erro ao obter dados do contato' });
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
    const count = await clearAllWhatsappContactCache();
    res.json({ success: true, data: { deleted: count } });
  } catch (e) {
    console.error('deleteWhatsappContactCacheAll', e);
    res.status(500).json({ success: false, error: 'Erro ao limpar cache de contatos' });
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
    if (forceDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${sanitizeDownloadFilename(docName, 'arquivo')}"`
      );
    } else {
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${sanitizeDownloadFilename(docName, 'arquivo')}"`
      );
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
    const mimetype = file.mimetype || 'application/octet-stream';
    const mediaType = mimetypeToProviderMediaType(mimetype, file.originalname || '');
    const base64Data = file.buffer.toString('base64');
    const created = await sendMediaMessageFromUser({
      chatId,
      userId,
      userName: req.user?.name,
      mediaType,
      base64Data,
      mimetype,
      filename: file.originalname || undefined,
      caption: caption || undefined,
      fileSize: file.size
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
        `attachment; filename="${sanitizeDownloadFilename(name, 'arquivo')}"`
      );
    } else {
      const inlineName =
        qFilename ||
        parseFilenameFromMediaUrl(fileUrl) ||
        parseFilenameFromMediaUrl(internalUrl) ||
        'arquivo';
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${sanitizeDownloadFilename(inlineName, 'arquivo')}"`
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

const ALLOWED_MEDIA_TYPES = new Set(['image', 'voice', 'video', 'file']);
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
      res.status(400).json({ success: false, error: 'mediaType deve ser image, voice, video ou file' });
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

    const approxSize = Math.min(Math.floor((base64Data.length * 3) / 4), MAX_BASE64_LENGTH);
    const created = await sendMediaMessageFromUser({
      chatId,
      userId,
      userName: req.user?.name,
      mediaType: mediaType as WhatsappProviderMediaType,
      base64Data,
      mimetype,
      filename,
      caption,
      fileSize: approxSize
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
    if (!chatId || !text) {
      res.status(400).json({ success: false, error: 'chatId e text são obrigatórios' });
      return;
    }
    const created = await sendChatMessageFromUser({
      chatId,
      text,
      userId,
      userName: req.user?.name
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
