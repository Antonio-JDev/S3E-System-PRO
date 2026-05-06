import { Request, Response } from 'express';
import {
  emitWhatsappProviderConnectionStatus,
  handleWhatsappProviderWebhookEvent,
  ingestWhatsappProviderChatMetaUpdate,
  type WhatsappProviderWebhookBody
} from '../services/whatsappChat.service';
import {
  evolutionExtractChatsUpdateData,
  evolutionExtractContactsUpdateData,
  evolutionExtractMessagesUpsertData,
  evolutionMessageUpdateToAckPayload,
  evolutionPresenceToProviderPayload,
  evolutionUpsertMessageToProviderRaw,
  evolutionWebhookSession
} from '../utils/whatsappEvolutionWebhook.util';

const WHATSAPP_PROVIDER_WEBHOOK_EVENTS = new Set([
  'message',
  'message.any',
  'message.ack',
  'presence.update',
  'connection.update',
  'CONNECTION_UPDATE',
  'connections.update',
  'messages.upsert',
  'messages.update',
  'contacts.update',
  'chats.update',
  'chats.upsert'
]);

function normalizeWebhookConnectionState(raw: string | null | undefined): string {
  return (raw || '').trim().toLowerCase();
}

/**
 * Só considera desconectado quando a sessão realmente caiu.
 * Não usa `connecting` (reconexão transitória) para evitar alertas falsos.
 */
function webhookConnectionIsDisconnected(stateNorm: string): boolean {
  return (
    stateNorm === 'closed' ||
    stateNorm === 'close' ||
    stateNorm === 'logout' ||
    stateNorm === 'unpaired' ||
    stateNorm === 'refused'
  );
}

function extractConnectionUpdatePayload(body: Record<string, unknown>): {
  state: string | null;
  sessionLabel: string | null;
} {
  const sessionLabel =
    (typeof body.instance === 'string' && body.instance.trim()) ||
    (typeof body.session === 'string' && body.session.trim()) ||
    null;
  const nested = (body.payload ?? body.data) as Record<string, unknown> | undefined;
  let state: string | null = null;
  if (nested && typeof nested === 'object') {
    const st = nested.state;
    if (typeof st === 'string' && st.trim()) state = st.trim();
    const inst = nested.instance;
    if (!state && inst && typeof inst === 'object') {
      const s2 = (inst as Record<string, unknown>).state;
      if (typeof s2 === 'string' && s2.trim()) state = s2.trim();
    }
    const conn = nested.connection;
    if (!state && typeof conn === 'string' && conn.trim()) state = conn.trim();
  }
  if (!state && typeof body.state === 'string' && body.state.trim()) {
    state = body.state.trim();
  }
  return { state, sessionLabel };
}

function extractRawMessageId(raw: Record<string, unknown>): string | undefined {
  const id = raw.id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'number' && !Number.isNaN(id)) return String(id);
  const key = raw.key;
  if (key && typeof key === 'object') {
    const k = key as Record<string, unknown>;
    if (typeof k.id === 'string' && k.id.trim()) return k.id.trim();
    if (typeof k.id === 'number' && !Number.isNaN(k.id)) return String(k.id);
  }
  return undefined;
}

/** Em payloads Baileys/Evolution, `hasMedia` ou URL podem faltar no topo; reforça a partir de `type` e de `_data.message`. */
function extractEngineMediaHints(raw: Record<string, unknown>): {
  mediaUrl?: string;
  mediaMimetype?: string;
  mediaFilename?: string;
  mediaType?: string;
  mediaFileSize?: number;
} {
  const out: {
    mediaUrl?: string;
    mediaMimetype?: string;
    mediaFilename?: string;
    mediaType?: string;
    mediaFileSize?: number;
  } = {};

  const topType = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
  if (topType === 'ptt' || topType === 'audio' || topType === 'voice') {
    out.mediaType = 'audio';
    out.mediaMimetype = 'audio/ogg';
  } else if (topType === 'image' || topType === 'sticker') {
    out.mediaType = 'image';
  } else if (topType === 'video') {
    out.mediaType = 'video';
  } else if (topType === 'document') {
    out.mediaType = 'document';
  }

  const _data = raw._data;
  if (!_data || typeof _data !== 'object') {
    return out;
  }
  const message = (_data as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') {
    return out;
  }
  const m = message as Record<string, unknown>;

  const pick = (node: Record<string, unknown> | undefined, kind: 'audio' | 'image' | 'video' | 'document'): void => {
    if (!node || typeof node !== 'object') return;
    const url = node.url;
    if (typeof url === 'string' && url.length > 0) out.mediaUrl = url;
    const mt = node.mimetype;
    if (typeof mt === 'string' && mt.length > 0) out.mediaMimetype = mt;
    const fn = node.fileName ?? node.filename;
    if (typeof fn === 'string' && fn.length > 0) out.mediaFilename = fn;
    const fsz = node.fileLength ?? node.fileSize ?? node.size;
    if (typeof fsz === 'number' && !Number.isNaN(fsz)) out.mediaFileSize = Math.floor(fsz);
    out.mediaType = kind;
  };

  if (m.audioMessage && typeof m.audioMessage === 'object') {
    pick(m.audioMessage as Record<string, unknown>, 'audio');
    if (!out.mediaMimetype) out.mediaMimetype = 'audio/ogg';
  } else if (m.imageMessage && typeof m.imageMessage === 'object') {
    pick(m.imageMessage as Record<string, unknown>, 'image');
  } else if (m.videoMessage && typeof m.videoMessage === 'object') {
    pick(m.videoMessage as Record<string, unknown>, 'video');
  } else if (m.documentMessage && typeof m.documentMessage === 'object') {
    pick(m.documentMessage as Record<string, unknown>, 'document');
  } else if (m.stickerMessage && typeof m.stickerMessage === 'object') {
    pick(m.stickerMessage as Record<string, unknown>, 'image');
  }

  return out;
}

