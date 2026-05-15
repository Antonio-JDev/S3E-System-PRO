/**
 * Converte payloads de webhook da Evolution API v2 (Baileys) para o formato
 * esperado pelo normalizador legado do CRM.
 */

export function evolutionWebhookSession(body: Record<string, unknown>): string | undefined {
  if (typeof body.session === 'string' && body.session.trim()) return body.session.trim();
  if (typeof body.instance === 'string' && body.instance.trim()) return body.instance.trim();
  return undefined;
}

export function evolutionExtractMessagesUpsertData(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') as Record<string, unknown>[];
  }
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const msgs = d.messages;
    if (Array.isArray(msgs)) {
      return msgs.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') as Record<
        string,
        unknown
      >[];
    }
    if (d.key && typeof d.key === 'object') {
      return [d];
    }
  }
  return [];
}

function asTrimmedString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isLidJid(jid: string): boolean {
  return jid.toLowerCase().endsWith('@lid');
}

/**
 * Em alguns eventos o provedor envia JID "principal" em LID e o alternativo em PN/s.whatsapp.
 * Para evitar colisões e vazamento de cache entre contatos, preferimos manter o JID primário
 * quando ele existe (mesmo sendo @lid). Só usamos o secundário quando o primário não veio.
 */
function pickPreferredJid(primary: unknown, secondary: unknown): string {
  const p = asTrimmedString(primary);
  const s = asTrimmedString(secondary);
  if (!p) return s;
  return p;
}

/** Ignora atualizações de protocolo / vazias que não são conversa. */
function isNoiseEvolutionMessage(m: Record<string, unknown>): boolean {
  const inner = m.message as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== 'object') return true;
  if (inner.protocolMessage || inner.senderKeyDistributionMessage) return true;
  return false;
}

/**
 * Payload normalizado de reação extraído de um `messages.upsert` (ou
 * `messages.reaction`) da Evolution API v2 / Evolution Go.
 *
 *  - `targetProviderMessageId`: id da MENSAGEM ORIGINAL que recebeu o emoji
 *    (chave para localizar a `ChatMessage` no banco).
 *  - `reaction`: emoji aplicado; string vazia = REMOVER reação anterior.
 *  - `targetChatId`: JID do chat onde a mensagem original existe.
 *  - `targetFromMe`: `true` se a mensagem original foi enviada por nós (debug).
 *  - `reactorJid`: quem reagiu (cliente, ou nós mesmos quando reagimos pelo app).
 */
export interface EvolutionReactionWebhookPayload {
  targetProviderMessageId: string;
  reaction: string;
  targetChatId: string | null;
  targetFromMe: boolean;
  reactorJid: string | null;
}

/**
 * Detecta se o payload de `messages.upsert` representa uma reação (Baileys
 * envia reactions como uma mensagem normal contendo `message.reactionMessage`).
 *
 * Retorna `null` quando o payload não é uma reação — o caller deve seguir o
 * fluxo normal de mensagem.
 */
export function evolutionExtractReactionFromUpsert(
  m: Record<string, unknown>
): EvolutionReactionWebhookPayload | null {
  const inner = m.message as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== 'object') return null;
  const reactionNode = inner.reactionMessage as Record<string, unknown> | undefined;
  if (!reactionNode || typeof reactionNode !== 'object') return null;
  const targetKey = reactionNode.key as Record<string, unknown> | undefined;
  if (!targetKey || typeof targetKey !== 'object') return null;

  const targetProviderMessageId =
    typeof targetKey.id === 'string' && targetKey.id.trim() ? targetKey.id.trim() : '';
  if (!targetProviderMessageId) return null;

  const targetChatId = asTrimmedString(targetKey.remoteJid) || null;
  const targetFromMe = targetKey.fromMe === true;

  const reaction =
    typeof reactionNode.text === 'string' ? reactionNode.text : '';

  const outerKey = m.key as Record<string, unknown> | undefined;
  const reactorJid =
    outerKey && typeof outerKey === 'object'
      ? asTrimmedString((outerKey as Record<string, unknown>).participant) ||
        asTrimmedString((outerKey as Record<string, unknown>).remoteJid) ||
        null
      : null;

  return {
    targetProviderMessageId,
    reaction,
    targetChatId,
    targetFromMe,
    reactorJid
  };
}

/**
 * Alguns provedores emitem um evento dedicado `messages.reaction` em vez de
 * embutir o `reactionMessage` em `messages.upsert`. Aceitamos ambos os formatos.
 */
