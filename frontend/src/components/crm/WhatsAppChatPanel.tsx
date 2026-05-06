import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PDF_CUSTOMIZATION_STORAGE_KEY } from '../../hooks/usePDFCustomization';
import {
  fetchWhatsappChats,
  fetchWhatsappArchivedChats,
  fetchWhatsappSessionProfile,
  fetchWhatsappConnectionStatus,
  fetchWhatsappConnectionQr,
  fetchWhatsappMessages,
  fetchWhatsappProviderContacts,
  fetchWhatsappProviderGroups,
  fetchWhatsappProviderProfilePicture,
  fetchWhatsappProviderContactMeta,
  postWhatsappUpsertContactCache,
  postWhatsappMarkRead,
  postWhatsappSubscribePresence,
  sendWhatsappMessage,
  sendWhatsappMedia,
  postWhatsappSendFile,
  deleteWhatsappMessage,
  editWhatsappMessage,
  deleteWhatsappContactCacheAll,
  deleteWhatsappConversation,
  archiveWhatsappConversation,
  postWhatsappProviderLogout,
  postWhatsappMarkAllRead,
  postWhatsappUnarchive,
  fetchWhatsappActionsContext,
  postWhatsappLinkCliente,
  postWhatsappSendOrcamentoPdf,
  putWhatsappOrcamentoStatusMode,
  checkWhatsappProviderPhoneExists,
  whatsappProviderMediaProxyUrl,
  whatsappProviderMediaProxyDownloadUrl,
  whatsappMessageMediaInlineUrl,
  whatsappMessageMediaDownloadUrl,
  postEvolutionMarkMessagesRead,
  postEvolutionFindStatusMessage,
  postEvolutionMarkChatUnread,
  postEvolutionSendLocation,
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
import { clientesService, type Cliente } from '../../services/clientesService';
import { orcamentosService } from '../../services/orcamentosService';
import type { OrcamentoPDFData, PDFCustomization } from '../../types/pdfCustomization';
import { renderOrcamentoPdfBase64 } from '../../utils/orcamentoPdfRender';
import WhatsAppActionsDrawer from './WhatsAppActionsDrawer';
import AudioMessage from './AudioMessage';
import { AuthContext } from '../../contexts/AuthContext';
import { useWhatsAppSocket } from '../../hooks/useWhatsAppSocket';
import { EmojiInput } from '../ui/emoji/EmojiInput';
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
  stripOutboundPrefixForEdit,
  canonicalWhatsappChatId,
  outboundAckVisual,
  waJidToDigits,
  sanitizeWhatsappContactMetaForChat,
} from '../../utils/whatsappChat';

const FALLBACK_WHATSAPP_PROVIDER_DASHBOARD =
  import.meta.env.VITE_WHATSAPP_PROVIDER_DASHBOARD_URL || 'http://localhost:3333/manager';
const WHATSAPP_QR_ROTATION_MS = 75_000;

