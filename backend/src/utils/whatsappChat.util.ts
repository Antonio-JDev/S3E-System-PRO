export function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

export function waJidToDigits(jid: string): string {
  return digitsOnly((jid || '').split('@')[0] || jid);
}

/**
 * DM: sempre `55...` + `@c.us` (alinha com o front / funil). O provedor pode mandar `@s.whatsapp.net`.
 * Grupos / newsletter / lid: mantém o jid como veio.
 */
export function canonicalWhatsappChatId(jid: string): string {
  const raw = (jid || '').trim();
  if (!raw) return jid;
  const lower = raw.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return raw;
  }
  const localPart = raw.split('@')[0] || '';
  const d0 = digitsOnly(localPart);
  if (!d0) return raw;
  let d = d0;
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return `${d}@c.us`;
}

/** Variações possíveis do mesmo contato no banco (legado + formatos do provedor). */
export function storageChatIdVariants(chatId: string): string[] {
  const raw = (chatId || '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return [raw];
  }
  const canonical = canonicalWhatsappChatId(raw);
  const digits = waJidToDigits(canonical);
  const out = new Set<string>([raw, canonical]);
  if (digits) {
    out.add(`${digits}@c.us`);
    out.add(`${digits}@s.whatsapp.net`);
    out.add(`${digits}@lid`);
    if (digits.startsWith('55') && digits.length > 2) {
      const rest = digits.slice(2);
      out.add(`${rest}@c.us`);
      out.add(`${rest}@s.whatsapp.net`);
      out.add(`${rest}@lid`);
    } else if (!digits.startsWith('55')) {
      out.add(`55${digits}@c.us`);
      out.add(`55${digits}@s.whatsapp.net`);
      out.add(`55${digits}@lid`);
    }
  }
  return [...out].filter(Boolean);
}

/** Converte telefone cadastrado (máscara ou dígitos) para chatId WhatsApp */
export function toWhatsappChatId(phone: string): string {
  let d = digitsOnly(phone);
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return `${d}@c.us`;
}

/**
 * Resolve o chatId "da conversa" a partir do payload do provedor.
 *
 * - DM: mantém o comportamento antigo (peer = from/to conforme fromMe)
 * - Grupos/newsletter: o chat é o JID do grupo (`...@g.us`) / canal (`...@newsletter`),
 *   mesmo quando o provedor envia `from` como o participante que falou.
 */
export function peerChatIdFromPayload(payload: {
  from: string;
  to: string;
  fromMe: boolean;
  chatId?: string;
  participant?: string;
}): string {
  const chatId = (payload.chatId || '').trim();
  if (chatId) return chatId;

  const to = (payload.to || '').trim();
  const lowerTo = to.toLowerCase();
  if (lowerTo.endsWith('@g.us') || lowerTo.endsWith('@newsletter')) {
    return to;
  }

  return payload.fromMe ? payload.to : payload.from;
}

export function formatOutboundPrefix(userName: string, text: string): string {
  const name = (userName || 'Usuário').trim() || 'Usuário';
  return `*${name}*\n\n${text}`;
}

/** Remove o prefixo *Nome*\n\n das mensagens enviadas pelo CRM (para edição do texto). */
export function stripOutboundPrefixForEdit(content: string): string {
  const m = content.match(/^\*[^*]+\*\s*\n\n([\s\S]*)$/);
  return m ? m[1].trim() : content.trim();
}

/** Categoria persistida em chat_messages.media_type */
export function inferStoredMediaType(mimetype: string, _filename?: string): string {
  const m = (mimetype || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return 'document';
}

export function normalizeAudioContentType(mimetype: string | null | undefined, filename?: string | null): string {
  const m = (mimetype || '').toLowerCase();
  const lowName = (filename || '').toLowerCase();
  if (m.includes('ogg') || lowName.endsWith('.ogg') || lowName.endsWith('.oga') || lowName.endsWith('.opus')) {
    return 'audio/ogg';
  }
  if (m.includes('webm') || lowName.endsWith('.webm')) {
    return 'audio/webm';
  }
  return mimetype && m.trim() ? m : 'application/octet-stream';
}