export function evolutionExtractReactionFromReactionEvent(
  data: unknown
): EvolutionReactionWebhookPayload | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;

  // Variante "achatada" (campos top-level).
  const flatTargetId =
    typeof root.messageId === 'string' && root.messageId.trim()
      ? root.messageId.trim()
      : typeof root.id === 'string' && root.id.trim()
        ? root.id.trim()
        : '';
  const flatChatId = asTrimmedString(root.remoteJid) || asTrimmedString(root.chatId) || null;
  const flatReaction =
    typeof root.reaction === 'string'
      ? root.reaction
      : typeof root.text === 'string'
        ? root.text
        : '';
  if (flatTargetId) {
    return {
      targetProviderMessageId: flatTargetId,
      reaction: flatReaction,
      targetChatId: flatChatId,
      targetFromMe: root.fromMe === true,
      reactorJid: asTrimmedString(root.reactorJid) || null
    };
  }

  // Variante aninhada (compat com messages.upsert).
  return evolutionExtractReactionFromUpsert(root);
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractVcardFromContactEntry(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const o = entry as Record<string, unknown>;
  if (typeof o.vcard === 'string' && o.vcard.trim()) return o.vcard.trim();
  const nested = o.contactMessage;
  if (nested && typeof nested === 'object') {
    const v = (nested as Record<string, unknown>).vcard;
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function buildMinimalVcard(displayName: string): string {
  const safe = displayName.replace(/\r|\n/g, ' ').trim() || 'Contato';
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${safe}\nEND:VCARD`;
}

function formatLocationBody(raw: Record<string, unknown>): string {
  const name = asTrimmedString(raw.name);
  const address = asTrimmedString(raw.address);
  const lat = asFiniteNumber(raw.degreesLatitude ?? raw.latitude);
  const lng = asFiniteNumber(raw.degreesLongitude ?? raw.longitude);
  const lines: string[] = ['📍 Localização compartilhada'];
  if (name) lines.push(`Nome: ${name}`);
  if (address) lines.push(`Endereço: ${address}`);
  if (lat !== null && lng !== null) {
    lines.push(`Coordenadas: ${lat},${lng}`);
    lines.push(`https://maps.google.com/?q=${lat},${lng}`);
  }
  return lines.join('\n');
}

function unwrapMessageNode(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== 'object') return {};
  let current = node as Record<string, unknown>;
  for (let i = 0; i < 6; i++) {
    if (current.ephemeralMessage && typeof current.ephemeralMessage === 'object') {
      const next = (current.ephemeralMessage as Record<string, unknown>).message;
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>;
        continue;
      }
    }
    if (current.viewOnceMessage && typeof current.viewOnceMessage === 'object') {
      const next = (current.viewOnceMessage as Record<string, unknown>).message;
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>;
        continue;
      }
    }
    if (current.viewOnceMessageV2 && typeof current.viewOnceMessageV2 === 'object') {
      const next = (current.viewOnceMessageV2 as Record<string, unknown>).message;
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>;
        continue;
      }
    }
    if (current.viewOnceMessageV2Extension && typeof current.viewOnceMessageV2Extension === 'object') {
      const next = (current.viewOnceMessageV2Extension as Record<string, unknown>).message;
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>;
        continue;
      }
    }
    if (current.editedMessage && typeof current.editedMessage === 'object') {
      const next = (current.editedMessage as Record<string, unknown>).message;
      if (next && typeof next === 'object') {
        current = next as Record<string, unknown>;
        continue;
      }
    }
    break;
  }
  return current;
}

/**
 * Converte status numérico da Evolution API (protocolo Baileys) para a
 * convenção interna do CRM: 1=enviado, 2=entregue, 3=lido, 4=reproduzido.
 * Evolution/Baileys: 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED.
 */
function evolutionStatusToInternalAck(status: number): number {
  if (status <= 0) return -1;
  if (status <= 2) return 1;
  if (status === 3) return 2;
  if (status === 4) return 3;
  return 4;
}