function normalizeWhatsappProviderMessagePayload(
  raw: Record<string, unknown>
): WhatsappProviderWebhookBody['payload'] | null {
  if (typeof raw.from !== 'string' || !raw.from.trim()) {
    return null;
  }
  const fromMe =
    raw.fromMe === true ||
    raw.fromMe === 'true' ||
    raw.fromMe === 1 ||
    raw.fromMe === '1';

  const chatId =
    typeof raw.chatId === 'string' && raw.chatId.includes('@') ? raw.chatId : undefined;
  const participant =
    typeof raw.participant === 'string' && raw.participant.includes('@') ? raw.participant : undefined;

  let to = typeof raw.to === 'string' && raw.to.trim() ? raw.to : '';
  if (!to) {
    to = chatId || participant || raw.from;
  }

  let timestamp = 0;
  if (typeof raw.timestamp === 'number' && !Number.isNaN(raw.timestamp)) {
    timestamp = Math.floor(raw.timestamp);
  } else if (typeof raw.timestamp === 'string') {
    const n = parseInt(raw.timestamp, 10);
    if (!Number.isNaN(n)) timestamp = n;
  }
  let mediaUrl: string | undefined;
  let mediaMimetype: string | undefined;
  let mediaFilename: string | undefined;
  let providerMediaId: string | undefined;
  let mediaFileSize: number | undefined;
  let mediaType: string | undefined;
  const media = raw.media;
  if (media && typeof media === 'object') {
    const m = media as Record<string, unknown>;
    if (typeof m.url === 'string' && m.url.length > 0) mediaUrl = m.url;
    if (typeof m.mimetype === 'string' && m.mimetype.length > 0) mediaMimetype = m.mimetype;
    if (typeof m.filename === 'string' && m.filename.length > 0) mediaFilename = m.filename;
    const mid = m.id;
    if (typeof mid === 'string' && mid.trim()) providerMediaId = mid.trim();
    else if (typeof mid === 'number' && !Number.isNaN(mid)) providerMediaId = String(mid);
    const fsz = m.fileSize ?? m.fileLength ?? m.size;
    if (typeof fsz === 'number' && !Number.isNaN(fsz)) mediaFileSize = Math.floor(fsz);
    const mt = m.type;
    if (typeof mt === 'string' && mt.trim()) mediaType = mt.trim();
  }

  const hints = extractEngineMediaHints(raw);
  mediaUrl = mediaUrl || hints.mediaUrl;
  mediaMimetype = mediaMimetype || hints.mediaMimetype;
  mediaFilename = mediaFilename || hints.mediaFilename;
  mediaFileSize = mediaFileSize ?? hints.mediaFileSize;
  mediaType = mediaType || hints.mediaType;

  const mediaKinds = new Set(['ptt', 'audio', 'voice', 'image', 'video', 'document', 'sticker']);
  const topType = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
  const hasMedia =
    raw.hasMedia === true ||
    raw.hasMedia === 'true' ||
    raw.hasMedia === 1 ||
    !!mediaUrl ||
    !!mediaType ||
    (topType.length > 0 && mediaKinds.has(topType));

  if (mediaType?.toLowerCase() === 'ptt' || mediaType?.toLowerCase() === 'voice') {
    mediaType = 'audio';
    mediaMimetype = mediaMimetype || 'audio/ogg';
  }

  let ack: number | undefined;
  if (typeof raw.ack === 'number' && !Number.isNaN(raw.ack)) {
    ack = Math.trunc(raw.ack);
  } else if (typeof raw.ack === 'string') {
    const n = parseInt(raw.ack, 10);
    if (!Number.isNaN(n)) ack = n;
  }

  return {
    id: extractRawMessageId(raw),
    from: raw.from,
    to,
    participant,
    fromMe,
    body: typeof raw.body === 'string' ? raw.body : undefined,
    timestamp,
    ack,
    hasMedia,
    mediaUrl,
    mediaMimetype,
    mediaFilename,
    providerMediaId,
    mediaFileSize,
    mediaType
  };
}

