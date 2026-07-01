import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  ArrowLeft,
  CalendarFold,
  Check,
  CheckCheck,
  Contact,
  FileText,
  Images,
  LogOut,
  MessageCircle,
  Mic,
  Plus,
  QrCode,
  Smile,
  Sticker,
  Search,
  SquareCheck,
  Star,
  Trash2,
  X,
  User,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { loadPdfCustomizationFromStorage } from '../../hooks/usePDFCustomization';
import { useMatchMedia, WA_MOBILE_MEDIA } from '../../hooks/useMatchMedia';
import iconePdfChat from '../../assets/icone-pdf-chat.svg';
import chatBgWebp from '../../assets/bg-darkBlack.webp';
import chatBgWhiteWebp from '../../assets/bg-white.webp';
import {
  fetchWhatsappChats,
  fetchWhatsappArchivedChats,
  fetchWhatsappSessionProfile,
  fetchWhatsappConnectionStatus,
  fetchWhatsappConnectionQr,
  fetchWhatsappMessages,
  fetchWhatsappProviderContacts,
  fetchWhatsappProviderContactsSearch,
  fetchWhatsappProviderGroups,
  fetchWhatsappProviderProfilePicture,
  fetchWhatsappGroupParticipantCache,
  fetchWhatsappProviderContactMeta,
  postWhatsappUpsertContactCache,
  postWhatsappMarkRead,
  postWhatsappSubscribePresence,
  sendWhatsappMessage,
  sendWhatsappMedia,
  postWhatsappSendFile,
  deleteWhatsappMessage,
  deleteWhatsappMessageForMe,
  editWhatsappMessage,
  deleteWhatsappContactCacheAll,
  fetchWhatsappProfileFetchTarget,
  fetchWhatsappResolveOpenChat,
  deleteWhatsappConversation,
  archiveWhatsappConversation,
  postWhatsappPinConversation,
  postWhatsappFavoriteConversation,
  postWhatsappProviderLogout,
  postWhatsappMarkAllRead,
  postWhatsappUnarchive,
  fetchWhatsappActionsContext,
  postWhatsappLinkCliente,
  postWhatsappUnlinkCliente,
  postWhatsappSendOrcamentoPdf,
  whatsappCdnImageProxyUrl,
  whatsappProfilePictureImageUrl,
  putWhatsappOrcamentoStatusMode,
  checkWhatsappProviderPhoneExists,
  whatsappProviderMediaProxyUrl,
  whatsappProviderMediaProxyDownloadUrl,
  whatsappMessageMediaInlineUrl,
  whatsappMessageMediaDownloadUrl,
  postWhatsappForwardMessages,
  reactToWhatsappMessage,
  postEvolutionMarkMessagesRead,
  postEvolutionFindStatusMessage,
  postEvolutionMarkChatUnread,
  postEvolutionSendContact,
  postEvolutionInstanceSetPresence,
  postEvolutionGroupUpdatePicture,
  postEvolutionGroupUpdateSubject,
  postEvolutionGroupUpdateDescription,
  getEvolutionGroupFetchInviteCode,
  postEvolutionGroupRevokeInviteCode,
  postEvolutionGroupSendInvite,
  getEvolutionGroupFindByJid,
  getEvolutionGroupFindMembers,
  postEvolutionGroupUpdateMembers,
  postEvolutionGroupUpdateSetting,
  postEvolutionGroupToggleEphemeral,
  deleteEvolutionGroupLeave,
  postEvolutionFetchProfilePicture,
  postEvolutionProfileFetchContact,
  postEvolutionProfileFetchBusiness,
  postEvolutionProfileUpdateName,
  postEvolutionProfileUpdateStatus,
  postEvolutionProfileUpdatePicture,
  deleteEvolutionProfilePicture,
  getEvolutionProfilePrivacy,
  postEvolutionProfilePrivacy,
  toastWhatsappApiError,
  throwAfterWhatsappToast,
  isWhatsappErrorAlreadyToasted,
  type EvolutionPrivacySettingsBody,
  type WhatsappProviderMediaType,
  type WhatsappChatPreview,
  type WhatsappMessageDto,
  type WhatsappProviderContactRow,
  type WhatsappProviderGroupRow,
  type WhatsappActionsContextData,
  type WhatsappOrcamentoStatusMode,
} from '../../services/whatsappChatService';
import { Twemoji } from 'react-emoji-render';
import { clientesService, type Cliente } from '../../services/clientesService';
import { listContatosS3e, type ContatoS3eDto } from '../../services/contatosS3eService';
import { getEmojiOnlyCount } from '../../utils/emojiOnly';
import { getBackoffRemainingMs, registerBackoffSuccess, registerRateLimitBackoff } from '../../utils/rateLimitBackoff';
import { onlyDigits } from '../../utils/masks';
import { downloadInNewTab, openInNewTab } from '../../utils/browserLinks';
import WhatsAppActionsDrawer from './WhatsAppActionsDrawer';
import AudioMessage from './AudioMessage';
import WhatsAppForwardModal from './WhatsAppForwardModal';
import ImagePreviewModal from './ImagePreviewModal';
import NovaConversaDrawer from './NovaConversaDrawer';
import WhatsAppChatLabelEditDrawer from './WhatsAppChatLabelEditDrawer';
import WhatsAppChatLabelPickChatsDrawer, { type SelectableChat } from './WhatsAppChatLabelPickChatsDrawer';
import { listChatLabels, type WhatsappChatLabelDto } from '../../services/whatsappChatLabelsService';
import { AuthContext } from '../../contexts/AuthContext';
import { useWhatsAppSocket } from '../../hooks/useWhatsAppSocket';
import { useWhatsAppRealtimeStatus } from '../../hooks/useWhatsAppSocket';
import { ComposerEmojiGifStickerModal, type ComposerPickerTab } from './ComposerEmojiGifStickerModal';
import { WhatsappComposerEditor, type WhatsappComposerEditorHandle } from './WhatsappComposerEditor';
import './WhatsappComposerEditor.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  chatIdToDisplayLabel,
  firstNameOnly,
  toWhatsappChatId,
  formatPhoneForDisplay,
  findWhatsappContactInRows,
  findWhatsappGroupInRows,
  whatsappContactDisplayName,
  whatsappGroupDisplayName,
  displayNameForChatHeader,
  resolveChatPreviewLabels,
  isWhatsappGroupChatId,
  shortGroupIdLabel,
  stripOutboundPrefixForEdit,
  canonicalWhatsappChatId,
  outboundAckVisual,
  waJidToDigits,
  sanitizeWhatsappContactMetaForChat,
  formatChatDate,
  isSameChatDay,
  resolveOutboundChatId,
  repairUtf8Mojibake,
  fileWithNormalizedUploadName,
  formatPhoneForProviderContact,
  dedupeChatPreviews,
  chatPreviewMergeKey,
  resolveChatPreviewUpdateContext,
  upsertChatPreviewInList,
} from '../../utils/whatsappChat';
import {
  WA_SIDEBAR_FILTER_STORAGE_KEY,
  readStoredSidebarFilter,
  isCrmAdminUser,
} from '../../utils/whatsappCrmHelpers';

const FALLBACK_WHATSAPP_PROVIDER_DASHBOARD =
  import.meta.env.VITE_WHATSAPP_PROVIDER_DASHBOARD_URL || 'http://localhost:3333/manager';
const WHATSAPP_QR_ROTATION_MS = 75_000;

const chatsQueryKey = ['whatsapp-chats'] as const;
const archivedChatsQueryKey = ['whatsapp-archived-chats'] as const;
const messagesQueryKey = (chatId: string) => ['whatsapp-messages', canonicalWhatsappChatId(chatId)] as const;

type SendTextMutationVars = {
  text: string;
  optimisticId: string;
  replySnapshot: WhatsappMessageDto | null;
};

type SendOrcamentoPdfMutationVars = {
  orcamentoId: string;
  modeOverride?: WhatsappOrcamentoStatusMode;
  optimisticId: string;
};

const WA_SEND_CONTACT_MAX = 3;
const WA_SEND_CONTACT_API_GAP_MS = 520;
/** Máximo de linhas renderizadas no picker (evita travar o React). */
const WA_SEND_CONTACT_PICKER_RENDER_CAP = 450;
/** Máximo de fotos buscadas na agenda lateral (Evolution). */
const WA_AGENDA_AVATAR_FETCH_CAP = 72;

function pickFirstNonEmptyString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) return t;
    }
  }
  return '';
}

function normalizeEvolutionContactProfile(raw: unknown): { displayName: string; profilePictureUrl: string } {
  const top =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const nested =
    top.data && typeof top.data === 'object' && !Array.isArray(top.data)
      ? (top.data as Record<string, unknown>)
      : null;
  const obj = nested ? { ...top, ...nested } : top;

  const displayName = pickFirstNonEmptyString(obj, [
    'name',
    'pushName',
    'pushname',
    'notify',
    'verifiedName',
    'shortName',
  ]);
  const profilePictureUrl = pickFirstNonEmptyString(obj, [
    'picture',
    'pictureUrl',
    'profilePictureUrl',
    'profilePicUrl',
    'photoUrl',
  ]);
  return { displayName, profilePictureUrl };
}

function isJustDigitsLabel(label: string): boolean {
  const d = (label || '').replace(/\D/g, '');
  if (!d) return true;
  return d.length >= 8 && d === (label || '').replace(/\D/g, '');
}

function hasMeaningfulName(label: string | null | undefined): boolean {
  const t = (label || '').trim();
  if (!t) return false;
  return !isJustDigitsLabel(t);
}

function pickWhatsappSessionProfileDisplayName(sp: Record<string, unknown> | null | undefined): string {
  if (!sp) return '';
  const n = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string).trim() : '');
  return (
    n('name') ||
    n('pushname') ||
    n('verifiedName') ||
    (typeof sp.me === 'object' &&
      sp.me &&
      typeof (sp.me as Record<string, unknown>).name === 'string' &&
      String((sp.me as Record<string, unknown>).name).trim()) ||
    ''
  );
}

const defaultEvolutionPrivacy = (): EvolutionPrivacySettingsBody => ({
  readreceipts: 'all',
  profile: 'all',
  status: 'all',
  online: 'all',
  last: 'all',
  groupadd: 'all',
});

function mergeEvolutionPrivacyFromUnknown(
  raw: unknown,
  prev: EvolutionPrivacySettingsBody
): EvolutionPrivacySettingsBody {
  let o: Record<string, unknown> =
    raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
  const nested = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : null;
  if (nested) o = { ...nested };
  const pick = <K extends keyof EvolutionPrivacySettingsBody>(
    k: K,
    allowed: readonly string[]
  ): EvolutionPrivacySettingsBody[K] => {
    const v = o[k as string];
    return typeof v === 'string' && allowed.includes(v) ? (v as EvolutionPrivacySettingsBody[K]) : prev[k];
  };
  return {
    readreceipts: pick('readreceipts', ['all', 'none']),
    profile: pick('profile', ['all', 'contacts', 'contact_blacklist', 'none']),
    status: pick('status', ['all', 'contacts', 'contact_blacklist', 'none']),
    online: pick('online', ['all', 'match_last_seen']),
    last: pick('last', ['all', 'contacts', 'contact_blacklist', 'none']),
    groupadd: pick('groupadd', ['all', 'contacts', 'contact_blacklist']),
  };
}

type GroupParticipantRow = { id: string; admin?: string; name?: string };
type GroupInfoView = {
  id: string;
  subject: string;
  desc: string;
  pictureUrl: string;
  size?: number;
  announce?: boolean;
  restrict?: boolean;
  participants: GroupParticipantRow[];
};

function normalizeGroupInfo(raw: unknown, fallbackChatId: string): GroupInfoView {
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).data
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
  const idRaw = typeof data.id === 'string' ? data.id.trim() : '';
  const normalizedChat = canonicalWhatsappChatId(fallbackChatId);
  const id = idRaw || normalizedChat;
  const subject =
    (typeof data.subject === 'string' && data.subject.trim()) ||
    (typeof data.name === 'string' && data.name.trim()) ||
    '';
  const desc = typeof data.desc === 'string' ? data.desc : '';
  const pictureUrl =
    (typeof data.pictureUrl === 'string' && data.pictureUrl) ||
    (typeof data.profilePictureUrl === 'string' && data.profilePictureUrl) ||
    '';
  const participantsRaw = Array.isArray(data.participants) ? data.participants : [];
  const participants = participantsRaw
    .map((p): GroupParticipantRow | null => {
      if (!p || typeof p !== 'object') return null;
      const o = p as Record<string, unknown>;
      const pid = typeof o.id === 'string' ? o.id.trim() : '';
      if (!pid) return null;
      return {
        id: pid,
        admin: typeof o.admin === 'string' ? o.admin : undefined,
        name:
          (typeof o.name === 'string' && o.name.trim()) ||
          (typeof o.notify === 'string' && o.notify.trim()) ||
          (typeof o.pushName === 'string' && o.pushName.trim()) ||
          undefined,
      };
    })
    .filter((x): x is GroupParticipantRow => Boolean(x));
  return {
    id,
    subject,
    desc,
    pictureUrl,
    size: typeof data.size === 'number' ? data.size : undefined,
    announce: typeof data.announce === 'boolean' ? data.announce : undefined,
    restrict: typeof data.restrict === 'boolean' ? data.restrict : undefined,
    participants,
  };
}

function normalizeGroupMembers(raw: unknown): GroupParticipantRow[] {
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).data
      ? (raw as Record<string, unknown>).data
      : raw;
  // EvoGo retorna `Participants` (PascalCase); Evolution v2 retorna `participants`.
  const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const arr = Array.isArray(data)
    ? data
    : dataObj
      ? (dataObj.participants ?? dataObj.Participants ?? [])
      : [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p): GroupParticipantRow | null => {
      if (!p || typeof p !== 'object') return null;
      const o = p as Record<string, unknown>;
      // EvoGo: JID (LID interno) ou PhoneNumber (PN canônico). Preferimos PhoneNumber
      // quando disponível porque é o que cruza com `contatos_s3e` e o cache do banco.
      const evoPhone = typeof o.PhoneNumber === 'string' ? o.PhoneNumber.trim() : '';
      const evoJid = typeof o.JID === 'string' ? o.JID.trim() : '';
      const id =
        (typeof o.id === 'string' && o.id.trim()) ||
        evoPhone ||
        evoJid ||
        (typeof o.jid === 'string' && o.jid.trim()) ||
        '';
      if (!id) return null;
      const display = typeof o.DisplayName === 'string' ? o.DisplayName.trim() : '';
      return {
        id,
        admin: typeof o.admin === 'string' ? o.admin : (o.IsAdmin === true ? 'admin' : undefined),
        name:
          (typeof o.name === 'string' && o.name.trim()) ||
          (typeof o.notify === 'string' && o.notify.trim()) ||
          (typeof o.pushName === 'string' && o.pushName.trim()) ||
          display ||
          undefined,
      };
    })
    .filter((x): x is GroupParticipantRow => Boolean(x));
}

function normalizeInviteUrl(raw: unknown): string {
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).data
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
  const invite = data.inviteUrl;
  return typeof invite === 'string' ? invite.trim() : '';
}

type ProviderStatusAckRow = { providerMessageId: string; ack: number };

function coerceProviderAck(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Converte status numérico do protocolo Evolution/Baileys para a convenção interna:
 * Evolution: 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
 * Interno:  -1=error, 0-1=enviado, 2=entregue, 3=lido, 4=reproduzido
 */
function evolutionStatusToInternalAck(status: number): number {
  if (status <= 0) return -1;
  if (status <= 2) return 1;
  if (status === 3) return 2;
  if (status === 4) return 3;
  return 4;
}

function ackNameToAck(name: string): number | null {
  const u = name.trim().toUpperCase();
  const map: Record<string, number> = {
    ERROR: -1,
    PENDING: 0,
    SERVER: 1,
    DEVICE: 2,
    DELIVERY_ACK: 2,
    READ: 3,
    PLAYED: 4,
  };
  return map[u] ?? null;
}

function normalizeStatusAckRows(raw: unknown): ProviderStatusAckRow[] {
  const root =
    raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).data
      ? (raw as Record<string, unknown>).data
      : raw;
  const arr = Array.isArray(root)
    ? root
    : root && typeof root === 'object'
      ? ((root as Record<string, unknown>).messages ??
          (root as Record<string, unknown>).records ??
          (root as Record<string, unknown>).statusMessages ??
          (root as Record<string, unknown>).items ??
          [])
      : [];
  if (!Array.isArray(arr)) return [];
  const out: ProviderStatusAckRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const key = o.key && typeof o.key === 'object' ? (o.key as Record<string, unknown>) : null;
    const pid =
      (typeof o.id === 'string' && o.id.trim()) ||
      (typeof o.messageId === 'string' && o.messageId.trim()) ||
      (typeof key?.id === 'string' && key.id.trim()) ||
      '';
    if (!pid) continue;
    const ackFromName =
      typeof o.ackName === 'string'
        ? ackNameToAck(o.ackName)
        : typeof o.statusName === 'string'
          ? ackNameToAck(o.statusName)
          : null;
    const rawAck = coerceProviderAck(o.ack);
    const rawStatus = coerceProviderAck(o.status);
    const rawNumeric = rawAck ?? rawStatus;
    const ackFromNumeric = rawNumeric !== null ? evolutionStatusToInternalAck(rawNumeric) : null;
    const ack = ackFromName ?? ackFromNumeric;
    if (ack === null || !Number.isFinite(ack) || ack < 0) continue;
    out.push({ providerMessageId: pid, ack });
  }
  return out;
}

function sortChatsByRecent(list: WhatsappChatPreview[]): WhatsappChatPreview[] {
  return [...list].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

function normalizeSearchText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Limite enviado ao backend ao listar a agenda inteira (Evolution já devolve tudo; WAHA agrega páginas). */
const WHATSAPP_AGENDA_LIST_LIMIT = 150_000;
/** Com menos caracteres, listamos tudo; a partir disso usa-se a rota de busca no servidor. */
const WHATSAPP_AGENDA_SEARCH_MIN_CHARS = 2;

/** Dígitos do telefone para abrir conversa a partir da agenda (campo `number` ou JID numérico). */
function agendaContactWhatsappDigits(row: WhatsappProviderContactRow): string {
  const n = (row.number || '').replace(/\D/g, '');
  if (n.length >= 10) return n;
  const fromId = waJidToDigits(row.id || '');
  if (fromId.length >= 10) return fromId;
  return '';
}

type ParsedVCard = {
  displayName: string | null;
  /** Dígitos com DDI quando possível (ex. 5511999999999), até 3 entradas. */
  phoneDigits: string[];
};

function vCardValueAfterColon(line: string): string {
  const i = line.indexOf(':');
  if (i === -1) return '';
  return line.slice(i + 1).trim();
}

function normalizeVCardPhoneDigits(raw: string): string {
  let d = onlyDigits(raw);
  if (!d) return '';
  if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) d = `55${d}`;
  return d;
}

function formatInternationalBrFromDigits(d: string): string {
  const x = onlyDigits(d);
  if (!x) return '';
  if (x.startsWith('55') && x.length >= 12 && x.length <= 13) {
    const ddd = x.slice(2, 4);
    const rest = x.slice(4);
    if (rest.length === 9) return `+55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (x.length >= 10) return `+${x}`;
  return x;
}

function evolutionWuidFromContactRow(row: WhatsappProviderContactRow): string {
  const n = onlyDigits(String(row.number || ''));
  if (n.length >= 10 && n.length <= 15) {
    let d = n;
    if (d.length <= 11 && !d.startsWith('55')) d = `55${d}`;
    return d;
  }
  const jidDigits = waJidToDigits(row.id);
  if (jidDigits.length >= 10) {
    let d = jidDigits;
    if (d.length <= 11 && !d.startsWith('55')) d = `55${d}`;
    return d;
  }
  return '';
}

function contactRowIsEvolutionSendable(row: WhatsappProviderContactRow): boolean {
  if (row.isGroup) return false;
  const w = evolutionWuidFromContactRow(row);
  return w.length >= 8;
}

function buildEvolutionPhoneStylizedFromRow(row: WhatsappProviderContactRow): string {
  const w = evolutionWuidFromContactRow(row);
  if (w) return formatInternationalBrFromDigits(w);
  return formatPhoneForProviderContact(row) || formatPhoneForDisplay(row.id);
}

/**
 * Linha do picker "Enviar contato" — extensão do `WhatsappProviderContactRow`
 * (formato esperado pelos helpers existentes) com os campos extras vindos da
 * agenda S3E (`empresa`, `revisado`, etc.). Mantemos compatibilidade total com
 * `whatsappContactDisplayName`, `evolutionWuidFromContactRow`,
 * `contactRowIsEvolutionSendable` e demais helpers sem precisar refatorar.
 */
type S3eContactPickerRow = WhatsappProviderContactRow & {
  /** Empresa associada na agenda S3E (vai como `organization` no vcard EvoGo). */
  s3eEmpresa: string | null;
  /** True quando o contato ainda não foi revisado pelo operador (importação automática). */
  s3eRevisado: boolean;
  /** Snapshot da `nomeAgenda` original — útil para exibir mesmo se cair em fallback. */
  s3eNomeAgenda: string | null;
};

/**
 * Converte um `ContatoS3eDto` (vindo de /api/contatos-s3e) para uma linha que se
 * encaixa no picker existente. O `id` virou um wuid sintético (`digits@c.us`),
 * suficiente para que `evolutionWuidFromContactRow` e o estado de seleção
 * (`sendContactSelectedIds`) operem normalmente.
 */
function s3eContactToProviderRow(c: ContatoS3eDto): S3eContactPickerRow {
  const digits = onlyDigits(c.numero);
  const syntheticId = digits ? `${digits}@c.us` : c.id;
  const displayName = (c.nomeAgenda || c.empresa || c.pushName || '').trim();
  return {
    id: syntheticId,
    number: digits,
    name: displayName,
    pushname: c.pushName || '',
    shortName: '',
    isMe: false,
    isGroup: false,
    isWAContact: true,
    isMyContact: true,
    isBlocked: false,
    s3eEmpresa: c.empresa,
    s3eRevisado: c.revisado,
    s3eNomeAgenda: c.nomeAgenda
  };
}

function parseVCardFromText(raw: string): ParsedVCard | null {
  const text = (raw || '').trim();
  if (!text) return null;
  if (!/BEGIN:VCARD/i.test(text)) return null;
  const lines = text.split(/\r?\n/);
  let displayName: string | null = null;
  const fnLine = lines.find((l) => /^FN/i.test(l));
  if (fnLine) {
    const v = vCardValueAfterColon(fnLine);
    if (v) displayName = v.split(';')[0].trim();
  }
  if (!displayName) {
    const nLine = lines.find((l) => /^N:/i.test(l));
    if (nLine) {
      const v = vCardValueAfterColon(nLine);
      const parts = v.split(';');
      const family = (parts[0] || '').trim();
      const given = (parts[1] || '').trim();
      const composed = [given, family].filter(Boolean).join(' ').trim();
      if (composed) displayName = composed;
    }
  }
  const phoneDigits = Array.from(
    new Set(
      lines
        .filter((l) => /^TEL/i.test(l))
        .map((l) => normalizeVCardPhoneDigits(vCardValueAfterColon(l)))
        .filter(Boolean)
    )
  ).slice(0, 3);
  return { displayName, phoneDigits };
}

/** Wallpaper do chat (asset local) — tamanho da “ladrilha” para repeat (menor = padrão mais fino). */
const CHAT_BG_TILE_DARK = `url(${chatBgWebp})`;
const CHAT_BG_TILE_LIGHT = `url(${chatBgWhiteWebp})`;
const CHAT_BG_TILE_PX = 380;

const chatWallpaperLayerStyle = (imageUrl: string, baseColor: string): React.CSSProperties => ({
  backgroundColor: baseColor,
  backgroundImage: imageUrl,
  backgroundSize: `${CHAT_BG_TILE_PX}px`,
  backgroundPosition: '0 0',
  backgroundRepeat: 'repeat',
});

function formatMsgTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatListTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Renderiza texto WhatsApp com:
 *  - *negrito* (trechos entre asteriscos);
 *  - emojis em SVG via Twemoji (set do Twitter/X, alta definição, idêntico em
 *    Windows/Linux/Mac/mobile). Substitui o glyph nativo do Windows que sai
 *    com aparência "cartoon" (Segoe UI Emoji).
 *
 * As `<img>` injetadas pelo Twemoji ficam estilizadas via `.message-emoji-text`
 * em `index.css` para alinharem na baseline do texto sem quebrar o leading.
 */
/**
 * Regex para detecção de URLs no corpo do texto. Reconhece:
 *   - URLs com esquema explícito (http://, https://);
 *   - URLs implícitas (www.dominio.com/...) — convertidas em `https://` ao montar
 *     o `href`.
 * Os trailing characters comuns de pontuação (`.,;:!?)]}>"`) são deixados de
 * fora do match para não estragar a leitura.
 */
const WHATSAPP_URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"]+?)(?=$|[\s<>"]|[.,;:!?)\]}]+(?:\s|$))/gi;

/** Telefone em texto (10–15 dígitos; opcional +55) — ex.: 47996362471 */
const WHATSAPP_PHONE_IN_TEXT_REGEX = /(?<!\d)(?:\+?55[\s.-]?)?\d{10,15}(?!\d)/g;

function splitTextByPhones(text: string): Array<{ kind: 'text' | 'phone'; value: string }> {
  if (!text) return [];
  const out: Array<{ kind: 'text' | 'phone'; value: string }> = [];
  let lastIndex = 0;
  for (const m of text.matchAll(WHATSAPP_PHONE_IN_TEXT_REGEX)) {
    if (m.index === undefined) continue;
    const digits = onlyDigits(m[0]);
    if (digits.length < 10 || digits.length > 15) continue;
    if (m.index > lastIndex) out.push({ kind: 'text', value: text.slice(lastIndex, m.index) });
    out.push({ kind: 'phone', value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) out.push({ kind: 'text', value: text.slice(lastIndex) });
  return out;
}

function renderTextChunkWithUrlsAndPhones(
  text: string,
  keyPrefix: string,
  onPhoneClick?: (digits: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  splitTextByUrls(text).forEach((urlSeg, ui) => {
    if (urlSeg.kind === 'url') {
      const href = urlSeg.value.startsWith('www.') ? `https://${urlSeg.value}` : urlSeg.value;
      nodes.push(
        <a
          key={`${keyPrefix}-u${ui}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all dark:text-blue-400"
        >
          <Twemoji svg className="message-emoji-text" text={urlSeg.value} />
        </a>
      );
      return;
    }
    splitTextByPhones(urlSeg.value).forEach((phSeg, pi) => {
      if (phSeg.kind === 'phone' && onPhoneClick) {
        const digits = onlyDigits(phSeg.value);
        nodes.push(
          <button
            key={`${keyPrefix}-p${pi}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPhoneClick(digits);
            }}
            className="inline cursor-pointer border-0 bg-transparent p-0 text-[#027eb5] underline decoration-[#027eb5]/70 hover:text-[#00a884] dark:text-[#53bdeb] dark:decoration-[#53bdeb]/70 dark:hover:text-[#00d4aa]"
            title="Abrir conversa com este número"
          >
            <Twemoji svg className="message-emoji-text" text={phSeg.value} />
          </button>
        );
      } else {
        nodes.push(
          <Twemoji key={`${keyPrefix}-t${ui}-${pi}`} svg className="message-emoji-text" text={phSeg.value} />
        );
      }
    });
  });
  return nodes;
}

/**
 * Quebra um pedaço de texto em `text` / `url`, preservando a ordem e o conteúdo
 * exato (concatenar tudo retorna a string original). Usado pelo
 * `renderWhatsAppText` para evitar uma segunda passada no `string.split`.
 */
function splitTextByUrls(text: string): Array<{ kind: 'text' | 'url'; value: string }> {
  if (!text) return [];
  const out: Array<{ kind: 'text' | 'url'; value: string }> = [];
  let lastIndex = 0;
  for (const m of text.matchAll(WHATSAPP_URL_REGEX)) {
    if (m.index === undefined) continue;
    if (m.index > lastIndex) out.push({ kind: 'text', value: text.slice(lastIndex, m.index) });
    out.push({ kind: 'url', value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) out.push({ kind: 'text', value: text.slice(lastIndex) });
  return out;
}

function renderInlineWhatsAppFormatting(
  text: string,
  keyPrefix: string,
  onPhoneClick?: (digits: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const italicParts = text.split(/(_[^_]+_)/g);
  italicParts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      const inner = part.slice(1, -1);
      const innerNodes = renderBoldChunks(inner, `${keyPrefix}i${i}`, onPhoneClick);
      nodes.push(
        <em key={`${keyPrefix}em${i}`} className="italic">
          {innerNodes}
        </em>
      );
      return;
    }
    nodes.push(...renderBoldChunks(part, `${keyPrefix}p${i}`, onPhoneClick));
  });
  return nodes;
}

function renderBoldChunks(
  text: string,
  keyPrefix: string,
  onPhoneClick?: (digits: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const boldParts = text.split(/(\*[^*]+\*)/g);
  boldParts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      const inner = part.slice(1, -1);
      const innerNodes = renderTextChunkWithUrlsAndPhones(inner, `${keyPrefix}b${i}`, onPhoneClick);
      nodes.push(
        <strong key={`${keyPrefix}b${i}`} className="font-semibold">
          {innerNodes}
        </strong>
      );
      return;
    }
    nodes.push(...renderTextChunkWithUrlsAndPhones(part, `${keyPrefix}t${i}`, onPhoneClick));
  });
  return nodes;
}

function renderWhatsAppText(text: string, onPhoneClick?: (digits: string) => void): React.ReactNode {
  const t = repairUtf8Mojibake(text || '');
  if (!t) return null;
  return renderInlineWhatsAppFormatting(t, 'root', onPhoneClick);
}

/**
 * Mapeia a contagem de emojis-only (1, 2 ou 3) na classe CSS que controla o
 * tamanho do glyph "jumbo" — replica o comportamento progressivo do WhatsApp
 * Web: quanto menos emojis, maior cada um aparece.
 */
const JUMBO_EMOJI_SIZE_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-[64px] leading-none',
  2: 'text-[56px] leading-none',
  3: 'text-[48px] leading-none'
};

type ParsedLocationPayload = {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
};