export function evolutionUpsertMessageToProviderRaw(m: Record<string, unknown>): Record<string, unknown> | null {
  if (isNoiseEvolutionMessage(m)) return null;

  const key = m.key as Record<string, unknown> | undefined;
  if (!key || typeof key !== 'object') return null;
  const remoteJid = pickPreferredJid(key.remoteJid, key.remoteJidAlt);
  if (!remoteJid || remoteJid === 'status@broadcast') return null;

  const fromMe = key.fromMe === true;
  const participant = pickPreferredJid(key.participant, key.participantAlt) || undefined;
  const from = !fromMe && participant ? participant : remoteJid;

  const innerRaw = m.message as Record<string, unknown> | undefined;
  const inner = unwrapMessageNode(innerRaw);
  let bodyText = '';
  let type: string | undefined;
  let hasMedia = false;
  let mediaMimetype: string | undefined;
  let mediaFilename: string | undefined;
  let mediaUrl: string | undefined;
  let providerMediaId: string | undefined;

  if (inner && typeof inner === 'object') {
    if (typeof inner.conversation === 'string') {
      bodyText = inner.conversation;
    } else if (inner.extendedTextMessage && typeof inner.extendedTextMessage === 'object') {
      const et = inner.extendedTextMessage as Record<string, unknown>;
      if (typeof et.text === 'string') bodyText = et.text;
    } else if (inner.locationMessage && typeof inner.locationMessage === 'object') {
      type = 'location';
      hasMedia = false;
      bodyText = formatLocationBody(inner.locationMessage as Record<string, unknown>);
    } else if (inner.imageMessage && typeof inner.imageMessage === 'object') {
      type = 'image';
      hasMedia = true;
      const im = inner.imageMessage as Record<string, unknown>;
      if (typeof im.caption === 'string') bodyText = im.caption;
      if (typeof im.mimetype === 'string') mediaMimetype = im.mimetype;
      if (typeof im.fileName === 'string') mediaFilename = im.fileName;
      if (typeof im.url === 'string') mediaUrl = im.url;
      if (typeof im.directPath === 'string') providerMediaId = im.directPath;
    } else if (inner.videoMessage && typeof inner.videoMessage === 'object') {
      type = 'video';
      hasMedia = true;
      const vm = inner.videoMessage as Record<string, unknown>;
      if (typeof vm.caption === 'string') bodyText = vm.caption;
      if (typeof vm.mimetype === 'string') mediaMimetype = vm.mimetype;
      if (typeof vm.fileName === 'string') mediaFilename = vm.fileName;
      if (typeof vm.url === 'string') mediaUrl = vm.url;
      if (typeof vm.directPath === 'string') providerMediaId = vm.directPath;
    } else if (inner.audioMessage && typeof inner.audioMessage === 'object') {
      type = 'audio';
      hasMedia = true;
      const am = inner.audioMessage as Record<string, unknown>;
      if (typeof am.mimetype === 'string') mediaMimetype = am.mimetype;
      if (typeof am.fileName === 'string') mediaFilename = am.fileName;
      if (typeof am.url === 'string') mediaUrl = am.url;
      if (typeof am.directPath === 'string') providerMediaId = am.directPath;
    } else if (inner.documentMessage && typeof inner.documentMessage === 'object') {
      type = 'document';
      hasMedia = true;
      const dm = inner.documentMessage as Record<string, unknown>;
      if (typeof dm.caption === 'string') bodyText = dm.caption;
      if (typeof dm.mimetype === 'string') mediaMimetype = dm.mimetype;
      if (typeof dm.fileName === 'string') mediaFilename = dm.fileName;
      if (typeof dm.url === 'string') mediaUrl = dm.url;
      if (typeof dm.directPath === 'string') providerMediaId = dm.directPath;
    } else if (inner.contactMessage && typeof inner.contactMessage === 'object') {
      type = 'contact';
      hasMedia = false;
      const cm = inner.contactMessage as Record<string, unknown>;
      const vcard = typeof cm.vcard === 'string' ? cm.vcard.trim() : '';
      const displayName = typeof cm.displayName === 'string' ? cm.displayName.trim() : '';
      if (vcard && /BEGIN:VCARD/i.test(vcard)) {
        bodyText = vcard;
      } else if (displayName) {
        bodyText = buildMinimalVcard(displayName);
      } else {
        bodyText = buildMinimalVcard('Contato');
      }
    } else if (inner.contactsArrayMessage && typeof inner.contactsArrayMessage === 'object') {
      type = 'contact';
      hasMedia = false;
      const cam = inner.contactsArrayMessage as Record<string, unknown>;
      const arr = cam.contacts;
      let picked: string | null = null;
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          picked = extractVcardFromContactEntry(entry);
          if (picked && /BEGIN:VCARD/i.test(picked)) break;
        }
      }
      const displayName = typeof cam.displayName === 'string' ? cam.displayName.trim() : '';
      if (picked && /BEGIN:VCARD/i.test(picked)) {
        bodyText = picked;
      } else if (displayName) {
        bodyText = buildMinimalVcard(displayName);
      } else {
        bodyText = buildMinimalVcard('Contato');
      }
    } else if (inner.stickerMessage) {
      type = 'sticker';
      hasMedia = true;
    } else {
      const keys = Object.keys(inner).filter((k) => k.endsWith('Message'));
      if (keys.length > 0) {
        hasMedia = true;
        type = keys[0].replace(/Message$/i, '').toLowerCase();
      }
    }
  }

  const tsRaw = m.messageTimestamp ?? m.timestamp;
  let timestamp = 0;
  if (typeof tsRaw === 'number' && !Number.isNaN(tsRaw)) {
    timestamp = tsRaw > 1e12 ? Math.floor(tsRaw / 1000) : Math.floor(tsRaw);
  } else if (typeof tsRaw === 'string') {
    const n = parseInt(tsRaw, 10);
    if (!Number.isNaN(n)) timestamp = n > 1e12 ? Math.floor(n / 1000) : n;
  }

  let ack: number | undefined;
  const rawStatus = m.status;
  if (typeof rawStatus === 'number' && !Number.isNaN(rawStatus) && rawStatus > 0) {
    ack = evolutionStatusToInternalAck(rawStatus);
  }

  return {
    id: key.id,
    from,
    to: remoteJid,
    fromMe,
    body: bodyText || undefined,
    chatId: remoteJid,
    participant,
    timestamp,
    ack,
    hasMedia:
      hasMedia ||
      Boolean(
        type &&
          type !== 'conversation' &&
          type !== 'location' &&
          type !== 'contact'
      ),
    type,
    mediaMimetype,
    mediaFilename,
    mediaUrl,
    providerMediaId,
    _data: m
  };
}

