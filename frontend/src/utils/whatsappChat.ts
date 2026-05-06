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
 * Para reduzir duplicidade de conversa, `@lid` também é normalizado para `@c.us`.
 */
export function canonicalWhatsappChatId(jid: string): string {
  const raw = (jid || '').trim();
  if (!raw) return jid;
  const lower = raw.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
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

/** Telefone formatado (BR) a partir do chatId; LID sem PN retorna rótulo curto. */
export function formatPhoneForDisplay(chatId: string): string {
  const raw = (chatId || '').trim();
  const lower = raw.toLowerCase();
  if (lower.endsWith('@lid')) {
    const local = raw.split('@')[0] || '';
    const d = onlyDigits(local);
    if (d.length >= 4) {
      return `…${d.slice(-8)}`;
    }
    return 'Contato (ID oculto)';
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

export interface WhatsappContactLike {
  id: string;
  number?: string;
  name?: string;
  pushname?: string;
  shortName?: string;
  isGroup?: boolean;
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
export function sanitizeWhatsappContactMetaForChat<T extends { contact?: WhatsappContactLike | null; group?: WhatsappGroupLike | null; profilePictureUrl?: string | null }>(
  chatId: string,
  meta: T | null | undefined
): T | null | undefined {
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

/** Cabeçalho do chat: nome (CRM → provedor ao vivo → título) e linha com número. */
export function displayNameForChatHeader(params: {
  chatId: string;
  crmName?: string | null;
  /** @deprecated cache removido da prioridade de exibição — campo mantido por compatibilidade. */
  cachedProviderName?: string | null;
  providerContactName?: string;
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

  const phone = formatPhoneForDisplay(params.chatId);
  const crm = params.crmName?.trim();
  const pn = params.providerContactName?.trim();
  const fb = params.fallbackTitle?.trim();
  const titleDigits = fb ? onlyDigits(fb) : '';
  const chatDigits = waJidToDigits(params.chatId);
  const fbIsJustNumber = Boolean(fb && titleDigits && titleDigits === chatDigits);
  const fbMismatchNumber =
    Boolean(titleDigits) &&
    titleDigits.length >= 8 &&
    chatDigits.length >= 8 &&
    titleDigits !== chatDigits;
  const isLid = params.chatId.trim().toLowerCase().endsWith('@lid');
  const primary = crm || pn || (fb && !fbIsJustNumber && !fbMismatchNumber ? fb : '') || phone;
  const secondary =
    primary !== phone ? phone : isLid ? 'WhatsApp · privacidade (sem número no JID)' : 'WhatsApp';
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

/** Lista de conversas: título (nome) + opcional linha com número, estilo WhatsApp. */
export function resolveChatPreviewLabels(
  c: { chatId: string; contactName?: string | null; providerCachedName?: string | null },
  providerContact: WhatsappContactLike | undefined,
  providerGroup: WhatsappGroupLike | undefined
): { listTitle: string; phone: string; showPhoneSub: boolean; avatarLabel: string; headerForChat: string } {
  const phone = formatPhoneForDisplay(c.chatId);
  const isG = isWhatsappGroupChatId(c.chatId);
  const wn = whatsappContactDisplayName(providerContact);
  const gname = whatsappGroupDisplayName(providerGroup);
  const crmShort = c.contactName ? firstNameOnly(c.contactName) : '';
  const namePart = crmShort || (isG ? gname : wn) || '';
  const listTitle = namePart || phone;
  const showPhoneSub = !isG && Boolean(namePart) && listTitle !== phone;
  const avatarLabel = c.contactName || (isG ? gname : wn) || phone;
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