function parseLocationFromMessageContent(content: string): ParsedLocationPayload | null {
  const text = (content || '').trim();
  if (!text) return null;
  const markerMatch = text.match(/Coordenadas:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (markerMatch) {
    const latitude = Number.parseFloat(markerMatch[1]);
    const longitude = Number.parseFloat(markerMatch[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const name = text.match(/Nome:\s*(.+)/i)?.[1]?.trim() || undefined;
    const address = text.match(/Endere[cç]o:\s*(.+)/i)?.[1]?.trim() || undefined;
    return { latitude, longitude, name, address };
  }
  const urlMatch = text.match(/https?:\/\/(?:www\.)?maps\.google\.[^\s]*[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (urlMatch) {
    const latitude = Number.parseFloat(urlMatch[1]);
    const longitude = Number.parseFloat(urlMatch[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }
  return null;
}

function avatarLetter(label: string): string {
  const t = label.replace(/\D/g, '');
  if (t.length >= 2) return t.slice(-2);
  const c = label.trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

const ContactAvatar = memo(function ContactAvatar({
  chatId,
  imageUrl,
  label,
  size,
  children,
}: {
  chatId?: string;
  imageUrl?: string | null;
  label: string;
  size: 'list' | 'header';
  children?: React.ReactNode;
}) {
  const [imgErr, setImgErr] = useState(false);
  const dim = size === 'header' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-[15px]';
  const avatarSrc = chatId
    ? whatsappProfilePictureImageUrl(chatId, true)
    : whatsappCdnImageProxyUrl(imageUrl);

  useEffect(() => {
    setImgErr(false);
  }, [chatId, imageUrl]);

  const showImg = Boolean(avatarSrc && !imgErr);
  return (
    <div className={`relative flex ${dim} shrink-0 items-center justify-center`}>
      {showImg ? (
        <img
          src={avatarSrc!}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-[#dfe5e7] font-medium text-[#54656f] dark:bg-[#54656f] dark:text-[#e9edef] ${size === 'list' ? 'text-[15px]' : 'text-sm'}`}
        >
          {avatarLetter(label)}
        </div>
      )}
      {children}
    </div>
  );
});

const CheckDoubleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Ticks de envio (WhatsApp-style) — usando `lucide-react` (Check / CheckCheck).
 *
 *  - ack=1 (single): ✓ cinza            → "enviada ao servidor"
 *  - ack=2 (double_grey): ✓✓ cinza      → "entregue ao destinatário"
 *  - ack=3 (double_blue): ✓✓ azul #4fc3f7 → "lida pelo destinatário"
 *
 * Em balão verde escuro (mensagens nossas) usamos um cinza mais claro pra
 * manter contraste com o fundo, como faz o WhatsApp Web.
 */
function OutboundAckIcon({
  ack,
  onOutgoingBubble,
}: {
  ack: number | null | undefined;
  onOutgoingBubble?: boolean;
}) {
  const vis = outboundAckVisual(ack);
  const greyCls = onOutgoingBubble ? 'text-[#667781] dark:text-[#b8e8d8]' : 'text-[#8696a0]';
  if (vis === 'single') {
    return <Check size={16} strokeWidth={1.75} className={`ml-0.5 shrink-0 ${greyCls}`} aria-hidden />;
  }
  if (vis === 'double_grey') {
    return <CheckCheck size={16} strokeWidth={1.75} className={`ml-0.5 shrink-0 ${greyCls}`} aria-hidden />;
  }
  return (
    <CheckCheck
      size={16}
      strokeWidth={1.75}
      className="ml-0.5 shrink-0 text-[#4fc3f7]"
      aria-hidden
    />
  );
}

const SendPlaneIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
  </svg>
);

const AttachIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const EllipsisVerticalIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

/** Ícones do menu ⋮ da lista (traço fino, cinza — estilo WhatsApp Web). */
const WA_SIDEBAR_MENU_ICON = 'h-[18px] w-[18px] shrink-0 text-[#54656f] dark:text-[#8696a0]';

/** Ícone “nova conversa” (quadrado com +), alinhado ao WhatsApp Web. */
const NewChatSquareIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

function detectMediaType(mime: string): WhatsappProviderMediaType {
  const m = mime.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('audio/')) return 'voice';
  if (m.startsWith('video/')) return 'video';
  return 'file';
}

/** Extrai arquivos do clipboard (ex.: print com Ctrl+V). */
function filesFromClipboardData(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];
  const out: File[] = [];
  const seen = new Set<string>();

  const push = (file: File | null) => {
    if (!file || file.size <= 0) return;
    const key = `${file.name}|${file.size}|${file.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(file);
  };

  if (clipboardData.items?.length) {
    for (const item of Array.from(clipboardData.items)) {
      if (item.kind !== 'file') continue;
      push(item.getAsFile());
    }
  }
  if (!out.length && clipboardData.files?.length) {
    for (const file of Array.from(clipboardData.files)) {
      push(file);
    }
  }

  return out.map((file, idx) => {
    const mime = file.type || 'image/png';
    const hasName = Boolean(file.name?.trim() && file.name !== 'blob');
    if (hasName) return file;
    const ext =
      mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'png';
    const suffix = out.length > 1 ? `-${idx + 1}` : '';
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return new File([file], `print-${stamp}${suffix}.${ext}`, { type: mime });
  });
}

const MEDIA_ACCEPT = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar';
const MAX_FILE_SIZE_MB = 50;

/** Pausa entre envios em lote (Evolution/Meta) — ms. Override: `VITE_WA_UPLOAD_BATCH_DELAY_MS`. Mínimo 800 ms. */
const WA_UPLOAD_BATCH_DELAY_MS = Math.max(
  800,
  Number.parseInt(String(import.meta.env.VITE_WA_UPLOAD_BATCH_DELAY_MS || ''), 10) || 2200
);
/** Máximo de arquivos por lote. Override: `VITE_WA_UPLOAD_BATCH_MAX_FILES`. */
const WA_UPLOAD_BATCH_MAX_FILES = Math.min(
  30,
  Math.max(2, Number.parseInt(String(import.meta.env.VITE_WA_UPLOAD_BATCH_MAX_FILES || ''), 10) || 15)
);
/** Uploads em paralelo no envio (1 = só sequencial). Máx. 2 — `VITE_WA_UPLOAD_SEND_CONCURRENCY`. */
const WA_UPLOAD_SEND_CONCURRENCY = Math.min(
  2,
  Math.max(1, Number.parseInt(String(import.meta.env.VITE_WA_UPLOAD_SEND_CONCURRENCY || ''), 10) || 1)
);

interface PendingMedia {
  id: string;
  file: File;
  mediaType: WhatsappProviderMediaType;
  previewUrl: string | null;
  asSticker?: boolean;
}

function newPendingMediaId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface PendingRecordedAudio {
  blob: Blob;
  url: string;
  mimeType: string;
  size: number;
  elapsedSec: number;
  waveformBars: number[];
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = typeof reader.result === 'string' ? reader.result : '';
      if (!out) {
        reject(new Error('Falha ao converter áudio para base64'));
        return;
      }
      resolve(out);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de áudio'));
    reader.readAsDataURL(blob);
  });
}

function formatRecordingElapsed(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const WAVEFORM_BARS = [0.22, 0.55, 0.34, 0.78, 0.48, 0.62, 0.27, 0.73, 0.39, 0.57, 0.31, 0.66, 0.45, 0.81, 0.29, 0.52, 0.36, 0.69, 0.41, 0.58];

function smoothBars(values: number[], radius = 2): number[] {
  if (values.length === 0) return values;
  return values.map((_, idx) => {
    let sum = 0;
    let n = 0;
    for (let i = Math.max(0, idx - radius); i <= Math.min(values.length - 1, idx + radius); i += 1) {
      sum += values[i];
      n += 1;
    }
    return n > 0 ? sum / n : values[idx];
  });
}

function buildWaveformBars(samples: number[], targetBars = 40): number[] {
  if (!samples.length) return WAVEFORM_BARS;
  const rawBars: number[] = [];
  for (let i = 0; i < targetBars; i += 1) {
    const start = Math.floor((i / targetBars) * samples.length);
    const end = Math.floor(((i + 1) / targetBars) * samples.length);
    const chunk = samples.slice(start, Math.max(start + 1, end));
    const peak = chunk.reduce((acc, v) => Math.max(acc, v), 0);
    rawBars.push(Math.max(0, Math.min(1, peak)));
  }

  const smoothed = smoothBars(rawBars, 1);
  const noiseFloor = 0.08;
  const speechBoost = 1.35;

  return smoothed.map((v) => {
    // Gate de silêncio: remove ruído residual de microfone.
    const gated = v <= noiseFloor ? 0 : (v - noiseFloor) / (1 - noiseFloor);
    // Compressão suave para valorizar fala sem "estourar" barras.
    const compressed = Math.pow(gated, 0.7) * speechBoost;
    return Math.max(0.08, Math.min(1, compressed));
  });
}

function VoiceWaveformPreview({ progress, playing, bars }: { progress: number; playing: boolean; bars: number[] }) {
  const baseBars = bars.length ? bars : WAVEFORM_BARS;
  return (
    <div className="flex h-10 items-end gap-[3px] rounded-md bg-black/5 px-2 py-1.5 dark:bg-white/10">
      {baseBars.map((amp, i) => {
        const h = Math.max(5, Math.round(amp * 24));
        const threshold = (i + 1) / baseBars.length;
        const active = progress >= threshold;
        return (
          <span
            key={i}
            className={`wa-wave-bar ${active ? 'wa-wave-bar--active' : ''} ${playing ? 'wa-wave-bar--playing' : ''}`}
            style={{ height: `${h}px`, animationDelay: `${i * 0.05}s` }}
          />
        );
      })}
    </div>
  );
}

/** Tamanho de exibição de figurinha no chat (WhatsApp Web ~180px; arquivo 512×512). */
const WA_STICKER_DISPLAY_PX = 180;

function mediaMimeCategory(
  mime: string | null | undefined,
  mediaTypeField?: string | null,
  filename?: string | null
): 'image' | 'audio' | 'video' | 'document' | 'sticker' {
  const t = (mediaTypeField || '').toLowerCase();
  if (t === 'sticker') return 'sticker';
  if (t === 'image') return 'image';
  if (t === 'video') return 'video';
  if (t === 'audio' || t === 'ptt' || t === 'voice') return 'audio';
  if (t === 'document') return 'document';
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  const low = (filename || '').toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(low)) return 'image';
  if (/\.(ogg|opus|mp3|wav|m4a|aac|webm)$/i.test(low)) return 'audio';
  if (/\.(mp4|mov|mkv|avi|webm)$/i.test(low)) return 'video';
  return 'document';
}

/** Trecho exibido na barra de resposta do composer (rótulos iguais ao WhatsApp Web). */
function composerReplySnippet(m: WhatsappMessageDto): string {
  const raw = (m.content || '').trim();
  if (raw && !raw.includes('BEGIN:VCARD')) {
    return repairUtf8Mojibake(raw);
  }
  const mt = (m.mediaType || '').toLowerCase();
  if (mt === 'sticker') return 'Figurinha';
  if (mt === 'location') return 'Localização';
  if (mt === 'contact') return 'Contato';
  const hasMedia = Boolean(
    m.hasMedia ||
      m.mediaUrl ||
      m.mediaType ||
      m.mediaMimetype ||
      m.mimeType ||
      m.fileName ||
      m.mediaFilename
  );
  if (!hasMedia) return 'Mensagem';
  const cat = mediaMimeCategory(
    m.mediaMimetype ?? m.mimeType ?? undefined,
    m.mediaType,
    m.mediaFilename || m.fileName
  );
  if (cat === 'image') return 'Foto';
  if (cat === 'video') return 'Vídeo';
  if (cat === 'audio') return 'Áudio';
  if (cat === 'document') {
    const name = repairUtf8Mojibake(m.mediaFilename || m.fileName || '').trim();
    return name || 'Documento';
  }
  return 'Mensagem';
}

function tokenQueryString(): string {
  const t = localStorage.getItem('token');
  return t ? `&token=${encodeURIComponent(t)}` : '';
}

function PdfDocumentCard({
  filename,
  sizeLabel,
  pending,
  fromMe,
  onOpen,
}: {
  filename: string;
  sizeLabel?: string | null;
  pending?: boolean;
  fromMe?: boolean;
  onOpen?: () => void;
}) {
  const meta = pending ? 'PDF' : sizeLabel ? `PDF • ${sizeLabel}` : 'PDF';
  const cardBg = fromMe
    ? 'bg-[#d1f4cc] dark:bg-[#0b3d33]/70'
    : 'bg-[#f0f2f5] dark:bg-[#1d282f]';
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!pending) onOpen?.();
      }}
      className={`mb-1 w-full min-w-[min(100%,280px)] overflow-hidden rounded-lg text-left transition ${
        pending ? 'cursor-default' : 'cursor-pointer hover:opacity-95'
      } ${cardBg}`}
      aria-label={pending ? `Enviando ${filename}` : `Abrir ${filename}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <img src={iconePdfChat} alt="" className="h-9 w-9 shrink-0 object-contain" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-tight text-[#111b21] dark:text-[#e9edef]">
            {filename}
          </p>
          <p className="mt-0.5 text-[12px] leading-tight text-[#667781] dark:text-[#8696a0]">{meta}</p>
        </div>
      </div>
    </button>
  );
}

function MediaRenderer({
  m,
  onImageClick,
  audioFooterRight,
}: {
  m: WhatsappMessageDto;
  onImageClick?: (url: string) => void;
  audioFooterRight?: React.ReactNode;
}) {
  // `m.id` sempre existe (id interno do BD) e NÃO indica mídia.
  // Só renderiza bloco de arquivo/mídia quando houver referência real de mídia.
  const hasAnyMediaRef = Boolean(
    m.hasMedia ||
      m.mediaUrl ||
      m.mediaType ||
      m.mediaMimetype ||
      m.mimeType ||
      m.fileName ||
      m.mediaFilename
  );
  if (!hasAnyMediaRef) return null;
  const fname = repairUtf8Mojibake(m.mediaFilename || m.fileName || 'arquivo');
  const legacy = m.mediaUrl ? whatsappProviderMediaProxyUrl(m.mediaUrl, fname) + tokenQueryString() : null;
  // Stream por id só faz sentido quando a mensagem realmente tem mídia (o backend valida `hasMedia`).
  const byId = m.hasMedia ? whatsappMessageMediaInlineUrl(m.id) : null;
  const byIdDownload = m.hasMedia ? whatsappMessageMediaDownloadUrl(m.id) : null;
  const mediaSrc = byId || legacy;
  const mediaSrcDownload = byIdDownload || (m.mediaUrl ? whatsappProviderMediaProxyDownloadUrl(m.mediaUrl, fname) + tokenQueryString() : null) || mediaSrc;

  let cat = mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, fname);
  if (cat === 'document') {
    const c = (m.content || '').toLowerCase();
    if (c.includes('áudio') || c.includes('audio') || c.includes('🎤')) cat = 'audio';
    else if (c.includes('imagem') || c.includes('foto') || c.includes('📷')) cat = 'image';
  }
  const sizeLabel = formatFileSize(m.fileSize ?? undefined);
  const lowName = fname.toLowerCase();
  const isPdf =
    (m.mediaMimetype || '').toLowerCase().includes('pdf') ||
    lowName.endsWith('.pdf') ||
    (m.content || '').toLowerCase().includes('.pdf');
  const isPendingOutboundPdf = Boolean(m.fromMe && isPdf && hasAnyMediaRef && !mediaSrc);

  if (isPdf && (mediaSrc || isPendingOutboundPdf)) {
    const openPdfAsBlobInNewTab = async () => {
      if (!mediaSrc) return;
      try {
        const resp = await fetch(mediaSrc, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        openInNewTab(url);
        window.setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            /* ignore */
          }
        }, 60_000);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível abrir o PDF');
        openInNewTab(mediaSrc);
      }
    };
    return (
      <PdfDocumentCard
        filename={fname}
        sizeLabel={sizeLabel}
        pending={isPendingOutboundPdf}
        fromMe={m.fromMe}
        onOpen={() => void openPdfAsBlobInNewTab()}
      />
    );
  }

  if (!mediaSrc) return null;

  const audioMime =
    (m.mediaMimetype || '').toLowerCase().includes('ogg') || fname.toLowerCase().endsWith('.ogg')
      ? 'audio/ogg'
      : m.mediaMimetype || 'audio/ogg';
  const handleDownload = () => {
    const url = mediaSrcDownload ?? mediaSrc;
    downloadInNewTab({ url, filename: fname });
  };

  if (cat === 'sticker') {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(mediaSrc)}
        className="mb-0.5 block cursor-pointer leading-none"
        aria-label="Abrir figurinha"
        title="Abrir figurinha"
      >
        <img
          src={mediaSrc}
          alt="Figurinha"
          width={WA_STICKER_DISPLAY_PX}
          height={WA_STICKER_DISPLAY_PX}
          className="wa-chat-sticker-img"
          loading="lazy"
          draggable={false}
        />
      </button>
    );
  }

  if (cat === 'image') {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(mediaSrc)}
        className="block mb-1 cursor-pointer"
        aria-label="Abrir imagem"
        title="Abrir imagem"
      >
        <img
          src={mediaSrc}
          alt={fname}
          className="max-w-full max-h-72 rounded object-contain bg-black/5 dark:bg-white/5"
          loading="lazy"
        />
      </button>
    );
  }

  if (cat === 'audio') {
    const mt = (m.mediaType || '').toLowerCase();
    const low = fname.toLowerCase();
    const isVoiceNote =
      mt === 'voice' || mt === 'ptt' || low.endsWith('.opus') || low.includes('ptt') || low.endsWith('.oga');
    return (
      <AudioMessage
        src={mediaSrc}
        mimeType={audioMime}
        filename={fname}
        variant={m.fromMe ? 'outgoing' : 'incoming'}
        isVoiceNote={isVoiceNote}
        footerRight={audioFooterRight}
      />
    );
  }

  if (cat === 'video') {
    return (
      <video controls preload="metadata" className="max-w-full max-h-72 rounded mb-1">
        <source src={mediaSrc} type={m.mediaMimetype || 'video/mp4'} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  return (
    <div className="mb-1 overflow-hidden rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-[#161717]/40">
      <div className="flex items-center gap-3 px-2 py-2">
        <svg className="h-8 w-8 flex-shrink-0 text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">{fname}</p>
          {sizeLabel ? <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">{sizeLabel}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => openInNewTab(mediaSrc)}
          className="rounded-md border border-[#00a884] px-2 py-1 text-[11px] font-medium text-[#00a884] hover:bg-[#00a884]/10"
        >
          Visualizar
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-md border border-[#d1d7db] px-2 py-1 text-[11px] font-medium text-[#54656f] hover:bg-black/5 dark:border-[#2a3942] dark:text-[#8696a0] dark:hover:bg-white/10"
        >
          Baixar
        </button>
      </div>
    </div>
  );
}

/** Ícones do menu de ações da mensagem (estilo WhatsApp Web — stroke, ~18px). */
const WaMenuIconWrap = (p: { children: React.ReactNode; className?: string }) => (
  <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center ${p.className ?? ''}`}>{p.children}</span>
);

const WaMenuIconReply = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 015.5 5.5V19" />
  </svg>
);

const WaMenuIconPencil = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const WaMenuIconCopy = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const WaMenuIconStar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden {...p}>
    <path d="M12 3.5l2.2 5.2 5.6.4-4.3 3.7 1.4 5.5L12 15.9 6.1 18.3l1.4-5.5L3.2 9.1l5.6-.4L12 3.5z" />
  </svg>
);

const WaMenuIconForward = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M15 14l5-5-5-5M20 9H9.5A5.5 5.5 0 004 14.5V19" />
  </svg>
);

const WaMenuIconEyeOff = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
  </svg>
);

const WaMenuIconTrash = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
  </svg>
);

const WA_MSG_MENU_ITEM =
  'flex cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-2 text-[14px] leading-snug text-[#111b21] outline-none transition-colors dark:text-[#e9edef] data-[highlighted]:bg-[#f7f5f3] data-[highlighted]:text-[#111b21] dark:data-[highlighted]:bg-[#2a3942] dark:data-[highlighted]:text-[#e9edef] focus:bg-[#f7f5f3] focus:text-[#111b21] dark:focus:bg-[#2a3942] dark:focus:text-[#e9edef]';

const WA_MSG_MENU_ITEM_DANGER =
  'flex cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-2 text-[14px] leading-snug text-red-600 outline-none transition-colors dark:text-red-400 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:data-[highlighted]:bg-red-950/35 dark:data-[highlighted]:text-red-300 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/35 dark:focus:text-red-300';

const WA_MSG_MENU_ICON = 'h-[18px] w-[18px] shrink-0 text-[#54656f] dark:text-[#b0b9bf]';

/**
 * Reações rápidas exibidas no topo do menu da mensagem (estilo WhatsApp Web).
 * Mantemos curto (6) pra caber em uma linha; o usuário pode digitar/colar
 * outros emojis no futuro via picker dedicado.
 */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

const MessageBubble = memo(function MessageBubble({
  m,
  layout,
  groupParticipantLabel,
  showGroupParticipant,
  onDeleteMessage,
  onDeleteForMe,
  onStartForwardSelection,
  onReplyToMessage,
  onEditMessage,
  onReactToMessage,
  onToggleFavoriteMessage,
  isFavoriteMessage,
  onImageClick,
  onNavigateWhatsappChat,
  onOpenPhoneFromText,
  actionsDisabled,
}: {
  m: WhatsappMessageDto;
  layout: 'compact' | 'full';
  groupParticipantLabel?: string | null;
  showGroupParticipant?: boolean;
  onDeleteMessage: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onStartForwardSelection: (messageId: string) => void;
  onReplyToMessage: (message: WhatsappMessageDto) => void;
  onEditMessage: (message: WhatsappMessageDto) => void;
  onReactToMessage: (message: WhatsappMessageDto, emoji: string) => void;
  onToggleFavoriteMessage: (message: WhatsappMessageDto) => void;
  isFavoriteMessage: (messageId: string) => boolean;
  onImageClick?: (url: string) => void;
  /** Abre conversa ao tocar em “Conversar” no cartão de contato (vCard). */
  onNavigateWhatsappChat?: (chatId: string, label: string) => void;
  /** Abre conversa ao tocar em número detectado no texto da mensagem. */
  onOpenPhoneFromText?: (digits: string) => void;
  actionsDisabled?: boolean;
}) {
  const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false);
  const maxW = layout === 'full' ? 'max-w-[min(78%,720px)]' : 'max-w-[min(65%,420px)]';
  const vcard = useMemo(() => parseVCardFromText(m.content || ''), [m.content]);
  const showContactCard = Boolean(vcard);
  const hasMedia =
    !showContactCard &&
    m.mediaType !== 'location' &&
    m.mediaType !== 'contact' &&
    (!!m.hasMedia ||
      !!m.mediaUrl ||
      !!m.mediaType ||
      !!m.mediaMimetype ||
      !!m.mimeType ||
      !!m.fileName ||
      !!m.mediaFilename);
  const locationPayload = parseLocationFromMessageContent(m.content || '');
  const isFormattedLocationText = (m.content || '').trim().toLowerCase().startsWith('📍 localização compartilhada');
  const showContent =
    m.content &&
    (!hasMedia || !['📷 Imagem', '🎤 Áudio', '🎥 Vídeo', '🟩 Figurinha'].includes(m.content)) &&
    !(locationPayload && isFormattedLocationText) &&
    !showContactCard;
  const showAck = Boolean(m.fromMe);
  const primaryMediaKind = useMemo(() => {
    if (!hasMedia) return null as 'audio' | 'sticker' | null;
    const fname = repairUtf8Mojibake(m.mediaFilename || m.fileName || 'arquivo');
    let cat = mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, fname);
    if (cat === 'document') {
      const c = (m.content || '').toLowerCase();
      if (c.includes('áudio') || c.includes('audio') || c.includes('🎤')) cat = 'audio';
      else if (c.includes('imagem') || c.includes('foto') || c.includes('📷')) cat = 'image';
    }
    if (cat === 'audio') return 'audio';
    if (cat === 'sticker') return 'sticker';
    return null;
  }, [hasMedia, m.mediaFilename, m.fileName, m.mediaMimetype, m.mimeType, m.mediaType, m.content]);

  const primaryMediaIsAudio = primaryMediaKind === 'audio';
  const primaryMediaIsSticker = primaryMediaKind === 'sticker';

  const bubblePadX = primaryMediaIsAudio ? 'px-2.5' : primaryMediaIsSticker ? 'px-1 py-0.5' : 'px-2';
  const embedAudioMetaFooter = primaryMediaIsAudio && !showContent;
  const embedVCardMetaFooter = Boolean(showContactCard && vcard);

  /**
   * Modo "emoji jumbo" estilo WhatsApp Web: quando a mensagem contém APENAS
   * de 1 a 3 emojis (sem texto, sem mídia, sem vCard, sem localização), a
   * bolha some — emojis grandes flutuam sobre o fundo da conversa.
   *
   * Requisitos para entrar nesse modo:
   *  - `showContent` true (a mensagem renderiza texto, não placeholder);
   *  - Nenhuma mídia/vCard/location embutida (mantém bolha quando há);
   *  - `getEmojiOnlyCount` retornou 1, 2 ou 3.
   */
  const emojiJumboCount = useMemo<0 | 1 | 2 | 3>(() => {
    if (!showContent) return 0;
    if (hasMedia || showContactCard || (locationPayload && isFormattedLocationText)) return 0;
    return getEmojiOnlyCount(m.content);
  }, [showContent, hasMedia, showContactCard, locationPayload, isFormattedLocationText, m.content]);
  const isEmojiJumbo = emojiJumboCount > 0;

  /**
   * Pílula com o emoji de reação "pendurada" no canto inferior da bolha
   * (estilo WhatsApp Web). Posição muda conforme o lado:
   *  - Mensagem nossa (`fromMe`): canto inferior esquerdo da bolha.
   *  - Mensagem do cliente: canto inferior direito.
   */
  const reactionBadge =
    m.reaction && m.reaction.trim() ? (
      <button
        type="button"
        className={`absolute -bottom-2.5 z-10 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 text-[14px] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.15)] ring-1 ring-black/10 transition hover:scale-110 dark:bg-[#2a3942] dark:ring-white/10 ${
          m.fromMe ? '-left-1.5' : '-right-1.5'
        }`}
        onClick={(e) => {
          e.preventDefault();
          // Clicar no badge da própria reação NÃO remove pelo cliente —
          // apenas reage de volta com o mesmo emoji (toggle só faz sentido
          // se a reação for nossa; UI futura pode tratar esse caso).
          onReactToMessage(m, m.reaction || '');
        }}
        aria-label={`Reação: ${m.reaction}`}
        title={`Reação: ${m.reaction}`}
      >
        <span aria-hidden>{m.reaction}</span>
      </button>
    ) : null;

  /**
   * Quando entra no modo "emoji jumbo": removemos a bolha (bg, shadow, rounded)
   * e damos um `bubblePadX` mais frouxo, mantendo apenas o `relative` para
   * ancorar a reaction badge e o footer de horário/ack que continuam sobre os
   * emojis. O texto em si fica num `<p>` separado abaixo, com classe gigante.
   */
  const bubbleAppearanceClasses = isEmojiJumbo
    ? 'bg-transparent shadow-none'
    : m.fromMe
      ? 'bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#005c4b] dark:text-[#e9edef]'
      : 'bg-white text-[#111b21] rounded-lg rounded-tl-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#202c33] dark:text-[#e9edef]';
  const bubblePadYClass = isEmojiJumbo ? 'py-2' : 'py-1.5';

  return (
    <div className={`flex w-full px-9 sm:px-12 py-0.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative ${maxW} ${bubblePadX} ${bubblePadYClass} ${bubbleAppearanceClasses}`}
      >
        {reactionBadge}
        {!actionsDisabled ? (
          <div
            className={`absolute right-1 top-1 z-10 transition-opacity ${
              bubbleMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {/* Editar / excluir mensagem: somente neste menu (sem duplicar em barra ou seleção). */}
            <DropdownMenu open={bubbleMenuOpen} onOpenChange={setBubbleMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#54656f] hover:bg-black/10 dark:text-[#a9b4ba] dark:hover:bg-white/10"
                  aria-label="Ações da mensagem"
                  title="Ações"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                sideOffset={6}
                align={m.fromMe ? 'end' : 'start'}
                className="min-w-[11.5rem] w-max max-w-[min(100vw-2rem,16rem)] rounded-lg border border-gray-200 p-1.5 shadow-lg dark:border-[#3b4a54] dark:bg-[#233138] dark:text-[#e9edef]"
              >
                {m.providerMessageId ? (
                  <>
                    <div
                      className="mb-1 flex items-center justify-between gap-1 rounded-md bg-black/[0.03] px-1 py-1 dark:bg-white/[0.04]"
                      role="group"
                      aria-label="Reagir à mensagem"
                    >
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-125 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                          aria-label={`Reagir com ${emoji}`}
                          title={`Reagir com ${emoji}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setBubbleMenuOpen(false);
                            onReactToMessage(m, emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#3b4a54]" />
                  </>
                ) : null}
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!m.providerMessageId) {
                      toast.message('Aguarde a mensagem ser entregue antes de responder.');
                      return;
                    }
                    setBubbleMenuOpen(false);
                    onReplyToMessage(m);
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconReply className={WA_MSG_MENU_ICON} />
                  </WaMenuIconWrap>
                  Responder
                </DropdownMenuItem>
                {m.fromMe && !hasMedia ? (
                  <DropdownMenuItem
                    className={WA_MSG_MENU_ITEM}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!m.providerMessageId) {
                        toast.message('Aguarde a mensagem ser entregue antes de editar.');
                        return;
                      }
                      setBubbleMenuOpen(false);
                      onEditMessage(m);
                    }}
                  >
                    <WaMenuIconWrap>
                      <WaMenuIconPencil className={WA_MSG_MENU_ICON} />
                    </WaMenuIconWrap>
                    Editar
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM}
                  onSelect={async (e) => {
                    e.preventDefault();
                    const raw = (m.content || '').trim();
                    const text = repairUtf8Mojibake(raw || (m.mediaFilename || m.fileName || ''));
                    if (!text) {
                      toast.message('Nada para copiar');
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success('Copiado');
                    } catch {
                      toast.error('Não foi possível copiar');
                    }
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconCopy className={WA_MSG_MENU_ICON} />
                  </WaMenuIconWrap>
                  Copiar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM}
                  onSelect={(e) => {
                    e.preventDefault();
                    onToggleFavoriteMessage(m);
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconStar className={WA_MSG_MENU_ICON} />
                  </WaMenuIconWrap>
                  {isFavoriteMessage(m.id) ? 'Desfavoritar' : 'Favoritar'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM}
                  onSelect={(e) => {
                    e.preventDefault();
                    onStartForwardSelection(m.id);
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconForward className={WA_MSG_MENU_ICON} />
                  </WaMenuIconWrap>
                  Encaminhar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM}
                  onSelect={(e) => {
                    e.preventDefault();
                    onDeleteForMe(m.id);
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconEyeOff className={WA_MSG_MENU_ICON} />
                  </WaMenuIconWrap>
                  Apagar pra mim
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#3b4a54]" />
                <DropdownMenuLabel className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                  Para todos no chat
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className={WA_MSG_MENU_ITEM_DANGER}
                  onSelect={(e) => {
                    e.preventDefault();
                    onDeleteMessage(m.id);
                  }}
                >
                  <WaMenuIconWrap>
                    <WaMenuIconTrash className="h-[18px] w-[18px] shrink-0 text-red-600 dark:text-red-400" />
                  </WaMenuIconWrap>
                  Excluir mensagem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        {showGroupParticipant && !m.fromMe && groupParticipantLabel ? (
          <p className="mb-1 truncate text-[12px] font-semibold text-[#00a884] dark:text-[#00a884]">
            {groupParticipantLabel}
          </p>
        ) : null}
        {hasMedia && (
          <MediaRenderer
            m={m}
            onImageClick={onImageClick}
            audioFooterRight={
              embedAudioMetaFooter ? (
                <>
                  <span>{formatMsgTime(m.timestamp)}</span>
                  {showAck ? <OutboundAckIcon ack={m.ack} onOutgoingBubble={m.fromMe} /> : null}
                </>
              ) : undefined
            }
          />
        )}
        {locationPayload ? (
          <div className="mb-1 rounded-lg border border-[#d1d7db] bg-white/70 p-2 dark:border-[#2a3942] dark:bg-[#161717]/30">
            <p className="text-[13px] font-semibold text-[#111b21] dark:text-[#e9edef]">
              📍 {locationPayload.name || 'Localização'}
            </p>
            {locationPayload.address ? (
              <p className="mt-0.5 text-[12px] text-[#54656f] dark:text-[#a9b4ba]">{locationPayload.address}</p>
            ) : null}
            <p className="mt-0.5 text-[11px] text-[#667781] dark:text-[#8696a0]">
              {locationPayload.latitude.toFixed(6)}, {locationPayload.longitude.toFixed(6)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <a
                href={`https://maps.google.com/?q=${locationPayload.latitude},${locationPayload.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-[#d1d7db] px-2 py-1 text-[11px] font-medium text-[#54656f] hover:bg-black/5 dark:border-[#2a3942] dark:text-[#8696a0] dark:hover:bg-white/10"
              >
                Abrir no mapa
              </a>
            </div>
          </div>
        ) : null}
        {showContactCard && vcard ? (
          <div
            className={`mb-1 min-w-[260px] max-w-[min(100%,320px)] overflow-hidden rounded-[10px] border shadow-sm ${
              m.fromMe
                ? 'border-[#00000014] bg-white/90 dark:border-white/10 dark:bg-[#0b2a24]/90'
                : 'border-[#d1d7db] bg-white dark:border-[#2a3942] dark:bg-[#182229]'
            }`}
          >
            <div className="relative flex gap-2.5 px-2.5 pb-2 pt-2.5 pr-[4.5rem]">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#54656f] ${
                  m.fromMe ? 'bg-[#dfe5e7] dark:bg-[#2a3942]' : 'bg-[#dfe5e7] dark:bg-[#2a3942]'
                }`}
              >
                <UserRound className="h-7 w-7 opacity-80" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-[#111b21] dark:text-[#e9edef]">
                  {vcard.displayName || 'Contato'}
                </p>
                {vcard.phoneDigits[0] ? (
                  <div className="mt-1.5 flex items-start gap-2">
                    <span className="mt-0.5 rounded bg-[#00a884]/12 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#008069] dark:bg-[#00a884]/25 dark:text-[#53d4b0]">
                      Tel
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-[#111b21] dark:text-[#e9edef]">
                        {formatInternationalBrFromDigits(vcard.phoneDigits[0])}
                      </p>
                      {vcard.phoneDigits.slice(1).map((d) => (
                        <p key={d} className="mt-0.5 text-[12px] text-[#54656f] dark:text-[#a9b4ba]">
                          {formatInternationalBrFromDigits(d)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div
                className={`absolute bottom-1.5 right-2 flex items-center gap-0.5 text-[11px] tabular-nums ${
                  m.fromMe ? 'text-[#667781] dark:text-[#b8e8d8]' : 'text-[#667781]'
                }`}
              >
                <span>{formatMsgTime(m.timestamp)}</span>
                {showAck ? <OutboundAckIcon ack={m.ack} onOutgoingBubble={m.fromMe} /> : null}
              </div>
            </div>
            <div
              className={`grid grid-cols-2 divide-x ${
                m.fromMe
                  ? 'divide-[#00000012] border-t border-[#00000012] dark:divide-white/10 dark:border-white/10'
                  : 'divide-[#e9edef] border-t border-[#e9edef] dark:divide-[#2a3942] dark:border-[#2a3942]'
              }`}
            >
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium text-[#027e5f] transition hover:bg-black/[0.03] dark:text-[#53d4b0] dark:hover:bg-white/[0.04]"
                onClick={() => {
                  const raw = (m.content || '').trim();
                  if (!raw) {
                    toast.message('Nada para salvar');
                    return;
                  }
                  try {
                    const blob = new Blob([raw], { type: 'text/vcard;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(vcard.displayName || 'contato').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 40) || 'contato'}.vcf`;
                    a.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
                    toast.success('Contato baixado');
                  } catch {
                    toast.error('Não foi possível salvar o contato');
                  }
                }}
              >
                <Contact className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                Salvar contato
              </button>
              <button
                type="button"
                disabled={!vcard.phoneDigits[0]}
                className="flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium text-[#027e5f] transition enabled:hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#53d4b0] dark:enabled:hover:bg-white/[0.04]"
                onClick={() => {
                  const d = vcard.phoneDigits[0];
                  if (!d) {
                    toast.message('Telefone não disponível neste cartão');
                    return;
                  }
                  if (!onNavigateWhatsappChat) {
                    toast.message('Abra o chat na lista para usar “Conversar”.');
                    return;
                  }
                  const jid = toWhatsappChatId(d);
                  onNavigateWhatsappChat(jid, formatInternationalBrFromDigits(d));
                }}
              >
                <MessageCircle className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                Mandar mensagem
              </button>
            </div>
          </div>
        ) : null}
        {showContent && (() => {
          if (isEmojiJumbo) {
            const jumboText = repairUtf8Mojibake(m.content || '');
            if (!jumboText) return null;
            return (
              // Visual "emoji jumbo": glyphs gigantes sem bolha. O `pr-14` mantém
              // espaço lateral para o timestamp/ack absoluto não sobrepor o emoji.
              <p
                className={`${JUMBO_EMOJI_SIZE_CLASS[emojiJumboCount as 1 | 2 | 3]} whitespace-pre-wrap break-words pr-14 pb-1 select-text`}
              >
                <Twemoji
                  svg
                  className="message-emoji-text message-emoji-jumbo"
                  text={jumboText}
                />
              </p>
            );
          }
          return (
            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px] pr-14 pb-0.5">
              {renderWhatsAppText(m.content, onOpenPhoneFromText)}
            </p>
          );
        })()}
        {!showContent && <div className={primaryMediaIsAudio || embedVCardMetaFooter ? 'pb-1' : 'pb-4'} />}
        {!embedAudioMetaFooter && !embedVCardMetaFooter ? (
          <div
            className={`absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] tabular-nums ${
              m.fromMe ? 'text-[#667781]' : 'text-[#667781]'
            }`}
          >
            <span>{formatMsgTime(m.timestamp)}</span>
            {showAck ? <OutboundAckIcon ack={m.ack} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

const ChevronDownIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export interface WhatsAppChatPanelProps {
  /** Quando vazio, a coluna da direita mostra apenas o estado vazio. */
  chatId: string;
  title: string;
  /** Só usado no painel embutido; na página dedicada omitir para esconder o ✕. */
  onClose?: () => void;
  onEditLead?: () => void;
  onNavigateChat?: (chatId: string, label: string) => void;
  /** `full` = tela cheia (lista + conversa estilo WhatsApp Web desktop). */
  layout?: 'compact' | 'full';
}

export const WhatsAppChatPanel: React.FC<WhatsAppChatPanelProps> = ({
  chatId,
  title,
  onClose,
  onEditLead,
  onNavigateChat,
  layout = 'compact',
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<WhatsappMessageDto | null>(null);

  const favoritesStorageKey = useMemo(() => `wa-chat-favs:${canonicalWhatsappChatId(chatId)}`, [chatId]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesStorageKey);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(arr)) {
        setFavoriteIds(new Set(arr.filter((x) => typeof x === 'string')));
      } else {
        setFavoriteIds(new Set());
      }
    } catch {
      setFavoriteIds(new Set());
    }
  }, [favoritesStorageKey]);

  // Fixar/Favoritar conversa agora é persistido no backend (por usuário).

  const isFavoriteMessage = useCallback((messageId: string) => favoriteIds.has(messageId), [favoriteIds]);

  const persistFavorites = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify([...next.values()]));
    } catch {
      // ignore
    }
  }, [favoritesStorageKey]);

  const toggleFavoriteMessage = useCallback((m: WhatsappMessageDto) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) {
        next.delete(m.id);
        toast.message('Mensagem desfavoritada');
      } else {
        next.add(m.id);
        toast.message('Mensagem favoritada');
      }
      persistFavorites(next);
      return next;
    });
  }, [persistFavorites]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  /**
   * Reset visual imediato ao trocar de chat:
   * evita “piscar” o nome do contato anterior enquanto o novo header/meta ainda não carregou.
   */
  const [forceHeaderReset, setForceHeaderReset] = useState(false);
  const [isInForwardSelectionMode, setIsInForwardSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => new Set());
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardTargetChatId, setForwardTargetChatId] = useState<string | null>(null);
  const [forwardingNow, setForwardingNow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [newPhoneComposerOpen, setNewPhoneComposerOpen] = useState(false);
  /**
   * Filtros built-in: `all` (Tudo) e `unread / favorites / groups`.
   * Filtros customizados: `label:<id>` — pertinência via `whatsapp_chat_label_memberships`.
   */
  const [chatSidebarFilter, setChatSidebarFilter] = useState<string>(readStoredSidebarFilter);
  const [labelEditOpen, setLabelEditOpen] = useState(false);
  const [labelEditTarget, setLabelEditTarget] = useState<WhatsappChatLabelDto | null>(null);
  const [labelPickChatsOpen, setLabelPickChatsOpen] = useState(false);
  const labelPickChatsResolverRef = useRef<((v: string[] | null) => void) | null>(null);
  const [labelPickInitialIds, setLabelPickInitialIds] = useState<string[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [pendingMediaList, setPendingMediaList] = useState<PendingMedia[]>([]);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isDraggingFileOverChat, setIsDraggingFileOverChat] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ chatId: string; label: string } | null>(null);
  const WA_ASIDE_MIN_WIDTH = 408;
  const WA_ASIDE_MAX_WIDTH = 720;
  const [asideWidth, setAsideWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return WA_ASIDE_MIN_WIDTH;
    try {
      const stored = window.localStorage.getItem('wa-chat-aside-width');
      const v = stored ? Number(stored) : NaN;
      if (Number.isFinite(v)) {
        return Math.max(WA_ASIDE_MIN_WIDTH, Math.min(WA_ASIDE_MAX_WIDTH, v));
      }
    } catch {
      // localStorage indisponível — usa default
    }
    return WA_ASIDE_MIN_WIDTH;
  });
  const [isResizingAside, setIsResizingAside] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);
  const filterTabsRef = useRef<HTMLDivElement | null>(null);
  const filterTabsDragRef = useRef<{ startX: number; startScroll: number; pointerId: number; moved: boolean } | null>(null);
  const filterTabsJustDraggedRef = useRef(false);
  const asideResizeRef = useRef<{
    startX: number;
    startW: number;
    pointerId: number;
    target: HTMLDivElement;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem('wa-chat-aside-width', String(asideWidth));
    } catch {
      // localStorage indisponível — ignora persistência
    }
  }, [asideWidth]);

  const handleFilterTabsPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    const el = filterTabsRef.current;
    if (!el) return;
    filterTabsDragRef.current = {
      startX: e.clientX,
      startScroll: el.scrollLeft,
      pointerId: e.pointerId,
      moved: false,
    };
  }, []);

  const handleFilterTabsPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = filterTabsDragRef.current;
    const el = filterTabsRef.current;
    if (!state || !el) return;
    const dx = e.clientX - state.startX;
    if (!state.moved && Math.abs(dx) > 4) {
      state.moved = true;
      try {
        el.setPointerCapture(state.pointerId);
      } catch {
        // setPointerCapture pode falhar — segue com listeners normais
      }
    }
    if (state.moved) {
      el.scrollLeft = state.startScroll - dx;
      e.preventDefault();
    }
  }, []);

  const handleFilterTabsPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = filterTabsDragRef.current;
    if (!state) return;
    const el = filterTabsRef.current;
    if (state.moved) {
      filterTabsJustDraggedRef.current = true;
      window.setTimeout(() => {
        filterTabsJustDraggedRef.current = false;
      }, 0);
      try {
        el?.releasePointerCapture?.(state.pointerId);
      } catch {
        // releasePointerCapture pode falhar — ignorado
      }
    }
    filterTabsDragRef.current = null;
    e.stopPropagation();
  }, []);

  const handleAsideResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget;
    const startW = asideRef.current?.getBoundingClientRect().width ?? asideWidth;
    asideResizeRef.current = {
      startX: e.clientX,
      startW,
      pointerId: e.pointerId,
      target,
    };
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture pode falhar — usa listeners
    }
    setIsResizingAside(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [asideWidth]);

  const handleAsideResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = asideResizeRef.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    // O `sm:max-w-[60vw]` no CSS cuida do clamp visual em telas estreitas; aqui só impomos os limites lógicos.
    const next = Math.max(
      WA_ASIDE_MIN_WIDTH,
      Math.min(WA_ASIDE_MAX_WIDTH, Math.round(state.startW + dx))
    );
    setAsideWidth(next);
  }, []);

  const handleAsideResizeEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = asideResizeRef.current;
    if (!state) return;
    try {
      state.target.releasePointerCapture?.(state.pointerId);
    } catch {
      // releasePointerCapture pode falhar — ignorado
    }
    asideResizeRef.current = null;
    setIsResizingAside(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);
  const [batchUploadProgress, setBatchUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const photosVideosInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const [composerPickerOpen, setComposerPickerOpen] = useState(false);
  const [composerPickerTab, setComposerPickerTab] = useState<ComposerPickerTab>('emoji');
  const composerPickerPanelRef = useRef<HTMLDivElement>(null);
  const composerPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const composerDraftInputRef = useRef<WhatsappComposerEditorHandle>(null);
  const chatFileDragCounterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionReadLastByChatRef = useRef<Map<string, string>>(new Map());
  const prevProviderConnRef = useRef<boolean | undefined>(undefined);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdRef = useRef(chatId);

  useEffect(() => {
    if (!composerPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (composerPickerPanelRef.current?.contains(t)) return;
      if (composerPickerTriggerRef.current?.contains(t)) return;
      setComposerPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [composerPickerOpen]);

  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [contactsPanelOpen, setContactsPanelOpen] = useState(false);
  const [contactsPanelForceRefresh, setContactsPanelForceRefresh] = useState(false);
  const [groupsForceRefresh, setGroupsForceRefresh] = useState(false);
  const [contactsAgendaSearchInput, setContactsAgendaSearchInput] = useState('');
  const [debouncedAgendaSearch, setDebouncedAgendaSearch] = useState('');
  const [contactsSortBy, setContactsSortBy] = useState<'name' | 'id'>('name');
  const [contactsSortOrder, setContactsSortOrder] = useState<'asc' | 'desc'>('asc');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedAgendaSearch(contactsAgendaSearchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [contactsAgendaSearchInput]);
  const [checkPhoneDraft, setCheckPhoneDraft] = useState('');
  const [checkPhoneResult, setCheckPhoneResult] = useState<{ numberExists: boolean; chatId: string | null } | null>(
    null
  );
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [archivedPanelOpen, setArchivedPanelOpen] = useState(false);
  const [sendContactStep, setSendContactStep] = useState<'idle' | 'pick' | 'confirm'>('idle');
  const [sendContactSearch, setSendContactSearch] = useState('');
  const [sendContactSelectedIds, setSendContactSelectedIds] = useState<string[]>([]);
  const [sendContactConfirmRows, setSendContactConfirmRows] = useState<S3eContactPickerRow[]>([]);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(false);
  const contactPanelAutoFetchKeyRef = useRef<string>('');
  const [actionsClienteSearch, setActionsClienteSearch] = useState('');
  const [actionsClienteSearchDebounced, setActionsClienteSearchDebounced] = useState('');
  const [actionsContextSnapshot, setActionsContextSnapshot] = useState<WhatsappActionsContextData | null>(null);
  const [groupSubjectDraft, setGroupSubjectDraft] = useState('');
  const [groupDescriptionDraft, setGroupDescriptionDraft] = useState('');
  const [groupPictureDraft, setGroupPictureDraft] = useState('');
  const [groupInviteDescription, setGroupInviteDescription] = useState('');
  const [groupInviteNumbers, setGroupInviteNumbers] = useState('');
  const [groupMembersAction, setGroupMembersAction] = useState<'add' | 'remove' | 'promote' | 'demote'>('add');
  const [groupMembersDraft, setGroupMembersDraft] = useState('');
  const [groupSettingAction, setGroupSettingAction] = useState<'announcement' | 'not_announcement' | 'locked' | 'unlocked'>(
    'announcement'
  );

  const exitForwardSelectionMode = useCallback(() => {
    setIsInForwardSelectionMode(false);
    setSelectedMessageIds(new Set());
    setForwardModalOpen(false);
    setForwardTargetChatId(null);
  }, []);

  const toggleForwardSelectedMessage = useCallback((messageId: string) => {
    if (!messageId) return;
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  // Edição de mensagem (precisa ser declarada antes do handler global de teclado)
  const startEditMessage = useCallback((m: WhatsappMessageDto) => {
    setEditingId(m.id);
    setEditDraft(stripOutboundPrefixForEdit(m.content));
  }, []);

  const cancelEditMessage = useCallback(() => {
    setEditingId(null);
    setEditDraft('');
  }, []);

  /**
   * Reage a uma mensagem (ou remove a reação ao passar `''`).
   * Atualiza o cache local imediatamente; o backend persiste e emite socket.
   */
  const reactToMessage = useCallback(
    async (m: WhatsappMessageDto, emoji: string) => {
      if (!m.id) return;
      if (!m.providerMessageId) {
        toast.message('Aguarde a mensagem ser entregue antes de reagir.');
        return;
      }
      const trimmed = (emoji || '').trim();
      const cid = canonicalWhatsappChatId(m.chatId);
      const previous = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid));
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).map((x) =>
          x.id === m.id ? { ...x, reaction: trimmed ? trimmed : null } : x
        )
      );
      try {
        const res = await reactToWhatsappMessage(m.id, trimmed);
        if (!res.success) {
          if (previous) queryClient.setQueryData(messagesQueryKey(cid), previous);
          toast.error(res.error || 'Não foi possível reagir');
          return;
        }
        if (res.data) {
          queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
            (old ?? []).map((x) =>
              x.id === res.data!.id ? { ...x, reaction: res.data!.reaction } : x
            )
          );
        }
        toast.success(trimmed ? `Reação ${trimmed} enviada` : 'Reação removida');
      } catch (err) {
        if (previous) queryClient.setQueryData(messagesQueryKey(cid), previous);
        console.warn('[WA] reactToWhatsappMessage falhou', err);
        toast.error('Não foi possível reagir');
      }
    },
    [queryClient]
  );
  const [groupEphemeralExpiration, setGroupEphemeralExpiration] = useState('86400');
  const [groupInviteUrl, setGroupInviteUrl] = useState('');
  const [groupInfo, setGroupInfo] = useState<GroupInfoView | null>(null);
  const [profileFetchNumber, setProfileFetchNumber] = useState('');
  const [profileWpName, setProfileWpName] = useState('');
  const [profileWpStatus, setProfileWpStatus] = useState('');
  const [profileWpPicture, setProfileWpPicture] = useState('');
  const [privacyForm, setPrivacyForm] = useState<EvolutionPrivacySettingsBody>(() => defaultEvolutionPrivacy());
  const [profileLookupJson, setProfileLookupJson] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrIssuedAtMs, setQrIssuedAtMs] = useState<number | null>(null);
  const presenceResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Flag local que indica se já enviamos `available` ao provedor para a
   * "digitação atual". Evita disparar uma chamada HTTP a cada tecla — o
   * `useEffect` que observa `draft` re-executa em todo keystroke e antes
   * essa chamada acontecia N vezes (gerando lag visível e ruído de rede).
   */
  const presenceAvailableSentRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingWaveRafRef = useRef<number | null>(null);
  const recordingWaveSamplesRef = useRef<number[]>([]);
  const recordingWaveDataRef = useRef<Uint8Array | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelRef = useRef(false);
  const recordingStoppingRef = useRef(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [pendingRecordedAudio, setPendingRecordedAudio] = useState<PendingRecordedAudio | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentSec, setPreviewCurrentSec] = useState(0);
  const [previewDurationSec, setPreviewDurationSec] = useState(0);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const ackFallbackSyncInFlightRef = useRef(false);
  const ackFallbackSignatureRef = useRef('');
  const auth = useContext(AuthContext);
  const crmUser = auth?.user ?? null;
  const crmIsAdmin = useMemo(() => isCrmAdminUser(crmUser), [crmUser]);
  const realtime = useWhatsAppRealtimeStatus();
  chatIdRef.current = chatId;

  useEffect(() => {
    if (!sidebarMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target as Node)) {
        setSidebarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [sidebarMenuOpen]);

  const { data: chatList = [] } = useQuery({
    queryKey: chatsQueryKey,
    queryFn: async (): Promise<WhatsappChatPreview[]> => {
      const r = await fetchWhatsappChats();
      if (!r.success || !Array.isArray(r.data)) return [];
      return sortChatsByRecent(
        dedupeChatPreviews(
          r.data.map((c) => ({
            ...c,
            unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
            lastAck: c.lastAck ?? null,
          }))
        )
      );
    },
    // Fallback se o Socket.io falhar (CORS, proxy, etc.)
    refetchInterval: realtime.connected ? 60_000 : 20_000,
    refetchIntervalInBackground: false,
  });

  const { data: chatLabels = [] } = useQuery({
    queryKey: ['whatsapp-chat-labels'] as const,
    queryFn: async (): Promise<WhatsappChatLabelDto[]> => {
      const r = await listChatLabels();
      if (r.success && Array.isArray(r.data)) return r.data;
      return [];
    },
    // O usuário cria/edita listas raramente — uma janela grande é OK.
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(WA_SIDEBAR_FILTER_STORAGE_KEY, chatSidebarFilter);
    } catch {
      // localStorage indisponível
    }
  }, [chatSidebarFilter]);

  useEffect(() => {
    if (!chatSidebarFilter.startsWith('label:')) return;
    const labelId = chatSidebarFilter.slice('label:'.length);
    if (chatLabels.some((l) => l.id === labelId)) return;
    setChatSidebarFilter('all');
  }, [chatSidebarFilter, chatLabels]);

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: messagesQueryKey(chatId),
    queryFn: async (): Promise<WhatsappMessageDto[]> => {
      const cid = canonicalWhatsappChatId(chatId);
      const r = await fetchWhatsappMessages(cid);
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: Boolean(chatId),
    // Socket-first: quando tempo real está online, não precisa polling agressivo.
    refetchInterval: Boolean(chatId) ? (realtime.connected ? false : 60_000) : false,
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 2_000,
  });

  const outboundChatId = useMemo(() => resolveOutboundChatId(chatId), [chatId]);

  const displayMessages = useMemo(() => {
    const byId = new Map<string, WhatsappMessageDto>();
    for (const x of messages) {
      byId.set(x.id, x);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages]);

  const evolutionNumberFromChat = useCallback((cid: string): string => {
    const digits = waJidToDigits(canonicalWhatsappChatId(cid));
    return digits;
  }, []);

  const sendContactRecipientPretty = useMemo(() => {
    const num = evolutionNumberFromChat(outboundChatId);
    const intl = formatInternationalBrFromDigits(num);
    if (intl && intl.length > 1) return intl;
    return formatPhoneForDisplay(resolveOutboundChatId(outboundChatId));
  }, [outboundChatId, evolutionNumberFromChat]);

  const { data: connectionStatus } = useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: async () => {
      const r = await fetchWhatsappConnectionStatus();
      if (!r.success || !r.data) return null;
      return r.data;
    },
    // Socket-first: quando conectado, confia no evento `whatsapp:connection:status`.
    // Fallback leve só quando o socket estiver offline.
    refetchInterval: realtime.connected ? false : 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 2_000,
  });

  const {
    data: connectionQr,
    isLoading: loadingConnectionQr,
    refetch: refetchConnectionQr,
    isFetching: fetchingConnectionQr,
    error: connectionQrError,
  } = useQuery({
    queryKey: ['whatsapp-connection-qr'],
    queryFn: async () => {
      const r = await fetchWhatsappConnectionQr();
      if (!r.success || !r.data) throw new Error(r.error || 'Não foi possível obter o QR code.');
      return r.data;
    },
    enabled: qrModalOpen,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!qrModalOpen) return;
    if (connectionQr?.base64) {
      setQrIssuedAtMs(Date.now());
    }
  }, [qrModalOpen, connectionQr?.base64, connectionQr?.count]);

  useEffect(() => {
    if (!qrModalOpen) return;
    if (!connectionStatus?.connected) return;
    setQrModalOpen(false);
    setQrIssuedAtMs(null);
  }, [qrModalOpen, connectionStatus?.connected]);

  useEffect(() => {
    if (!qrModalOpen) return;
    const timer = window.setInterval(() => {
      if (connectionStatus?.connected) return;
      if (!qrIssuedAtMs) return;
      if (fetchingConnectionQr) return;
      const elapsed = Date.now() - qrIssuedAtMs;
      if (elapsed < WHATSAPP_QR_ROTATION_MS) return;
      void refetchConnectionQr();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [qrModalOpen, connectionStatus?.connected, qrIssuedAtMs, fetchingConnectionQr, refetchConnectionQr]);

  const { data: providerContactRows = [] } = useQuery({
    queryKey: ['whatsapp-provider-contacts'],
    queryFn: async (): Promise<WhatsappProviderContactRow[]> => {
      const r = await fetchWhatsappProviderContacts();
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: false, // evita chamadas automáticas ao abrir o chat (reduz risco de ban)
    staleTime: 30 * 60 * 1000,
  });

  const useAgendaServerSearch = debouncedAgendaSearch.length >= WHATSAPP_AGENDA_SEARCH_MIN_CHARS;

  const {
    data: agendaListFull = [],
    isLoading: agendaListFullLoading,
    refetch: refetchContactsPanel,
  } = useQuery({
    queryKey: ['whatsapp-provider-contacts-panel', contactsSortBy, contactsSortOrder],
    queryFn: async (): Promise<WhatsappProviderContactRow[]> => {
      const r = await fetchWhatsappProviderContacts(
        {
          limit: WHATSAPP_AGENDA_LIST_LIMIT,
          offset: 0,
          sortBy: contactsSortBy,
          sortOrder: contactsSortOrder,
          refresh: contactsPanelForceRefresh,
        },
        { timeout: 120_000 }
      );
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: contactsPanelOpen && !useAgendaServerSearch,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: agendaListSearch = [],
    isFetching: agendaListSearchFetching,
    refetch: refetchAgendaSearch,
  } = useQuery({
    queryKey: ['whatsapp-provider-contacts-search', debouncedAgendaSearch] as const,
    queryFn: async (): Promise<WhatsappProviderContactRow[]> => {
      const r = await fetchWhatsappProviderContactsSearch(debouncedAgendaSearch);
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: contactsPanelOpen && useAgendaServerSearch,
    staleTime: 60 * 1000,
  });

  const agendaDisplayedRows = useAgendaServerSearch ? agendaListSearch : agendaListFull;
  const agendaDisplayedLoading = useAgendaServerSearch ? agendaListSearchFetching : agendaListFullLoading;

  const agendaDisplayedRowsSorted = useMemo(() => {
    const rows = [...agendaDisplayedRows];
    const mul = contactsSortOrder === 'asc' ? 1 : -1;
    const key = (r: WhatsappProviderContactRow) =>
      contactsSortBy === 'id'
        ? String(r.id || '')
        : (whatsappContactDisplayName(r) || r.id || '').toLowerCase();
    rows.sort((a, b) => key(a).localeCompare(key(b), 'pt-BR', { sensitivity: 'base' }) * mul);
    return rows;
  }, [agendaDisplayedRows, contactsSortBy, contactsSortOrder]);

  const sendContactFlowActive = sendContactStep !== 'idle';
  /**
   * Fonte do picker "Enviar contato": agenda S3E (`contatos_s3e`), NÃO mais a
   * agenda do provedor (Evolution/Baileys). Motivação:
   *  - A agenda do provedor não inclui mais o catálogo da Meta (foi bloqueada),
   *    então só listava quem o operador já conversou — cobertura ruim;
   *  - A agenda S3E carrega os ~3k contatos importados via CSV + os novos
   *    capturados automaticamente em mensagens inbound;
   *  - Os nomes da S3E (`nomeAgenda`) são os reais cadastrados, não cache do
   *    WhatsApp que poderia ser replicado entre conversas.
   * Limite de 5000 é o teto cap do backend (suficiente para a base atual).
   */
  const {
    data: sendContactPickerRows = [] as S3eContactPickerRow[],
    isLoading: sendContactPickerLoading,
  } = useQuery({
    queryKey: ['s3e-contacts-send-flow', 5000] as const,
    queryFn: async (): Promise<S3eContactPickerRow[]> => {
      const r = await listContatosS3e({
        pageSize: 5000,
        page: 1,
        orderBy: 'nome',
        revisado: 'todos'
      });
      if (!r.success || !r.data || !Array.isArray(r.data.items)) return [];
      return r.data.items.map(s3eContactToProviderRow);
    },
    enabled: sendContactFlowActive,
    staleTime: 2 * 60 * 1000,
  });

  /** Fotos no picker desativadas: buscar URL por contato em massa sobrecarrega Evolution e congela a UI. */
  const sendFlowPicByContactId = useMemo(() => new Map<string, string | null>(), []);

  const sendContactFilteredRows = useMemo(() => {
    const base = sendContactPickerRows.filter((r) => !r.isGroup);
    const q = normalizeSearchText(sendContactSearch);
    if (!q) return base;
    return base.filter((c) => {
      const label = whatsappContactDisplayName(c);
      // Inclui `s3eEmpresa` no haystack — permite localizar por nome da empresa
      // (ex.: "Fortlev", "Cattoni") sem precisar lembrar do contato pessoal.
      const hay = normalizeSearchText(
        [label, c.id, c.number || '', c.pushname || '', c.shortName || '', c.s3eEmpresa || ''].join(' ')
      );
      return hay.includes(q);
    });
  }, [sendContactPickerRows, sendContactSearch]);

  /**
   * Ordena pela `nomeAgenda` (já que a agenda S3E não tem `isMe`) e corta no
   * teto de render para não estourar o DOM. `youRows` é mantido como `[]` por
   * compatibilidade com o consumer abaixo, mas a seção visual foi removida.
   */
  const sendPickerLayout = useMemo(() => {
    const filtered = sendContactFilteredRows;
    const sorted = [...filtered].sort((a, b) =>
      whatsappContactDisplayName(a).localeCompare(whatsappContactDisplayName(b), 'pt-BR', { sensitivity: 'base' })
    );
    const cap = WA_SEND_CONTACT_PICKER_RENDER_CAP;
    const otherShown = sorted.slice(0, cap);
    const hiddenCount = Math.max(0, filtered.length - otherShown.length);
    return { youRows: [] as S3eContactPickerRow[], otherRows: otherShown, hiddenCount, total: filtered.length };
  }, [sendContactFilteredRows]);

  const sendContactYouRows = sendPickerLayout.youRows;
  const sendContactOtherRows = sendPickerLayout.otherRows;

  const closeSendContactFlow = useCallback(() => {
    setSendContactStep('idle');
    setSendContactSearch('');
    setSendContactSelectedIds([]);
    setSendContactConfirmRows([]);
  }, []);

  const toggleSendContactSelected = useCallback((id: string, sendable: boolean) => {
    if (!sendable) {
      toast.message('Este contato não pode ser enviado (número indisponível).');
      return;
    }
    setSendContactSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= WA_SEND_CONTACT_MAX) {
        toast.message(`No máximo ${WA_SEND_CONTACT_MAX} contatos por envio.`);
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const openSendContactConfirmStep = useCallback(() => {
    if (!sendContactSelectedIds.length) {
      toast.message('Selecione ao menos um contato.');
      return;
    }
    const map = new Map(sendContactPickerRows.map((r) => [r.id, r]));
    const rows: S3eContactPickerRow[] = [];
    for (const id of sendContactSelectedIds) {
      const r = map.get(id);
      if (!r) continue;
      if (!contactRowIsEvolutionSendable(r)) {
        toast.error(`Contato sem número válido: ${whatsappContactDisplayName(r) || id}`);
        return;
      }
      rows.push(r);
    }
    if (!rows.length) {
      toast.error('Não foi possível montar a lista de envio.');
      return;
    }
    setSendContactConfirmRows(rows);
    setSendContactStep('confirm');
  }, [sendContactPickerRows, sendContactSelectedIds]);

  const sendContactSelectedSummary = useMemo(() => {
    const map = new Map(sendContactPickerRows.map((r) => [r.id, r]));
    return sendContactSelectedIds
      .map((id) => {
        const r = map.get(id);
        return r ? whatsappContactDisplayName(r) || formatPhoneForDisplay(r.id) : '';
      })
      .filter(Boolean)
      .join(', ');
  }, [sendContactPickerRows, sendContactSelectedIds]);

  const checkPhoneMut = useMutation({
    mutationFn: async (phone: string) => {
      const r = await checkWhatsappProviderPhoneExists(phone);
      if (!r.success) throw new Error(r.error || 'Falha ao verificar');
      return r.data as { numberExists: boolean; chatId: string | null };
    },
    onSuccess: (data) => {
      setCheckPhoneResult(data);
      if (data.numberExists && data.chatId) {
        toast.success('Número encontrado no WhatsApp', { description: data.chatId });
      } else {
        toast.message('Este número não está registrado no WhatsApp.');
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao verificar');
    },
  });

  const { data: archivedChatList = [], isLoading: archivedLoading } = useQuery({
    queryKey: archivedChatsQueryKey,
    queryFn: async (): Promise<WhatsappChatPreview[]> => {
      const r = await fetchWhatsappArchivedChats();
      if (!r.success || !Array.isArray(r.data)) return [];
      return sortChatsByRecent(
        dedupeChatPreviews(
          r.data.map((c) => ({
            ...c,
            unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
            lastAck: c.lastAck ?? null,
          }))
        )
      );
    },
    enabled: archivedPanelOpen,
    staleTime: 0,
  });

  const { data: sessionProfilePayload } = useQuery({
    queryKey: ['whatsapp-session-profile'],
    queryFn: async () => {
      const r = await fetchWhatsappSessionProfile();
      if (!r.success || !r.data) return null;
      return r.data;
    },
    enabled: Boolean(connectionStatus?.connected),
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!profilePanelOpen) return;
    const sp = sessionProfilePayload?.sessionProfile;
    if (!sp || typeof sp !== 'object') return;
    const n = pickWhatsappSessionProfileDisplayName(sp as Record<string, unknown>);
    setProfileWpName((prev) => (prev.trim() === '' && n ? n : prev));
  }, [profilePanelOpen, sessionProfilePayload?.sessionProfile]);

  const unarchiveMut = useMutation({
    mutationFn: async (cid: string) => {
      const r = await postWhatsappUnarchive(cid);
      if (!r.success) throw new Error(r.error || 'Falha ao desarquivar');
    },
    onSuccess: () => {
      toast.success('Conversa desarquivada');
      queryClient.invalidateQueries({ queryKey: chatsQueryKey });
      queryClient.invalidateQueries({ queryKey: archivedChatsQueryKey });
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao desarquivar'),
  });

  const markAllReadMut = useMutation({
    mutationFn: async () => {
      const r = await postWhatsappMarkAllRead();
      if (!r.success) throw new Error(r.error || 'Falha');
    },
    onSuccess: () => {
      toast.success('Todas as conversas marcadas como lidas');
      queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao marcar como lidas'),
  });

  const markUnreadMut = useMutation({
    mutationFn: async () => {
      const canon = canonicalWhatsappChatId(chatId);
      const msgs = displayMessages.filter((m) => Boolean(m.providerMessageId));
      const last = msgs[msgs.length - 1];
      if (!last?.providerMessageId) {
        throw new Error('Esta conversa ainda não possui mensagem com ID do provedor.');
      }
      const r = await postEvolutionMarkChatUnread({
        chat: canon,
        // Algumas versões da Evolution validam `lastMessage` como objeto (não array).
        // O backend também aceita array e normaliza, mas enviamos objeto para compatibilidade.
        lastMessage: {
          key: {
            remoteJid: canon,
            fromMe: !!last.fromMe,
            id: last.providerMessageId,
            ...(last.participant ? { participant: last.participant } : {}),
          },
        },
      });
      if (!r.success) {
        throw new Error(r.error || 'Falha ao marcar como não lida');
      }
    },
    onSuccess: () => {
      toast.success('Conversa marcada como não lida');
      setChatMenuOpen(false);
      queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao marcar conversa como não lida');
    },
  });

  const { data: providerGroupRows = [] } = useQuery({
    queryKey: ['whatsapp-provider-groups'],
    queryFn: async (): Promise<WhatsappProviderGroupRow[]> => {
      const r = await fetchWhatsappProviderGroups({ refresh: groupsForceRefresh });
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: false, // evita chamadas automáticas ao abrir o chat (reduz risco de ban)
    staleTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 3_000,
  });

  const { data: activeContactMeta, dataUpdatedAt: contactMetaUpdatedAt } = useQuery({
    queryKey: ['whatsapp-contact-meta', chatId],
    queryFn: async () => {
      const r = await fetchWhatsappProviderContactMeta(chatId);
      if (!r.success || !r.data) return null;
      return r.data;
    },
    enabled: Boolean(chatId),
    staleTime: 120_000,
    select: (data) => sanitizeWhatsappContactMetaForChat(chatId, data) ?? data,
  });

  useEffect(() => {
    if (!chatId || !contactMetaUpdatedAt) return;
    void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
  }, [chatId, contactMetaUpdatedAt, queryClient]);

  const profilePictures = useQueries({
    queries: chatList.map((c) => ({
      queryKey: ['whatsapp-profile-picture', c.chatId] as const,
      queryFn: async (): Promise<string | null> => {
        const r = await fetchWhatsappProviderProfilePicture(c.chatId);
        if (!r.success || !r.data) return null;
        return r.data.url ?? null;
      },
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    })),
  });

  const profileUrlByChatId = useMemo(() => {
    const m = new Map<string, string | null>();
    chatList.forEach((c, i) => {
      m.set(c.chatId, profilePictures[i]?.data ?? null);
    });
    return m;
  }, [chatList, profilePictures]);

  const agendaRowsForAvatarFetch = useMemo(
    () => agendaDisplayedRowsSorted.slice(0, WA_AGENDA_AVATAR_FETCH_CAP),
    [agendaDisplayedRowsSorted]
  );

  const contactAvatarQueries = useQueries({
    queries: agendaRowsForAvatarFetch.map((row) => ({
      queryKey: ['whatsapp-evolution-contact-avatar', row.id] as const,
      queryFn: async (): Promise<string | null> => {
        try {
          const r = await postEvolutionFetchProfilePicture({ number: row.id.trim() });
          if (!r.success) return null;
          const u = r.data?.profilePictureUrl;
          return typeof u === 'string' && u.length > 0 ? u : null;
        } catch {
          return null;
        }
      },
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      enabled: contactsPanelOpen && agendaRowsForAvatarFetch.length > 0,
    })),
  });

  const contactPicByContactId = useMemo(() => {
    const m = new Map<string, string | null>();
    agendaRowsForAvatarFetch.forEach((row, i) => {
      m.set(row.id, contactAvatarQueries[i]?.data ?? null);
    });
    return m;
  }, [agendaRowsForAvatarFetch, contactAvatarQueries]);

  const filteredChats = useMemo(() => {
    let list = chatList;
    if (chatSidebarFilter === 'unread') list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    else if (chatSidebarFilter === 'favorites') list = list.filter((c) => !!c.favorite);
    else if (chatSidebarFilter === 'groups') list = list.filter((c) => isWhatsappGroupChatId(c.chatId));
    else if (chatSidebarFilter.startsWith('label:')) {
      // Filtro por lista customizada — usa as memberships já carregadas
      // pela query `whatsapp-chat-labels`. Comparamos `chatId` canonicalizado
      // dos dois lados para casar PN ↔ LID sem depender do roteamento atual.
      const labelId = chatSidebarFilter.slice('label:'.length);
      const label = chatLabels.find((l) => l.id === labelId);
      if (label) {
        const ids = new Set(label.chatIds.map((c) => canonicalWhatsappChatId(c)));
        list = list.filter((c) => ids.has(canonicalWhatsappChatId(c.chatId)));
      } else {
        // ID inválido / lista deletada — não mostra nada e segura o estado
        // até o operador escolher outro filtro.
        list = [];
      }
    }

    const raw = chatSearch.trim();
    if (!raw) return list;
    const q = normalizeSearchText(raw);
    const qDigits = raw.replace(/\D/g, '');
    return list.filter((c) => {
      const isG = isWhatsappGroupChatId(c.chatId);
      const w = !isG ? findWhatsappContactInRows(providerContactRows, c.chatId) : undefined;
      const wg = isG ? findWhatsappGroupInRows(providerGroupRows, c.chatId) : undefined;
      const wn = whatsappContactDisplayName(w);
      const gname = whatsappGroupDisplayName(wg);
      const { listTitle, phone, avatarLabel } = resolveChatPreviewLabels(c, w, wg);
      const haystack = normalizeSearchText(
        [listTitle, phone, c.chatId, c.lastContent || '', c.contactName || '', c.providerCachedName || '', wn, gname, avatarLabel].join(' ')
      );
      if (haystack.includes(q)) return true;
      if (qDigits.length >= 2) {
        const idDigits = c.chatId.replace(/\D/g, '');
        if (idDigits.includes(qDigits)) return true;
      }
      return false;
    });
  }, [chatList, chatSearch, chatSidebarFilter, chatLabels, providerContactRows, providerGroupRows]);

  /**
   * Conversas elegíveis para entrar em uma lista — universo completo do
   * CRM (sem filtros / sem busca). Memoizado porque entra no modal de
   * seleção e pode ter centenas de itens; recalcular a cada render é
   * pesado por causa do `resolveChatPreviewLabels` por linha.
   */
  const selectableChatsForLabel = useMemo<SelectableChat[]>(() => {
    return chatList.map((c) => {
      const isG = isWhatsappGroupChatId(c.chatId);
      const w = !isG ? findWhatsappContactInRows(providerContactRows, c.chatId) : undefined;
      const wg = isG ? findWhatsappGroupInRows(providerGroupRows, c.chatId) : undefined;
      const { listTitle } = resolveChatPreviewLabels(c, w, wg);
      const title = listTitle || formatPhoneForDisplay(c.chatId);
      return {
        chatId: canonicalWhatsappChatId(c.chatId),
        title,
        subtitle: c.providerCachedName && c.providerCachedName !== title ? c.providerCachedName : null,
        profilePictureUrl: c.cachedProfilePictureUrl ?? null
      };
    });
  }, [chatList, providerContactRows, providerGroupRows]);

  const chatTitleByIdMemo = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of selectableChatsForLabel) m.set(c.chatId, c.title);
    return m;
  }, [selectableChatsForLabel]);

  const sortedFilteredChats = useMemo(() => {
    const list = filteredChats.slice();
    list.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const af = a.favorite ? 1 : 0;
      const bf = b.favorite ? 1 : 0;
      if (af !== bf) return bf - af;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
    return list;
  }, [filteredChats]);

  const logoutMut = useMutation({
    mutationFn: async () => {
      const r = await postWhatsappProviderLogout();
      if (!r.success) throw new Error(r.error || 'Falha ao desconectar');
    },
    onSuccess: () => {
      toast.success('WhatsApp desconectado', {
        description: 'Abra o painel do provedor WhatsApp e escaneie o QR code para conectar de novo.',
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao desconectar');
    },
  });

  const handleWhatsappProviderLogout = useCallback(() => {
    if (
      !window.confirm(
        'Desconectar o WhatsApp neste aparelho? A sessão será encerrada e será necessário escanear o QR code no painel do provedor para usar de novo.'
      )
    ) {
      return;
    }
    logoutMut.mutate();
  }, [logoutMut]);

  useEffect(() => {
    const c = connectionStatus?.connected;
    const dash = connectionStatus?.dashboardUrl || FALLBACK_WHATSAPP_PROVIDER_DASHBOARD;
    if (c === undefined) return;
    const prev = prevProviderConnRef.current;
    prevProviderConnRef.current = c;
    if (prev === undefined) {
      if (!c) {
        toast.warning('WhatsApp desconectado', {
          description: `Abra ${dash} e leia o QR code para conectar a sessão.`,
          duration: 14_000,
        });
      }
      return;
    }
    if (prev === false && c) {
      toast.success('WhatsApp conectado', {
        description: 'Sessão ativa — você pode enviar e receber mensagens.',
        duration: 6_000,
      });
    }
    if (prev === true && !c) {
      toast.error('WhatsApp desconectado', {
        description: `Conexão perdida. Abra ${dash} e escaneie o QR code novamente.`,
        duration: 12_000,
      });
    }
  }, [connectionStatus?.connected, connectionStatus?.dashboardUrl]);

  const activePreview = useMemo(() => {
    const activeCid = canonicalWhatsappChatId(chatId);
    return chatList.find((c) => canonicalWhatsappChatId(c.chatId) === activeCid);
  }, [chatList, chatId]);
  const activeIsGroup = useMemo(() => isWhatsappGroupChatId(chatId), [chatId]);

  const GROUP_META_COOLDOWN_MS = Number(import.meta.env.VITE_WA_GROUP_META_COOLDOWN_MS) || 60_000;
  const GROUP_MEMBERS_COOLDOWN_MS = Number(import.meta.env.VITE_WA_GROUP_MEMBERS_COOLDOWN_MS) || 60_000;
  const GROUP_BACKOFF_BASE_MS = Number(import.meta.env.VITE_WA_GROUP_BACKOFF_BASE_MS) || 10_000;
  const GROUP_BACKOFF_MAX_MS = Number(import.meta.env.VITE_WA_GROUP_BACKOFF_MAX_MS) || 120_000;
  const lastGroupMetaFetchAtRef = useRef<Map<string, number>>(new Map());
  const lastGroupMembersFetchAtRef = useRef<Map<string, number>>(new Map());

  const isLikelyRateLimit = useCallback((res: { success: boolean; status?: number; error?: string } | null | undefined) => {
    if (!res || res.success) return false;
    const st = res.status;
    const low = `${res.error || ''} ${st ?? ''}`.toLowerCase();
    return st === 429 || low.includes('rate-overlimit') || low.includes('rate overlimit') || low.includes('too many') || low.includes('429');
  }, []);

  const groupMembersQuery = useQuery({
    queryKey: ['whatsapp-group-members', chatId],
    queryFn: async (): Promise<GroupParticipantRow[]> => {
      const groupJid = canonicalWhatsappChatId(chatId);
      const r = await getEvolutionGroupFindMembers(groupJid);
      if (!r.success) return [];
      return normalizeGroupMembers(r.data);
    },
    // IMPORTANT: membros de grupo podem causar rate-limit (429).
    // Só buscamos quando o usuário pedir explicitamente no painel de grupo.
    enabled: false,
    staleTime: 5 * 60_000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  /**
   * Cache local de participantes (servido pelo backend): nome resolvido por
   * agenda S3E + `whatsapp_contact_cache`. É barato (só leitura no banco) e
   * pode ser puxado em toda abertura de grupo sem rate-limit. Garante que
   * o balão da mensagem mostre o nome legível do remetente em vez de
   * `+digits`.
   */
  const groupParticipantsCacheQuery = useQuery({
    queryKey: ['whatsapp-group-participants-cache', chatId],
    queryFn: async () => {
      if (!chatId || !isWhatsappGroupChatId(chatId)) return [];
      const r = await fetchWhatsappGroupParticipantCache(chatId);
      if (!r.success || !r.data) return [];
      return r.data;
    },
    enabled: Boolean(chatId && isWhatsappGroupChatId(chatId)),
    staleTime: 5 * 60_000,
    refetchInterval: false,
  });

  const groupParticipantLabelByDigits = useMemo(() => {
    const m = new Map<string, string>();
    // Fonte primária: cache do backend (agenda S3E + whatsapp_contact_cache).
    for (const row of groupParticipantsCacheQuery.data ?? []) {
      const digits = (row.digits || '').trim();
      const label = (row.displayName || '').trim();
      if (digits && label) m.set(digits, label);
    }
    // Fonte secundária: `/group/participants` (só carrega se o painel for aberto).
    const rows = (groupMembersQuery.data ?? groupInfo?.participants ?? []).slice();
    for (const p of rows) {
      const digits = waJidToDigits(String(p.id || ''));
      if (!digits) continue;
      const label = (p.name || '').trim();
      // Não sobrescreve: o cache do backend tem prioridade (já cruzou com S3E).
      if (label && !m.has(digits)) m.set(digits, label);
    }
    return m;
  }, [groupParticipantsCacheQuery.data, groupMembersQuery.data, groupInfo?.participants]);

  const resolveGroupParticipantLabel = useCallback(
    (participantJid: string | null | undefined): string | null => {
      const digits = participantJid ? waJidToDigits(participantJid) : '';
      if (!digits) return null;
      const fromMembers = groupParticipantLabelByDigits.get(digits);
      if (fromMembers) return fromMembers;
      // fallback: tenta a agenda do provedor (contacts)
      const contact = findWhatsappContactInRows(providerContactRows, `${digits}@c.us`);
      const wn = whatsappContactDisplayName(contact);
      if (wn) return wn;
      return `+${digits}`;
    },
    [groupParticipantLabelByDigits, providerContactRows]
  );

  const { primary: headerPrimary, secondary: headerSecondary } = useMemo(() => {
    if (forceHeaderReset) {
      const phone = formatPhoneForDisplay(chatId);
      return {
        primary: phone,
        secondary: isWhatsappGroupChatId(chatId) ? `Grupo · ${shortGroupIdLabel(chatId)}` : 'WhatsApp',
      };
    }
    return displayNameForChatHeader({
      chatId,
      crmName: activePreview?.contactName,
      agendaS3eName: activeContactMeta?.nomeAgendaS3e ?? activePreview?.agendaS3eName,
      cachedProviderName: activePreview?.providerCachedName,
      providerContactName: whatsappContactDisplayName(activeContactMeta?.contact ?? undefined),
      providerContact: activeContactMeta?.contact ?? findWhatsappContactInRows(providerContactRows, chatId) ?? null,
      // Telefone real preferido: backend já injeta no `contact-meta` para
      // o chat ativo e na própria preview (`phoneNumberFromS3e`).
      s3ePhoneDigits: activeContactMeta?.numeroContatoS3e ?? activePreview?.phoneNumberFromS3e ?? null,
      groupName: whatsappGroupDisplayName(activeContactMeta?.group ?? undefined),
      fallbackTitle: title,
    });
  }, [
    chatId,
    forceHeaderReset,
    activePreview?.contactName,
    activePreview?.providerCachedName,
    activePreview?.agendaS3eName,
    activePreview?.phoneNumberFromS3e,
    activeContactMeta?.nomeAgendaS3e,
    activeContactMeta?.numeroContatoS3e,
    activeContactMeta?.contact,
    activeContactMeta?.group,
    providerContactRows,
    title,
  ]);

  const composerReplyMeta = useMemo(() => {
    if (!replyToMessage) return null;
    const m = replyToMessage;
    const author = m.fromMe
      ? 'Você'
      : activeIsGroup
        ? resolveGroupParticipantLabel(m.participant) || headerPrimary || 'Participante'
        : headerPrimary || title || 'Contato';
    const toneClass =
      !m.fromMe && activeIsGroup ? 'whatsapp-composer-reply--group' : 'whatsapp-composer-reply--peer';
    return { author, toneClass, snippet: composerReplySnippet(m) };
  }, [replyToMessage, activeIsGroup, resolveGroupParticipantLabel, headerPrimary, title]);

  useEffect(() => {
    if (!chatId) return;
    setForceHeaderReset(true);
    const t = window.setTimeout(() => setForceHeaderReset(false), 350);
    return () => window.clearTimeout(t);
  }, [chatId]);

  const totalUnreadMsgs = useMemo(
    () => chatList.reduce((acc, c) => acc + Math.max(0, c.unreadCount || 0), 0),
    [chatList]
  );

  const sidebarFilterCounts = useMemo(() => {
    let unreadChats = 0;
    let favoriteChats = 0;
    let groupChats = 0;
    for (const c of chatList) {
      if ((c.unreadCount ?? 0) > 0) unreadChats += 1;
      if (c.favorite) favoriteChats += 1;
      if (isWhatsappGroupChatId(c.chatId)) groupChats += 1;
    }
    return { unreadChats, favoriteChats, groupChats };
  }, [chatList]);

  const actionsContextQuery = useQuery({
    queryKey: ['whatsapp-actions-context', chatId],
    queryFn: async (): Promise<WhatsappActionsContextData | null> => {
      if (!chatId) return null;
      const r = await fetchWhatsappActionsContext(chatId);
      if (!r.success || !r.data) return null;
      return r.data;
    },
    enabled: Boolean(chatId && actionsPanelOpen && !activeIsGroup),
    refetchInterval: actionsPanelOpen ? 30_000 : false,
  });

  useEffect(() => {
    if (!actionsContextQuery.data) return;
    setActionsContextSnapshot(actionsContextQuery.data);
  }, [actionsContextQuery.data]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setActionsClienteSearchDebounced(actionsClienteSearch);
    }, 280);
    return () => window.clearTimeout(id);
  }, [actionsClienteSearch]);

  useEffect(() => {
    if (actionsPanelOpen) return;
    setActionsClienteSearch('');
    setActionsClienteSearchDebounced('');
  }, [actionsPanelOpen]);

  const actionsClientesQuery = useQuery({
    queryKey: ['whatsapp-actions-clientes', actionsClienteSearchDebounced],
    queryFn: async (): Promise<Cliente[]> => {
      const result = await clientesService.listar({
        search: actionsClienteSearchDebounced.trim() || undefined,
      });
      if (!result.success || !Array.isArray(result.data)) return [];
      return result.data.slice(0, 120);
    },
    enabled: Boolean(actionsPanelOpen && !activeIsGroup),
    staleTime: 20_000,
  });

  const linkClienteMut = useMutation({
    mutationFn: async (clienteId: string) => {
      const r = await postWhatsappLinkCliente(chatId, clienteId);
      if (!r.success) {
        toastWhatsappApiError(r, { titleFallback: 'Falha ao vincular contato ao cliente' });
        throwAfterWhatsappToast();
      }
      return true;
    },
    onSuccess: () => {
      toast.success('Contato vinculado ao cliente com sucesso');
      void actionsContextQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e.message || 'Erro ao vincular contato');
    },
  });

  const unlinkClienteMut = useMutation({
    mutationFn: async () => {
      const r = await postWhatsappUnlinkCliente(chatId);
      if (!r.success) {
        toastWhatsappApiError(r, { titleFallback: 'Falha ao desvincular contato do cliente' });
        throwAfterWhatsappToast();
      }
      return true;
    },
    onSuccess: () => {
      toast.success('Contato desvinculado do cliente');
      void actionsContextQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e.message || 'Erro ao desvincular contato');
    },
  });

  const updateStatusModeMut = useMutation({
    mutationFn: async (mode: WhatsappOrcamentoStatusMode) => {
      const r = await putWhatsappOrcamentoStatusMode(mode);
      if (!r.success) {
        toastWhatsappApiError(r, { titleFallback: 'Falha ao salvar configuração' });
        throwAfterWhatsappToast();
      }
      if (!r.data) {
        toast.error('Falha ao salvar configuração');
        throwAfterWhatsappToast();
      }
      return r.data.mode;
    },
    onSuccess: (mode) => {
      setActionsContextSnapshot((prev) => (prev ? { ...prev, statusUpdateMode: mode } : prev));
      toast.success('Configuração de atualização de status salva');
      void actionsContextQuery.refetch();
    },
    onError: (e: Error) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e.message || 'Erro ao salvar configuração');
    },
  });

  const [sendingOrcamentoId, setSendingOrcamentoId] = useState<string | null>(null);

  const sendOrcamentoPdfMut = useMutation({
    mutationFn: async (payload: SendOrcamentoPdfMutationVars) => {
      const mode = payload.modeOverride ?? actionsContextSnapshot?.statusUpdateMode;
      const pdfCustomization = loadPdfCustomizationFromStorage();

      const r = await postWhatsappSendOrcamentoPdf({
        chatId: outboundChatId,
        orcamentoId: payload.orcamentoId,
        mode,
        pdfCustomization: pdfCustomization as unknown as Record<string, unknown>,
      });
      const httpOk = r.status == null || (r.status >= 200 && r.status < 300);
      if (!httpOk || !r.success) {
        const errLow = `${r.error || ''}`.toLowerCase();
        const timeoutLike = errLow.includes('timeout') || errLow.includes('demorou');
        if (timeoutLike) {
          toast.warning('Envio em processamento', {
            description:
              'O WhatsApp demorou para responder. O PDF pode ter sido enviado; confirme no chat e clique em Atualizar.',
          });
          throwAfterWhatsappToast();
        }
        toastWhatsappApiError(r, { titleFallback: 'Falha ao enviar PDF do orçamento' });
        throwAfterWhatsappToast();
      }
      return r.data ?? null;
    },
    onMutate: (payload) => {
      setActionsPanelOpen(false);
      setSendingOrcamentoId(payload.orcamentoId);

      const ctx = actionsContextSnapshot ?? actionsContextQuery.data;
      const orc = ctx?.orcamentos?.find((o) => o.id === payload.orcamentoId);
      const num = orc?.numeroSequencial ?? orc?.numero ?? 'orcamento';
      const fname = `Orcamento-${num}.pdf`;
      const userName = (crmUser?.name || 'Usuário').trim() || 'Usuário';
      const caption = `*${userName}*\n\nSegue o orçamento ${num} conforme tratativa enviado via S3E System.`;

      const optimistic: WhatsappMessageDto = {
        id: payload.optimisticId,
        chatId: outboundChatId,
        content: `📎 Arquivo\n${caption}`,
        fromMe: true,
        timestamp: new Date().toISOString(),
        ack: 0,
        providerMessageId: null,
        hasMedia: true,
        mediaType: 'document',
        mediaMimetype: 'application/pdf',
        mediaFilename: fname,
        fileName: fname,
      };
      mergeMessage(optimistic);
    },
    onSuccess: (data, variables) => {
      const cid = canonicalWhatsappChatId(outboundChatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).filter((x) => x.id !== variables.optimisticId)
      );
      if (data?.message) {
        mergeMessage({ ...data.message, chatId: cid });
      }
      void actionsContextQuery.refetch();
    },
    onError: (e: Error, variables) => {
      const cid = canonicalWhatsappChatId(outboundChatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).filter((x) => x.id !== variables.optimisticId)
      );
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e.message || 'Erro ao enviar PDF');
    },
    onSettled: () => {
      setSendingOrcamentoId(null);
    },
  });

  const syncMarkRead = useCallback(
    (cid: string) => {
      const canon = canonicalWhatsappChatId(cid);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
        const list = old ?? [];
        const row = list.find((c) => canonicalWhatsappChatId(c.chatId) === canon);
        const key = chatPreviewMergeKey(canon, row?.phoneNumberFromS3e);
        return list.map((c) =>
          chatPreviewMergeKey(c.chatId, c.phoneNumberFromS3e) === key ? { ...c, unreadCount: 0 } : c
        );
      });
      void postWhatsappMarkRead(cid).then((res) => {
        if (!res.success) {
          console.warn('[WhatsApp] mark-read (CRM) falhou', res.error, res.status);
        }
      });
    },
    [queryClient]
  );

  const scheduleMarkRead = useCallback(
    (cid: string) => {
      if (markReadDebounceRef.current) clearTimeout(markReadDebounceRef.current);
      markReadDebounceRef.current = setTimeout(() => {
        markReadDebounceRef.current = null;
        syncMarkRead(cid);
      }, 450);
    },
    [syncMarkRead]
  );

  useEffect(() => {
    if (!chatId) return;
    syncMarkRead(chatId);
  }, [chatId, syncMarkRead]);

  useEffect(() => {
    setActionsPanelOpen(false);
    setActionsClienteSearch('');
    setActionsContextSnapshot(null);
  }, [chatId]);

  useEffect(() => {
    if (activeIsGroup && actionsPanelOpen) {
      setActionsPanelOpen(false);
    }
  }, [activeIsGroup, actionsPanelOpen]);

  /**
   * Confirmação de leitura no WhatsApp (Evolution `markMessageAsRead`): só ao abrir a conversa no CRM
   * (troca de `chatId` + fim do carregamento), não a cada nova mensagem nem a cada refetch do histórico.
   * Antes: `displayMessages` nas dependências disparava leitura no aparelho oficial mesmo sem o operador “reabrir” o chat.
   */
  useEffect(() => {
    if (!chatId || loadingMsgs) return;
    const canon = canonicalWhatsappChatId(chatId);
    const t = window.setTimeout(() => {
      const msgs = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(chatId)) ?? [];
      const relevant = msgs.filter((m) => canonicalWhatsappChatId(m.chatId) === canon);
      const incoming = relevant.filter((m) => !m.fromMe && m.providerMessageId);
      if (incoming.length === 0) return;
      if (document.visibilityState !== 'visible') return;
      const lastPid = String(incoming[incoming.length - 1].providerMessageId);
      const lastSent = evolutionReadLastByChatRef.current.get(canon);
      if (lastSent === lastPid) return;
      evolutionReadLastByChatRef.current.set(canon, lastPid);
      const readMessages = incoming.slice(-80).map((m) => ({
        remoteJid: canon,
        fromMe: false,
        id: m.providerMessageId as string,
      }));
      void postEvolutionMarkMessagesRead(readMessages).then((res) => {
        if (!res.success) console.warn('[WhatsApp] Evolution markMessageAsRead (ao abrir chat)', res.error, res.status);
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [chatId, loadingMsgs, queryClient]);

  useEffect(() => {
    if (!chatId) return;
    void postWhatsappSubscribePresence(chatId).catch((err) => {
      console.warn('[WhatsApp] subscribe presence', err);
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const text = draft.trim();
    if (!text) {
      // Draft esvaziado — reseta a flag para o próximo "começar a digitar".
      presenceAvailableSentRef.current = false;
      return;
    }
    // Só dispara `available` UMA vez por sessão de digitação (a primeira tecla).
    // Antes, este effect rodava a cada tecla, fazendo uma chamada HTTP por
    // keystroke — isso causava o atraso percebido no composer.
    if (!presenceAvailableSentRef.current) {
      presenceAvailableSentRef.current = true;
      void postEvolutionInstanceSetPresence('available').catch(() => {
        /* endpoint Evolution opcional */
      });
    }
    if (presenceResetRef.current) clearTimeout(presenceResetRef.current);
    presenceResetRef.current = setTimeout(() => {
      presenceResetRef.current = null;
      presenceAvailableSentRef.current = false;
      void postEvolutionInstanceSetPresence('unavailable').catch(() => {
        /* endpoint Evolution opcional */
      });
    }, 2800);
  }, [draft, chatId]);

  useEffect(() => {
    setPeerTyping(false);
    if (typingHideRef.current) {
      clearTimeout(typingHideRef.current);
      typingHideRef.current = null;
    }
  }, [chatId]);

  useEffect(
    () => () => {
      if (typingHideRef.current) clearTimeout(typingHideRef.current);
    },
    []
  );

  useEffect(() => {
    if (!chatMenuOpen) return;
    const close = () => setChatMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [chatMenuOpen]);

  useEffect(() => {
    setGroupPanelOpen(false);
    setContactPanelOpen(false);
    setGroupInfo(null);
    setGroupInviteUrl('');
    ackFallbackSignatureRef.current = '';
  }, [chatId]);

  useEffect(
    () => () => {
      if (markReadDebounceRef.current) clearTimeout(markReadDebounceRef.current);
      if (evolutionReadDebounceRef.current) clearTimeout(evolutionReadDebounceRef.current);
    },
    []
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [queryClient]);

  // Esc: fecha primeiro overlays/modais; se nada estiver aberto, fecha o chat ativo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Se houver edição de mensagem ativa, Esc cancela primeiro.
      if (editingId) {
        e.preventDefault();
        cancelEditMessage();
        return;
      }

      // Prioridade: overlays/modais.
      if (qrModalOpen) {
        e.preventDefault();
        setQrModalOpen(false);
        return;
      }
      if (chatMenuOpen) {
        e.preventDefault();
        setChatMenuOpen(false);
        return;
      }
      if (sidebarMenuOpen) {
        e.preventDefault();
        setSidebarMenuOpen(false);
        return;
      }
      if (contactsPanelOpen) {
        e.preventDefault();
        setContactsPanelOpen(false);
        return;
      }
      if (archivedPanelOpen) {
        e.preventDefault();
        setArchivedPanelOpen(false);
        return;
      }
      if (actionsPanelOpen) {
        e.preventDefault();
        setActionsPanelOpen(false);
        return;
      }
      if (groupPanelOpen) {
        e.preventDefault();
        setGroupPanelOpen(false);
        return;
      }
      if (contactPanelOpen) {
        e.preventDefault();
        setContactPanelOpen(false);
        return;
      }
      if (profilePanelOpen) {
        e.preventDefault();
        setProfilePanelOpen(false);
        return;
      }

      // Se nenhum modal/overlay estiver aberto, Esc fecha a conversa ativa.
      if (chatId && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    chatId,
    onClose,
    editingId,
    cancelEditMessage,
    qrModalOpen,
    chatMenuOpen,
    sidebarMenuOpen,
    contactsPanelOpen,
    archivedPanelOpen,
    actionsPanelOpen,
    groupPanelOpen,
    contactPanelOpen,
    profilePanelOpen,
  ]);

  const mergeMessage = useCallback(
    (msg: WhatsappMessageDto) => {
      const cid = canonicalWhatsappChatId(msg.chatId);
      const list = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey) ?? [];
      const ctx = resolveChatPreviewUpdateContext(list, cid, chatId, msg.fromMe);
      const storageCid = ctx.messageCacheChatId || ctx.preferredChatId || cid;
      const normalizedMsg = { ...msg, chatId: storageCid };

      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(storageCid), (old) => {
        const merged = old ?? [];
        if (merged.some((x) => x.id === normalizedMsg.id)) return merged;
        return [...merged, normalizedMsg];
      });

      if (storageCid !== cid) {
        queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
          (old ?? []).filter((x) => x.id !== normalizedMsg.id)
        );
      }

      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
        const previews = old ?? [];
        const prevRows = ctx.matchedRows;
        const prevRow = prevRows.length
          ? prevRows.reduce((a, b) => (new Date(b.lastAt ?? 0) > new Date(a.lastAt ?? 0) ? b : a))
          : undefined;
        const activeKey = chatId
          ? chatPreviewMergeKey(
              canonicalWhatsappChatId(chatId),
              previews.find((c) => canonicalWhatsappChatId(c.chatId) === canonicalWhatsappChatId(chatId))
                ?.phoneNumberFromS3e ?? ctx.phoneHint
            )
          : '';
        const isActiveChat = Boolean(activeKey && activeKey === ctx.mergeKey);

        let unreadCount: number;
        if (isActiveChat) {
          unreadCount = 0;
          if (!normalizedMsg.fromMe) scheduleMarkRead(storageCid);
        } else if (!normalizedMsg.fromMe) {
          unreadCount = prevRows.reduce((s, r) => s + (r.unreadCount ?? 0), 0) + 1;
        } else {
          unreadCount = prevRows.reduce((s, r) => s + (r.unreadCount ?? 0), 0);
        }

        const preview: WhatsappChatPreview = {
          chatId: ctx.preferredChatId,
          lastContent: normalizedMsg.content,
          lastAt: normalizedMsg.timestamp,
          lastFromMe: normalizedMsg.fromMe,
          lastAck: normalizedMsg.fromMe ? (normalizedMsg.ack ?? null) : null,
          unreadCount,
          contactName: prevRow?.contactName,
          providerCachedName: prevRow?.providerCachedName,
          phoneNumberFromS3e: prevRow?.phoneNumberFromS3e ?? ctx.phoneHint,
          cachedProfilePictureUrl: prevRow?.cachedProfilePictureUrl,
        };
        return sortChatsByRecent(
          upsertChatPreviewInList(previews, preview, { activeChatId: chatId, mergeKey: ctx.mergeKey })
        );
      });

      // Se o chat está aberto e a mensagem chegou agora, isso equivale a “visualizar” no CRM.
      // Marca como lida no WhatsApp oficial apenas quando a aba está visível (evita auto-read em background).
      if (
        !normalizedMsg.fromMe &&
        normalizedMsg.providerMessageId &&
        ctx.mergeKey ===
          chatPreviewMergeKey(
            canonicalWhatsappChatId(chatId),
            list.find((c) => canonicalWhatsappChatId(c.chatId) === canonicalWhatsappChatId(chatId))
              ?.phoneNumberFromS3e ?? ctx.phoneHint
          ) &&
        document.visibilityState === 'visible'
      ) {
        if (evolutionReadDebounceRef.current) clearTimeout(evolutionReadDebounceRef.current);
        evolutionReadDebounceRef.current = setTimeout(() => {
          evolutionReadDebounceRef.current = null;
          const canon = canonicalWhatsappChatId(storageCid);
          const pid = String(normalizedMsg.providerMessageId);
          const lastSent = evolutionReadLastByChatRef.current.get(canon);
          if (lastSent === pid) return;
          evolutionReadLastByChatRef.current.set(canon, pid);
          void postEvolutionMarkMessagesRead([
            {
              remoteJid: canon,
              fromMe: false,
              id: pid,
            },
          ]).then((res) => {
            if (!res.success) console.warn('[WhatsApp] Evolution markMessageAsRead (mensagem recebida no chat aberto)', res.error, res.status);
          });
        }, 650);
      }
    },
    [queryClient, chatId, scheduleMarkRead]
  );

  const onSocketMessageDeleted = useCallback(
    (payload: { id: string; chatId: string }) => {
      const cid = canonicalWhatsappChatId(payload.chatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        old?.filter((x) => x.id !== payload.id) ?? []
      );
    },
    [queryClient]
  );

  const onSocketMessageEdited = useCallback(
    (msg: WhatsappMessageDto) => {
      const cid = canonicalWhatsappChatId(msg.chatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) => {
        const list = old ?? [];
        return list.map((x) => (x.id === msg.id ? { ...msg, chatId: cid } : x));
      });
    },
    [queryClient]
  );

  /**
   * Socket: cliente reagiu (ou removeu reação) a uma mensagem nossa, OU nós
   * mesmos reagimos pelo painel — em ambos os casos o backend persistiu e
   * propagou. Aqui fazemos patch no cache do React Query da conversa para o
   * emoji aparecer no canto da bolha sem refetch.
   */
  const onSocketReaction = useCallback(
    (p: { id: string; chatId: string; reaction: string | null }) => {
      const cid = canonicalWhatsappChatId(p.chatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).map((x) => (x.id === p.id ? { ...x, reaction: p.reaction } : x))
      );
    },
    [queryClient]
  );

  const onSocketAck = useCallback(
    (p: { id: string; chatId: string; ack: number | null }) => {
      const cid = canonicalWhatsappChatId(p.chatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).map((x) => (x.id === p.id ? { ...x, ack: p.ack ?? x.ack } : x))
      );
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
        const list = old ?? [];
        const row = list.find((c) => canonicalWhatsappChatId(c.chatId) === cid);
        const key = chatPreviewMergeKey(cid, row?.phoneNumberFromS3e);
        const msgs =
          queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid)) ??
          queryClient.getQueryData<WhatsappMessageDto[]>(
            messagesQueryKey(row?.chatId ?? cid)
          ) ??
          [];
        const lastOut = [...msgs].reverse().find((m) => m.fromMe);
        if (!lastOut || lastOut.id !== p.id) return list;
        return list.map((c) =>
          chatPreviewMergeKey(c.chatId, c.phoneNumberFromS3e) === key
            ? { ...c, lastAck: p.ack ?? c.lastAck }
            : c
        );
      });
    },
    [queryClient]
  );

  const reconcileAckByProviderStatus = useCallback(
    async (reason: 'open' | 'interval') => {
      const cid = canonicalWhatsappChatId(chatIdRef.current);
      if (!cid) return;
      if (ackFallbackSyncInFlightRef.current) return;
      const snapshot = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid)) ?? [];
      const outgoing = snapshot.filter((m) => m.fromMe && typeof m.providerMessageId === 'string' && m.providerMessageId.trim());
      if (outgoing.length === 0) return;

      // Evita hammering em mudanças irrelevantes quando a chamada periódica roda.
      const sig = `${cid}|${outgoing.length}|${outgoing[outgoing.length - 1]?.providerMessageId ?? ''}|${
        outgoing[outgoing.length - 1]?.ack ?? ''
      }`;
      if (reason === 'interval' && ackFallbackSignatureRef.current === sig) return;

      ackFallbackSyncInFlightRef.current = true;
      try {
        const r = await postEvolutionFindStatusMessage({
          where: { remoteJid: cid, fromMe: true },
          limit: Math.min(Math.max(outgoing.length * 2, 30), 250),
        });
        if (!r.success) {
          console.warn('[WhatsApp] findStatusMessage fallback falhou', r.error, r.status);
          return;
        }
        const rows = normalizeStatusAckRows(r.data);
        if (rows.length === 0) return;
        const ackByProviderId = new Map<string, number>();
        for (const row of rows) {
          const prev = ackByProviderId.get(row.providerMessageId) ?? -1;
          if (row.ack > prev) ackByProviderId.set(row.providerMessageId, row.ack);
        }
        if (ackByProviderId.size === 0) return;

        queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) => {
          const list = old ?? [];
          return list.map((m) => {
            if (!m.fromMe || !m.providerMessageId) return m;
            const nextAck = ackByProviderId.get(m.providerMessageId);
            if (nextAck == null) return m;
            const prevAck = typeof m.ack === 'number' ? m.ack : 0;
            return nextAck > prevAck ? { ...m, ack: nextAck } : m;
          });
        });

        queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
          const list = old ?? [];
          const msgs = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid)) ?? [];
          const lastOut = [...msgs].reverse().find((m) => m.fromMe);
          if (!lastOut || !lastOut.providerMessageId) return list;
          const byProvider = ackByProviderId.get(lastOut.providerMessageId);
          if (byProvider == null) return list;
          const nextLastAck = Math.max(lastOut.ack ?? 0, byProvider);
          return list.map((c) =>
            canonicalWhatsappChatId(c.chatId) === cid ? { ...c, lastAck: Math.max(c.lastAck ?? 0, nextLastAck) } : c
          );
        });

        const updatedMsgs = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid)) ?? [];
        const updatedOutgoing = updatedMsgs.filter(
          (m) => m.fromMe && typeof m.providerMessageId === 'string' && m.providerMessageId.trim()
        );
        ackFallbackSignatureRef.current = `${cid}|${updatedOutgoing.length}|${
          updatedOutgoing[updatedOutgoing.length - 1]?.providerMessageId ?? ''
        }|${updatedOutgoing[updatedOutgoing.length - 1]?.ack ?? ''}`;
      } catch (e) {
        console.warn('[WhatsApp] reconcileAckByProviderStatus erro', e);
      } finally {
        ackFallbackSyncInFlightRef.current = false;
      }
    },
    [queryClient]
  );

  const onSocketPresence = useCallback((payload: { chatId: string; session: string | null; presences: unknown }) => {
    const active = canonicalWhatsappChatId(chatIdRef.current);
    if (!active || canonicalWhatsappChatId(payload.chatId) !== active) return;
    const list = Array.isArray(payload.presences) ? payload.presences : [];
    const isTyping = list.some(
      (x: { lastKnownPresence?: string }) =>
        x?.lastKnownPresence === 'typing' || x?.lastKnownPresence === 'recording'
    );
    if (typingHideRef.current) clearTimeout(typingHideRef.current);
    if (isTyping) {
      setPeerTyping(true);
      typingHideRef.current = setTimeout(() => {
        typingHideRef.current = null;
        setPeerTyping(false);
      }, 5000);
    } else {
      setPeerTyping(false);
    }
  }, []);

  const onSocketChatRemoved = useCallback(
    (payload: { chatId: string }) => {
      const cid = canonicalWhatsappChatId(payload.chatId);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).filter((c) => canonicalWhatsappChatId(c.chatId) !== cid)
      );
      queryClient.removeQueries({ queryKey: messagesQueryKey(cid) });
      if (canonicalWhatsappChatId(chatIdRef.current) === cid) {
        onNavigateChat?.('', '');
      }
    },
    [queryClient, onNavigateChat]
  );

  const onSocketChatArchived = useCallback(
    (payload: { chatId: string; archived: boolean }) => {
      const cid = canonicalWhatsappChatId(payload.chatId);
      queryClient.invalidateQueries({ queryKey: chatsQueryKey });
      queryClient.invalidateQueries({ queryKey: archivedChatsQueryKey });
      if (payload.archived) {
        queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
          (old ?? []).filter((c) => canonicalWhatsappChatId(c.chatId) !== cid)
        );
        if (canonicalWhatsappChatId(chatIdRef.current) === cid) {
          onNavigateChat?.('', '');
        }
      }
    },
    [queryClient, onNavigateChat]
  );

  const onSocketChatMeta = useCallback(
    (payload: { chatId: string; displayName: string | null; profilePictureUrl: string | null }) => {
      const cid = canonicalWhatsappChatId(payload.chatId);
      if (
        (import.meta as any)?.env?.VITE_WHATSAPP_DEBUG_IDS === '1' ||
        (import.meta as any)?.env?.VITE_WHATSAPP_DEBUG_IDS === 'true'
      ) {
        // eslint-disable-next-line no-console
        console.debug('[WA-UI-META] payload.chatId=%s canonical=%s name=%s', payload.chatId, cid, payload.displayName);
      }
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).map((c) =>
          canonicalWhatsappChatId(c.chatId) === cid
            ? {
                ...c,
                providerCachedName: payload.displayName ?? c.providerCachedName ?? null,
                cachedProfilePictureUrl: payload.profilePictureUrl ?? c.cachedProfilePictureUrl ?? null,
              }
            : c
        )
      );
    },
    [queryClient]
  );

  const onSocketChatFlags = useCallback(
    (payload: { chatId: string; pinned: boolean; favorite: boolean }) => {
      const cid = canonicalWhatsappChatId(payload.chatId);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).map((c) =>
          canonicalWhatsappChatId(c.chatId) === cid
            ? { ...c, pinned: payload.pinned, favorite: payload.favorite }
            : c
        )
      );
    },
    [queryClient]
  );

  const onSocketConnectionStatus = useCallback(
    (_payload: { disconnected: boolean; state: string | null; session: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
    },
    [queryClient]
  );

  useWhatsAppSocket(mergeMessage, {
    onDeleted: onSocketMessageDeleted,
    onEdited: onSocketMessageEdited,
    onAck: onSocketAck,
    onReaction: onSocketReaction,
    onPresence: onSocketPresence,
    onChatRemoved: onSocketChatRemoved,
    onChatArchived: onSocketChatArchived,
    onChatFlags: onSocketChatFlags,
    onChatMeta: onSocketChatMeta,
    onConnectionStatus: onSocketConnectionStatus,
  });

  const deleteMessageMut = useMutation({
    mutationFn: async (messageId: string) => {
      const r = await deleteWhatsappMessage(messageId);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return r.data;
    },
    onMutate: async (messageId: string) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryKey(chatId) });
      const previous = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(chatId));
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(chatId), (old) =>
        (old ?? []).filter((x) => x.id !== messageId)
      );
      return { previous };
    },
    onError: (e, _messageId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(messagesQueryKey(chatId), ctx.previous);
      }
      if (isWhatsappErrorAlreadyToasted(e)) return;
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    },
    onSuccess: () => {
      toast.success('Mensagem excluída');
    },
  });

  const deleteForMeMut = useMutation({
    mutationFn: async (messageId: string) => {
      const r = await deleteWhatsappMessageForMe(messageId);
      if (!r.success || !r.data) throw new Error(r.error || 'Falha ao apagar mensagem');
      return r.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(data.chatId), (old) =>
        (old ?? []).filter((m) => m.id !== data.id)
      );
      toast.success('Mensagem apagada (somente para você)');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao apagar mensagem');
    },
  });

  const editMessageMut = useMutation({
    mutationFn: async (vars: { messageId: string; text: string }) => {
      const r = await editWhatsappMessage(vars.messageId, vars.text);
      if (!r.success || !r.data) throw new Error(r.error || 'Falha ao editar');
      return r.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(data.chatId), (old) => {
        const list = old ?? [];
        return list.map((x) => (x.id === data.id ? data : x));
      });
      setEditingId(null);
      setEditDraft('');
      toast.success('Mensagem atualizada');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao editar');
    },
  });

  const sendMediaMut = useMutation({
    mutationFn: async ({ items }: { items: PendingMedia[] }) => {
      if (!items.length) throw new Error('Nenhum arquivo');
      if (!outboundChatId?.trim()) throw new Error('Selecione uma conversa.');

      const captionFirst = mediaCaption.trim() || undefined;
      const captionRest = undefined;
      const quotedMessageId = replyToMessage?.providerMessageId || undefined;

      const conc = WA_UPLOAD_SEND_CONCURRENCY;
      let done = 0;
      setBatchUploadProgress({ current: 0, total: items.length });

      const uploadOne = async (pm: PendingMedia, globalIndex: number) => {
        const file = fileWithNormalizedUploadName(pm.file);
        const caption = globalIndex === 0 ? captionFirst : captionRest;
        const r = await postWhatsappSendFile({
          chatId: outboundChatId,
          file,
          caption: caption?.trim() ? caption : undefined,
          quotedMessageId,
          asSticker: pm.asSticker === true,
        });
        if (!r.success || !r.data) {
          throw new Error(r.error || `Falha ao enviar ${file.name}`);
        }
        mergeMessage(r.data);
        done += 1;
        setBatchUploadProgress({ current: done, total: items.length });
      };

      for (let wave = 0; wave < items.length; wave += conc) {
        const slice = items.slice(wave, wave + conc);
        await Promise.all(
          slice.map((pm, k) => uploadOne(pm, wave + k))
        );
        if (wave + conc < items.length) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, WA_UPLOAD_BATCH_DELAY_MS);
          });
        }
      }

      return items.length;
    },
    onSuccess: (count, vars) => {
      for (const pm of vars.items) {
        if (pm.previewUrl) URL.revokeObjectURL(pm.previewUrl);
      }
      setPendingMediaList([]);
      setMediaCaption('');
      setReplyToMessage(null);
      setBatchUploadProgress(null);
      toast.success(count === 1 ? 'Mídia enviada' : `${count} arquivos enviados.`);
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      setBatchUploadProgress(null);
      toast.error(e.message || 'Erro ao enviar mídia');
    },
  });

  const sendAudioMut = useMutation({
    mutationFn: async (payload: { base64Data: string; mimetype: string; filename: string }) => {
      const r = await sendWhatsappMedia({
        chatId: outboundChatId,
        mediaType: 'voice',
        base64Data: payload.base64Data,
        mimetype: payload.mimetype,
        filename: payload.filename,
        quotedMessageId: replyToMessage?.providerMessageId || undefined,
      });
      if (!r.success || !r.data) throw new Error(r.error || 'Falha ao enviar áudio');
      return r.data;
    },
    onSuccess: (data) => {
      setPendingRecordedAudio((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      setReplyToMessage(null);
      if (data) mergeMessage(data);
      toast.success('Áudio enviado');
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar áudio');
    },
  });

  const sendContactConfirmMut = useMutation({
    mutationFn: async (rows: S3eContactPickerRow[]) => {
      if (isWhatsappGroupChatId(outboundChatId)) {
        throw new Error('Envio de contato (Evolution) está disponível apenas para chats individuais.');
      }
      const number = evolutionNumberFromChat(outboundChatId);
      if (!number || number.length < 8) {
        throw new Error('Contato Evolution requer número válido (chat individual).');
      }
      for (let i = 0; i < rows.length; i += 1) {
        if (i > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, WA_SEND_CONTACT_API_GAP_MS);
          });
        }
        const row = rows[i];
        const wuid = evolutionWuidFromContactRow(row);
        if (!wuid || wuid.length < 8) {
          throw new Error(`Contato sem número válido para envio: ${whatsappContactDisplayName(row) || row.id}`);
        }
        const phoneNumber = buildEvolutionPhoneStylizedFromRow(row);
        const fullName = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id) || 'Contato';
        // `organization`: prioriza a empresa da agenda S3E quando disponível,
        // caindo em '-' apenas se vazio. A EvoGo aceita string vazia, mas
        // mantemos '-' para preservar o comportamento original do backend.
        const organization = (row.s3eEmpresa || '').trim() || '-';
        const r = await postEvolutionSendContact({
          number,
          contact: [
            {
              wuid,
              phoneNumber,
              fullName,
              organization,
              email: '-',
              url: '-',
            },
          ],
        });
        if (!r.success) throw new Error(r.error || 'Falha ao enviar contato no Evolution');
      }
    },
    onSuccess: (_, rows) => {
      toast.success(rows.length === 1 ? 'Contato enviado' : `${rows.length} contatos enviados`);
      closeSendContactFlow();
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(chatId) });
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar contato');
    },
  });

  const stageFilesFromPicker = useCallback(
    (rawFiles: File[], opts?: { asSticker?: boolean }) => {
      if (sendMediaMut.isPending) {
        toast.message('Aguarde o envio em andamento.');
        return;
      }
      const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
      const next: PendingMedia[] = [];
      const asSticker = opts?.asSticker === true;
      for (const file of rawFiles) {
        if (file.size > maxBytes) {
          toast.error(`${repairUtf8Mojibake(file.name)} excede ${MAX_FILE_SIZE_MB} MB e foi ignorado.`);
          continue;
        }
        if (next.length >= WA_UPLOAD_BATCH_MAX_FILES) {
          toast.message(
            `No máximo ${WA_UPLOAD_BATCH_MAX_FILES} arquivos por seleção (proteção Evolution/Meta).`
          );
          break;
        }
        try {
          const mediaType = detectMediaType(file.type);
          const previewUrl = mediaType === 'image' ? URL.createObjectURL(file) : null;
          next.push({ id: newPendingMediaId(), file, mediaType, previewUrl, asSticker });
        } catch {
          toast.error('Não foi possível ler um dos arquivos');
        }
      }
      if (!next.length) return;
      setPendingMediaList((prev) => {
        for (const pm of prev) {
          if (pm.previewUrl) URL.revokeObjectURL(pm.previewUrl);
        }
        return next;
      });
      setMediaCaption('');
    },
    [sendMediaMut.isPending]
  );

  const handleStickerSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (!file) return;
      stageFilesFromPicker([file], { asSticker: true });
      if (stickerInputRef.current) stickerInputRef.current.value = '';
    },
    [stageFilesFromPicker]
  );

  const handleGifSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (!file) return;
      stageFilesFromPicker([file]);
      if (gifInputRef.current) gifInputRef.current.value = '';
    },
    [stageFilesFromPicker]
  );

  const handlePhotosVideosSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (!files.length) return;
      stageFilesFromPicker(files);
      if (photosVideosInputRef.current) photosVideosInputRef.current.value = '';
    },
    [stageFilesFromPicker]
  );

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? Array.from(e.target.files) : [];
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!list.length) return;
      stageFilesFromPicker(list);
    },
    [stageFilesFromPicker]
  );

  const removePendingMediaById = useCallback((id: string) => {
    setPendingMediaList((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const dataTransferHasFiles = (dt: DataTransfer | null): boolean => {
    if (!dt?.types) return false;
    return Array.from(dt.types).includes('Files');
  };

  const handleChatFileDragOverCapture = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!chatId || isInForwardSelectionMode) return;
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [chatId, isInForwardSelectionMode]
  );

  const handleChatFileDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!chatId || isInForwardSelectionMode) return;
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      const rt = e.relatedTarget as Node | null;
      if (rt instanceof Node && e.currentTarget.contains(rt)) return;
      chatFileDragCounterRef.current += 1;
      if (chatFileDragCounterRef.current === 1) setIsDraggingFileOverChat(true);
    },
    [chatId, isInForwardSelectionMode]
  );

  const handleChatFileDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!chatId) return;
    e.preventDefault();
    const rt = e.relatedTarget as Node | null;
    if (rt instanceof Node && e.currentTarget.contains(rt)) return;
    chatFileDragCounterRef.current = Math.max(0, chatFileDragCounterRef.current - 1);
    if (chatFileDragCounterRef.current === 0) setIsDraggingFileOverChat(false);
  }, [chatId]);

  const handleChatFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!chatId || isInForwardSelectionMode) return;
      e.preventDefault();
      chatFileDragCounterRef.current = 0;
      setIsDraggingFileOverChat(false);
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      const list = Array.from(e.dataTransfer.files);
      if (!list.length) return;
      if (sendMediaMut.isPending) {
        toast.message('Aguarde o envio em andamento.');
        return;
      }
      stageFilesFromPicker(list);
    },
    [chatId, isInForwardSelectionMode, sendMediaMut.isPending, stageFilesFromPicker]
  );

  const handleChatFilePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!chatId || isInForwardSelectionMode) return;
      const list = filesFromClipboardData(e.clipboardData);
      if (!list.length) return;
      e.preventDefault();
      e.stopPropagation();
      if (sendMediaMut.isPending) {
        toast.message('Aguarde o envio em andamento.');
        return;
      }
      stageFilesFromPicker(list);
    },
    [chatId, isInForwardSelectionMode, sendMediaMut.isPending, stageFilesFromPicker]
  );

  const cancelMedia = useCallback(() => {
    setPendingMediaList((prev) => {
      for (const pm of prev) {
        if (pm.previewUrl) URL.revokeObjectURL(pm.previewUrl);
      }
      return [];
    });
    setMediaCaption('');
  }, []);

  const handleSendMedia = useCallback(() => {
    if (!pendingMediaList.length || sendMediaMut.isPending) return;
    sendMediaMut.mutate({ items: pendingMediaList });
  }, [pendingMediaList, sendMediaMut]);

  const stopRecordingStream = useCallback(() => {
    if (recordingTickerRef.current) {
      clearInterval(recordingTickerRef.current);
      recordingTickerRef.current = null;
    }
    if (recordingWaveRafRef.current != null) {
      cancelAnimationFrame(recordingWaveRafRef.current);
      recordingWaveRafRef.current = null;
    }
    try {
      recordingSourceNodeRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    recordingSourceNodeRef.current = null;
    recordingAnalyserRef.current = null;
    recordingWaveDataRef.current = null;
    const ctx = recordingAudioCtxRef.current;
    recordingAudioCtxRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => {
        /* ignore */
      });
    }
    const stream = recordingStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordingStoppingRef.current = false;
  }, []);

  const discardRecordedAudio = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
    setPreviewCurrentSec(0);
    setPreviewDurationSec(0);
    setPendingRecordedAudio((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const startForwardSelectionMode = useCallback(
    (messageIdToSelect?: string) => {
      // Ao entrar no modo seleção, cancelamos compositores para ficar fiel ao WhatsApp Web.
      setPendingMediaList((prev) => {
        for (const pm of prev) {
          if (pm.previewUrl) URL.revokeObjectURL(pm.previewUrl);
        }
        return [];
      });
      setMediaCaption('');
      discardRecordedAudio();
      setIsInForwardSelectionMode(true);
      setForwardModalOpen(false);
      setForwardTargetChatId(null);
      setEditingId(null);
      setEditDraft('');
      setSelectedMessageIds(() => {
        const s = new Set<string>();
        if (messageIdToSelect) s.add(messageIdToSelect);
        return s;
      });
    },
    [discardRecordedAudio]
  );

  useEffect(
    () => () => {
      if (presenceResetRef.current) clearTimeout(presenceResetRef.current);
      presenceAvailableSentRef.current = false;
      void postEvolutionInstanceSetPresence('unavailable').catch(() => {
        /* endpoint Evolution opcional */
      });
      discardRecordedAudio();
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        recordingStoppingRef.current = true;
        rec.onstop = null;
        rec.stop();
      }
      stopRecordingStream();
    },
    [stopRecordingStream, discardRecordedAudio]
  );

  const syncPreviewAudioProgress = useCallback(() => {
    const a = previewAudioRef.current;
    if (!a) return;
    const duration = Number.isFinite(a.duration) ? Math.max(0, a.duration) : 0;
    const current = Math.max(0, a.currentTime || 0);
    setPreviewDurationSec(duration);
    setPreviewCurrentSec(current);
    setPreviewProgress(duration > 0 ? Math.min(1, current / duration) : 0);
  }, []);

  const cancelCurrentRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') {
      stopRecordingStream();
      return;
    }
    recordingCancelRef.current = true;
    recordingStoppingRef.current = true;
    rec.stop();
  }, [stopRecordingStream]);

  const confirmSendRecordedAudio = useCallback(async () => {
    if (!pendingRecordedAudio || sendAudioMut.isPending) return;
    try {
      const audioDataUrl = await blobToDataUrl(pendingRecordedAudio.blob);
      const commaIdx = audioDataUrl.indexOf(',');
      const base64Data = commaIdx >= 0 ? audioDataUrl.slice(commaIdx + 1) : audioDataUrl;
      const mimetype = pendingRecordedAudio.mimeType || 'audio/ogg';
      const ext =
        mimetype.includes('ogg') || mimetype.includes('opus')
          ? 'ogg'
          : mimetype.includes('webm')
            ? 'webm'
            : mimetype.includes('mp3')
              ? 'mp3'
              : 'audio';
      sendAudioMut.mutate({
        base64Data,
        mimetype,
        filename: `audio-${Date.now()}.${ext}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao processar áudio gravado');
    }
  }, [pendingRecordedAudio, sendAudioMut]);

  useEffect(() => {
    if (!pendingRecordedAudio) return;
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
    setPreviewCurrentSec(0);
    setPreviewDurationSec(pendingRecordedAudio.elapsedSec);
  }, [pendingRecordedAudio]);

  const toggleAudioRecording = useCallback(async () => {
    if (sendAudioMut.isPending) return;
    if (recordingStoppingRef.current) {
      toast.message('Finalizando gravação anterior, aguarde 1s e tente novamente.');
      return;
    }
    if (isWhatsappGroupChatId(chatId)) {
      toast.error('Gravação de áudio está habilitada apenas para conversa individual.');
      return;
    }

    const currentRecorder = mediaRecorderRef.current;
    if (currentRecorder && currentRecorder.state !== 'inactive') {
      recordingStoppingRef.current = true;
      currentRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Seu navegador não suporta gravação de áudio.');
      return;
    }

    try {
      stopRecordingStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const mimeCandidates = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'];
      const chosenMime = mimeCandidates.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      });

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingCancelRef.current = false;
      recordingStoppingRef.current = false;
      recordingChunksRef.current = [];
      recordingWaveSamplesRef.current = [];
      setRecordingElapsedSec(0);
      setIsRecordingAudio(true);
      discardRecordedAudio();

      try {
        const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const sourceNode = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          sourceNode.connect(analyser);
          recordingAudioCtxRef.current = ctx;
          recordingSourceNodeRef.current = sourceNode;
          recordingAnalyserRef.current = analyser;
          recordingWaveDataRef.current = new Uint8Array(analyser.frequencyBinCount);

          const sampleWave = () => {
            const an = recordingAnalyserRef.current;
            const data = recordingWaveDataRef.current;
            if (!an || !data) return;
            an.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
              const centered = (data[i] - 128) / 128;
              sum += centered * centered;
            }
            const rms = Math.sqrt(sum / data.length);
            const normalized = Math.max(0.02, Math.min(1, rms * 2.8));
            const arr = recordingWaveSamplesRef.current;
            arr.push(normalized);
            if (arr.length > 1200) arr.shift();
            recordingWaveRafRef.current = requestAnimationFrame(sampleWave);
          };
          recordingWaveRafRef.current = requestAnimationFrame(sampleWave);
        }
      } catch {
        // WebAudio pode falhar em alguns ambientes; segue gravação normalmente.
      }

      void postEvolutionInstanceSetPresence('available').catch(() => {
        /* endpoint Evolution opcional */
      });

      if (recordingTickerRef.current) clearInterval(recordingTickerRef.current);
      recordingTickerRef.current = setInterval(() => {
        setRecordingElapsedSec((s) => s + 1);
      }, 1000);

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          recordingChunksRef.current.push(evt.data);
        }
      };

      recorder.onerror = () => {
        mediaRecorderRef.current = null;
        recordingStoppingRef.current = false;
        setIsRecordingAudio(false);
        stopRecordingStream();
        toast.error('Falha ao gravar áudio');
      };

      recorder.onstop = async () => {
        mediaRecorderRef.current = null;
        recordingStoppingRef.current = false;
        setIsRecordingAudio(false);
        stopRecordingStream();
        if (recordingCancelRef.current) {
          recordingCancelRef.current = false;
          recordingChunksRef.current = [];
          setRecordingElapsedSec(0);
          toast.message('Gravação cancelada');
          return;
        }
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        if (!chunks.length) {
          toast.error('Nenhum áudio foi capturado.');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 500) {
          toast.error('Áudio muito curto. Grave novamente.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const bars = buildWaveformBars(recordingWaveSamplesRef.current, 40);
        recordingWaveSamplesRef.current = [];
        setPendingRecordedAudio({
          blob,
          url,
          mimeType: recorder.mimeType || 'audio/webm',
          size: blob.size,
          elapsedSec: recordingElapsedSec,
          waveformBars: bars
        });
        toast.message('Áudio pronto. Escute antes de enviar.');
      };

      recorder.start(350);
      toast.message('Gravação iniciada. Toque no microfone para enviar.');
    } catch (e) {
      mediaRecorderRef.current = null;
      recordingStoppingRef.current = false;
      setIsRecordingAudio(false);
      stopRecordingStream();
      toast.error(e instanceof Error ? e.message : 'Permissão de microfone negada');
    }
  }, [sendAudioMut, chatId, stopRecordingStream, discardRecordedAudio, recordingElapsedSec]);

  useEffect(() => {
    setPendingMediaList((prev) => {
      for (const pm of prev) {
        if (pm.previewUrl) URL.revokeObjectURL(pm.previewUrl);
      }
      return [];
    });
    setMediaCaption('');
    discardRecordedAudio();
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      recordingCancelRef.current = true;
      recordingStoppingRef.current = true;
      rec.stop();
      return;
    }
    stopRecordingStream();
  }, [chatId, discardRecordedAudio, stopRecordingStream]);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!window.confirm('Excluir esta mensagem para todos no WhatsApp?')) return;
      deleteMessageMut.mutate(messageId);
    },
    [deleteMessageMut]
  );

  useEffect(() => {
    setEditingId(null);
    setEditDraft('');
    exitForwardSelectionMode();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, chatId]);

  const archiveConversationMut = useMutation({
    mutationFn: async () => {
      const cid = canonicalWhatsappChatId(chatId);
      if (!cid || !String(cid).trim()) {
        toast.error('Não foi possível arquivar: chatId inválido');
        throw new Error('chatId inválido');
      }
      const r = await archiveWhatsappConversation(cid);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onMutate: async () => {
      const cid = canonicalWhatsappChatId(chatId);
      const previous = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).filter((c) => canonicalWhatsappChatId(c.chatId) !== cid)
      );
      onNavigateChat?.('', '');
      setChatMenuOpen(false);
      return { previous, cid, label: headerPrimary };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(chatsQueryKey, ctx.previous);
      if (ctx?.cid && onNavigateChat) onNavigateChat(ctx.cid, ctx.label);
      if (isWhatsappErrorAlreadyToasted(e)) return;
      toast.error(e instanceof Error ? e.message : 'Erro ao arquivar');
    },
    onSuccess: () => {
      toast.success('Conversa arquivada');
      queryClient.invalidateQueries({ queryKey: archivedChatsQueryKey });
    },
  });

  const pinConversationMut = useMutation({
    mutationFn: async (vars: { chatId: string; pinned: boolean }) => {
      const cid = canonicalWhatsappChatId(vars.chatId);
      if (!cid || !String(cid).trim()) throw new Error('chatId inválido');
      const r = await postWhatsappPinConversation(cid, vars.pinned);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return { chatId: cid, pinned: vars.pinned };
    },
    onMutate: async (vars) => {
      const cid = canonicalWhatsappChatId(vars.chatId);
      const previous = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).map((c) =>
          canonicalWhatsappChatId(c.chatId) === cid ? { ...c, pinned: vars.pinned } : c
        )
      );
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(chatsQueryKey, ctx.previous);
      if (isWhatsappErrorAlreadyToasted(e)) return;
      toast.error(e instanceof Error ? e.message : 'Erro ao fixar conversa');
    },
  });

  const favoriteConversationMut = useMutation({
    mutationFn: async (vars: { chatId: string; favorite: boolean }) => {
      const cid = canonicalWhatsappChatId(vars.chatId);
      if (!cid || !String(cid).trim()) throw new Error('chatId inválido');
      const r = await postWhatsappFavoriteConversation(cid, vars.favorite);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return { chatId: cid, favorite: vars.favorite };
    },
    onMutate: async (vars) => {
      const cid = canonicalWhatsappChatId(vars.chatId);
      const previous = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).map((c) =>
          canonicalWhatsappChatId(c.chatId) === cid ? { ...c, favorite: vars.favorite } : c
        )
      );
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(chatsQueryKey, ctx.previous);
      if (isWhatsappErrorAlreadyToasted(e)) return;
      toast.error(e instanceof Error ? e.message : 'Erro ao favoritar conversa');
    },
  });

  const deleteConversationMut = useMutation({
    mutationFn: async (vars: { targetChatId: string; label: string }) => {
      const cid = canonicalWhatsappChatId(vars.targetChatId || chatId);
      if (!cid || !String(cid).trim()) {
        toast.error('Não foi possível apagar: chatId inválido');
        throw new Error('chatId inválido');
      }
      const r = await deleteWhatsappConversation(cid);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onMutate: async (vars) => {
      const cid = canonicalWhatsappChatId(vars.targetChatId || chatId);
      const previous = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey);
      const messagesSnapshot = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid));
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).filter((c) => canonicalWhatsappChatId(c.chatId) !== cid)
      );
      queryClient.removeQueries({ queryKey: messagesQueryKey(cid) });
      if (canonicalWhatsappChatId(chatId) === cid) {
        onNavigateChat?.('', '');
      }
      setChatMenuOpen(false);
      return { previous, cid, label: vars.label || headerPrimary, messagesSnapshot };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(chatsQueryKey, ctx.previous);
      if (ctx?.messagesSnapshot) {
        queryClient.setQueryData(messagesQueryKey(ctx.cid), ctx.messagesSnapshot);
      }
      if (ctx?.cid && onNavigateChat) onNavigateChat(ctx.cid, ctx.label);
      if (isWhatsappErrorAlreadyToasted(e)) return;
      toast.error(e instanceof Error ? e.message : 'Erro ao apagar conversa');
    },
    onSuccess: () => {
      toast.success('Conversa apagada');
    },
  });

  const invalidateWhatsappSessionProfile = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['whatsapp-session-profile'] });
  }, [queryClient]);

  const invalidateGroupCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['whatsapp-provider-groups'] });
    void queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-meta', chatId] });
    void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
  }, [chatId, queryClient]);

  const parseGroupNumbers = useCallback((raw: string): string[] => {
    return raw
      .split(/[\n,;]+/)
      .map((x) => x.trim())
      .map((x) => x.replace(/\s+/g, '').replace(/[^\d]/g, ''))
      .filter((x, i, arr) => x.length >= 8 && arr.indexOf(x) === i);
  }, []);

  const refreshGroupInfoMut = useMutation({
    mutationFn: async () => {
      const groupJid = canonicalWhatsappChatId(chatId);
      const groupRes = await getEvolutionGroupFindByJid(groupJid);
      if (!groupRes.success) {
        if (isLikelyRateLimit(groupRes)) {
          const key = `wa-group-meta:${groupJid}`;
          const { waitMs } = registerRateLimitBackoff(key, { baseMs: GROUP_BACKOFF_BASE_MS, maxMs: GROUP_BACKOFF_MAX_MS });
          toast.message(`Limite do WhatsApp atingido. Tentaremos novamente após ${(waitMs / 1000).toFixed(0)}s.`);
        }
        toastWhatsappApiError(groupRes);
        throwAfterWhatsappToast();
      }
      const base = normalizeGroupInfo(groupRes.data, groupJid);
      return base;
    },
    onSuccess: (info) => {
      registerBackoffSuccess(`wa-group-meta:${canonicalWhatsappChatId(chatId)}`);
      setGroupInfo(info);
      setGroupSubjectDraft(info.subject);
      setGroupDescriptionDraft(info.desc);
      if (info.pictureUrl) setGroupPictureDraft(info.pictureUrl);
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro ao carregar grupo');
    },
  });

  const evoGroupSubjectMut = useMutation({
    mutationFn: async () => {
      const r = await postEvolutionGroupUpdateSubject(canonicalWhatsappChatId(chatId), groupSubjectDraft.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Nome do grupo atualizado');
      invalidateGroupCaches();
      refreshGroupInfoMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupDescriptionMut = useMutation({
    mutationFn: async () => {
      const r = await postEvolutionGroupUpdateDescription(canonicalWhatsappChatId(chatId), groupDescriptionDraft.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Descrição do grupo atualizada');
      refreshGroupInfoMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupPictureMut = useMutation({
    mutationFn: async () => {
      const r = await postEvolutionGroupUpdatePicture(canonicalWhatsappChatId(chatId), groupPictureDraft.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Foto do grupo atualizada');
      refreshGroupInfoMut.mutate();
      invalidateGroupCaches();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupInviteCodeMut = useMutation({
    mutationFn: async () => {
      const r = await getEvolutionGroupFetchInviteCode(canonicalWhatsappChatId(chatId));
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return normalizeInviteUrl(r.data);
    },
    onSuccess: (inviteUrl) => {
      setGroupInviteUrl(inviteUrl);
      if (inviteUrl) toast.success('Convite do grupo carregado');
      else toast.message('Convite carregado, mas sem URL no payload');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupRevokeInviteMut = useMutation({
    mutationFn: async () => {
      const r = await postEvolutionGroupRevokeInviteCode(canonicalWhatsappChatId(chatId));
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Link de convite revogado');
      setGroupInviteUrl('');
      evoGroupInviteCodeMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupSendInviteMut = useMutation({
    mutationFn: async () => {
      const numbers = parseGroupNumbers(groupInviteNumbers);
      if (numbers.length === 0) {
        throw new Error('Informe ao menos um número para enviar convite');
      }
      const r = await postEvolutionGroupSendInvite({
        groupJid: canonicalWhatsappChatId(chatId),
        description: groupInviteDescription.trim() || 'Convite para entrar no grupo',
        numbers,
      });
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Convite enviado para os números informados');
      setGroupInviteNumbers('');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupUpdateMembersMut = useMutation({
    mutationFn: async () => {
      const participants = parseGroupNumbers(groupMembersDraft);
      if (participants.length === 0) {
        throw new Error('Informe ao menos um número para atualizar membros');
      }
      const r = await postEvolutionGroupUpdateMembers({
        groupJid: canonicalWhatsappChatId(chatId),
        action: groupMembersAction,
        participants,
      });
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Membros do grupo atualizados');
      setGroupMembersDraft('');
      refreshGroupInfoMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupUpdateSettingMut = useMutation({
    mutationFn: async () => {
      const r = await postEvolutionGroupUpdateSetting(canonicalWhatsappChatId(chatId), groupSettingAction);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Configuração do grupo atualizada');
      refreshGroupInfoMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupToggleEphemeralMut = useMutation({
    mutationFn: async () => {
      const expiration = Number.parseInt(groupEphemeralExpiration.trim(), 10);
      if (!Number.isFinite(expiration) || expiration < 0) {
        throw new Error('Expiração inválida. Informe um inteiro >= 0 em segundos');
      }
      const r = await postEvolutionGroupToggleEphemeral(canonicalWhatsappChatId(chatId), expiration);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Mensagens temporárias atualizadas');
      refreshGroupInfoMut.mutate();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoGroupLeaveMut = useMutation({
    mutationFn: async () => {
      const r = await deleteEvolutionGroupLeave(canonicalWhatsappChatId(chatId));
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Você saiu do grupo');
      setGroupPanelOpen(false);
      invalidateGroupCaches();
      const currentCanonical = canonicalWhatsappChatId(chatId);
      const next = chatList.find((c) => canonicalWhatsappChatId(c.chatId) !== currentCanonical);
      if (next) {
        const nextTitle = next.contactName || formatPhoneForDisplay(next.chatId);
        onNavigateChat?.(canonicalWhatsappChatId(next.chatId), nextTitle);
      } else {
        onClose?.();
      }
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  // Removido autofetch agressivo de metadados de grupo ao abrir o painel
  // para evitar rate-limit em grupos grandes. Agora é somente sob ação do usuário.

  useEffect(() => {
    if (!chatId) return;
    const t = setTimeout(() => {
      void reconcileAckByProviderStatus('open');
    }, 500);
    return () => clearTimeout(t);
  }, [chatId, reconcileAckByProviderStatus]);

  useEffect(() => {
    if (!chatId) return;
    const t = setInterval(() => {
      void reconcileAckByProviderStatus('interval');
    }, 45_000);
    return () => clearInterval(t);
  }, [chatId, reconcileAckByProviderStatus]);

  const evoProfileNameMut = useMutation({
    mutationFn: async (name: string) => {
      const r = await postEvolutionProfileUpdateName(name.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Nome do perfil WhatsApp atualizado');
      invalidateWhatsappSessionProfile();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoProfileStatusMut = useMutation({
    mutationFn: async (status: string) => {
      const r = await postEvolutionProfileUpdateStatus(status.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Recado (status) atualizado no WhatsApp');
      invalidateWhatsappSessionProfile();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoProfilePictureMut = useMutation({
    mutationFn: async (picture: string) => {
      const r = await postEvolutionProfileUpdatePicture(picture.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Foto de perfil atualizada');
      setProfileWpPicture('');
      invalidateWhatsappSessionProfile();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoProfileRemovePictureMut = useMutation({
    mutationFn: async () => {
      const r = await deleteEvolutionProfilePicture();
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Foto de perfil removida');
      invalidateWhatsappSessionProfile();
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoFetchContactProfileMut = useMutation({
    mutationFn: async (number: string) => {
      const r = await postEvolutionProfileFetchContact(number.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return r.data;
    },
    onSuccess: (data) => {
      setProfileLookupJson(JSON.stringify(data ?? null, null, 2));
      try {
        const parsed = normalizeEvolutionContactProfile(data);
        // Só atualiza o nome quando a Evolution realmente retornar um nome válido.
        // Isso evita sobrescrever com fallback e reduz “flapping” de labels.
        const dn = parsed.displayName.trim();
        const displayName = dn && !isJustDigitsLabel(dn) ? dn : '';
        const profilePictureUrl =
          parsed.profilePictureUrl.trim() ||
          (activeContactMeta?.profilePictureUrl ?? '').trim() ||
          (activePreview?.cachedProfilePictureUrl ?? '').trim() ||
          '';

        if (displayName || profilePictureUrl) {
          void postWhatsappUpsertContactCache({
            chatId,
            displayName: displayName || null,
            profilePictureUrl: profilePictureUrl || null,
          }).then((r) => {
            if (r.success) {
              const cid = canonicalWhatsappChatId(chatId);
              queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
                (old ?? []).map((c) =>
                  canonicalWhatsappChatId(c.chatId) === cid
                    ? {
                        ...c,
                        providerCachedName: displayName || c.providerCachedName || null,
                        cachedProfilePictureUrl: profilePictureUrl || c.cachedProfilePictureUrl || null,
                      }
                    : c
                )
              );
              void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
              void queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-meta', cid] });
            }
          });
        }
      } catch {
        // ignora: cache é best-effort
      }
      toast.success('Perfil do contato obtido');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  // Nota: removemos o autofetch ao abrir o painel para evitar chamadas “surpresa” à Evolution.
  // O usuário pode clicar em “Buscar perfil” quando quiser atualizar.

  const evoFetchBusinessProfileMut = useMutation({
    mutationFn: async (number: string) => {
      const r = await postEvolutionProfileFetchBusiness(number.trim());
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return r.data;
    },
    onSuccess: (data) => {
      setProfileLookupJson(JSON.stringify(data ?? null, null, 2));
      toast.success('Perfil comercial obtido');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoLoadPrivacyMut = useMutation({
    mutationFn: async () => {
      const r = await getEvolutionProfilePrivacy();
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
      return r.data;
    },
    onSuccess: (data) => {
      setPrivacyForm((prev) => mergeEvolutionPrivacyFromUnknown(data, prev));
      toast.success('Configurações de privacidade carregadas');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const evoSavePrivacyMut = useMutation({
    mutationFn: async (body: EvolutionPrivacySettingsBody) => {
      const r = await postEvolutionProfilePrivacy(body);
      if (!r.success) {
        toastWhatsappApiError(r);
        throwAfterWhatsappToast();
      }
    },
    onSuccess: () => {
      toast.success('Privacidade atualizada');
    },
    onError: (e) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e instanceof Error ? e.message : 'Erro');
    },
  });

  const refocusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        composerDraftInputRef.current?.focus();
      });
    });
  }, []);

  // Lê o draft via ref para não invalidar handleSend/onSubmit a cada keystroke.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const sendMut = useMutation({
    mutationFn: async ({ text, replySnapshot }: SendTextMutationVars) => {
      const r = await sendWhatsappMessage(
        outboundChatId,
        text,
        replySnapshot?.providerMessageId || undefined,
        replySnapshot?.fromMe
      );
      if (!r.success) throw new Error(r.error || 'Falha ao enviar');
      return r.data;
    },
    onSuccess: (data, variables) => {
      if (!data) return;
      const localCid = canonicalWhatsappChatId(outboundChatId);
      const normalized = { ...data, chatId: localCid };
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(localCid), (old) => {
        const list = (old ?? []).filter((x) => x.id !== variables.optimisticId);
        if (list.some((x) => x.id === normalized.id)) return list;
        return [...list, normalized];
      });
      const serverCid = canonicalWhatsappChatId(data.chatId);
      if (serverCid !== localCid) {
        queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(serverCid), (old) =>
          (old ?? []).filter((x) => x.id !== normalized.id && x.id !== variables.optimisticId)
        );
      }
      mergeMessage(normalized);
      refocusComposer();
    },
    onError: (e: Error, variables) => {
      const cid = canonicalWhatsappChatId(outboundChatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).filter((x) => x.id !== variables.optimisticId)
      );
      setDraft(variables.text);
      draftRef.current = variables.text;
      if (variables.replySnapshot) setReplyToMessage(variables.replySnapshot);
      toast.error(e.message || 'Erro ao enviar mensagem');
      refocusComposer();
    },
  });

  const handleSend = useCallback(() => {
    const t = draftRef.current.trim();
    if (!t) return;

    const replySnapshot = replyToMessage;
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimistic: WhatsappMessageDto = {
      id: optimisticId,
      chatId: outboundChatId,
      content: t,
      fromMe: true,
      timestamp: new Date().toISOString(),
      ack: 0,
      providerMessageId: null,
    };

    setDraft('');
    draftRef.current = '';
    setReplyToMessage(null);
    mergeMessage(optimistic);
    refocusComposer();

    sendMut.mutate({ text: t, optimisticId, replySnapshot });
  }, [sendMut, refocusComposer, replyToMessage, outboundChatId, mergeMessage]);

  const handleOpenPhoneFromText = useCallback(
    async (rawDigits: string) => {
      let digits = onlyDigits(rawDigits);
      if (digits.length < 10) return;
      if (digits.length <= 11 && !digits.startsWith('55')) digits = `55${digits}`;
      const title = formatPhoneForDisplay(`${digits.replace(/^\+/, '')}@c.us`);
      try {
        const r = await fetchWhatsappResolveOpenChat(digits);
        if (r.success && r.data?.chatId) {
          onNavigateChat?.(canonicalWhatsappChatId(r.data.chatId), title);
          return;
        }
      } catch {
        // fallback abaixo
      }
      onNavigateChat?.(canonicalWhatsappChatId(toWhatsappChatId(digits)), title);
    },
    [onNavigateChat]
  );

  useEffect(() => {
    if (!chatId || isInForwardSelectionMode || sendContactStep !== 'idle' || editingId) return;
    const id = window.requestAnimationFrame(() => {
      composerDraftInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [chatId, isInForwardSelectionMode, sendContactStep, editingId]);

  const isWaMobile = useMatchMedia(WA_MOBILE_MEDIA);
  const mobileListOnly = isWaMobile && !chatId;
  const mobileChatOnly = isWaMobile && !!chatId;

  const rootClass =
    layout === 'full'
      ? 'flex h-full min-h-0 w-full max-w-none flex-1 overflow-hidden rounded-none border-0 border-y border-[#e9edef] bg-white shadow-none dark:border-dark-border dark:bg-[#161717]'
      : 'flex h-[min(72vh,680px)] w-full max-w-full overflow-hidden rounded border border-[#d1d7db] bg-white shadow-[0_6px_18px_rgba(11,20,26,0.15)] dark:border-dark-border dark:bg-[#161717]';

  const asideClass =
    layout === 'full'
      ? `flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col border-r border-[#e9edef] bg-white dark:border-dark-border dark:bg-[#161717] min-[780px]:w-[var(--wa-aside-w,408px)] min-[780px]:max-w-[60vw] min-[780px]:shrink-0${mobileChatOnly ? ' max-[779px]:hidden' : ' max-[779px]:w-full max-[779px]:max-w-none max-[779px]:border-r-0'}`
      : `flex w-full max-w-[300px] shrink-0 flex-col border-r border-[#e9edef] bg-white dark:border-dark-border dark:bg-[#161717] min-[780px]:max-w-[320px]${mobileChatOnly ? ' max-[779px]:hidden' : ' max-[779px]:w-full max-[779px]:max-w-none max-[779px]:border-r-0'}`;

  const chatColumnClass = `relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#efeae2] dark:bg-[#161717]${mobileListOnly ? ' max-[779px]:hidden' : ''}${mobileChatOnly ? ' max-[779px]:w-full max-[779px]:flex-1' : ''}`;

  return (
    <div className={rootClass}>
      {/* Coluna esquerda — lista (estilo WhatsApp Web) */}
      <aside
        ref={asideRef}
        className={`${asideClass} relative`}
        style={
          layout === 'full'
            ? ({ ['--wa-aside-w' as string]: `${asideWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-[#e9edef] bg-white px-3 max-[779px]:pl-14 dark:border-[#2a3942] dark:bg-[#161717]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-[#1daa61] dark:text-white">WhatsApp</h1>
            {totalUnreadMsgs > 0 ? (
              <span
                className="inline-flex min-w-[1.35rem] shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                title={`${totalUnreadMsgs} mensagem(ns) não lida(s) no total`}
              >
                {totalUnreadMsgs > 99 ? '99+' : totalUnreadMsgs}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              title="Nova conversa"
              aria-expanded={newPhoneComposerOpen}
              aria-controls="wa-sidebar-new-phone"
              onClick={() => {
                setNewPhoneComposerOpen(true);
                setSidebarMenuOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#f7f5f3] dark:text-[#aebac1] dark:hover:bg-white/10"
              aria-label="Nova conversa"
            >
              <NewChatSquareIcon className="h-[22px] w-[22px]" />
            </button>
            <div className="relative shrink-0" ref={sidebarMenuRef}>
            <button
              type="button"
              title="Menu"
              onClick={() => setSidebarMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] hover:bg-[#f7f5f3] dark:text-[#aebac1] dark:hover:bg-white/10"
              aria-expanded={sidebarMenuOpen}
              aria-haspopup="menu"
              aria-label="Menu da lista de conversas"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            {sidebarMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-[60] mt-1 min-w-[min(92vw,260px)] max-w-[92vw] rounded-lg border border-[#e9edef] bg-white py-1 shadow-xl dark:border-[#2a3942] dark:bg-[#202c33]"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    window.open(
                      connectionStatus?.dashboardUrl || FALLBACK_WHATSAPP_PROVIDER_DASHBOARD,
                      '_blank',
                      'noopener,noreferrer'
                    );
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span
                    className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${connectionStatus?.connected ? 'bg-[#25d366]' : 'bg-red-500'}`}
                    aria-hidden
                  />
                  Painel do provedor (sessão)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setQrModalOpen(true);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <QrCode className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  QR code da sessão
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setContactsPanelOpen(true);
                    setCheckPhoneResult(null);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <Contact className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Agenda de contatos
                </button>
                <div className="my-1 border-t border-[#e9edef] dark:border-[#2a3942]" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Para criar um grupo, use o WhatsApp no telefone ou o painel do provedor.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <UserPlus className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Novo grupo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setArchivedPanelOpen(true);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <Archive className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Arquivadas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Mensagens favoritas ainda não estão disponíveis no CRM.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <Star className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Mensagens favoritas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Seleção em massa em breve.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <SquareCheck className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Selecionar conversas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={markAllReadMut.isPending}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 disabled:opacity-50 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    markAllReadMut.mutate();
                    setSidebarMenuOpen(false);
                  }}
                >
                  <CheckCheck className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Marcar todas como lidas
                </button>
                <div className="my-1 border-t border-[#e9edef] dark:border-[#2a3942]" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setProfilePanelOpen(true);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <User className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Meu perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={async () => {
                    setSidebarMenuOpen(false);
                    try {
                      const r = await deleteWhatsappContactCacheAll();
                      if (r.success) {
                        const deleted = r.data?.deleted ?? 0;
                        const rebuilt = r.data?.rebuilt ?? 0;
                        toast.success(
                          rebuilt > 0
                            ? `Cache limpo (${deleted} apagados). ${rebuilt} entradas regravadas a partir do CRM (Cliente/Lead).`
                            : `Cache do WhatsApp apagado (${deleted} registros). Nada foi regravado na hora — se o nome continuar errado, verifique o cadastro Cliente/Lead ou o nome que o WhatsApp envia ao chegar mensagem.`
                        );
                        // Recarrega lista e meta do chat ativo para evitar “vazar” estado antigo após clear.
                        void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
                        if (chatId) {
                          void queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-meta', chatId] });
                        }
                        // Remove cache em memória do React Query (base key) para não reaproveitar payload antigo.
                        queryClient.removeQueries({ queryKey: ['whatsapp-contact-meta'] });
                      } else {
                        toast.error('Erro ao limpar cache');
                      }
                    } catch {
                      toast.error('Erro ao limpar cache de nomes');
                    }
                  }}
                >
                  <Trash2 className={WA_SIDEBAR_MENU_ICON} strokeWidth={1.75} aria-hidden />
                  Limpar cache de nomes
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={logoutMut.isPending}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] text-[#b91c1c] hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    handleWhatsappProviderLogout();
                  }}
                >
                  <LogOut className="h-[18px] w-[18px] shrink-0 text-current" strokeWidth={1.75} aria-hidden />
                  Desconectar WhatsApp
                </button>
              </div>
            ) : null}
            </div>
          </div>
        </div>
        <div className="shrink-0 space-y-2 border-b border-[#e9edef] bg-white px-3 py-2 dark:border-[#2a3942] dark:bg-[#161717]">
          <div className="relative" role="search">
            <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8696a0] dark:text-[#8696a0]">
              <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            </span>
            <input
              type="search"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Pesquisar ou começar uma nova conversa"
              autoComplete="off"
              className="w-full rounded-full border border-transparent bg-[#f7f5f3] py-2.5 pl-10 pr-4 text-[14px] text-[#111b21] shadow-none placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:bg-[#202c33] dark:text-[#e9edef]"
            />
          </div>
          <div
            ref={filterTabsRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-y"
            role="tablist"
            aria-label="Filtros da lista de conversas (arraste lateralmente para navegar)"
            onPointerDown={handleFilterTabsPointerDown}
            onPointerMove={handleFilterTabsPointerMove}
            onPointerUp={handleFilterTabsPointerEnd}
            onPointerCancel={handleFilterTabsPointerEnd}
            onClickCapture={(e) => {
              if (filterTabsJustDraggedRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {(
              [
                { id: 'all' as const, label: 'Tudo' },
                {
                  id: 'unread' as const,
                  label: 'Não lidas',
                  count: sidebarFilterCounts.unreadChats,
                },
                { id: 'favorites' as const, label: 'Favoritas', count: sidebarFilterCounts.favoriteChats },
                { id: 'groups' as const, label: 'Grupos', count: sidebarFilterCounts.groupChats },
              ] as const
            ).map((tab) => {
              const active = chatSidebarFilter === tab.id;
              const count = 'count' in tab ? tab.count : 0;
              const showCount = typeof count === 'number' && count > 0 && tab.id !== 'all';
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChatSidebarFilter(tab.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'bg-[#00a884] text-white shadow-sm'
                      : 'bg-[#f7f5f3] text-[#54656f] hover:bg-[#edeae7] dark:bg-[#202c33] dark:text-[#e9edef] dark:hover:bg-[#2a3942]'
                  }`}
                >
                  {tab.label}
                  {showCount ? ` ${count}` : ''}
                </button>
              );
            })}
            {chatLabels.map((label) => {
              const filterId = `label:${label.id}`;
              const active = chatSidebarFilter === filterId;
              return (
                <button
                  key={label.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChatSidebarFilter(filterId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setLabelEditTarget(label);
                    setLabelEditOpen(true);
                  }}
                  onDoubleClick={() => {
                    setLabelEditTarget(label);
                    setLabelEditOpen(true);
                  }}
                  title={`${label.nome}${label.isGlobal ? ' (todos os usuários)' : ''} — duplo-clique para editar`}
                  style={
                    active && label.cor
                      ? { backgroundColor: label.cor, color: '#fff', borderColor: label.cor }
                      : undefined
                  }
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'bg-[#00a884] text-white shadow-sm'
                      : 'border-[#e9edef] bg-[#f7f5f3] text-[#54656f] hover:bg-[#edeae7] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef] dark:hover:bg-[#2a3942]'
                  }`}
                >
                  {label.emoji ? <span aria-hidden>{label.emoji}</span> : null}
                  <span className="truncate">{label.nome}</span>
                  {label.total > 0 ? <span className="opacity-70"> · {label.total}</span> : null}
                </button>
              );
            })}
            <button
              type="button"
              title="Criar nova lista"
              aria-label="Criar nova lista"
              onClick={() => {
                setLabelEditTarget(null);
                setLabelEditOpen(true);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[#8696a0]/50 text-[#8696a0] hover:bg-[#f7f5f3] dark:hover:bg-white/10"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
        </div>
        <div className="wa-scroll flex-1 overflow-y-auto bg-white px-1.5 dark:bg-[#161717]">
          {chatList.length === 0 && (
            <p className="p-4 text-center text-[13px] text-[#667781]">Nenhuma conversa sincronizada ainda.</p>
          )}
          {chatList.length > 0 && filteredChats.length === 0 ? (
            <div className="p-4 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
              <p>
                {chatSearch.trim()
                  ? `Nenhuma conversa corresponde a "${chatSearch.trim()}".`
                  : chatSidebarFilter === 'unread'
                    ? 'Nenhuma conversa não lida.'
                    : chatSidebarFilter === 'favorites'
                      ? 'Nenhuma conversa favorita.'
                      : chatSidebarFilter === 'groups'
                        ? 'Nenhum grupo nesta lista.'
                        : chatSidebarFilter.startsWith('label:')
                          ? 'Esta lista ainda está vazia. Clique no nome dela para adicionar conversas.'
                          : 'Nenhuma conversa encontrada.'}
              </p>
              {chatSidebarFilter.startsWith('label:') ? (
                <button
                  type="button"
                  onClick={() => {
                    const id = chatSidebarFilter.slice('label:'.length);
                    const label = chatLabels.find((l) => l.id === id);
                    if (label) {
                      setLabelEditTarget(label);
                      setLabelEditOpen(true);
                    }
                  }}
                  className="mt-2 rounded-full bg-[#00a884] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#008f6f]"
                >
                  Adicionar conversas
                </button>
              ) : null}
            </div>
          ) : null}
          {sortedFilteredChats.map((c) => {
            const isG = isWhatsappGroupChatId(c.chatId);
            const w = !isG ? findWhatsappContactInRows(providerContactRows, c.chatId) : undefined;
            const wg = isG ? findWhatsappGroupInRows(providerGroupRows, c.chatId) : undefined;
            const { listTitle, avatarLabel, headerForChat } = resolveChatPreviewLabels(c, w, wg);
            const active = canonicalWhatsappChatId(c.chatId) === canonicalWhatsappChatId(chatId);
            const unread = (c.unreadCount ?? 0) > 0;
            const uCount = c.unreadCount ?? 0;
            const canonCid = canonicalWhatsappChatId(c.chatId);
            const pinned = !!c.pinned;
            const fav = !!c.favorite;
            const lastPreview = repairUtf8Mojibake(c.lastContent);
            const rowPic =
              c.cachedProfilePictureUrl ||
              (c.chatId === chatId ? activeContactMeta?.profilePictureUrl : null) ||
              profileUrlByChatId.get(c.chatId) ||
              null;
            return (
              <div
                key={c.chatId}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onNavigateChat?.(canonicalWhatsappChatId(c.chatId), headerForChat);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigateChat?.(canonicalWhatsappChatId(c.chatId), headerForChat);
                  }
                }}
                className={`group relative my-0.5 flex min-h-[4.5rem] w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#00a884] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111b21] ${
                  active ? 'bg-[#edeae7] dark:bg-[#2a3942]' : 'hover:bg-[#f7f5f3] dark:hover:bg-[#2a3942]'
                }`}
              >
                <ContactAvatar chatId={c.chatId} imageUrl={rowPic} label={avatarLabel} size="list" />
                <div className="flex min-h-[3.25rem] min-w-0 flex-1 flex-col justify-center gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`min-w-0 truncate text-[16px] leading-tight text-[#111b21] dark:text-[#e9edef] ${
                        unread ? 'font-bold text-[#111b21] dark:text-white' : 'font-medium'
                      }`}
                    >
                      {listTitle}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {pinned ? (
                        <span className="text-[12px] leading-none text-[#8696a0] dark:text-[#667781]" title="Fixada" aria-hidden>
                          📌
                        </span>
                      ) : null}
                      <span
                        className={`text-[11px] tabular-nums leading-none ${
                          unread ? 'font-semibold text-[#25d366]' : 'font-normal text-[#667781] dark:text-[#8696a0]'
                        }`}
                      >
                        {formatListTime(c.lastAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p
                      className={`min-w-0 flex-1 truncate text-[14px] leading-snug ${
                        unread ? 'font-medium text-[#111b21] dark:text-[#e9edef]' : 'font-normal text-[#667781] dark:text-[#8696a0]'
                      }`}
                    >
                      {c.lastFromMe ? (
                        <>
                          <span className="inline-flex translate-y-[1px]">
                            <OutboundAckIcon ack={c.lastAck} />
                          </span>{' '}
                          Você:{' '}
                        </>
                      ) : null}
                      {lastPreview.slice(0, 52)}
                      {lastPreview.length > 52 ? '…' : ''}
                    </p>
                    {unread ? (
                      <span
                        className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-semibold tabular-nums leading-none text-white"
                        aria-label={`${uCount} não lidas`}
                      >
                        {uCount > 99 ? '99+' : uCount}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Indicadores (favorito — fixado já aparece ao lado do horário) */}
                <div className="absolute right-11 top-1/2 z-0 hidden -translate-y-1/2 items-center gap-1.5 text-[12px] text-[#667781] group-hover:flex dark:text-[#8696a0]">
                  {fav ? <span title="Conversa favorita">⭐</span> : null}
                </div>

                {/* Setinha + dropdown */}
                <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] hover:bg-black/10 dark:text-[#a9b4ba] dark:hover:bg-white/10"
                        aria-label="Ações da conversa"
                        title="Ações"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={6} align="end" className="min-w-[220px]">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          if (!window.confirm('Arquivar esta conversa?')) return;
                          onNavigateChat?.(canonCid, headerForChat);
                          archiveConversationMut.mutate();
                        }}
                        disabled={archiveConversationMut.isPending}
                      >
                        Arquivar conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          pinConversationMut.mutate({ chatId: canonCid, pinned: !pinned });
                        }}
                      >
                        {pinned ? 'Desafixar conversa' : 'Fixar conversa'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          favoriteConversationMut.mutate({ chatId: canonCid, favorite: !fav });
                        }}
                      >
                        {fav ? 'Desfavoritar conversa' : 'Favoritar conversa'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setDeleteConfirm({ chatId: canonCid, label: headerForChat });
                        }}
                        disabled={deleteConversationMut.isPending}
                        className="text-red-700 focus:text-red-700 dark:text-red-400 dark:focus:text-red-400"
                      >
                        Apagar conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-[#e9edef] bg-white px-2 py-2 dark:border-[#2a3942] dark:bg-[#202c33]">
          <button
            type="button"
            onClick={() => setProfilePanelOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-[#f7f5f3] dark:hover:bg-white/5"
            title="Meu perfil (WhatsApp e CRM)"
          >
            {whatsappCdnImageProxyUrl(sessionProfilePayload?.profilePictureUrl) ? (
              <img
                src={whatsappCdnImageProxyUrl(sessionProfilePayload?.profilePictureUrl)}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-[15px] font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0]">
                {avatarLetter(crmUser?.name || pickWhatsappSessionProfileDisplayName(sessionProfilePayload?.sessionProfile ?? null) || '?')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                {pickWhatsappSessionProfileDisplayName(sessionProfilePayload?.sessionProfile ?? null) || crmUser?.name || 'Meu perfil'}
              </p>
              <p className="truncate text-[11px] text-[#667781] dark:text-[#8696a0]">
                {crmUser?.email ? `CRM · ${crmUser.email}` : 'Toque para ver dados'}
              </p>
            </div>
          </button>
        </div>

        {qrModalOpen ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl dark:bg-[#202c33]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Conectar WhatsApp</h2>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(false)}
                  className="rounded-lg px-2 py-1 text-[12px] font-medium text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Fechar
                </button>
              </div>

              <p className="mb-3 text-[12px] text-[#667781] dark:text-[#8696a0]">
                Escaneie este QR no WhatsApp do celular em <strong>Aparelhos conectados</strong>.
              </p>
              {!connectionStatus?.connected ? (
                <p className="mb-3 text-[11px] text-[#667781] dark:text-[#8696a0]">
                  O QR atual permanece na tela para leitura. Se nao conectar em ~75s, um novo QR sera solicitado automaticamente.
                </p>
              ) : null}

              <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-[#e9edef] bg-[#f8f9fa] p-3 dark:border-[#2a3942] dark:bg-[#161717]">
                {loadingConnectionQr ? (
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                ) : connectionQr?.base64 ? (
                  <img src={connectionQr.base64} alt="QR code WhatsApp" className="h-64 w-64 rounded-md bg-white p-2" />
                ) : (
                  <div className="space-y-1 text-center">
                    <p className="text-[13px] text-[#111b21] dark:text-[#e9edef]">QR indisponível no momento.</p>
                    <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                      {connectionQr?.message ||
                        (connectionQrError instanceof Error
                          ? connectionQrError.message
                          : 'Tente atualizar ou abra o dashboard para verificar a sessão.')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void refetchConnectionQr()}
                  disabled={fetchingConnectionQr}
                  className="rounded-lg border border-[#00a884] px-3 py-1.5 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  {fetchingConnectionQr ? 'Atualizando…' : 'Atualizar QR'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.open(connectionStatus?.dashboardUrl || FALLBACK_WHATSAPP_PROVIDER_DASHBOARD, '_blank', 'noopener,noreferrer')
                  }
                  className="rounded-lg bg-[#00a884] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#008f6f]"
                >
                  Abrir dashboard
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {archivedPanelOpen ? (
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#161717]">
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <h2 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                Arquivadas
              </h2>
              <button
                type="button"
                onClick={() => setArchivedPanelOpen(false)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Fechar
              </button>
            </div>
            <p className="shrink-0 border-b border-[#e9edef] px-3 py-2 text-[12px] text-[#667781] dark:border-[#2a3942] dark:text-[#8696a0]">
              Conversas que você arquivou no CRM (sincronizado com o provedor). Toque para abrir ou em &quot;Desarquivar&quot; para
              voltar à lista principal.
            </p>
            <div className="wa-scroll min-h-0 flex-1 overflow-y-auto">
              {archivedLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              ) : null}
              {!archivedLoading && archivedChatList.length === 0 ? (
                <p className="p-4 text-center text-[13px] text-[#667781]">Nenhuma conversa arquivada.</p>
              ) : null}
              {!archivedLoading &&
                archivedChatList.map((c) => {
                  const isG = isWhatsappGroupChatId(c.chatId);
                  const w = !isG ? findWhatsappContactInRows(providerContactRows, c.chatId) : undefined;
                  const wg = isG ? findWhatsappGroupInRows(providerGroupRows, c.chatId) : undefined;
                  const { listTitle, headerForChat } = resolveChatPreviewLabels(c, w, wg);
                  return (
                    <div
                      key={c.chatId}
                      className="flex w-full gap-2 border-b border-[#f0f2f5] px-2 py-2 dark:border-[#2a3942]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateChat?.(canonicalWhatsappChatId(c.chatId), headerForChat);
                          setArchivedPanelOpen(false);
                        }}
                        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-white dark:hover:bg-[#202c33]"
                      >
                        <p className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">{listTitle}</p>
                        <p className="mt-0.5 truncate text-[13px] text-[#667781] dark:text-[#8696a0]">
                          {repairUtf8Mojibake(c.lastContent).slice(0, 56)}
                        </p>
                      </button>
                      <button
                        type="button"
                        disabled={unarchiveMut.isPending}
                        onClick={() => unarchiveMut.mutate(c.chatId)}
                        className="shrink-0 self-center rounded-lg border border-[#00a884] px-2 py-1.5 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                      >
                        Desarquivar
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}

        {profilePanelOpen ? (
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#161717]">
            <div className="sticky top-0 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <h2 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Perfil</h2>
              <button
                type="button"
                onClick={() => setProfilePanelOpen(false)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-col items-center px-4 py-6">
              {whatsappCdnImageProxyUrl(sessionProfilePayload?.profilePictureUrl) ? (
                <img
                  src={whatsappCdnImageProxyUrl(sessionProfilePayload?.profilePictureUrl)}
                  alt=""
                  className="h-28 w-28 rounded-full object-cover shadow-md"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#dfe5e7] text-3xl font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0]">
                  {avatarLetter(
                    pickWhatsappSessionProfileDisplayName(sessionProfilePayload?.sessionProfile ?? null) || crmUser?.name || '?'
                  )}
                </div>
              )}
              <p className="mt-4 text-center text-[20px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                {pickWhatsappSessionProfileDisplayName(sessionProfilePayload?.sessionProfile ?? null) || crmUser?.name || '—'}
              </p>
              {sessionProfilePayload?.whatsappId ? (
                <p className="mt-1 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
                  WhatsApp ID:{' '}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">
                    {sessionProfilePayload.whatsappId}
                  </code>
                </p>
              ) : null}
            </div>
            <div className="mx-3 mb-4 space-y-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Conta no CRM (S3E)
              </p>
              {crmUser ? (
                <ul className="space-y-2 text-[14px] text-[#111b21] dark:text-[#e9edef]">
                  <li>
                    <span className="text-[#667781] dark:text-[#8696a0]">Nome: </span>
                    {crmUser.name}
                  </li>
                  <li>
                    <span className="text-[#667781] dark:text-[#8696a0]">E-mail: </span>
                    {crmUser.email}
                  </li>
                  <li>
                    <span className="text-[#667781] dark:text-[#8696a0]">Função: </span>
                    {crmUser.role}
                  </li>
                </ul>
              ) : (
                <p className="text-[13px] text-[#667781]">Não foi possível carregar o usuário do CRM.</p>
              )}
            </div>
            <div className="mx-3 mb-6 space-y-2 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Sessão WhatsApp (provedor)
              </p>
              {connectionStatus?.connected ? (
                <p className="text-[13px] text-[#111b21] dark:text-[#e9edef]">
                  Sessão ativa ({connectionStatus.sessionStatus || 'conectado'}).
                </p>
              ) : (
                <p className="text-[13px] text-amber-800 dark:text-amber-200">
                  WhatsApp desconectado — abra o painel do provedor e escaneie o QR code.
                </p>
              )}
              {sessionProfilePayload?.sessionProfile && Object.keys(sessionProfilePayload.sessionProfile).length > 0 ? (
                <pre className="max-h-40 overflow-auto rounded-lg bg-black/5 p-2 text-[11px] text-[#111b21] dark:bg-white/5 dark:text-[#e9edef]">
                  {JSON.stringify(sessionProfilePayload.sessionProfile, null, 2)}
                </pre>
              ) : (
                <p className="text-[13px] text-[#667781]">
                  Perfil bruto da API não disponível (verifique a versão do provedor / endpoints /me e /profile).
                </p>
              )}
            </div>

            <div className="mx-3 mb-6 space-y-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Editar perfil WhatsApp (Evolution)
              </p>
              <p className="text-[11px] leading-snug text-[#667781] dark:text-[#8696a0]">
                Altera a <strong>conta conectada</strong> na sessão. Requer provedor Evolution (
                <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">WHATSAPP_PROVIDER_KIND=evolution</code>
                ) e sessão ativa.
              </p>
              {!connectionStatus?.connected ? (
                <p className="text-[13px] text-amber-800 dark:text-amber-200">Conecte o WhatsApp para usar estas ações.</p>
              ) : (
                <>
                  <label className="block text-[12px] text-[#667781] dark:text-[#8696a0]">Nome exibido</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={profileWpName}
                      onChange={(e) => setProfileWpName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                      placeholder="Nome no WhatsApp"
                    />
                    <button
                      type="button"
                      disabled={evoProfileNameMut.isPending || !profileWpName.trim()}
                      onClick={() => evoProfileNameMut.mutate(profileWpName)}
                      className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                    >
                      Salvar nome
                    </button>
                  </div>
                  <label className="mt-2 block text-[12px] text-[#667781] dark:text-[#8696a0]">Recado (status)</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={profileWpStatus}
                      onChange={(e) => setProfileWpStatus(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                      placeholder="Texto do recado"
                    />
                    <button
                      type="button"
                      disabled={evoProfileStatusMut.isPending || !profileWpStatus.trim()}
                      onClick={() => evoProfileStatusMut.mutate(profileWpStatus)}
                      className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                    >
                      Salvar recado
                    </button>
                  </div>
                  <label className="mt-2 block text-[12px] text-[#667781] dark:text-[#8696a0]">
                    Nova foto (URL pública ou base64, conforme sua Evolution)
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={profileWpPicture}
                      onChange={(e) => setProfileWpPicture(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                      placeholder="https://... ou data:image/..."
                    />
                    <button
                      type="button"
                      disabled={evoProfilePictureMut.isPending || !profileWpPicture.trim()}
                      onClick={() => evoProfilePictureMut.mutate(profileWpPicture)}
                      className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                    >
                      Atualizar foto
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={evoProfileRemovePictureMut.isPending}
                    onClick={() => evoProfileRemovePictureMut.mutate()}
                    className="rounded-lg border border-red-200 px-3 py-2 text-[12px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    Remover foto de perfil
                  </button>

                  <p className="pt-2 text-[12px] font-medium text-[#111b21] dark:text-[#e9edef]">
                    Consultar perfil de outro número
                  </p>
                  <input
                    value={profileFetchNumber}
                    onChange={(e) => setProfileFetchNumber(e.target.value)}
                    className="w-full rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                    placeholder="5511999999999 ou JID"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        evoFetchContactProfileMut.isPending ||
                        evoFetchBusinessProfileMut.isPending ||
                        !profileFetchNumber.trim()
                      }
                      onClick={() => evoFetchContactProfileMut.mutate(profileFetchNumber)}
                      className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                    >
                      Fetch perfil
                    </button>
                    <button
                      type="button"
                      disabled={
                        evoFetchContactProfileMut.isPending ||
                        evoFetchBusinessProfileMut.isPending ||
                        !profileFetchNumber.trim()
                      }
                      onClick={() => evoFetchBusinessProfileMut.mutate(profileFetchNumber)}
                      className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                    >
                      Fetch business
                    </button>
                  </div>
                  {profileLookupJson ? (
                    <pre className="max-h-36 overflow-auto rounded-lg bg-black/5 p-2 text-[10px] text-[#111b21] dark:bg-white/5 dark:text-[#e9edef]">
                      {profileLookupJson}
                    </pre>
                  ) : null}

                  <p className="pt-2 text-[12px] font-medium text-[#111b21] dark:text-[#e9edef]">Privacidade</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ['readreceipts', 'Confirmações de leitura', ['all', 'none']] as const,
                        ['profile', 'Foto do perfil', ['all', 'contacts', 'contact_blacklist', 'none']] as const,
                        ['status', 'Recado', ['all', 'contacts', 'contact_blacklist', 'none']] as const,
                        ['online', 'Online', ['all', 'match_last_seen']] as const,
                        ['last', 'Visto por último', ['all', 'contacts', 'contact_blacklist', 'none']] as const,
                        ['groupadd', 'Adicionar a grupos', ['all', 'contacts', 'contact_blacklist']] as const,
                      ] as const
                    ).map(([key, label, opts]) => (
                      <label key={key} className="block text-[11px] text-[#667781] dark:text-[#8696a0]">
                        {label}
                        <select
                          value={privacyForm[key as keyof EvolutionPrivacySettingsBody]}
                          onChange={(e) =>
                            setPrivacyForm((p) => ({
                              ...p,
                              [key]: e.target.value as EvolutionPrivacySettingsBody[typeof key],
                            }))
                          }
                          className="mt-0.5 w-full rounded-lg border border-[#d1d7db] bg-white px-2 py-1.5 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                        >
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={evoLoadPrivacyMut.isPending}
                      onClick={() => evoLoadPrivacyMut.mutate()}
                      className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                    >
                      Carregar do WhatsApp
                    </button>
                    <button
                      type="button"
                      disabled={evoSavePrivacyMut.isPending}
                      onClick={() => evoSavePrivacyMut.mutate(privacyForm)}
                      className="rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                    >
                      Salvar privacidade
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {contactPanelOpen ? (
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#161717]">
            <div className="sticky top-0 flex h-12 shrink-0 items-center gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <button
                type="button"
                aria-label="Fechar"
                title="Fechar"
                onClick={() => setContactPanelOpen(false)}
                className="shrink-0 rounded-lg p-2 text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
              >
                <span className="text-xl leading-none" aria-hidden>
                  ✕
                </span>
              </button>
              <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                Dados do contato
              </h2>
              <div className="w-8" aria-hidden />
            </div>

            <div className="flex flex-col items-center px-4 py-6">
              {whatsappProfilePictureImageUrl(
                chatId,
                Boolean(
                  activePreview?.cachedProfilePictureUrl ||
                    activeContactMeta?.profilePictureUrl ||
                    profileUrlByChatId.get(chatId)
                )
              ) ? (
                <img
                  src={
                    whatsappProfilePictureImageUrl(
                      chatId,
                      Boolean(
                        activePreview?.cachedProfilePictureUrl ||
                          activeContactMeta?.profilePictureUrl ||
                          profileUrlByChatId.get(chatId)
                      )
                    )!
                  }
                  alt=""
                  className="h-28 w-28 rounded-full object-cover shadow-md"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#dfe5e7] text-3xl font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0]">
                  {avatarLetter(headerPrimary || formatPhoneForDisplay(chatId))}
                </div>
              )}
              <p className="mt-4 text-center text-[20px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                {headerPrimary || '—'}
              </p>
              <p className="mt-1 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">{formatPhoneForDisplay(chatId)}</p>
            </div>

            <div className="mx-3 mb-4 space-y-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Dados no CRM / cache
              </p>
              <ul className="space-y-2 text-[14px] text-[#111b21] dark:text-[#e9edef]">
                <li>
                  <span className="text-[#667781] dark:text-[#8696a0]">Nome (CRM): </span>
                  {activePreview?.contactName || '—'}
                </li>
                <li>
                  <span className="text-[#667781] dark:text-[#8696a0]">Nome (cache WhatsApp): </span>
                  {activePreview?.providerCachedName || '—'}
                </li>
                <li>
                  <span className="text-[#667781] dark:text-[#8696a0]">Chat ID: </span>
                  <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">{canonicalWhatsappChatId(chatId)}</code>
                </li>
              </ul>
            </div>

            <div className="mx-3 mb-6 space-y-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Evolution API — perfil (contato)
              </p>
              <p className="text-[11px] leading-snug text-[#667781] dark:text-[#8696a0]">
                Usa as rotas do backend: <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">/api/whatsapp/evolution/profile/fetch-contact</code> e{' '}
                <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">/api/whatsapp/evolution/profile/fetch-business</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={evoFetchContactProfileMut.isPending}
                  onClick={async () => {
                    try {
                      const r = await fetchWhatsappProfileFetchTarget(chatId);
                      if (!r.success) {
                        toastWhatsappApiError(r, { titleFallback: 'Não foi possível resolver o JID para buscar o perfil' });
                        return;
                      }
                      const t = r.data?.target?.trim();
                      if (!t) {
                        toast.error('Não foi possível resolver o JID para buscar o perfil');
                        return;
                      }
                      evoFetchContactProfileMut.mutate(t);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Erro ao resolver JID do contato');
                    }
                  }}
                  className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  {evoFetchContactProfileMut.isPending ? 'Buscando…' : 'Buscar perfil'}
                </button>
                <button
                  type="button"
                  disabled={evoFetchBusinessProfileMut.isPending}
                  onClick={async () => {
                    try {
                      const r = await fetchWhatsappProfileFetchTarget(chatId);
                      if (!r.success) {
                        toastWhatsappApiError(r, { titleFallback: 'Não foi possível resolver o JID para buscar o perfil' });
                        return;
                      }
                      const t = r.data?.target?.trim();
                      if (!t) {
                        toast.error('Não foi possível resolver o JID para buscar o perfil');
                        return;
                      }
                      evoFetchBusinessProfileMut.mutate(t);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Erro ao resolver JID do contato');
                    }
                  }}
                  className="rounded-lg border border-[#d1d7db] px-3 py-2 text-[12px] font-medium text-[#54656f] hover:bg-black/5 dark:border-[#2a3942] dark:text-[#8696a0] dark:hover:bg-white/10 disabled:opacity-50"
                >
                  {evoFetchBusinessProfileMut.isPending ? 'Buscando…' : 'Perfil comercial'}
                </button>
              </div>

              {profileLookupJson ? (
                <pre className="max-h-72 overflow-auto rounded-lg bg-black/5 p-2 text-[11px] text-[#111b21] dark:bg-white/5 dark:text-[#e9edef]">
                  {profileLookupJson}
                </pre>
              ) : (
                <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                  Clique em “Buscar perfil” para ver o JSON retornado pela Evolution para este número.
                </p>
              )}
            </div>

            <div className="mx-3 mb-8 space-y-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Mídia, links e docs
              </p>
              {(() => {
                const canon = canonicalWhatsappChatId(chatId);
                const msgs = (queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(chatId)) ?? []).filter(
                  (m) => canonicalWhatsappChatId(m.chatId) === canon
                );
                const media = msgs.filter((m) => Boolean(m.hasMedia || m.mediaUrl || m.mediaType || m.mediaMimetype || m.mimeType || m.fileName || m.mediaFilename));
                const mediaImages = media.filter((m) => mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, m.mediaFilename || m.fileName) === 'image');
                const mediaDocs = media.filter((m) => mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, m.mediaFilename || m.fileName) === 'document');
                const mediaVideos = media.filter((m) => mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, m.mediaFilename || m.fileName) === 'video');
                const mediaAudios = media.filter((m) => mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, m.mediaFilename || m.fileName) === 'audio');

                const urlRe = /\bhttps?:\/\/[^\s<>()]+/gi;
                const urlSet = new Set<string>();
                for (const m of msgs) {
                  const text = String(m.content || '');
                  const found = text.match(urlRe) ?? [];
                  for (const u of found) {
                    const cleaned = u.replace(/[),.;]+$/g, '').trim();
                    if (cleaned.length >= 10) urlSet.add(cleaned);
                  }
                }
                const links = [...urlSet].slice(0, 8);

                const preview = mediaImages.slice(-12);
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-[11px] text-[#667781] dark:text-[#8696a0]">
                      <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{mediaImages.length} mídias</span>
                      <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{links.length} links</span>
                      <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{mediaDocs.length} docs</span>
                      <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{mediaVideos.length} vídeos</span>
                      <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{mediaAudios.length} áudios</span>
                    </div>

                    {preview.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {preview.map((m) => {
                          const fname = repairUtf8Mojibake(m.mediaFilename || m.fileName || 'imagem');
                          const legacy = m.mediaUrl ? whatsappProviderMediaProxyUrl(m.mediaUrl, fname) + tokenQueryString() : null;
                          const byId = m.hasMedia ? whatsappMessageMediaInlineUrl(m.id) : null;
                          const src = byId || legacy;
                          if (!src) return null;
                          return (
                            <a
                              key={m.id}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block aspect-square overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
                              title={fname}
                            >
                              <img src={src} alt={fname} className="h-full w-full object-cover" loading="lazy" />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">Nenhuma mídia encontrada neste chat.</p>
                    )}

                    {links.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[12px] font-semibold text-[#111b21] dark:text-[#e9edef]">Links recentes</p>
                        <ul className="space-y-1 text-[12px]">
                          {links.map((u) => (
                            <li key={u} className="truncate">
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00a884] hover:underline"
                              >
                                {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}

        {groupPanelOpen ? (
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#161717]">
            <div className="sticky top-0 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <h2 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Gerenciar grupo</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                      disabled={refreshGroupInfoMut.isPending}
                      onClick={() => {
                        const cid = canonicalWhatsappChatId(chatId);
                        const now = Date.now();
                        const backoffKey = `wa-group-meta:${cid}`;
                        const backoffRemaining = getBackoffRemainingMs(backoffKey, now);
                        if (backoffRemaining > 0) {
                          toast.message(`Aguarde ${(backoffRemaining / 1000).toFixed(0)}s (rate-limit) para tentar novamente.`);
                          return;
                        }
                        const last = lastGroupMetaFetchAtRef.current.get(cid) ?? 0;
                        const remaining = GROUP_META_COOLDOWN_MS - (now - last);
                        if (remaining > 0) {
                          toast.message(`Aguarde ${(remaining / 1000).toFixed(0)}s para atualizar dados do grupo novamente.`);
                          return;
                        }
                        lastGroupMetaFetchAtRef.current.set(cid, now);
                        refreshGroupInfoMut.mutate();
                      }}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#00a884] hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  {refreshGroupInfoMut.isPending ? 'Atualizando…' : 'Atualizar'}
                </button>
                <button
                  type="button"
                  onClick={() => setGroupPanelOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mx-3 mt-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">Resumo do grupo</p>
              <p className="mt-2 text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                {groupInfo?.subject || headerPrimary || 'Grupo sem nome'}
              </p>
              <p className="mt-0.5 text-[12px] text-[#667781] dark:text-[#8696a0]">
                {groupInfo?.id || canonicalWhatsappChatId(chatId)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#667781] dark:text-[#8696a0]">
                <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                      {(groupMembersQuery.data?.length ?? groupInfo?.participants.length ?? 0)} membros
                </span>
                {typeof groupInfo?.announce === 'boolean' ? (
                  <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                    {groupInfo.announce ? 'Somente admins enviam' : 'Todos enviam'}
                  </span>
                ) : null}
                {typeof groupInfo?.restrict === 'boolean' ? (
                  <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                    {groupInfo.restrict ? 'Restrito' : 'Aberto'}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mx-3 mt-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">Nome, descrição e foto</p>

              <label className="mt-2 block text-[12px] text-[#667781] dark:text-[#8696a0]">Nome do grupo</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={groupSubjectDraft}
                  onChange={(e) => setGroupSubjectDraft(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  placeholder="Nome visível no WhatsApp"
                />
                <button
                  type="button"
                  disabled={evoGroupSubjectMut.isPending || !groupSubjectDraft.trim()}
                  onClick={() => evoGroupSubjectMut.mutate()}
                  className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Salvar nome
                </button>
              </div>

              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">Descrição</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={groupDescriptionDraft}
                  onChange={(e) => setGroupDescriptionDraft(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  placeholder="Descrição do grupo"
                />
                <button
                  type="button"
                  disabled={evoGroupDescriptionMut.isPending || !groupDescriptionDraft.trim()}
                  onClick={() => evoGroupDescriptionMut.mutate()}
                  className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Salvar descrição
                </button>
              </div>

              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">Foto do grupo (URL)</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={groupPictureDraft}
                  onChange={(e) => setGroupPictureDraft(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  placeholder="https://... (imagem pública)"
                />
                <button
                  type="button"
                  disabled={evoGroupPictureMut.isPending || !groupPictureDraft.trim()}
                  onClick={() => evoGroupPictureMut.mutate()}
                  className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Atualizar foto
                </button>
              </div>
            </div>

            <div className="mx-3 mt-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">Convite do grupo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={evoGroupInviteCodeMut.isPending}
                  onClick={() => evoGroupInviteCodeMut.mutate()}
                  className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  Buscar link de convite
                </button>
                <button
                  type="button"
                  disabled={evoGroupRevokeInviteMut.isPending}
                  onClick={() => evoGroupRevokeInviteMut.mutate()}
                  className="rounded-lg border border-amber-200 px-3 py-2 text-[12px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  Revogar link
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={groupInviteUrl}
                  onChange={(e) => setGroupInviteUrl(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  placeholder="URL de convite"
                />
                <button
                  type="button"
                  disabled={!groupInviteUrl}
                  onClick={async () => {
                    if (!groupInviteUrl) return;
                    try {
                      await navigator.clipboard.writeText(groupInviteUrl);
                      toast.success('Link copiado');
                    } catch {
                      toast.error('Não foi possível copiar o link');
                    }
                  }}
                  className="shrink-0 rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  Copiar link
                </button>
              </div>
              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">Mensagem do convite</label>
              <input
                value={groupInviteDescription}
                onChange={(e) => setGroupInviteDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                placeholder="Ex.: Entre no nosso grupo de atendimento"
              />
              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">Números (um por linha ou separados por vírgula)</label>
              <textarea
                value={groupInviteNumbers}
                onChange={(e) => setGroupInviteNumbers(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                placeholder={'5511999999999\n5511888888888'}
              />
              <button
                type="button"
                disabled={evoGroupSendInviteMut.isPending || !groupInviteNumbers.trim()}
                onClick={() => evoGroupSendInviteMut.mutate()}
                className="mt-2 rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
              >
                Enviar convite para números
              </button>
            </div>

            <div className="mx-3 my-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">Membros</p>
              <p className="mt-1 text-[11px] text-[#667781] dark:text-[#8696a0]">
                Para adicionar/remover/promover/rebaixar, informe números com DDI (ex.: 5511999999999).
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={groupMembersQuery.isFetching}
                  onClick={async () => {
                    const cid = canonicalWhatsappChatId(chatId);
                    const now = Date.now();
                    const backoffKey = `wa-group-members:${cid}`;
                    const backoffRemaining = getBackoffRemainingMs(backoffKey, now);
                    if (backoffRemaining > 0) {
                      toast.message(`Aguarde ${(backoffRemaining / 1000).toFixed(0)}s (rate-limit) para buscar membros novamente.`);
                      return;
                    }
                    const last = lastGroupMembersFetchAtRef.current.get(cid) ?? 0;
                    const remaining = GROUP_MEMBERS_COOLDOWN_MS - (now - last);
                    if (remaining > 0) {
                      toast.message(`Aguarde ${(remaining / 1000).toFixed(0)}s para buscar membros novamente.`);
                      return;
                    }
                    lastGroupMembersFetchAtRef.current.set(cid, now);
                    const r = await groupMembersQuery.refetch();
                    if (r.error) {
                      const low = String((r.error as any)?.message || r.error).toLowerCase();
                      if (low.includes('rate-overlimit') || low.includes('429') || low.includes('too many')) {
                        const { waitMs } = registerRateLimitBackoff(backoffKey, {
                          baseMs: GROUP_BACKOFF_BASE_MS,
                          maxMs: GROUP_BACKOFF_MAX_MS,
                          now,
                        });
                        toast.message(`Limite do WhatsApp atingido. Tente novamente após ${(waitMs / 1000).toFixed(0)}s.`);
                      }
                    } else {
                      registerBackoffSuccess(backoffKey);
                    }
                  }}
                  className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  {groupMembersQuery.isFetching ? 'Buscando…' : 'Buscar membros'}
                </button>
                <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                  (somente quando necessário — evita rate-limit)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={groupMembersAction}
                  onChange={(e) => setGroupMembersAction(e.target.value as 'add' | 'remove' | 'promote' | 'demote')}
                  className="rounded-lg border border-[#d1d7db] bg-white px-2 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                >
                  <option value="add">Adicionar</option>
                  <option value="remove">Remover</option>
                  <option value="promote">Promover admin</option>
                  <option value="demote">Remover admin</option>
                </select>
                <button
                  type="button"
                  disabled={evoGroupUpdateMembersMut.isPending || !groupMembersDraft.trim()}
                  onClick={() => evoGroupUpdateMembersMut.mutate()}
                  className="rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Aplicar ação
                </button>
              </div>
              <textarea
                value={groupMembersDraft}
                onChange={(e) => setGroupMembersDraft(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                placeholder={'5511999999999\n5511888888888'}
              />
              <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-[#e9edef] dark:border-[#2a3942]">
                {(groupMembersQuery.data?.length ?? groupInfo?.participants.length ?? 0) > 0 ? (
                  (groupMembersQuery.data?.length ? groupMembersQuery.data : groupInfo?.participants || []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-[#f0f2f5] px-3 py-2 text-[12px] last:border-b-0 dark:border-[#2a3942]"
                    >
                      <span className="truncate text-[#111b21] dark:text-[#e9edef]">{formatPhoneForDisplay(p.id)}</span>
                      <span className="ml-2 shrink-0 text-[#667781] dark:text-[#8696a0]">{p.admin || 'membro'}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-[12px] text-[#667781] dark:text-[#8696a0]">Sem membros carregados.</p>
                )}
              </div>
            </div>

            <div className="mx-3 mb-3 rounded-xl border border-[#e9edef] bg-white p-4 dark:border-[#2a3942] dark:bg-[#202c33]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                Configurações avançadas
              </p>
              <p className="mt-1 text-[11px] text-[#667781] dark:text-[#8696a0]">
                Controle de envio/edição no grupo, mensagens temporárias e saída do grupo.
              </p>

              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">Update setting</label>
              <div className="mt-1 flex flex-wrap gap-2">
                <select
                  value={groupSettingAction}
                  onChange={(e) =>
                    setGroupSettingAction(
                      e.target.value as 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
                    )
                  }
                  className="rounded-lg border border-[#d1d7db] bg-white px-2 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                >
                  <option value="announcement">announcement (somente admins enviam)</option>
                  <option value="not_announcement">not_announcement (todos enviam)</option>
                  <option value="locked">locked (somente admins editam configs)</option>
                  <option value="unlocked">unlocked (todos editam configs)</option>
                </select>
                <button
                  type="button"
                  disabled={evoGroupUpdateSettingMut.isPending}
                  onClick={() => evoGroupUpdateSettingMut.mutate()}
                  className="rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Aplicar setting
                </button>
              </div>

              <label className="mt-3 block text-[12px] text-[#667781] dark:text-[#8696a0]">
                Toggle ephemeral (expiração em segundos)
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  value={groupEphemeralExpiration}
                  onChange={(e) => setGroupEphemeralExpiration(e.target.value)}
                  className="w-[200px] rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[12px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  placeholder="Ex.: 0, 86400, 604800"
                />
                <button
                  type="button"
                  disabled={evoGroupToggleEphemeralMut.isPending || !groupEphemeralExpiration.trim()}
                  onClick={() => evoGroupToggleEphemeralMut.mutate()}
                  className="rounded-lg bg-[#00a884] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  Atualizar temporárias
                </button>
              </div>

              <div className="mt-4 border-t border-[#e9edef] pt-3 dark:border-[#2a3942]">
                <button
                  type="button"
                  disabled={evoGroupLeaveMut.isPending}
                  onClick={() => {
                    if (!window.confirm('Deseja realmente sair deste grupo no WhatsApp?')) return;
                    evoGroupLeaveMut.mutate();
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-[12px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Sair do grupo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {contactsPanelOpen ? (
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#161717]">
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <h2 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                Agenda de contatos
              </h2>
              <button
                type="button"
                onClick={() => setContactsPanelOpen(false)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Fechar
              </button>
            </div>
            <p className="shrink-0 border-b border-[#e9edef] px-3 py-2 text-[11px] leading-snug text-[#667781] dark:border-[#2a3942] dark:text-[#8696a0]">
              Lista completa via backend (<code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">GET …/whatsapp/provider-contacts</code>
              ) e busca por nome/número em{' '}
              <code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">GET …/whatsapp/provider-contacts/search</code>.
              Os nomes no CRM continuam vindo das mensagens e do cache; aqui são os contatos salvos no aparelho (Evolution/WAHA).
              No motor NOWEB mantenha a <strong>Store</strong> ativa. Para número novo no Brasil, use a verificação abaixo.
            </p>
            <div className="shrink-0 space-y-2 border-b border-[#e9edef] px-3 py-2 dark:border-[#2a3942]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={agendaDisplayedLoading}
                  onClick={async () => {
                    setContactsPanelForceRefresh(true);
                    try {
                      if (debouncedAgendaSearch.length >= WHATSAPP_AGENDA_SEARCH_MIN_CHARS) {
                        await refetchAgendaSearch();
                      } else {
                        await refetchContactsPanel();
                      }
                    } finally {
                      setContactsPanelForceRefresh(false);
                    }
                  }}
                  className="rounded-lg bg-[#00a884] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  {agendaDisplayedLoading ? 'Carregando…' : 'Atualizar lista'}
                </button>
                <label className="flex items-center gap-1 text-[12px] text-[#667781]">
                  Ordenar
                  <select
                    value={`${contactsSortBy}-${contactsSortOrder}`}
                    onChange={(e) => {
                      const [sb, so] = e.target.value.split('-') as ['name' | 'id', 'asc' | 'desc'];
                      setContactsSortBy(sb);
                      setContactsSortOrder(so);
                    }}
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1 text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  >
                    <option value="name-asc">Nome A–Z</option>
                    <option value="name-desc">Nome Z–A</option>
                    <option value="id-asc">ID crescente</option>
                    <option value="id-desc">ID decrescente</option>
                  </select>
                </label>
              </div>
              <input
                type="search"
                value={contactsAgendaSearchInput}
                onChange={(e) => setContactsAgendaSearchInput(e.target.value)}
                placeholder={`Buscar na agenda (mín. ${WHATSAPP_AGENDA_SEARCH_MIN_CHARS} letras ou 2+ dígitos no número) — vazio lista todos`}
                className="w-full rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={checkPhoneDraft}
                  onChange={(e) => {
                    setCheckPhoneDraft(e.target.value);
                    setCheckPhoneResult(null);
                  }}
                  placeholder="Verificar número (DDI+DDD+nº, ex. 5511999999999)"
                  className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                />
                <button
                  type="button"
                  disabled={checkPhoneMut.isPending || !checkPhoneDraft.replace(/\D/g, '').length}
                  onClick={() => checkPhoneMut.mutate(checkPhoneDraft)}
                  className="shrink-0 rounded-lg border border-[#00a884] px-3 py-2 text-[13px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  Verificar no WhatsApp
                </button>
              </div>
              {checkPhoneResult ? (
                <div className="rounded-lg bg-white px-3 py-2 text-[13px] dark:bg-[#202c33]">
                  {checkPhoneResult.numberExists && checkPhoneResult.chatId ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[#111b21] dark:text-[#e9edef]">
                        Cadastrado: <code className="text-[12px]">{checkPhoneResult.chatId}</code>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const jid = canonicalWhatsappChatId(checkPhoneResult.chatId!);
                          onNavigateChat?.(jid, formatPhoneForDisplay(jid));
                          setContactsPanelOpen(false);
                        }}
                        className="rounded-lg bg-[#00a884] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#008f6f]"
                      >
                        Abrir conversa
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#667781]">Número não encontrado no WhatsApp.</span>
                  )}
                </div>
              ) : null}
            </div>
            <div className="wa-scroll min-h-0 flex-1 overflow-y-auto">
              {agendaDisplayedLoading && !agendaDisplayedRowsSorted.length ? (
                <div className="flex justify-center py-12">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              ) : null}
              {!agendaDisplayedLoading && agendaDisplayedRowsSorted.length === 0 ? (
                <p className="p-4 text-center text-[13px] text-[#667781]">
                  {useAgendaServerSearch
                    ? 'Nenhum contato encontrado para essa busca.'
                    : agendaListFull.length === 0
                      ? 'Nenhum contato retornado pelo provedor (confira sessão, motor e Store).'
                      : 'Nenhum resultado.'}
                </p>
              ) : null}
              {agendaDisplayedRowsSorted.map((row) => {
                const primary = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id);
                const rowIdLabel = String(row.id || '').toLowerCase().endsWith('@lid') ? '' : (row.id !== primary ? row.id : '');
                const sub = [row.pushname, rowIdLabel, row.number].filter(Boolean).join(' · ');
                const waDigits = agendaContactWhatsappDigits(row);
                const waLine =
                  waDigits.length >= 10
                    ? formatPhoneForDisplay(`${waDigits.replace(/^\+/, '')}@c.us`)
                    : row.number?.trim() || (String(row.id || '').toLowerCase().endsWith('@lid') ? 'ID interno (sem número na agenda)' : row.id);
                const rowPic = contactPicByContactId.get(row.id) ?? null;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={async () => {
                      const title = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id);
                      if (waDigits.length >= 10) {
                        try {
                          const r = await fetchWhatsappResolveOpenChat(waDigits);
                          if (r.success && r.data?.chatId) {
                            onNavigateChat?.(canonicalWhatsappChatId(r.data.chatId), title);
                            setContactsPanelOpen(false);
                            if (!r.data.numberExists) {
                              toast.message('Conversa aberta pelo número cadastrado.', {
                                description: 'Se não enviar mensagem, confira o chip no aparelho.',
                              });
                            }
                            return;
                          }
                        } catch {
                          // fallback abaixo
                        }
                      }
                      const source = waDigits.length >= 10 ? toWhatsappChatId(waDigits) : row.id;
                      const jid = canonicalWhatsappChatId(source);
                      onNavigateChat?.(jid, title);
                      setContactsPanelOpen(false);
                    }}
                    className="flex w-full gap-3 border-b border-[#e9edef] px-3 py-2.5 text-left transition-colors hover:bg-white dark:border-[#2a3942] dark:hover:bg-[#202c33]"
                  >
                    <ContactAvatar
                      chatId={canonicalWhatsappChatId(row.id)}
                      imageUrl={rowPic}
                      label={primary}
                      size="list"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">{primary}</span>
                        {row.isGroup ? (
                          <span className="shrink-0 rounded bg-[#8696a0]/20 px-1.5 py-0.5 text-[10px] text-[#54656f] dark:text-[#8696a0]">
                            Grupo
                          </span>
                        ) : null}
                        {row.isBlocked ? (
                          <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-700 dark:text-red-400">
                            Bloqueado
                          </span>
                        ) : null}
                        {row.isMe ? (
                          <span className="shrink-0 text-[10px] text-[#667781]">(eu)</span>
                        ) : null}
                      </div>
                      {sub ? (
                        <span className="truncate text-[12px] text-[#667781] dark:text-[#8696a0]">{sub}</span>
                      ) : null}
                      <span className="truncate font-mono text-[12px] text-[#00a884] dark:text-[#25d366]" title="Usado para abrir a conversa e enviar mensagem">
                        WhatsApp: {waLine}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <NovaConversaDrawer
          open={newPhoneComposerOpen}
          onClose={() => setNewPhoneComposerOpen(false)}
          onOpenChat={(cid, label) => {
            onNavigateChat?.(canonicalWhatsappChatId(cid), label);
          }}
          onContatoSalvo={() => {
            // invalida a lista da página de Contatos S3E (se aberta em outra aba/tela)
            queryClient.invalidateQueries({ queryKey: ['contatos-s3e'] });
          }}
          variant="panel-overlay"
        />
        <WhatsAppChatLabelEditDrawer
          open={labelEditOpen}
          onClose={() => setLabelEditOpen(false)}
          initialLabel={labelEditTarget}
          currentUserId={crmUser?.id ?? null}
          isCrmAdmin={crmIsAdmin}
          onSaved={(label) => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-chat-labels'] });
            // Se a lista atual foi deletada, volta para "Tudo".
            if (
              chatSidebarFilter === `label:${label.id}` &&
              (label as { id: string }).id === '__deleted__'
            ) {
              setChatSidebarFilter('all');
            }
          }}
          resolveChatTitle={(cid) =>
            chatTitleByIdMemo.get(canonicalWhatsappChatId(cid)) || formatPhoneForDisplay(cid)
          }
          onPickChats={(currentChatIds) =>
            new Promise<string[] | null>((resolve) => {
              labelPickChatsResolverRef.current = resolve;
              setLabelPickInitialIds(currentChatIds);
              setLabelPickChatsOpen(true);
            })
          }
        />
        <WhatsAppChatLabelPickChatsDrawer
          open={labelPickChatsOpen}
          onClose={() => {
            labelPickChatsResolverRef.current?.(null);
            labelPickChatsResolverRef.current = null;
            setLabelPickChatsOpen(false);
          }}
          initialSelected={labelPickInitialIds}
          availableChats={selectableChatsForLabel}
          onConfirm={(ids) => {
            labelPickChatsResolverRef.current?.(ids);
            labelPickChatsResolverRef.current = null;
            setLabelPickChatsOpen(false);
          }}
        />

        {layout === 'full' ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar barra de conversas (arraste)"
            title="Arraste para alargar a barra de conversas (duplo clique restaura)"
            onPointerDown={handleAsideResizeStart}
            onPointerMove={handleAsideResizeMove}
            onPointerUp={handleAsideResizeEnd}
            onPointerCancel={handleAsideResizeEnd}
            onDoubleClick={() => setAsideWidth(WA_ASIDE_MIN_WIDTH)}
            className={`group absolute -right-[3px] top-0 z-30 hidden h-full w-1.5 cursor-col-resize select-none touch-none min-[780px]:block ${
              isResizingAside ? 'bg-[#00a884]/30' : 'hover:bg-[#00a884]/20'
            }`}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
                isResizingAside ? 'bg-[#00a884]' : 'bg-transparent group-hover:bg-[#00a884]/70'
              }`}
            />
          </div>
        ) : null}
      </aside>

      {/* Coluna direita — conversa ativa */}
      <div className={chatColumnClass}>
        {!chatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#efeae2] px-6 text-center dark:bg-[#161717]">
            <div className="text-5xl opacity-40" aria-hidden>
              💬
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-[#667781] dark:text-[#8696a0]">
              Selecione uma conversa à esquerda ou abra um lead pelo{' '}
              <span className="font-medium text-[#111b21] dark:text-[#e9edef]">Funil de Atendimento</span>.
            </p>
          </div>
        ) : (
          <>
            <header className="flex h-[60px] shrink-0 items-center gap-1 border-b border-[#e9edef] bg-white px-2 min-[780px]:gap-2 min-[780px]:px-3 dark:border-[#2a3942] dark:bg-[#161717]">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 min-[780px]:hidden dark:text-[#8696a0] dark:hover:bg-white/5"
                  aria-label="Voltar para conversas"
                  title="Voltar"
                >
                  <ArrowLeft className="h-6 w-6" strokeWidth={2} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!chatId) return;
                  if (activeIsGroup) setGroupPanelOpen(true);
                  else setContactPanelOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
                title={activeIsGroup ? 'Ver dados do grupo' : 'Ver dados do contato'}
              >
                <ContactAvatar
                  chatId={chatId}
                  imageUrl={
                    activePreview?.cachedProfilePictureUrl ||
                    activeContactMeta?.profilePictureUrl ||
                    profileUrlByChatId.get(chatId) ||
                    null
                  }
                  label={
                    activePreview?.contactName ||
                    whatsappGroupDisplayName(activeContactMeta?.group ?? undefined) ||
                    whatsappContactDisplayName(activeContactMeta?.contact ?? undefined) ||
                    title ||
                    formatPhoneForDisplay(chatId)
                  }
                  size="header"
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">{headerPrimary}</p>
                  <p className="truncate text-[13px] text-[#667781] dark:text-[#8696a0]">
                    {peerTyping ? (
                      <span className="font-medium italic text-[#00a884]">
                        {isWhatsappGroupChatId(chatId) ? 'alguém está digitando…' : 'digitando…'}
                      </span>
                    ) : (
                      headerSecondary
                    )}
                  </p>
                </div>
              </button>
              <div className="min-w-0 flex-1" />
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={chatMenuOpen}
                  aria-haspopup="menu"
                  title="Mais opções"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatMenuOpen((o) => !o);
                  }}
                  className="rounded-full p-2 text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    ⋮
                  </span>
                </button>
                {chatMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-[#e9edef] bg-white py-1 shadow-lg dark:border-[#2a3942] dark:bg-[#202c33]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={archiveConversationMut.isPending}
                      className="block w-full px-4 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveConversationMut.mutate();
                      }}
                    >
                      Arquivar conversa
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={markUnreadMut.isPending}
                      className="block w-full px-4 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        markUnreadMut.mutate();
                      }}
                    >
                      Marcar como não lida
                    </button>
                    {activeIsGroup ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-4 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatMenuOpen(false);
                          setGroupPanelOpen(true);
                        }}
                      >
                        Gerenciar grupo
                      </button>
                    ) : null}
                    {!activeIsGroup ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-4 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatMenuOpen(false);
                          setActionsPanelOpen(true);
                        }}
                      >
                        Ações
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={deleteConversationMut.isPending}
                      className="block w-full px-4 py-2.5 text-left text-[14px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMenuOpen(false);
                        setDeleteConfirm({
                          chatId: canonicalWhatsappChatId(chatId),
                          label: headerPrimary || formatPhoneForDisplay(chatId) || chatId,
                        });
                      }}
                    >
                      Apagar conversa
                    </button>
                  </div>
                ) : null}
              </div>
              {onEditLead && !isWhatsappGroupChatId(chatId) && (
                <button
                  type="button"
                  onClick={onEditLead}
                  className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
                >
                  Editar lead
                </button>
              )}
              {!isWhatsappGroupChatId(chatId) && (
                <button
                  type="button"
                  onClick={() => setActionsPanelOpen(true)}
                  className="rounded-full bg-[#d9fdd3] px-3 py-1.5 text-[13px] font-semibold text-[#075e54] hover:bg-[#c9f7c0] dark:bg-[#1f3d34] dark:text-[#5ee8a2] dark:hover:bg-[#23493e]"
                >
                  AÇÕES
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="hidden rounded-full p-2 text-[#54656f] hover:bg-black/5 min-[780px]:inline-flex dark:text-[#8696a0] dark:hover:bg-white/5"
                  aria-label="Fechar painel"
                >
                  <span className="text-lg leading-none">✕</span>
                </button>
              )}
            </header>

            <div
              className="relative flex min-h-0 flex-1 flex-col"
              onDragOverCapture={handleChatFileDragOverCapture}
              onDragEnter={handleChatFileDragEnter}
              onDragLeave={handleChatFileDragLeave}
              onDrop={handleChatFileDrop}
              onPasteCapture={handleChatFilePaste}
            >
            <WhatsAppActionsDrawer
              open={actionsPanelOpen}
              onClose={() => setActionsPanelOpen(false)}
              chatLabel={headerPrimary || title || ''}
              chatPhone={formatPhoneForDisplay(chatId)}
              context={actionsContextSnapshot || actionsContextQuery.data || null}
              loading={actionsContextQuery.isLoading || actionsContextQuery.isFetching}
              modeSaving={updateStatusModeMut.isPending}
              linkLoading={linkClienteMut.isPending}
              unlinkLoading={unlinkClienteMut.isPending}
              sendingOrcamentoId={sendingOrcamentoId}
              clienteSearch={actionsClienteSearch}
              onClienteSearchChange={setActionsClienteSearch}
              clientes={actionsClientesQuery.data || []}
              clientesLoading={actionsClientesQuery.isLoading || actionsClientesQuery.isFetching}
              onRefresh={() => {
                void actionsContextQuery.refetch();
              }}
              onLinkCliente={(clienteId) => {
                if (!chatId || !clienteId) return;
                linkClienteMut.mutate(clienteId);
              }}
              onUnlinkCliente={() => {
                if (!chatId) return;
                if (!window.confirm('Desvincular este contato do cliente?')) return;
                unlinkClienteMut.mutate();
              }}
              onSendOrcamentoPdf={(params) => {
                if (!chatId || !params?.orcamentoId) return;
                const optimisticId = `optimistic-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                sendOrcamentoPdfMut.mutate({ ...params, optimisticId });
              }}
              onChangeMode={(mode) => {
                updateStatusModeMut.mutate(mode);
              }}
            />

            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 bg-[#efeae2] dark:hidden"
                style={chatWallpaperLayerStyle(CHAT_BG_TILE_LIGHT, '#efeae2')}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 hidden bg-[#161717] dark:block"
                style={chatWallpaperLayerStyle(CHAT_BG_TILE_DARK, '#161717')}
              />
              <div className="wa-scroll relative z-[1] min-h-0 flex-1 overflow-y-auto bg-transparent py-2">
              {loadingMsgs && (
                <div className="flex justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              )}
              {!loadingMsgs &&
                displayMessages.map((m, idx) => {
                  const prev = idx > 0 ? displayMessages[idx - 1] : null;
                  const showDateHeader = idx === 0 || (prev ? !isSameChatDay(m.timestamp, prev.timestamp) : true);
                  return (
                  <div
                    key={m.id}
                    className={`group flex w-full flex-col py-0.5 ${m.fromMe ? 'items-end' : 'items-start'}`}
                  >
                    {showDateHeader ? (
                      <div className="pointer-events-none sticky top-3 z-[12] my-2 flex w-full justify-center">
                        <span className="pointer-events-auto rounded-full bg-[#1f2c33]/70 px-3 py-1 text-[11px] font-medium text-[#e9edef] shadow-sm backdrop-blur-sm">
                          {formatChatDate(m.timestamp)}
                        </span>
                      </div>
                    ) : null}
                    {editingId === m.id ? (
                      <div
                        className="flex w-full max-w-[min(78%,720px)] flex-col gap-2 rounded-lg border border-[#00a884] bg-white p-3 shadow-sm dark:border-[#00a884] dark:bg-[#202c33] sm:max-w-[min(65%,420px)]"
                      >
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={4}
                          className="w-full resize-y rounded border border-[#d1d7db] bg-white px-2 py-2 text-[14px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditMessage}
                            className="rounded-lg px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 dark:text-[#8696a0]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={editMessageMut.isPending || !editDraft.trim()}
                            onClick={() =>
                              editingId &&
                              editMessageMut.mutate({ messageId: editingId, text: editDraft.trim() })
                            }
                            className="rounded-lg bg-[#00a884] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex w-full items-stretch ${
                            isInForwardSelectionMode ? 'cursor-pointer select-none' : ''
                          } ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                          onClick={() => {
                            if (!isInForwardSelectionMode) return;
                            toggleForwardSelectedMessage(m.id);
                          }}
                          role={isInForwardSelectionMode ? 'button' : undefined}
                          aria-pressed={isInForwardSelectionMode ? selectedMessageIds.has(m.id) : undefined}
                        >
                          {isInForwardSelectionMode ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleForwardSelectedMessage(m.id);
                              }}
                              className="ml-3 mr-1 flex h-[38px] w-[38px] items-center justify-center rounded-full text-[#54656f] hover:bg-black/10 dark:text-[#a9b4ba] dark:hover:bg-white/10"
                              aria-label={selectedMessageIds.has(m.id) ? 'Desmarcar mensagem' : 'Marcar mensagem'}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded border ${
                                  selectedMessageIds.has(m.id)
                                    ? 'border-[#00a884] bg-[#00a884] text-white'
                                    : 'border-[#cbd5da] bg-transparent text-transparent dark:border-[#2a3942]'
                                }`}
                              >
                                <CheckIcon className="h-4 w-4" />
                              </span>
                            </button>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <MessageBubble
                              m={m}
                              layout={layout}
                              showGroupParticipant={activeIsGroup}
                              groupParticipantLabel={activeIsGroup ? resolveGroupParticipantLabel(m.participant) : null}
                              onDeleteMessage={handleDeleteMessage}
                      onDeleteForMe={(messageId) => {
                        if (deleteForMeMut.isPending) return;
                        deleteForMeMut.mutate(messageId);
                      }}
                              onStartForwardSelection={(messageId) => startForwardSelectionMode(messageId)}
                      onReplyToMessage={(msg) => {
                        setReplyToMessage(msg);
                      }}
                      onEditMessage={startEditMessage}
                      onReactToMessage={(msg, emoji) => {
                        void reactToMessage(msg, emoji);
                      }}
                      onToggleFavoriteMessage={toggleFavoriteMessage}
                      isFavoriteMessage={isFavoriteMessage}
                              onImageClick={(url) => setSelectedImageUrl(url)}
                              onNavigateWhatsappChat={(jid, label) => onNavigateChat?.(jid, label)}
                              onOpenPhoneFromText={handleOpenPhoneFromText}
                              actionsDisabled={isInForwardSelectionMode}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
                })}
              <div ref={bottomRef} />
              </div>
            </div>

            {!isInForwardSelectionMode && pendingMediaList.length > 0 ? (
              <div className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <p className="text-[12px] font-medium text-[#667781] dark:text-[#8696a0]">
                  {pendingMediaList.length === 1
                    ? '1 arquivo para enviar'
                    : `${pendingMediaList.length} arquivos para enviar (fila com concorrência limitada)`}
                </p>
                <div className="max-h-[min(40vh,280px)] overflow-y-auto rounded-lg border border-[#d1d7db] bg-white/80 p-2 dark:border-[#2a3942] dark:bg-[#161717]/60">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {pendingMediaList.map((pm) => {
                      const label =
                        pm.mediaType === 'image'
                          ? 'Imagem'
                          : pm.mediaType === 'voice'
                            ? 'Áudio'
                            : pm.mediaType === 'video'
                              ? 'Vídeo'
                              : 'Documento';
                      const sizeKb = pm.file.size / 1024;
                      const sizeStr =
                        sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(0)} KB`;
                      const displayName = repairUtf8Mojibake(pm.file.name);
                      return (
                        <div
                          key={pm.id}
                          className="group relative flex flex-col gap-1 rounded-md border border-[#e9edef] bg-[#f8f9fa] p-1.5 dark:border-[#2a3942] dark:bg-[#202c33]"
                        >
                          <button
                            type="button"
                            disabled={sendMediaMut.isPending}
                            onClick={() => removePendingMediaById(pm.id)}
                            className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[11px] text-white opacity-90 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Remover ${displayName}`}
                            title="Remover da fila"
                          >
                            ✕
                          </button>
                          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-[#dfe5e7] dark:bg-[#2a3942]">
                            {pm.previewUrl ? (
                              <img
                                src={pm.previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">
                                {pm.mediaType === 'voice' ? '🎤' : pm.mediaType === 'video' ? '🎥' : '📎'}
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 px-0.5 text-[11px] font-medium leading-tight text-[#111b21] dark:text-[#e9edef]">
                            {displayName}
                          </p>
                          <p className="px-0.5 text-[10px] text-[#667781] dark:text-[#8696a0]">
                            {sizeStr} · {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMedia();
                    }
                  }}
                  placeholder="Legenda (opcional; aplicada ao primeiro arquivo da fila)"
                  className="w-full rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] placeholder:text-[#8696a0] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={sendMediaMut.isPending}
                    onClick={cancelMedia}
                    className="rounded-lg px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 disabled:opacity-50 dark:text-[#8696a0]"
                  >
                    Cancelar tudo
                  </button>
                  <button
                    type="button"
                    disabled={sendMediaMut.isPending}
                    onClick={handleSendMedia}
                    className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                  >
                    {sendMediaMut.isPending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <SendPlaneIcon className="h-4 w-4" />
                    )}
                    Enviar
                  </button>
                </div>
              </div>
            ) : null}

            {!isInForwardSelectionMode && pendingRecordedAudio && !isRecordingAudio ? (
              <div className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0]">
                    <Mic className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                      Pré-escuta de áudio
                    </p>
                    <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                      {formatRecordingElapsed(pendingRecordedAudio.elapsedSec)} · {(pendingRecordedAudio.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <audio
                  ref={previewAudioRef}
                  controls
                  preload="metadata"
                  src={pendingRecordedAudio.url}
                  className="w-full"
                  onPlay={() => setIsPreviewPlaying(true)}
                  onPause={() => setIsPreviewPlaying(false)}
                  onEnded={() => {
                    setIsPreviewPlaying(false);
                    setPreviewProgress(1);
                  }}
                  onTimeUpdate={syncPreviewAudioProgress}
                  onLoadedMetadata={syncPreviewAudioProgress}
                />
                <div className="space-y-1">
                  <VoiceWaveformPreview
                    progress={previewProgress}
                    playing={isPreviewPlaying}
                    bars={pendingRecordedAudio.waveformBars}
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#667781] dark:text-[#8696a0]">
                    <span>{formatRecordingElapsed(Math.floor(previewCurrentSec))}</span>
                    <span>{formatRecordingElapsed(Math.floor(previewDurationSec || pendingRecordedAudio.elapsedSec))}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={discardRecordedAudio}
                    className="rounded-lg px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 dark:text-[#8696a0]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={sendAudioMut.isPending}
                    onClick={confirmSendRecordedAudio}
                    className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                  >
                    {sendAudioMut.isPending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <SendPlaneIcon className="h-4 w-4" />
                    )}
                    Enviar áudio
                  </button>
                </div>
              </div>
            ) : null}

            {isInForwardSelectionMode ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exitForwardSelectionMode}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/10"
                    aria-label="Cancelar seleção"
                    title="Cancelar"
                  >
                    <CloseXIcon className="h-5 w-5" />
                  </button>
                  <p className="text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">
                    {selectedMessageIds.size} selecionada(s)
                  </p>
                </div>
                <button
                  type="button"
                  disabled={selectedMessageIds.size <= 0}
                  onClick={() => {
                    setForwardModalOpen(true);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm transition enabled:hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:bg-[#8696a0]/40 disabled:text-white/70 dark:disabled:bg-[#2a3942]"
                  aria-label="Encaminhar mensagens selecionadas"
                  title="Encaminhar"
                >
                  <ForwardIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <footer className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef]/90 bg-[#f0f2f5] px-2 py-2 max-[779px]:pb-[max(0.5rem,env(safe-area-inset-bottom))] min-[780px]:px-3 dark:border-[#2a3942]/50 dark:bg-[#161717]">
                {(sendMediaMut.isPending && !pendingMediaList.length) || batchUploadProgress ? (
                  <div
                    className="flex items-center gap-2 rounded-lg border border-[#00a884]/30 bg-[#00a884]/10 px-3 py-2 text-[13px] font-medium text-[#075e54] dark:border-[#00a884]/40 dark:bg-[#00a884]/15 dark:text-[#5ee8a2]"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                    {batchUploadProgress && batchUploadProgress.total > 1 ? (
                      <span>
                        Enviando lote {batchUploadProgress.current}/{batchUploadProgress.total}…
                      </span>
                    ) : (
                      <span>Enviando arquivo…</span>
                    )}
                  </div>
                ) : null}
                <div className="flex min-h-[52px] flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={MEDIA_ACCEPT}
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <input
                    ref={stickerInputRef}
                    type="file"
                    accept="image/webp,image/png,image/jpeg"
                    className="hidden"
                    onChange={handleStickerSelected}
                  />
                  <input
                    ref={gifInputRef}
                    type="file"
                    accept="image/gif"
                    className="hidden"
                    onChange={handleGifSelected}
                  />
                  <input
                    ref={photosVideosInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handlePhotosVideosSelected}
                  />
                  {isRecordingAudio ? (
                    <div className="flex w-full items-center gap-2 rounded-full border border-[#e9edef] bg-white px-2 py-1.5 dark:border-[#2a3942] dark:bg-[#2a3942]">
                      <div className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full bg-red-100 px-3 py-2 text-[12px] font-medium text-red-800 dark:bg-red-900/35 dark:text-red-200">
                        <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                        <span className="truncate">Gravando {formatRecordingElapsed(recordingElapsedSec)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={cancelCurrentRecording}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/10"
                        aria-label="Cancelar gravação"
                        title="Cancelar gravação sem enviar"
                      >
                        <span className="text-lg leading-none" aria-hidden>
                          ✕
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleAudioRecording}
                        disabled={sendAudioMut.isPending || isWhatsappGroupChatId(chatId)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f6f] disabled:opacity-40"
                        aria-label="Parar e enviar áudio"
                        title="Parar e enviar áudio"
                      >
                        {sendAudioMut.isPending ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <span className="text-base font-bold leading-none" aria-hidden>
                            ■
                          </span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`relative flex w-full border border-[#d1d7db] bg-white shadow-sm dark:border-transparent dark:bg-[#2a3942] dark:shadow-none ${
                        composerReplyMeta
                          ? 'flex-col rounded-[21px]'
                          : 'items-center gap-0.5 rounded-full px-1.5 py-1'
                      }`}
                    >
                      {composerReplyMeta ? (
                        <>
                          <div className={`whatsapp-composer-reply ${composerReplyMeta.toneClass}`}>
                            <div className="whatsapp-composer-reply__body">
                              <p className="whatsapp-composer-reply__author">{composerReplyMeta.author}</p>
                              <p className="whatsapp-composer-reply__snippet">{composerReplyMeta.snippet}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyToMessage(null)}
                              className="whatsapp-composer-reply__dismiss"
                              aria-label="Cancelar resposta"
                              title="Cancelar resposta"
                            >
                              <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                            </button>
                          </div>
                          <div className="whatsapp-composer-reply-divider" aria-hidden />
                        </>
                      ) : null}
                      <div
                        className={`flex w-full items-end gap-0.5 ${
                          composerReplyMeta ? 'px-1.5 pb-1 pt-0.5' : ''
                        }`}
                      >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#00a884]/14 dark:text-[#8696a0] dark:hover:bg-[#00a884]/28"
                            aria-label="Anexar"
                            title="Anexar"
                          >
                            <Plus className="h-6 w-6" strokeWidth={1.9} aria-hidden />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          sideOffset={8}
                          align="start"
                          className="min-w-[240px] rounded-xl border border-[#e9edef] bg-white p-1 shadow-xl dark:border-[#2a3942] dark:bg-[#202c33]"
                        >
                          <DropdownMenuItem
                            onSelect={(ev) => {
                              ev.preventDefault();
                              fileInputRef.current?.click();
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#111b21] focus:bg-[#f7f5f3] dark:text-[#e9edef] dark:focus:bg-[#2a3942]"
                          >
                            <FileText className="h-[18px] w-[18px] shrink-0 text-[#a67bf0]" strokeWidth={1.75} />
                            Documento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(ev) => {
                              ev.preventDefault();
                              photosVideosInputRef.current?.click();
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#111b21] focus:bg-[#f7f5f3] dark:text-[#e9edef] dark:focus:bg-[#2a3942]"
                          >
                            <Images className="h-[18px] w-[18px] shrink-0 text-[#0386f0]" strokeWidth={1.75} />
                            Fotos e vídeos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(ev) => {
                              ev.preventDefault();
                              if (isWhatsappGroupChatId(chatId)) return;
                              setSendContactStep('pick');
                              setSendContactSearch('');
                              setSendContactSelectedIds([]);
                              setSendContactConfirmRows([]);
                            }}
                            disabled={isWhatsappGroupChatId(chatId)}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#111b21] focus:bg-[#f7f5f3] data-[disabled]:pointer-events-none data-[disabled]:opacity-40 dark:text-[#e9edef] dark:focus:bg-[#2a3942]"
                          >
                            <UserRound className="h-[18px] w-[18px] shrink-0 text-[#0aabfe]" strokeWidth={1.75} />
                            Contato
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(ev) => {
                              ev.preventDefault();
                              toast.message('Envio de evento em breve.');
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#111b21] focus:bg-[#f7f5f3] dark:text-[#e9edef] dark:focus:bg-[#2a3942]"
                          >
                            <CalendarFold className="h-[18px] w-[18px] shrink-0 text-[#f04154]" strokeWidth={1.75} />
                            Evento
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-[#e9edef] dark:bg-[#2a3942]" />
                          <DropdownMenuItem
                            onSelect={async (ev) => {
                              ev.preventDefault();
                              try {
                                const r = await deleteWhatsappContactCacheAll();
                                if (r.success) {
                                  const deleted = r.data?.deleted ?? 0;
                                  const rebuilt = r.data?.rebuilt ?? 0;
                                  toast.success(
                                    rebuilt > 0
                                      ? `Cache limpo (${deleted} apagados). ${rebuilt} entradas regravadas a partir do CRM (Cliente/Lead).`
                                      : `Cache do WhatsApp apagado (${deleted} registros). Nada foi regravado na hora — se o nome continuar errado, verifique o cadastro Cliente/Lead ou o nome que o WhatsApp envia ao chegar mensagem.`
                                  );
                                  void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
                                  if (chatId) {
                                    void queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-meta', chatId] });
                                  }
                                  queryClient.removeQueries({ queryKey: ['whatsapp-contact-meta'] });
                                } else {
                                  toast.error('Erro ao limpar cache');
                                }
                              } catch {
                                toast.error('Erro ao limpar cache de nomes');
                              }
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#111b21] focus:bg-[#f7f5f3] dark:text-[#e9edef] dark:focus:bg-[#2a3942]"
                          >
                            <Trash2 className="h-[18px] w-[18px] shrink-0 text-[#54656f] dark:text-[#8696a0]" strokeWidth={1.75} />
                            Limpar cache de nomes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        ref={composerPickerTriggerRef}
                        type="button"
                        onClick={() => {
                          setComposerPickerTab('emoji');
                          setComposerPickerOpen((o) => !o);
                        }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#00a884]/14 dark:text-[#8696a0] dark:hover:bg-[#00a884]/28"
                        aria-label="Emojis, GIFs e figurinhas"
                        title="Emojis, GIFs e figurinhas"
                        aria-expanded={composerPickerOpen}
                      >
                        <span className="relative inline-flex h-[24px] w-[24px] items-center justify-center" aria-hidden>
                          <Sticker className="h-[20px] w-[20px]" strokeWidth={1.85} />
                          <Smile
                            className="absolute -bottom-0.5 -right-0.5 h-[12px] w-[12px] rounded-[3px] bg-white stroke-[#54656f] dark:bg-[#2a3942] dark:stroke-[#8696a0]"
                            strokeWidth={2.2}
                          />
                        </span>
                      </button>

                      <ComposerEmojiGifStickerModal
                        open={composerPickerOpen}
                        onClose={() => setComposerPickerOpen(false)}
                        panelRef={composerPickerPanelRef}
                        tab={composerPickerTab}
                        onTabChange={setComposerPickerTab}
                        darkMode={
                          typeof document !== 'undefined' &&
                          document.documentElement.classList.contains('dark')
                        }
                        onEmojiSelect={(emoji) => {
                          composerDraftInputRef.current?.insertAtCursor(emoji);
                          setComposerPickerOpen(false);
                        }}
                        onChooseGif={() => {
                          gifInputRef.current?.click();
                          setComposerPickerOpen(false);
                        }}
                        onChooseSticker={() => {
                          stickerInputRef.current?.click();
                          setComposerPickerOpen(false);
                        }}
                      />

                      <WhatsappComposerEditor
                        ref={composerDraftInputRef}
                        value={draft}
                        onChange={setDraft}
                        onSubmit={handleSend}
                      />
                      {draft.trim() ? (
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={!draft.trim()}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition enabled:hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Enviar"
                        >
                          <SendPlaneIcon className="ml-0.5 h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleAudioRecording}
                          disabled={sendAudioMut.isPending || isWhatsappGroupChatId(chatId)}
                          className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition-colors hover:bg-[#00a884] hover:text-white hover:[&_svg]:stroke-[2.5] disabled:opacity-40 dark:text-[#8696a0] dark:hover:bg-[#00a884] dark:hover:text-white"
                          aria-label="Gravar áudio WhatsApp"
                          title="Gravar áudio (sendWhatsAppAudio)"
                        >
                          {sendAudioMut.isPending ? (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent dark:border-[#e9edef]" />
                          ) : (
                            <Mic
                              className="pointer-events-none h-6 w-6 shrink-0 text-inherit"
                              strokeWidth={1.85}
                              aria-hidden
                            />
                          )}
                        </button>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </footer>
            )}

            {isDraggingFileOverChat && sendContactStep === 'idle' && !deleteConfirm ? (
              <div
                className="pointer-events-none absolute inset-0 z-[100] m-3 flex items-center justify-center rounded-2xl border-[3px] border-dashed border-[#16a34a]/70 bg-[rgba(74,222,128,0.22)] dark:border-[#22c55e]/80 dark:bg-[rgba(34,197,94,0.18)]"
                aria-hidden
              >
                <p className="text-[15px] font-medium text-[#166534] dark:text-[#bbf7d0]">
                  Arraste ou cole (Ctrl+V) arquivo aqui
                </p>
              </div>
            ) : null}
            </div>

            {sendContactStep !== 'idle' ? (
              <div className="absolute inset-0 z-[200] flex items-end justify-center bg-black/35 p-3 backdrop-blur-[2px] sm:items-center">
                {sendContactStep === 'pick' ? (
                  <div className="flex h-[min(560px,88vh)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-[#e9edef] bg-white shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]">
                    <div className="flex shrink-0 items-center gap-1 border-b border-[#e9edef] px-1 py-1 dark:border-[#2a3942]">
                      <button
                        type="button"
                        onClick={closeSendContactFlow}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-[#f7f5f3] dark:text-[#e9edef] dark:hover:bg-white/10"
                        aria-label="Fechar"
                      >
                        ✕
                      </button>
                      <div className="flex-1 text-center">
                        <p className="text-[16px] font-semibold text-[#111b21] dark:text-[#e9edef]">Enviar contatos</p>
                        <p className="text-[11px] font-medium text-[#667781] dark:text-[#8696a0]">Agenda S3E</p>
                      </div>
                      <span className="w-10 shrink-0" aria-hidden />
                    </div>
                    <div className="shrink-0 px-3 pb-2 pt-2">
                      <div className="flex items-center gap-2 rounded-full border-2 border-[#00a884] bg-white px-3 py-1.5 dark:bg-[#2a3942]">
                        <Search className="h-[18px] w-[18px] shrink-0 text-[#8696a0]" strokeWidth={2} aria-hidden />
                        <input
                          value={sendContactSearch}
                          onChange={(e) => setSendContactSearch(e.target.value)}
                          placeholder="Pesquisar nome, empresa ou número"
                          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0] dark:text-[#e9edef]"
                        />
                      </div>
                      <p className="mt-1.5 px-1 text-[11px] text-[#667781] dark:text-[#8696a0]">
                        Até {WA_SEND_CONTACT_MAX} contatos · intervalo de {WA_SEND_CONTACT_API_GAP_MS} ms entre envios na API
                        {sendPickerLayout.hiddenCount > 0 ? (
                          <span className="mt-1 block text-amber-800 dark:text-amber-200">
                            Mostrando {sendContactYouRows.length + sendContactOtherRows.length} de {sendPickerLayout.total}. Use a
                            busca para achar quem não aparece na lista.
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto wa-scroll">
                      {sendContactPickerLoading ? (
                        <div className="flex justify-center py-16">
                          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                        </div>
                      ) : !sendContactFilteredRows.length ? (
                        <p className="px-4 py-10 text-center text-[14px] text-[#667781] dark:text-[#8696a0]">Nenhum contato encontrado.</p>
                      ) : (
                        <>
                          {sendContactOtherRows.length ? (
                            <div>
                              <p className="sticky top-0 z-[1] bg-[#f0f2f5] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#667781] dark:bg-[#1e2a31] dark:text-[#8696a0]">
                                Agenda S3E
                              </p>
                              {sendContactOtherRows.map((row) => {
                                const sendable = contactRowIsEvolutionSendable(row);
                                const checked = sendContactSelectedIds.includes(row.id);
                                const primary = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id);
                                // Sub-linha hierárquica: prioriza empresa (quando há) +
                                // telefone formatado; cai em pushName se nada disso houver.
                                const empresa = (row.s3eEmpresa || '').trim();
                                const phonePretty = sendable ? buildEvolutionPhoneStylizedFromRow(row) : '';
                                const pn = (row.pushname || '').trim();
                                const subLine = sendable
                                  ? empresa
                                    ? `${empresa} · ${phonePretty}`
                                    : phonePretty
                                  : pn && pn !== primary
                                    ? pn
                                    : 'Número indisponível para envio';
                                const showNovoBadge = !row.s3eRevisado;
                                return (
                                  <label
                                    key={row.id}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-[#f0f2f5] px-2 py-2.5 transition hover:bg-[#f7f5f3] dark:border-[#2a3942] dark:hover:bg-[#2a3942]/50 ${
                                      !sendable ? 'cursor-not-allowed opacity-55' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={checked}
                                      disabled={!sendable}
                                      onChange={() => toggleSendContactSelected(row.id, sendable)}
                                    />
                                    <span
                                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border-2 ${
                                        checked
                                          ? 'border-[#00a884] bg-[#00a884] text-white'
                                          : 'border-[#cfd4d8] bg-white dark:border-[#536471] dark:bg-[#202c33]'
                                      }`}
                                      aria-hidden
                                    >
                                      {checked ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                                    </span>
                                    <ContactAvatar
                                      chatId={canonicalWhatsappChatId(row.id)}
                                      imageUrl={sendFlowPicByContactId.get(row.id) ?? undefined}
                                      label={primary}
                                      size="list"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">
                                          {primary}
                                        </p>
                                        {showNovoBadge ? (
                                          <span
                                            className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                            title="Contato ainda não revisado pelo operador"
                                          >
                                            Novo
                                          </span>
                                        ) : null}
                                      </div>
                                      {subLine ? (
                                        <p className="truncate text-[13px] text-[#667781] dark:text-[#8696a0]">{subLine}</p>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-3 py-2.5 dark:border-[#2a3942] dark:bg-[#1e2a31]">
                      <div className="min-w-0 flex-1 truncate text-[14px] text-[#111b21] dark:text-[#e9edef]">
                        {sendContactSelectedIds.length ? sendContactSelectedSummary || 'Selecionado(s)' : 'Nenhum selecionado'}
                      </div>
                      <button
                        type="button"
                        disabled={!sendContactSelectedIds.length}
                        onClick={openSendContactConfirmStep}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-md transition enabled:hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Continuar"
                        title="Continuar"
                      >
                        <SendPlaneIcon className="ml-0.5 h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-[min(520px,86vh)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#e9edef] bg-white shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]">
                    <div className="flex shrink-0 items-start gap-2 border-b border-[#e9edef] px-2 py-2 dark:border-[#2a3942]">
                      <button
                        type="button"
                        onClick={() => setSendContactStep('pick')}
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-[#f7f5f3] dark:text-[#e9edef] dark:hover:bg-white/10"
                        aria-label="Voltar"
                      >
                        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                      </button>
                      <p className="flex-1 pt-1.5 text-[15px] font-medium leading-snug text-[#111b21] dark:text-[#e9edef]">
                        Deseja enviar {sendContactConfirmRows.length}{' '}
                        {sendContactConfirmRows.length === 1 ? 'contato' : 'contatos'} para {sendContactRecipientPretty}?
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto wa-scroll px-3 pb-24 pt-2">
                      {sendContactConfirmRows.map((row) => {
                        const primary = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id);
                        const phoneLabel = buildEvolutionPhoneStylizedFromRow(row);
                        return (
                          <div
                            key={row.id}
                            className="flex gap-3 border-b border-[#e9edef] py-3 last:border-b-0 dark:border-[#2a3942]"
                          >
                            <ContactAvatar
                              chatId={canonicalWhatsappChatId(row.id)}
                              imageUrl={sendFlowPicByContactId.get(row.id) ?? undefined}
                              label={primary}
                              size="list"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[16px] font-semibold text-[#111b21] dark:text-[#e9edef]">{primary}</p>
                              <div className="mt-1 flex items-start gap-2">
                                <span className="mt-0.5 rounded bg-[#00a884]/12 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#008069] dark:bg-[#00a884]/25 dark:text-[#53d4b0]">
                                  Tel
                                </span>
                                <p className="text-[14px] text-[#111b21] dark:text-[#e9edef]">{phoneLabel}</p>
                              </div>
                            </div>
                            <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-[#aebac1]" strokeWidth={1.75} aria-hidden />
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={sendContactConfirmMut.isPending || !sendContactConfirmRows.length}
                      onClick={() => sendContactConfirmMut.mutate(sendContactConfirmRows)}
                      className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg transition enabled:hover:bg-[#008f6f] disabled:opacity-45"
                      aria-label="Enviar contatos"
                      title="Enviar"
                    >
                      {sendContactConfirmMut.isPending ? (
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <SendPlaneIcon className="ml-0.5 h-6 w-6" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <WhatsAppForwardModal
              open={forwardModalOpen}
              onClose={() => {
                setForwardModalOpen(false);
                setForwardTargetChatId(null);
              }}
              recentChats={(chatList || []).filter((c) => canonicalWhatsappChatId(c.chatId) !== canonicalWhatsappChatId(chatId))}
              selectedCount={selectedMessageIds.size}
              selectedChatId={forwardTargetChatId}
              onSelectChatId={setForwardTargetChatId}
              confirming={forwardingNow}
              onConfirm={async () => {
                if (forwardingNow) return;
                if (!forwardTargetChatId) return;
                const ids = [...selectedMessageIds.values()];
                if (ids.length <= 0) return;
                setForwardingNow(true);
                try {
                  const r = await postWhatsappForwardMessages({
                    targetChatId: forwardTargetChatId,
                    messageIds: ids,
                  });
                  if (!r.success) {
                    toastWhatsappApiError(r);
                    return;
                  }
                  toast.success('Mensagem(ns) encaminhada(s)');
                  setForwardModalOpen(false);
                  setForwardTargetChatId(null);
                  exitForwardSelectionMode();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Erro ao encaminhar');
                } finally {
                  setForwardingNow(false);
                }
              }}
            />

            <ImagePreviewModal
              open={Boolean(selectedImageUrl)}
              imageUrl={selectedImageUrl}
              onClose={() => setSelectedImageUrl(null)}
            />
          </>
        )}
      </div>

      {deleteConfirm ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wa-delete-conv-title"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteConversationMut.isPending) {
              setDeleteConfirm(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !deleteConversationMut.isPending) {
              setDeleteConfirm(null);
            }
          }}
        >
          <div
            className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#202c33]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="wa-delete-conv-title"
              className="text-[18px] font-medium leading-snug text-[#111b21] dark:text-[#e9edef]"
            >
              {`Tem certeza que deseja excluir a conversa${
                firstNameOnly(deleteConfirm.label) ? ` com ${firstNameOnly(deleteConfirm.label)}` : ''
              }?`}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#54656f] dark:text-[#aebac1]">
              As mensagens serão removidas do CRM e do WhatsApp. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleteConversationMut.isPending}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-full px-5 py-2 text-[14px] font-semibold uppercase tracking-wide text-[#00a884] transition hover:bg-[#00a884]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#00a884]/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConversationMut.isPending}
                onClick={() => {
                  const target = deleteConfirm;
                  if (!target) return;
                  const canon = canonicalWhatsappChatId(target.chatId);
                  if (canonicalWhatsappChatId(chatId) !== canon) {
                    onNavigateChat?.(canon, target.label);
                  }
                  deleteConversationMut.mutate({ targetChatId: canon, label: target.label });
                  setDeleteConfirm(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f15c6d] px-5 py-2 text-[14px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#dd4f5f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteConversationMut.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                    Apagando…
                  </>
                ) : (
                  'Apagar'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 779px) {
          body[data-wa-mobile-chat="open"] .s3e-mobile-menu-btn {
            display: none !important;
          }
        }
        /* Scrollbar estilo WhatsApp Web (fino, sem trilho, thumb translúcido) */
        .wa-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
        }
        .dark .wa-scroll {
          scrollbar-color: rgba(255, 255, 255, 0.20) transparent;
        }
        .wa-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
          background: transparent;
        }
        .wa-scroll::-webkit-scrollbar-track,
        .wa-scroll::-webkit-scrollbar-corner {
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .wa-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
          border: none;
          min-height: 32px;
        }
        .wa-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.30);
        }
        .dark .wa-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
        .dark .wa-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.30);
        }
        .wa-wave-bar {
          width: 3px;
          border-radius: 999px;
          background: rgba(102, 119, 129, 0.55);
          transition: background-color .18s ease, transform .18s ease, opacity .18s ease;
          opacity: .85;
        }
        .wa-wave-bar--active {
          background: #00a884;
          opacity: 1;
        }
        .wa-wave-bar--playing {
          animation: waWavePulse 1s ease-in-out infinite;
        }
        @keyframes waWavePulse {
          0%, 100% { transform: scaleY(0.78); }
          50% { transform: scaleY(1.06); }
        }
      `}</style>
    </div>
  );
};

const CheckIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CloseXIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ForwardIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 9l6 6-6 6" />
    <path d="M20 15H9a5 5 0 0 1-5-5V4" />
  </svg>
);