function toObjectList(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  }
  if (typeof data === 'object') {
    return [data as Record<string, unknown>];
  }
  return [];
}

function normalizeWebhookChatId(row: Record<string, unknown>): string {
  return pickPreferredJid(
    row.remoteJid ?? row.id ?? row.jid ?? row.chatId ?? row.chat,
    row.remoteJidAlt
  );
}

/** contacts.update -> payload simplificado para cache de nome/foto no CRM. */
export function evolutionExtractContactsUpdateData(data: unknown): Array<Record<string, unknown>> {
  const list = toObjectList(data);
  const out: Array<Record<string, unknown>> = [];
  for (const row of list) {
    const chatId = normalizeWebhookChatId(row);
    if (!chatId || chatId === 'status@broadcast') continue;
    const displayName =
      asTrimmedString(row.pushName) ||
      asTrimmedString(row.name) ||
      asTrimmedString(row.shortName) ||
      asTrimmedString(row.notify) ||
      null;
    const profilePictureUrl =
      asTrimmedString(row.profilePicUrl) ||
      asTrimmedString(row.profilePictureUrl) ||
      asTrimmedString(row.photoUrl) ||
      null;
    out.push({ chatId, displayName, profilePictureUrl });
  }
  return out;
}

/** chats.update / chats.upsert -> payload simplificado para cache de nome/foto no CRM. */
export function evolutionExtractChatsUpdateData(data: unknown): Array<Record<string, unknown>> {
  const list = toObjectList(data);
  const out: Array<Record<string, unknown>> = [];
  for (const row of list) {
    const chatId = normalizeWebhookChatId(row);
    if (!chatId || chatId === 'status@broadcast') continue;
    const displayName =
      asTrimmedString(row.pushName) ||
      asTrimmedString(row.name) ||
      asTrimmedString(row.subject) ||
      asTrimmedString(row.title) ||
      null;
    const profilePictureUrl =
      asTrimmedString(row.profilePicUrl) ||
      asTrimmedString(row.profilePictureUrl) ||
      null;
    out.push({ chatId, displayName, profilePictureUrl });
  }
  return out;
}

/** messages.update → payload compatível com ingestWhatsappProviderMessageAck. */
export function evolutionMessageUpdateToAckPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const key = d.key;
  const update = d.update as Record<string, unknown> | undefined;
  let ack: number | undefined;
  let ackName: string | undefined;
  const coerceAckName = (raw: unknown): string | undefined => {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return undefined;
  };
  const coerceAckNumber = (raw: unknown): number | undefined => {
    if (typeof raw === 'number' && !Number.isNaN(raw)) return Math.trunc(raw);
    if (typeof raw === 'string') {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  };
  if (update && typeof update === 'object') {
    const st = update.status;
    const raw = coerceAckNumber(st);
    if (raw !== undefined) {
      ack = evolutionStatusToInternalAck(raw);
    } else {
      ackName = coerceAckName(st);
    }
  }
  if (ack === undefined) {
    const raw = coerceAckNumber(d.status);
    if (raw !== undefined) ack = evolutionStatusToInternalAck(raw);
  }
  if (ackName === undefined) {
    ackName = coerceAckName((update as Record<string, unknown> | undefined)?.statusName) ?? coerceAckName(d.statusName);
  }
  if (key && typeof key === 'object') {
    const out: Record<string, unknown> = { key };
    if (ack !== undefined) out.ack = ack;
    if (ack === undefined && ackName) out.ackName = ackName;
    return out;
  }
  return null;
}

export function evolutionPresenceToProviderPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const idRaw =
    (typeof d.id === 'string' && d.id.trim()) ||
    (typeof d.remoteJid === 'string' && d.remoteJid.trim()) ||
    '';
  if (!idRaw) return null;
  return {
    id: idRaw,
    presences: d.presences ?? d.presencesSample ?? d
  };
}