export async function whatsappWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (secret) {
    const sent = req.headers['x-webhook-secret'];
    if (sent !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body.event !== 'string') {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  if (!WHATSAPP_PROVIDER_WEBHOOK_EVENTS.has(body.event)) {
    res.status(200).json({ ok: true });
    return;
  }

  const session = evolutionWebhookSession(body);

  try {
    if (
      body.event === 'connection.update' ||
      body.event === 'CONNECTION_UPDATE' ||
      body.event === 'connections.update'
    ) {
      const expected = (process.env.WHATSAPP_PROVIDER_SESSION || 'default').trim();
      const { state, sessionLabel } = extractConnectionUpdatePayload(body);
      const incoming = (sessionLabel || '').trim();
      if (incoming && incoming !== expected) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }
      const n = normalizeWebhookConnectionState(state);
      const disconnected = webhookConnectionIsDisconnected(n);
      emitWhatsappProviderConnectionStatus({
        disconnected,
        state: state || n || null,
        session: incoming || expected || null
      });
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'messages.upsert') {
      const data = body.data;
      const list = evolutionExtractMessagesUpsertData(data);
      for (const raw of list) {
        const mapped = evolutionUpsertMessageToProviderRaw(raw);
        if (!mapped) continue;
        const payload = normalizeWhatsappProviderMessagePayload(mapped);
        if (!payload) continue;
        await handleWhatsappProviderWebhookEvent({
          event: 'message',
          session,
          payload
        });
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'messages.update') {
      const data = body.data;
      const items = Array.isArray(data)
        ? (data as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        : data && typeof data === 'object'
          ? [data as Record<string, unknown>]
          : [];
      console.debug('[WA-WEBHOOK] messages.update recebido: %d itens', items.length);
      for (const item of items) {
        const ackPayload = evolutionMessageUpdateToAckPayload(item);
        if (!ackPayload) {
          console.debug('[WA-WEBHOOK] messages.update item ignorado (sem ack/key):', JSON.stringify(item).slice(0, 300));
          continue;
        }
        console.debug('[WA-WEBHOOK] messages.update ackPayload:', JSON.stringify(ackPayload).slice(0, 300));
        await handleWhatsappProviderWebhookEvent({
          event: 'message.ack',
          session,
          payload: ackPayload
        });
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'contacts.update') {
      const contacts = evolutionExtractContactsUpdateData(body.data);
      for (const item of contacts) {
        await ingestWhatsappProviderChatMetaUpdate(item);
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'chats.update' || body.event === 'chats.upsert') {
      const chats = evolutionExtractChatsUpdateData(body.data);
      for (const item of chats) {
        await ingestWhatsappProviderChatMetaUpdate(item);
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'message' || body.event === 'message.any') {
      if (!body.payload || typeof body.payload !== 'object') {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }
      const payload = normalizeWhatsappProviderMessagePayload(body.payload as Record<string, unknown>);
      if (!payload) {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }
      await handleWhatsappProviderWebhookEvent({
        event: 'message',
        session,
        payload
      });
      res.status(200).json({ ok: true });
      return;
    }

    if (body.event === 'presence.update') {
      const mapped = evolutionPresenceToProviderPayload(body.data ?? body.payload);
      if (mapped) {
        await handleWhatsappProviderWebhookEvent({
          event: 'presence.update',
          session,
          payload: mapped
        });
      } else if (body.payload && typeof body.payload === 'object') {
        await handleWhatsappProviderWebhookEvent({
          event: 'presence.update',
          session,
          payload: body.payload as Record<string, unknown>
        });
      }
      res.status(200).json({ ok: true });
      return;
    }

    await handleWhatsappProviderWebhookEvent({
      event: body.event,
      session,
      payload: body.payload
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('whatsapp webhook:', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