const chatsQueryKey = ['whatsapp-chats'] as const;
const archivedChatsQueryKey = ['whatsapp-archived-chats'] as const;
const messagesQueryKey = (chatId: string) => ['whatsapp-messages', canonicalWhatsappChatId(chatId)] as const;

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
  const arr =
    Array.isArray(data) ? data : data && typeof data === 'object' ? (data as Record<string, unknown>).participants : [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p): GroupParticipantRow | null => {
      if (!p || typeof p !== 'object') return null;
      const o = p as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id.trim() : '';
      if (!id) return null;
      return {
        id,
        admin: typeof o.admin === 'string' ? o.admin : undefined,
        name:
          (typeof o.name === 'string' && o.name.trim()) ||
          (typeof o.notify === 'string' && o.notify.trim()) ||
          (typeof o.pushName === 'string' && o.pushName.trim()) ||
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

/** Padrão de fundo semelhante ao papel de parede clássico do chat (SVG genérico). */
const CHAT_BG_PATTERN =
  'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M30 0h30v30H30zM0 30h30v30H0z\'/%3E%3C/g%3E%3C/svg%3E")';

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

/** *negrito* no estilo WhatsApp (trechos entre asteriscos). */
function renderWhatsAppText(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

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
  imageUrl,
  label,
  size,
  children,
}: {
  imageUrl?: string | null;
  label: string;
  size: 'list' | 'header';
  children?: React.ReactNode;
}) {
  const [imgErr, setImgErr] = useState(false);
  const dim = size === 'header' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-[15px]';
  const showImg = Boolean(imageUrl && !imgErr);
  return (
    <div className={`relative flex ${dim} shrink-0 items-center justify-center`}>
      {showImg ? (
        <img
          src={imageUrl!}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-[#dfe5e7] font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0] ${size === 'list' ? 'text-[15px]' : 'text-sm'}`}
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

const CheckSingleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"
      fill="currentColor"
    />
  </svg>
);

function OutboundAckIcon({ ack }: { ack: number | null | undefined }) {
  const vis = outboundAckVisual(ack);
  if (vis === 'single') {
    return (
      <span className="material-symbols-outlined ml-0.5 h-3.5 w-3.5 shrink-0 text-[#8696a0] text-[16px] leading-none">
        check
      </span>
    );
  }
  if (vis === 'double_grey') {
    return (
      <span className="material-symbols-outlined ml-0.5 h-3.5 w-4 shrink-0 text-[#8696a0] text-[16px] leading-none">
        done_all
      </span>
    );
  }
  return (
    <span className="material-symbols-outlined ml-0.5 h-3.5 w-4 shrink-0 text-[#53bdeb] text-[16px] leading-none">
      done_all
    </span>
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

const LocationPinIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 21s-7-4.35-7-11a7 7 0 1 1 14 0c0 6.65-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const ContactsBookIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EllipsisVerticalIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

function detectMediaType(mime: string): WhatsappProviderMediaType {
  const m = mime.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('audio/')) return 'voice';
  if (m.startsWith('video/')) return 'video';
  return 'file';
}

const MEDIA_ACCEPT = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar';
const MAX_FILE_SIZE_MB = 50;

interface PendingMedia {
  file: File;
  mediaType: WhatsappProviderMediaType;
  previewUrl: string | null;
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

function mediaMimeCategory(
  mime: string | null | undefined,
  mediaTypeField?: string | null,
  filename?: string | null
): 'image' | 'audio' | 'video' | 'document' {
  const t = (mediaTypeField || '').toLowerCase();
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

function tokenQueryString(): string {
  const t = localStorage.getItem('token');
  return t ? `&token=${encodeURIComponent(t)}` : '';
}

function MediaRenderer({ m }: { m: WhatsappMessageDto }) {
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
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
  const fname = m.mediaFilename || m.fileName || 'arquivo';
  const legacy = m.mediaUrl ? whatsappProviderMediaProxyUrl(m.mediaUrl, fname) + tokenQueryString() : null;
  // Stream por id só faz sentido quando a mensagem realmente tem mídia (o backend valida `hasMedia`).
  const byId = m.hasMedia ? whatsappMessageMediaInlineUrl(m.id) : null;
  const byIdDownload = m.hasMedia ? whatsappMessageMediaDownloadUrl(m.id) : null;
  const mediaSrc = byId || legacy;
  const mediaSrcDownload = byIdDownload || (m.mediaUrl ? whatsappProviderMediaProxyDownloadUrl(m.mediaUrl, fname) + tokenQueryString() : null) || mediaSrc;
  if (!mediaSrc) return null;

  let cat = mediaMimeCategory(m.mediaMimetype ?? m.mimeType ?? undefined, m.mediaType, fname);
  if (cat === 'document') {
    const c = (m.content || '').toLowerCase();
    if (c.includes('áudio') || c.includes('audio') || c.includes('🎤')) cat = 'audio';
    else if (c.includes('imagem') || c.includes('foto') || c.includes('📷')) cat = 'image';
  }
  const sizeLabel = formatFileSize(m.fileSize ?? undefined);
  const audioMime =
    (m.mediaMimetype || '').toLowerCase().includes('ogg') || fname.toLowerCase().endsWith('.ogg')
      ? 'audio/ogg'
      : m.mediaMimetype || 'audio/ogg';
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaSrcDownload;
    a.download = fname;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (cat === 'image') {
    return (
      <a href={mediaSrc} target="_blank" rel="noopener noreferrer" className="block mb-1">
        <img
          src={mediaSrc}
          alt={fname}
          className="max-w-full max-h-72 rounded object-contain bg-black/5 dark:bg-white/5"
          loading="lazy"
        />
      </a>
    );
  }

  if (cat === 'audio') {
    return <AudioMessage src={mediaSrc} mimeType={audioMime} filename={fname} />;
  }

  if (cat === 'video') {
    return (
      <video controls preload="metadata" className="max-w-full max-h-72 rounded mb-1">
        <source src={mediaSrc} type={m.mediaMimetype || 'video/mp4'} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  const lowName = fname.toLowerCase();
  const canInlineDoc =
    (m.mediaMimetype || '').toLowerCase().includes('pdf') ||
    lowName.endsWith('.pdf');

  return (
    <div className="mb-1 overflow-hidden rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-[#111b21]/40">
      {canInlineDoc && docPreviewOpen ? (
        <iframe
          src={mediaSrc}
          title={fname}
          className="h-[260px] w-full bg-white"
          loading="lazy"
          sandbox="allow-same-origin allow-scripts"
        />
      ) : null}
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
          onClick={() => {
            if (canInlineDoc) {
              setDocPreviewOpen((v) => !v);
              return;
            }
            window.open(mediaSrc, '_blank', 'noopener,noreferrer');
          }}
          className="rounded-md border border-[#00a884] px-2 py-1 text-[11px] font-medium text-[#00a884] hover:bg-[#00a884]/10"
        >
          {canInlineDoc ? (docPreviewOpen ? 'Ocultar' : 'Visualizar') : 'Visualizar'}
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

const MessageBubble = memo(function MessageBubble({
  m,
  layout,
  groupParticipantLabel,
  showGroupParticipant,
}: {
  m: WhatsappMessageDto;
  layout: 'compact' | 'full';
  groupParticipantLabel?: string | null;
  showGroupParticipant?: boolean;
}) {
  const maxW = layout === 'full' ? 'max-w-[min(78%,720px)]' : 'max-w-[min(65%,420px)]';
  const hasMedia =
    m.mediaType !== 'location' &&
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
    (!hasMedia || !['📷 Imagem', '🎤 Áudio', '🎥 Vídeo'].includes(m.content)) &&
    !(locationPayload && isFormattedLocationText);
  const showAck = Boolean(m.fromMe);
  return (
    <div className={`flex w-full px-9 sm:px-12 py-0.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative ${maxW} px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
          m.fromMe
            ? 'bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none dark:bg-[#005c4b] dark:text-[#e9edef]'
            : 'bg-white text-[#111b21] rounded-lg rounded-tl-none dark:bg-[#202c33] dark:text-[#e9edef]'
        }`}
      >
        {showGroupParticipant && !m.fromMe && groupParticipantLabel ? (
          <p className="mb-1 truncate text-[12px] font-semibold text-[#00a884] dark:text-[#00a884]">
            {groupParticipantLabel}
          </p>
        ) : null}
        {hasMedia && <MediaRenderer m={m} />}
        {locationPayload ? (
          <div className="mb-1 rounded-lg border border-[#d1d7db] bg-white/70 p-2 dark:border-[#2a3942] dark:bg-[#111b21]/30">
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
        {showContent && (
          <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px] pr-14 pb-0.5">
            {renderWhatsAppText(m.content)}
          </p>
        )}
        {!showContent && <div className="pb-4" />}
        <div
          className={`absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] tabular-nums ${
            m.fromMe ? 'text-[#667781]' : 'text-[#667781]'
          }`}
        >
          <span>{formatMsgTime(m.timestamp)}</span>
          {showAck ? <OutboundAckIcon ack={m.ack} /> : null}
        </div>
      </div>
    </div>
  );
});

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [openPhoneDraft, setOpenPhoneDraft] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionReadLastByChatRef = useRef<Map<string, string>>(new Map());
  const sendLockRef = useRef(false);
  const prevProviderConnRef = useRef<boolean | undefined>(undefined);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdRef = useRef(chatId);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [contactsPanelOpen, setContactsPanelOpen] = useState(false);
  const [contactsFilter, setContactsFilter] = useState('');
  const [contactsSortBy, setContactsSortBy] = useState<'name' | 'id'>('name');
  const [contactsSortOrder, setContactsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [contactsLimit, setContactsLimit] = useState(500);
  const [checkPhoneDraft, setCheckPhoneDraft] = useState('');
  const [checkPhoneResult, setCheckPhoneResult] = useState<{ numberExists: boolean; chatId: string | null } | null>(
    null
  );
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [archivedPanelOpen, setArchivedPanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(false);
  const contactPanelAutoFetchKeyRef = useRef<string>('');
  const [actionsClienteSearch, setActionsClienteSearch] = useState('');
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

  // Edição de mensagem (precisa ser declarada antes do handler global de teclado)
  const startEditMessage = useCallback((m: WhatsappMessageDto) => {
    setEditingId(m.id);
    setEditDraft(stripOutboundPrefixForEdit(m.content));
  }, []);

  const cancelEditMessage = useCallback(() => {
    setEditingId(null);
    setEditDraft('');
  }, []);
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
  const [locationComposerOpen, setLocationComposerOpen] = useState(false);
  const [locationNameDraft, setLocationNameDraft] = useState('');
  const [locationAddressDraft, setLocationAddressDraft] = useState('');
  const [locationLatitudeDraft, setLocationLatitudeDraft] = useState('');
  const [locationLongitudeDraft, setLocationLongitudeDraft] = useState('');
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
        r.data.map((c) => ({
          ...c,
          unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
          lastAck: c.lastAck ?? null,
        }))
      );
    },
    // Fallback se o Socket.io falhar (CORS, proxy, etc.)
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: messagesQueryKey(chatId),
    queryFn: async (): Promise<WhatsappMessageDto[]> => {
      const cid = canonicalWhatsappChatId(chatId);
      const r = await fetchWhatsappMessages(cid);
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: Boolean(chatId),
    refetchInterval: Boolean(chatId) ? 12_000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 2_000,
  });

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

  const { data: connectionStatus } = useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: async () => {
      const r = await fetchWhatsappConnectionStatus();
      if (!r.success || !r.data) return null;
      return r.data;
    },
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
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
    staleTime: 90_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });

  const {
    data: contactsPanelRows = [],
    isLoading: contactsPanelLoading,
    refetch: refetchContactsPanel,
  } = useQuery({
    queryKey: ['whatsapp-provider-contacts-panel', contactsSortBy, contactsSortOrder, contactsLimit],
    queryFn: async (): Promise<WhatsappProviderContactRow[]> => {
      const r = await fetchWhatsappProviderContacts({
        limit: contactsLimit,
        offset: 0,
        sortBy: contactsSortBy,
        sortOrder: contactsSortOrder,
        refresh: true,
      });
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    enabled: contactsPanelOpen,
    staleTime: 0,
  });

  const filteredContactsPanel = useMemo(() => {
    const q = normalizeSearchText(contactsFilter);
    if (!q) return contactsPanelRows;
    return contactsPanelRows.filter((c) => {
      const label = whatsappContactDisplayName(c);
      const hay = normalizeSearchText([label, c.id, c.number || '', c.pushname || '', c.shortName || ''].join(' '));
      return hay.includes(q);
    });
  }, [contactsPanelRows, contactsFilter]);

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
        r.data.map((c) => ({
          ...c,
          unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
          lastAck: c.lastAck ?? null,
        }))
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
      const r = await fetchWhatsappProviderGroups();
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data;
    },
    staleTime: 90_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
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

  const contactAvatarQueries = useQueries({
    queries: contactsPanelRows.map((row) => ({
      queryKey: ['whatsapp-evolution-contact-avatar', row.id] as const,
      queryFn: async (): Promise<string | null> => {
        const r = await postEvolutionFetchProfilePicture({ number: row.id.trim() });
        if (!r.success) return null;
        const u = r.data?.profilePictureUrl;
        return typeof u === 'string' && u.length > 0 ? u : null;
      },
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      enabled: contactsPanelOpen && contactsPanelRows.length > 0,
    })),
  });

  const contactPicByContactId = useMemo(() => {
    const m = new Map<string, string | null>();
    contactsPanelRows.forEach((row, i) => {
      m.set(row.id, contactAvatarQueries[i]?.data ?? null);
    });
    return m;
  }, [contactsPanelRows, contactAvatarQueries]);

  const filteredChats = useMemo(() => {
    const raw = chatSearch.trim();
    if (!raw) return chatList;
    const q = normalizeSearchText(raw);
    const qDigits = raw.replace(/\D/g, '');
    return chatList.filter((c) => {
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
  }, [chatList, chatSearch, providerContactRows, providerGroupRows]);

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

  const groupMembersQuery = useQuery({
    queryKey: ['whatsapp-group-members', chatId],
    queryFn: async (): Promise<GroupParticipantRow[]> => {
      const groupJid = canonicalWhatsappChatId(chatId);
      const r = await getEvolutionGroupFindMembers(groupJid);
      if (!r.success) return [];
      return normalizeGroupMembers(r.data);
    },
    enabled: Boolean(chatId && activeIsGroup),
    staleTime: 60_000,
    refetchInterval: activeIsGroup ? 120_000 : false,
    refetchIntervalInBackground: false,
  });

  const groupParticipantLabelByDigits = useMemo(() => {
    const m = new Map<string, string>();
    const rows = (groupMembersQuery.data ?? groupInfo?.participants ?? []).slice();
    for (const p of rows) {
      const digits = waJidToDigits(String(p.id || ''));
      if (!digits) continue;
      const label = (p.name || '').trim();
      if (label) m.set(digits, label);
    }
    return m;
  }, [groupMembersQuery.data, groupInfo?.participants]);

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

  const { primary: headerPrimary, secondary: headerSecondary } = useMemo(
    () =>
      displayNameForChatHeader({
        chatId,
        crmName: activePreview?.contactName,
        cachedProviderName: activePreview?.providerCachedName,
        providerContactName: whatsappContactDisplayName(activeContactMeta?.contact ?? undefined),
        groupName: whatsappGroupDisplayName(activeContactMeta?.group ?? undefined),
        fallbackTitle: title,
      }),
    [chatId, activePreview?.contactName, activePreview?.providerCachedName, activeContactMeta?.contact, activeContactMeta?.group, title]
  );

  const totalUnreadMsgs = useMemo(
    () => chatList.reduce((acc, c) => acc + Math.max(0, c.unreadCount || 0), 0),
    [chatList]
  );

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

  const actionsClientesQuery = useQuery({
    queryKey: ['whatsapp-actions-clientes', actionsClienteSearch],
    queryFn: async (): Promise<Cliente[]> => {
      const result = await clientesService.listar({
        search: actionsClienteSearch.trim() || undefined,
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
      if (!r.success) throwAfterWhatsappToast(r, 'Falha ao vincular contato ao cliente');
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

  const updateStatusModeMut = useMutation({
    mutationFn: async (mode: WhatsappOrcamentoStatusMode) => {
      const r = await putWhatsappOrcamentoStatusMode(mode);
      if (!r.success || !r.data) throwAfterWhatsappToast(r, 'Falha ao salvar configuração');
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
    mutationFn: async (payload: { orcamentoId: string; modeOverride?: WhatsappOrcamentoStatusMode }) => {
      const mode = payload.modeOverride ?? actionsContextSnapshot?.statusUpdateMode;
      let pdfCustomization: PDFCustomization | null = null;
      try {
        const raw = localStorage.getItem(PDF_CUSTOMIZATION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            pdfCustomization = parsed as PDFCustomization;
          }
        }
      } catch {
        // ignora JSON inválido
      }

      const full = await orcamentosService.buscar(payload.orcamentoId);
      if (!full.success || !full.data) {
        throw new Error(full.error || 'Não foi possível carregar os dados do orçamento para gerar o PDF.');
      }
      const o: any = full.data;

      const mapItemName = (item: any): string =>
        item?.material?.nome || item?.kit?.nome || item?.servicoNome || item?.nome || item?.descricao || 'Item';

      const orcamentoData: OrcamentoPDFData = {
        numero: (o?.id ? String(o.id).slice(0, 8).toUpperCase() : payload.orcamentoId.slice(0, 8).toUpperCase()),
        numeroSequencial: typeof o?.numeroSequencial === 'number' ? o.numeroSequencial : undefined,
        data: o?.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : undefined,
        emissao: o?.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        validade: o?.validade ? new Date(o.validade).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        orcamentistaNome: typeof o?.orcamentistaNome === 'string' ? o.orcamentistaNome : undefined,
        enderecos: {
          cobranca: o?.cliente?.endereco,
          obra: o?.enderecoObra
        },
        cliente: {
          nome: o?.cliente?.nome || 'Cliente',
          cpfCnpj: o?.cliente?.cpfCnpj || undefined,
          endereco: o?.cliente?.endereco,
          telefone: o?.cliente?.telefone,
          email: o?.cliente?.email
        },
        projeto: {
          titulo: o?.titulo,
          descricao: o?.descricao,
          enderecoObra: o?.enderecoObra,
          cidade: o?.cidade,
          bairro: o?.bairro,
          cep: o?.cep,
          responsavelObra: o?.responsavelObra
        },
        prazos: {
          previsaoInicio: o?.previsaoInicio ? new Date(o.previsaoInicio).toLocaleDateString('pt-BR') : undefined,
          previsaoTermino: o?.previsaoTermino ? new Date(o.previsaoTermino).toLocaleDateString('pt-BR') : undefined
        },
        items: Array.isArray(o?.items)
          ? o.items.map((it: any) => ({
              codigo: it?.materialId || it?.kitId || it?.cotacaoId,
              nome: mapItemName(it),
              descricao: typeof it?.descricao === 'string' ? it.descricao : undefined,
              unidade: it?.unidadeMedida || 'UN',
              quantidade: Number(it?.quantidade || 0),
              valorUnitario: Number(it?.precoUnit ?? it?.precoUnitario ?? it?.valorUnitario ?? 0),
              valorTotal: Number(it?.subtotal ?? it?.valorTotal ?? 0)
            }))
          : [],
        financeiro: {
          subtotal: Number(o?.custoTotal ?? 0),
          bdi: typeof o?.bdi === 'number' ? o.bdi : undefined,
          valorComBDI: Number(o?.custoTotal ?? 0),
          desconto: Number(o?.descontoValor ?? 0),
          impostos: Number(o?.impostoPercentual ?? 0),
          valorTotal: Number(o?.precoVenda ?? o?.valorTotal ?? 0),
          condicaoPagamento: o?.condicaoPagamento
        },
        observacoes: o?.observacoes,
        descricaoGeral: o?.descricao,
        descricaoTecnica: o?.descricaoProjeto,
        fotos: []
      };

      const rendered = await renderOrcamentoPdfBase64({ orcamentoData, customization: pdfCustomization });
      // Fallback de segurança: se a captura falhar/sair vazia, manda o backend gerar via Puppeteer.
      const seemsEmpty = !rendered.base64 || rendered.base64.trim().length < 10_000;

      const r = await postWhatsappSendOrcamentoPdf({
        chatId,
        orcamentoId: payload.orcamentoId,
        mode,
        ...(pdfCustomization ? { pdfCustomization: pdfCustomization as unknown as Record<string, unknown> } : {}),
        ...(seemsEmpty ? {} : { pdfBase64: rendered.base64, pdfFilename: rendered.filename })
      });
      if (!r.success || !r.data) throwAfterWhatsappToast(r, 'Falha ao enviar PDF do orçamento');
      return r.data;
    },
    onMutate: (payload) => {
      setSendingOrcamentoId(payload.orcamentoId);
    },
    onSuccess: (data) => {
      if (data?.message) {
        mergeMessage(data.message);
      }
      toast.success(
        data?.statusUpdated
          ? 'PDF enviado e status atualizado para "Enviado ao Cliente"'
          : 'PDF enviado no chat com sucesso'
      );
      void actionsContextQuery.refetch();
      setActionsPanelOpen(false);
    },
    onError: (e: Error) => {
      if (!isWhatsappErrorAlreadyToasted(e)) toast.error(e.message || 'Erro ao enviar PDF');
    },
    onSettled: () => {
      setSendingOrcamentoId(null);
    },
  });

  const syncMarkRead = useCallback(
    (cid: string) => {
      const canon = canonicalWhatsappChatId(cid);
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        old?.map((c) => (canonicalWhatsappChatId(c.chatId) === canon ? { ...c, unreadCount: 0 } : c))
      );
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
    if (!text) return;
    void postEvolutionInstanceSetPresence('available').catch(() => {
      /* endpoint Evolution opcional */
    });
    if (presenceResetRef.current) clearTimeout(presenceResetRef.current);
    presenceResetRef.current = setTimeout(() => {
      presenceResetRef.current = null;
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
    setLocationComposerOpen(false);
    setLocationNameDraft('');
    setLocationAddressDraft('');
    setLocationLatitudeDraft('');
    setLocationLongitudeDraft('');
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
      if (locationComposerOpen) {
        e.preventDefault();
        setLocationComposerOpen(false);
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
    locationComposerOpen,
  ]);

  const mergeMessage = useCallback(
    (msg: WhatsappMessageDto) => {
      const cid = canonicalWhatsappChatId(msg.chatId);
      const normalizedMsg = { ...msg, chatId: cid };

      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) => {
        const list = old ?? [];
        if (list.some((x) => x.id === normalizedMsg.id)) return list;
        return [...list, normalizedMsg];
      });

      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
        const list = old ?? [];
        const prevRow = list.find((c) => canonicalWhatsappChatId(c.chatId) === cid);
        let unreadCount: number;
        if (canonicalWhatsappChatId(chatId) === cid) {
          unreadCount = 0;
          if (!normalizedMsg.fromMe) scheduleMarkRead(cid);
        } else if (!normalizedMsg.fromMe) {
          unreadCount = (prevRow?.unreadCount ?? 0) + 1;
        } else {
          unreadCount = prevRow?.unreadCount ?? 0;
        }

        const preview: WhatsappChatPreview = {
          chatId: cid,
          lastContent: normalizedMsg.content,
          lastAt: normalizedMsg.timestamp,
          lastFromMe: normalizedMsg.fromMe,
          lastAck: normalizedMsg.fromMe ? (normalizedMsg.ack ?? null) : null,
          unreadCount,
          contactName: prevRow?.contactName,
          providerCachedName: prevRow?.providerCachedName,
          cachedProfilePictureUrl: prevRow?.cachedProfilePictureUrl,
        };
        const rest = list.filter((c) => canonicalWhatsappChatId(c.chatId) !== cid);
        return sortChatsByRecent([preview, ...rest]);
      });

      // Se o chat está aberto e a mensagem chegou agora, isso equivale a “visualizar” no CRM.
      // Marca como lida no WhatsApp oficial apenas quando a aba está visível (evita auto-read em background).
      if (
        !normalizedMsg.fromMe &&
        normalizedMsg.providerMessageId &&
        canonicalWhatsappChatId(chatId) === cid &&
        document.visibilityState === 'visible'
      ) {
        if (evolutionReadDebounceRef.current) clearTimeout(evolutionReadDebounceRef.current);
        evolutionReadDebounceRef.current = setTimeout(() => {
          evolutionReadDebounceRef.current = null;
          const canon = canonicalWhatsappChatId(cid);
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

  const onSocketAck = useCallback(
    (p: { id: string; chatId: string; ack: number | null }) => {
      const cid = canonicalWhatsappChatId(p.chatId);
      queryClient.setQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid), (old) =>
        (old ?? []).map((x) => (x.id === p.id ? { ...x, ack: p.ack ?? x.ack } : x))
      );
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) => {
        const list = old ?? [];
        const msgs = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid)) ?? [];
        const lastOut = [...msgs].reverse().find((m) => m.fromMe);
        if (!lastOut || lastOut.id !== p.id) return list;
        return list.map((c) =>
          canonicalWhatsappChatId(c.chatId) === cid ? { ...c, lastAck: p.ack ?? c.lastAck } : c
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
    onPresence: onSocketPresence,
    onChatRemoved: onSocketChatRemoved,
    onChatArchived: onSocketChatArchived,
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
    mutationFn: async (pm: PendingMedia) => {
      const r = await postWhatsappSendFile({
        chatId,
        file: pm.file,
        caption: mediaCaption.trim() || undefined,
      });
      if (!r.success || !r.data) throw new Error(r.error || 'Falha ao enviar mídia');
      return r.data;
    },
    onSuccess: (data) => {
      setPendingMedia(null);
      setMediaCaption('');
      if (data) mergeMessage(data);
      toast.success('Mídia enviada');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar mídia');
    },
  });

  const sendAudioMut = useMutation({
    mutationFn: async (payload: { base64Data: string; mimetype: string; filename: string }) => {
      const r = await sendWhatsappMedia({
        chatId,
        mediaType: 'voice',
        base64Data: payload.base64Data,
        mimetype: payload.mimetype,
        filename: payload.filename,
      });
      if (!r.success || !r.data) throw new Error(r.error || 'Falha ao enviar áudio');
      return r.data;
    },
    onSuccess: (data) => {
      setPendingRecordedAudio((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      if (data) mergeMessage(data);
      toast.success('Áudio enviado');
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar áudio');
    },
  });

  const sendLocationMut = useMutation({
    mutationFn: async () => {
      const number = evolutionNumberFromChat(chatId);
      if (!number || number.length < 8) {
        throw new Error('Localização Evolution requer número válido (chat individual).');
      }
      const latitude = Number.parseFloat(locationLatitudeDraft.trim().replace(',', '.'));
      const longitude = Number.parseFloat(locationLongitudeDraft.trim().replace(',', '.'));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Latitude e longitude inválidas.');
      }
      const name = locationNameDraft.trim();
      const address = locationAddressDraft.trim();
      if (!name || !address) {
        throw new Error('Nome da cidade/local e endereço são obrigatórios.');
      }
      const r = await postEvolutionSendLocation({
        number,
        name,
        address,
        latitude,
        longitude,
        delay: 600,
      });
      if (!r.success) throw new Error(r.error || 'Falha ao enviar localização no Evolution');
    },
    onSuccess: () => {
      setLocationComposerOpen(false);
      setLocationNameDraft('');
      setLocationAddressDraft('');
      setLocationLatitudeDraft('');
      setLocationLongitudeDraft('');
      toast.success('Localização enviada');
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(chatId) });
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar localização');
    },
  });

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLatitudeDraft(pos.coords.latitude.toFixed(6));
        setLocationLongitudeDraft(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        toast.error(err.message || 'Não foi possível obter sua localização atual.');
      },
      { enableHighAccuracy: true, timeout: 12_000 }
    );
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máximo ${MAX_FILE_SIZE_MB} MB)`);
      return;
    }
    try {
      const mediaType = detectMediaType(file.type);
      const previewUrl = mediaType === 'image' ? URL.createObjectURL(file) : null;
      setPendingMedia({ file, mediaType, previewUrl });
      setMediaCaption('');
    } catch {
      toast.error('Não foi possível ler o arquivo');
    }
  }, []);

  const cancelMedia = useCallback(() => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
    setMediaCaption('');
  }, [pendingMedia]);

  const handleSendMedia = useCallback(() => {
    if (!pendingMedia || sendMediaMut.isPending) return;
    sendMediaMut.mutate(pendingMedia);
  }, [pendingMedia, sendMediaMut]);

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

  useEffect(
    () => () => {
      if (presenceResetRef.current) clearTimeout(presenceResetRef.current);
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
    setPendingMedia(null);
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
  }, [chatId]);

  const handleOpenByPhone = useCallback(() => {
    const digits = openPhoneDraft.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Informe DDD + número (mínimo 10 dígitos).');
      return;
    }
    if (!onNavigateChat) {
      toast.error('Abrir por número só está disponível na página Chat WhatsApp.');
      return;
    }
    const cid = toWhatsappChatId(openPhoneDraft);
    const label = chatIdToDisplayLabel(cid);
    onNavigateChat(cid, label);
    setOpenPhoneDraft('');
  }, [openPhoneDraft, onNavigateChat]);

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

  const deleteConversationMut = useMutation({
    mutationFn: async () => {
      const cid = canonicalWhatsappChatId(chatId);
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
    onMutate: async () => {
      const cid = canonicalWhatsappChatId(chatId);
      const previous = queryClient.getQueryData<WhatsappChatPreview[]>(chatsQueryKey);
      const messagesSnapshot = queryClient.getQueryData<WhatsappMessageDto[]>(messagesQueryKey(cid));
      queryClient.setQueryData<WhatsappChatPreview[]>(chatsQueryKey, (old) =>
        (old ?? []).filter((c) => canonicalWhatsappChatId(c.chatId) !== cid)
      );
      queryClient.removeQueries({ queryKey: messagesQueryKey(cid) });
      onNavigateChat?.('', '');
      setChatMenuOpen(false);
      return { previous, cid, label: headerPrimary, messagesSnapshot };
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
      const [groupRes, membersRes] = await Promise.all([
        getEvolutionGroupFindByJid(groupJid),
        getEvolutionGroupFindMembers(groupJid),
      ]);
      if (!groupRes.success) {
        toastWhatsappApiError(groupRes);
        throwAfterWhatsappToast();
      }
      if (!membersRes.success) {
        toastWhatsappApiError(membersRes);
        throwAfterWhatsappToast();
      }
      const base = normalizeGroupInfo(groupRes.data, groupJid);
      const members = normalizeGroupMembers(membersRes.data);
      const merged = { ...base, participants: members.length > 0 ? members : base.participants };
      return merged;
    },
    onSuccess: (info) => {
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

  useEffect(() => {
    if (!groupPanelOpen || !activeIsGroup) return;
    refreshGroupInfoMut.mutate();
  }, [activeIsGroup, groupPanelOpen, refreshGroupInfoMut]);

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
        const fallbackLiveName = whatsappContactDisplayName(activeContactMeta?.contact ?? undefined);
        const fallbackDisplay =
          parsed.displayName.trim() ||
          fallbackLiveName.trim() ||
          (activePreview?.providerCachedName ?? '').trim() ||
          '';
        const displayName =
          fallbackDisplay && !isJustDigitsLabel(fallbackDisplay) ? fallbackDisplay : '';
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

  useEffect(() => {
    if (!contactPanelOpen) return;
    if (!chatId || activeIsGroup) return;
    if (evoFetchContactProfileMut.isPending) return;

    const cid = canonicalWhatsappChatId(chatId);
    const already = contactPanelAutoFetchKeyRef.current;
    if (already === cid) return;

    const cachedName = activePreview?.providerCachedName ?? null;
    const liveName = whatsappContactDisplayName(activeContactMeta?.contact ?? undefined);
    const hasName = hasMeaningfulName(cachedName) || hasMeaningfulName(liveName);
    const hasPic = Boolean(
      (activePreview?.cachedProfilePictureUrl ?? '').trim() ||
        (activeContactMeta?.profilePictureUrl ?? '').trim()
    );
    if (hasName && hasPic) {
      contactPanelAutoFetchKeyRef.current = cid;
      return;
    }

    const digits = waJidToDigits(cid);
    if (!digits || digits.length < 8) return;
    contactPanelAutoFetchKeyRef.current = cid;
    evoFetchContactProfileMut.mutate(digits);
  }, [
    contactPanelOpen,
    chatId,
    activeIsGroup,
    activePreview?.providerCachedName,
    activePreview?.cachedProfilePictureUrl,
    activeContactMeta?.contact,
    activeContactMeta?.profilePictureUrl,
    evoFetchContactProfileMut,
  ]);

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

  const sendMut = useMutation({
    mutationFn: async (text: string) => {
      const r = await sendWhatsappMessage(chatId, text);
      if (!r.success) throw new Error(r.error || 'Falha ao enviar');
      return r.data;
    },
    onSuccess: (data) => {
      setDraft('');
      if (data) mergeMessage(data);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao enviar mensagem');
    },
  });

  const handleSend = useCallback(() => {
    const t = draft.trim();
    if (!t || sendMut.isPending || sendLockRef.current) return;
    sendLockRef.current = true;
    sendMut.mutate(t, {
      onSettled: () => {
        sendLockRef.current = false;
      },
    });
  }, [draft, sendMut]);

  const rootClass =
    layout === 'full'
      ? 'flex h-full min-h-0 w-full max-w-none flex-1 overflow-hidden rounded-none border-0 border-y border-[#e9edef] bg-white shadow-none dark:border-dark-border dark:bg-[#111b21]'
      : 'flex h-[min(72vh,680px)] w-full max-w-full overflow-hidden rounded border border-[#d1d7db] bg-white shadow-[0_6px_18px_rgba(11,20,26,0.15)] dark:border-dark-border dark:bg-[#111b21]';

  const asideClass =
    layout === 'full'
      ? 'flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col border-r border-[#e9edef] bg-white dark:border-dark-border dark:bg-[#111b21] sm:w-[400px] sm:max-w-[40vw] sm:shrink-0'
      : 'flex w-full max-w-[300px] shrink-0 flex-col border-r border-[#e9edef] bg-white dark:border-dark-border dark:bg-[#111b21] sm:max-w-[320px]';

  return (
    <div className={rootClass}>
      {/* Coluna esquerda — lista (estilo WhatsApp Web) */}
      <aside className={`${asideClass} relative`}>
        <div className="flex h-[60px] shrink-0 items-center gap-2 bg-[#f0f2f5] px-2 dark:bg-[#202c33] sm:gap-3 sm:px-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-medium text-[#54656f] dark:bg-[#2a3942] dark:text-[#8696a0]">
            CRM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">Conversas</p>
            <p className="truncate text-[12px] text-[#667781]">
              S3E · WhatsApp
              {totalUnreadMsgs > 0 ? (
                <span className="ml-2 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {totalUnreadMsgs > 99 ? '99+' : totalUnreadMsgs}
                </span>
              ) : null}
            </p>
          </div>
          <div className="relative shrink-0" ref={sidebarMenuRef}>
            <button
              type="button"
              title="Menu"
              onClick={() => setSidebarMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/10 dark:text-[#8696a0] dark:hover:bg-white/10"
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
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Para criar um grupo, use o WhatsApp no telefone ou o painel do provedor.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    👥
                  </span>
                  Novo grupo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setArchivedPanelOpen(true);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    📦
                  </span>
                  Arquivadas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Mensagens favoritas ainda não estão disponíveis no CRM.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    ⭐
                  </span>
                  Mensagens favoritas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    toast.message('Seleção em massa em breve.');
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    ☑️
                  </span>
                  Selecionar conversas
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={markAllReadMut.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 disabled:opacity-50 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    markAllReadMut.mutate();
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    ✓✓
                  </span>
                  Marcar todas como lidas
                </button>
                <div className="my-1 border-t border-[#e9edef] dark:border-[#2a3942]" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={() => {
                    setProfilePanelOpen(true);
                    setSidebarMenuOpen(false);
                  }}
                >
                  <span className="text-base" aria-hidden>
                    👤
                  </span>
                  Meu perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#111b21] hover:bg-black/5 dark:text-[#e9edef] dark:hover:bg-white/5"
                  onClick={async () => {
                    setSidebarMenuOpen(false);
                    try {
                      const r = await deleteWhatsappContactCacheAll();
                      if (r.success) {
                        toast.success(`Cache de nomes limpo (${r.data?.deleted ?? 0} entradas removidas)`);
                        void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
                      } else {
                        toast.error('Erro ao limpar cache');
                      }
                    } catch {
                      toast.error('Erro ao limpar cache de nomes');
                    }
                  }}
                >
                  <span className="text-base" aria-hidden>
                    🗑️
                  </span>
                  Limpar cache de nomes
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={logoutMut.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#b91c1c] hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    handleWhatsappProviderLogout();
                  }}
                >
                  <span className="text-base" aria-hidden>
                    🚪
                  </span>
                  Desconectar WhatsApp
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            title="Agenda de contatos (GET /api/contacts/all no provedor)"
            onClick={() => {
              setContactsPanelOpen(true);
              setCheckPhoneResult(null);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#00a884] transition hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Ver contatos WhatsApp"
          >
            <ContactsBookIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Ler QR code da sessão WhatsApp"
            onClick={() => setQrModalOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#00a884] transition hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Abrir QR code da sessão WhatsApp"
          >
            <span className="text-base leading-none" aria-hidden>
              QR
            </span>
          </button>
          <button
            type="button"
            title={
              connectionStatus?.connected
                ? 'WhatsApp conectado (sessão ativa) — abrir painel do provedor'
                : 'WhatsApp desconectado — clique para abrir o painel e ler o QR code'
            }
            onClick={() =>
              window.open(connectionStatus?.dashboardUrl || FALLBACK_WHATSAPP_PROVIDER_DASHBOARD, '_blank', 'noopener,noreferrer')
            }
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm transition hover:opacity-90 dark:border-[#2a3942] ${
              connectionStatus?.connected ? 'bg-[#25d366]' : 'bg-red-500'
            }`}
            aria-label={connectionStatus?.connected ? 'Abrir painel do provedor (conectado)' : 'Abrir painel do provedor (desconectado)'}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white/90" aria-hidden />
          </button>
        </div>
        <div className="shrink-0 space-y-2 border-b border-[#e9edef] px-3 py-2 dark:border-[#2a3942]">
          <div className="relative" role="search">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] opacity-50">
              🔍
            </span>
            <input
              type="search"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Pesquisar conversa (nome, número ou última mensagem)"
              autoComplete="off"
              className="w-full rounded-lg border border-transparent bg-[#f0f2f5] py-2 pl-9 pr-3 text-[14px] text-[#111b21] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:bg-[#2a3942] dark:text-[#e9edef]"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={openPhoneDraft}
              onChange={(e) => setOpenPhoneDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleOpenByPhone();
                }
              }}
              placeholder="Novo: DDD + número (sem cadastrar lead)"
              className="min-w-0 flex-1 rounded-lg border border-[#d1d7db] bg-white px-2.5 py-2 text-[13px] text-[#111b21] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
            />
            <button
              type="button"
              onClick={handleOpenByPhone}
              className="shrink-0 rounded-lg bg-[#00a884] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#008f6f]"
            >
              Abrir conversa
            </button>
          </div>
        </div>
        <div className="wa-scroll flex-1 overflow-y-auto">
          {chatList.length === 0 && (
            <p className="p-4 text-center text-[13px] text-[#667781]">Nenhuma conversa sincronizada ainda.</p>
          )}
          {chatList.length > 0 && filteredChats.length === 0 && (
            <p className="p-4 text-center text-[13px] text-[#667781]">
              Nenhuma conversa corresponde a &quot;{chatSearch.trim()}&quot;.
            </p>
          )}
          {filteredChats.map((c) => {
            const isG = isWhatsappGroupChatId(c.chatId);
            const w = !isG ? findWhatsappContactInRows(providerContactRows, c.chatId) : undefined;
            const wg = isG ? findWhatsappGroupInRows(providerGroupRows, c.chatId) : undefined;
            const { listTitle, phone, showPhoneSub, avatarLabel, headerForChat } = resolveChatPreviewLabels(c, w, wg);
            const active = canonicalWhatsappChatId(c.chatId) === canonicalWhatsappChatId(chatId);
            const unread = (c.unreadCount ?? 0) > 0;
            const uCount = c.unreadCount ?? 0;
            const rowPic =
              c.cachedProfilePictureUrl ||
              (c.chatId === chatId ? activeContactMeta?.profilePictureUrl : null) ||
              profileUrlByChatId.get(c.chatId) ||
              null;
            return (
              <button
                key={c.chatId}
                type="button"
                onClick={() => {
                  onNavigateChat?.(canonicalWhatsappChatId(c.chatId), headerForChat);
                }}
                className={`flex w-full gap-3 border-b border-[#f0f2f5] px-3 py-3 text-left transition-colors dark:border-[#2a3942] ${
                  active ? 'bg-[#f0f2f5] dark:bg-[#2a394275]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                }`}
              >
                <ContactAvatar imageUrl={rowPic} label={avatarLabel} size="list">
                  {unread ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full border-2 border-white bg-[#25d366] px-1 text-[10px] font-bold leading-none text-white dark:border-[#111b21]"
                      aria-label={`${uCount} não lidas`}
                    >
                      {uCount > 99 ? '99+' : uCount}
                    </span>
                  ) : null}
                </ContactAvatar>
                <div className="min-w-0 flex-1 border-b border-transparent pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-[16px] text-[#111b21] dark:text-[#e9edef] ${
                        unread ? 'font-bold text-[#111b21] dark:text-white' : ''
                      }`}
                    >
                      {listTitle}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] tabular-nums ${unread ? 'font-semibold text-[#25d366]' : 'text-[#667781]'}`}
                    >
                      {formatListTime(c.lastAt)}
                    </span>
                  </div>
                  {showPhoneSub ? (
                    <p className="truncate text-[12px] leading-snug text-[#8696a0] dark:text-[#8696a0]">{phone}</p>
                  ) : null}
                  <p
                    className={`mt-0.5 truncate text-[14px] ${
                      unread ? 'font-semibold text-[#111b21] dark:text-[#e9edef]' : 'text-[#667781] dark:text-[#8696a0]'
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
                    {c.lastContent.slice(0, 48)}
                    {c.lastContent.length > 48 ? '…' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-2 py-2 dark:border-[#2a3942] dark:bg-[#202c33]">
          <button
            type="button"
            onClick={() => setProfilePanelOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            title="Meu perfil (WhatsApp e CRM)"
          >
            {sessionProfilePayload?.profilePictureUrl ? (
              <img
                src={sessionProfilePayload.profilePictureUrl}
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

              <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-[#e9edef] bg-[#f8f9fa] p-3 dark:border-[#2a3942] dark:bg-[#111b21]">
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
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#111b21]">
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
                  const { listTitle, phone, showPhoneSub, headerForChat } = resolveChatPreviewLabels(c, w, wg);
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
                        {showPhoneSub ? (
                          <p className="truncate text-[12px] text-[#8696a0]">{phone}</p>
                        ) : null}
                        <p className="mt-0.5 truncate text-[13px] text-[#667781]">{c.lastContent.slice(0, 56)}</p>
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
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21]">
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
              {sessionProfilePayload?.profilePictureUrl ? (
                <img
                  src={sessionProfilePayload.profilePictureUrl}
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
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21]">
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
              {(activePreview?.cachedProfilePictureUrl || activeContactMeta?.profilePictureUrl || profileUrlByChatId.get(chatId)) ? (
                <img
                  src={
                    activePreview?.cachedProfilePictureUrl ||
                    activeContactMeta?.profilePictureUrl ||
                    profileUrlByChatId.get(chatId) ||
                    ''
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
                  onClick={() => {
                    const digits = waJidToDigits(canonicalWhatsappChatId(chatId));
                    evoFetchContactProfileMut.mutate(digits);
                  }}
                  className="rounded-lg border border-[#00a884] px-3 py-2 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                >
                  {evoFetchContactProfileMut.isPending ? 'Buscando…' : 'Buscar perfil'}
                </button>
                <button
                  type="button"
                  disabled={evoFetchBusinessProfileMut.isPending}
                  onClick={() => {
                    const digits = waJidToDigits(canonicalWhatsappChatId(chatId));
                    evoFetchBusinessProfileMut.mutate(digits);
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
                          const fname = m.mediaFilename || m.fileName || 'imagem';
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
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21]">
            <div className="sticky top-0 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e9edef] bg-white px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <h2 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Gerenciar grupo</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={refreshGroupInfoMut.isPending}
                  onClick={() => refreshGroupInfoMut.mutate()}
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
                  {groupInfo?.participants.length ?? 0} membros
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
                {groupInfo?.participants.length ? (
                  groupInfo.participants.map((p) => (
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
          <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#111b21]">
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
              Dados do provedor (<code className="rounded bg-black/5 px-1 text-[10px] dark:bg-white/10">GET /api/contacts/all</code>
              ). No motor NOWEB é necessário ter a <strong>Store</strong> ativa para listar contatos. Antes de enviar para
              número novo no Brasil, use a verificação abaixo (dígito 9). Consulte a documentação do seu provedor WhatsApp
              para detalhes da API de contatos.
            </p>
            <div className="shrink-0 space-y-2 border-b border-[#e9edef] px-3 py-2 dark:border-[#2a3942]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={contactsPanelLoading}
                  onClick={() => void refetchContactsPanel()}
                  className="rounded-lg bg-[#00a884] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
                >
                  {contactsPanelLoading ? 'Carregando…' : 'Atualizar lista'}
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
                <label className="flex items-center gap-1 text-[12px] text-[#667781]">
                  Limite
                  <select
                    value={contactsLimit}
                    onChange={(e) => setContactsLimit(Number(e.target.value))}
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1 text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  >
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </label>
              </div>
              <input
                type="search"
                value={contactsFilter}
                onChange={(e) => setContactsFilter(e.target.value)}
                placeholder="Filtrar nesta página (nome, JID, número)…"
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
              {contactsPanelLoading && !contactsPanelRows.length ? (
                <div className="flex justify-center py-12">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              ) : null}
              {!contactsPanelLoading && filteredContactsPanel.length === 0 ? (
                <p className="p-4 text-center text-[13px] text-[#667781]">
                  {contactsPanelRows.length === 0
                    ? 'Nenhum contato retornado pelo provedor (confira sessão, motor e Store).'
                    : 'Nenhum resultado para o filtro.'}
                </p>
              ) : null}
              {filteredContactsPanel.map((row) => {
                const primary = whatsappContactDisplayName(row) || formatPhoneForDisplay(row.id);
                const sub = [row.pushname, row.id !== primary ? row.id : '', row.number].filter(Boolean).join(' · ');
                const rowPic = contactPicByContactId.get(row.id) ?? null;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      const numberDigits = (row.number || '').replace(/\D/g, '');
                      const source = numberDigits.length >= 10 ? toWhatsappChatId(numberDigits) : row.id;
                      const jid = canonicalWhatsappChatId(source);
                      onNavigateChat?.(jid, whatsappContactDisplayName(row) || formatPhoneForDisplay(jid));
                      setContactsPanelOpen(false);
                    }}
                    className="flex w-full gap-3 border-b border-[#e9edef] px-3 py-2.5 text-left transition-colors hover:bg-white dark:border-[#2a3942] dark:hover:bg-[#202c33]"
                  >
                    <ContactAvatar imageUrl={rowPic} label={primary} size="list" />
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
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </aside>

      {/* Coluna direita — conversa ativa */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a]">
        {!chatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#efeae2] px-6 text-center dark:bg-[#0b141a]">
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
            <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-[#e9edef] bg-[#f0f2f5] px-3 dark:border-[#2a3942] dark:bg-[#202c33]">
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
                        if (
                          !window.confirm(
                            'Apagar esta conversa no CRM e no WhatsApp? O histórico local será removido.'
                          )
                        ) {
                          return;
                        }
                        deleteConversationMut.mutate();
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
                  className="rounded-full p-2 text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
                  aria-label="Fechar painel"
                >
                  <span className="text-lg leading-none">✕</span>
                </button>
              )}
            </header>

            <WhatsAppActionsDrawer
              open={actionsPanelOpen}
              onClose={() => setActionsPanelOpen(false)}
              chatLabel={headerPrimary || title || ''}
              chatPhone={formatPhoneForDisplay(chatId)}
              context={actionsContextSnapshot || actionsContextQuery.data || null}
              loading={actionsContextQuery.isLoading || actionsContextQuery.isFetching}
              modeSaving={updateStatusModeMut.isPending}
              linkLoading={linkClienteMut.isPending}
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
              onSendOrcamentoPdf={(params) => {
                if (!chatId || !params?.orcamentoId) return;
                sendOrcamentoPdfMut.mutate(params);
              }}
              onChangeMode={(mode) => {
                updateStatusModeMut.mutate(mode);
              }}
            />

            <div
              className="wa-scroll relative min-h-0 flex-1 overflow-y-auto py-2"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: CHAT_BG_PATTERN,
              }}
            >
              {loadingMsgs && (
                <div className="flex justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              )}
              {!loadingMsgs &&
                displayMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`group flex w-full flex-col py-0.5 ${m.fromMe ? 'items-end' : 'items-start'}`}
                  >
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
                        <MessageBubble
                          m={m}
                          layout={layout}
                          showGroupParticipant={activeIsGroup}
                          groupParticipantLabel={activeIsGroup ? resolveGroupParticipantLabel(m.participant) : null}
                        />
                        {m.fromMe && m.providerMessageId ? (
                          <div
                            className={`mt-0.5 flex max-w-[min(78%,720px)] gap-4 px-1 opacity-0 transition-opacity group-hover:opacity-100 sm:max-w-[min(65%,420px)] ${m.fromMe ? 'justify-end' : ''}`}
                          >
                            <button
                              type="button"
                              className="text-[12px] font-medium text-[#00a884] hover:underline"
                              onClick={() => startEditMessage(m)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-[12px] font-medium text-red-600 hover:underline disabled:opacity-50"
                              disabled={deleteMessageMut.isPending}
                              onClick={() => handleDeleteMessage(m.id)}
                            >
                              Excluir
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}
              <div ref={bottomRef} />
            </div>

            {pendingMedia && (
              <div className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <div className="flex items-start gap-3">
                  {pendingMedia.previewUrl ? (
                    <img
                      src={pendingMedia.previewUrl}
                      alt="Preview"
                      className="h-20 w-20 shrink-0 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#dfe5e7] text-2xl dark:bg-[#2a3942]">
                      {pendingMedia.mediaType === 'voice' ? '🎤' : pendingMedia.mediaType === 'video' ? '🎥' : '📎'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                      {pendingMedia.file.name}
                    </p>
                    <p className="text-[12px] text-[#667781]">
                      {(pendingMedia.file.size / 1024).toFixed(0)} KB
                      {' · '}
                      {pendingMedia.mediaType === 'image' ? 'Imagem' : pendingMedia.mediaType === 'voice' ? 'Áudio' : pendingMedia.mediaType === 'video' ? 'Vídeo' : 'Documento'}
                    </p>
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
                      placeholder="Legenda (opcional)"
                      className="mt-1.5 w-full rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] placeholder:text-[#8696a0] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelMedia}
                    className="rounded-lg px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 dark:text-[#8696a0]"
                  >
                    Cancelar
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
            )}

            {pendingRecordedAudio && !isRecordingAudio ? (
              <div className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-lg dark:bg-[#2a3942]">
                    🎙
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

            {locationComposerOpen ? (
              <div className="flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-lg dark:bg-[#2a3942]">
                    📍
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">Enviar localização</p>
                    <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                      Informe os dados do local para enviar ao contato.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={locationNameDraft}
                    onChange={(e) => setLocationNameDraft(e.target.value)}
                    placeholder="Nome da cidade/local"
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  />
                  <input
                    type="text"
                    value={locationAddressDraft}
                    onChange={(e) => setLocationAddressDraft(e.target.value)}
                    placeholder="Endereço"
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  />
                  <input
                    type="text"
                    value={locationLatitudeDraft}
                    onChange={(e) => setLocationLatitudeDraft(e.target.value)}
                    placeholder="Latitude (ex.: -23.550520)"
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  />
                  <input
                    type="text"
                    value={locationLongitudeDraft}
                    onChange={(e) => setLocationLongitudeDraft(e.target.value)}
                    placeholder="Longitude (ex.: -46.633308)"
                    className="rounded border border-[#d1d7db] bg-white px-2 py-1.5 text-[13px] text-[#111b21] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                  />
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="rounded-lg border border-[#00a884] px-3 py-1.5 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10"
                  >
                    Usar minha localização
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLocationComposerOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 dark:text-[#8696a0]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={sendLocationMut.isPending}
                      onClick={() => sendLocationMut.mutate()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                    >
                      {sendLocationMut.isPending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <SendPlaneIcon className="h-4 w-4" />
                      )}
                      Enviar localização
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <footer className="flex shrink-0 items-end gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT}
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
                aria-label="Anexar arquivo"
                title="Enviar imagem, áudio, vídeo ou documento"
              >
                <AttachIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setLocationComposerOpen((v) => !v)}
                disabled={sendLocationMut.isPending || isWhatsappGroupChatId(chatId)}
                className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5 disabled:opacity-40 dark:text-[#8696a0] dark:hover:bg-white/5"
                aria-label="Enviar localização"
                title="Enviar localização (sendLocation)"
              >
                <LocationPinIcon className="h-6 w-6" />
              </button>
              {isRecordingAudio ? (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Gravando {formatRecordingElapsed(recordingElapsedSec)}
                </div>
              ) : null}
              <button
                type="button"
                onClick={toggleAudioRecording}
                disabled={sendAudioMut.isPending || isWhatsappGroupChatId(chatId)}
                className={`mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                  isRecordingAudio
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5'
                }`}
                aria-label="Enviar áudio WhatsApp"
                title={isRecordingAudio ? 'Parar e enviar áudio' : 'Gravar áudio (sendWhatsAppAudio)'}
              >
                {sendAudioMut.isPending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isRecordingAudio ? (
                  <span className="text-base font-bold leading-none" aria-hidden>
                    ■
                  </span>
                ) : (
                  <span className="text-xl leading-none" aria-hidden>
                    🎙
                  </span>
                )}
              </button>
              {isRecordingAudio ? (
                <button
                  type="button"
                  onClick={cancelCurrentRecording}
                  className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
                  aria-label="Cancelar gravação"
                  title="Cancelar gravação sem enviar"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    ✕
                  </span>
                </button>
              ) : null}
              <EmojiInput value={draft} onChange={setDraft} onSubmit={handleSend} disabled={sendMut.isPending} />
              <button
                type="button"
                onClick={handleSend}
                disabled={sendMut.isPending || !draft.trim()}
                className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm transition enabled:hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:bg-[#8696a0]/40 disabled:text-white/70 dark:disabled:bg-[#2a3942]"
                aria-label="Enviar"
              >
                {sendMut.isPending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <SendPlaneIcon className="ml-0.5 h-6 w-6" />
                )}
              </button>
            </footer>
          </>
        )}
      </div>

      <style>{`
        .wa-scroll::-webkit-scrollbar { width: 6px; }
        .wa-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
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
