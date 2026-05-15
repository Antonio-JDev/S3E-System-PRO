/**
 * Adapter: traduz webhooks da Evolution Go (whatsmeow nativo) para o formato
 * Evolution API v2 (Baileys-style) que o `whatsappWebhookController` consome.
 *
 * Motivação:
 * - O backend foi originalmente escrito para a Evolution API v2, cujo webhook
 *   usa nomes como `messages.upsert`, `messages.update`, `connection.update`
 *   e estruturas Baileys (`{key, message, messageTimestamp, ...}`).
 * - A Evolution Go (v0.7+) usa whatsmeow puro e envia eventos em PascalCase
 *   (`Message`, `Receipt`, `PushName`, `Connected`, ...) com payload em
 *   PascalCase no `Info` mas o `Message` interno é serializado em camelCase
 *   (formato proto JSON do whatsmeow, equivalente a Baileys).
 *
 * Esta função detecta o formato EvoGo e devolve um body já no formato v2,
 * permitindo reutilizar todo o pipeline existente sem duplicar lógica.
 */

interface EvolutionGoInfo {
  Chat?: string;
  Sender?: string;
  SenderAlt?: string;
  ID?: string;
  IsFromMe?: boolean;
  IsGroup?: boolean;
  Type?: string;
  MediaType?: string;
  PushName?: string;
  Timestamp?: string | number;
}

interface EvolutionGoData extends EvolutionGoInfo {
  Info?: EvolutionGoInfo;
  Message?: Record<string, unknown>;
  RawMessage?: Record<string, unknown>;
  IsEphemeral?: boolean;
  IsViewOnce?: boolean;
  IsViewOnceV2?: boolean;
  IsViewOnceV2Extension?: boolean;
  IsEdit?: boolean;
  MessageIDs?: string[];
  Type?: string;
  State?: string;
  NewPushName?: string;
  OldPushName?: string;
  JID?: string;
}

function isEvolutionGoBody(body: Record<string, unknown>): boolean {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return false;
  // EvoGo: sempre tem `Info` (mesmo dentro de Receipt/PushName/ChatPresence)
  // ou então `Type`/`Chat`/`State` em PascalCase no nível raiz do data.
  if ('Info' in data) return true;
  if ('MessageIDs' in data) return true;
  if ('NewPushName' in data || 'OldPushName' in data) return true;
  if ('State' in data && 'Chat' in data) return true;
  return false;
}

function epochSecondsFromAny(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return 0;
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && asNum > 0) {
      return asNum > 1e12 ? Math.floor(asNum / 1000) : Math.floor(asNum);
    }
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return Math.floor(d.getTime() / 1000);
    }
  }
  return 0;
}

/** Status whatsmeow (string) → status Baileys (number) usado por v2. */
function whatsmeowReceiptTypeToBaileysStatus(type: string): number {
  const t = type.toLowerCase();
  if (t === 'read' || t === 'read-self') return 4;
  if (t === 'played' || t === 'played-self') return 5;
  if (t === 'sender' || t === 'delivery' || t === '') return 3;
  if (t === 'retry') return 2;
  return 3;
}

/** Converte `data.Message` (proto whatsmeow) já compatível com Baileys/Evolution v2. */
function adaptMessageNode(message: unknown): Record<string, unknown> {
  if (!message || typeof message !== 'object') return {};
  return message as Record<string, unknown>;
}

/**
 * Quando `WEBHOOK_FILES=true` (default na Evolution Go), o binário da mídia
 * vem inline como `data.Message.base64` — irmão do tipo da mensagem
 * (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`,
 * `stickerMessage`). Como esse base64 é grande, NÃO devolvemos no payload
 * adaptado para a Evolution v2 — repassamos só uma flag (`evoGoBase64`)
 * que o controller usa para hidratar `mediaBase64` no payload normalizado.
 */
function extractEvoGoMediaBase64(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const m = message as Record<string, unknown>;
  const b64 = m.base64;
  if (typeof b64 === 'string' && b64.length > 0) return b64;
  return undefined;
}

function adaptEvoGoMessageEvent(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as EvolutionGoData | undefined;
  if (!data || typeof data !== 'object') return body;

  const info = (data.Info ?? {}) as EvolutionGoInfo;
  const chat = (info.Chat ?? '').trim();
  const senderJid = (info.Sender ?? '').trim();
  const senderAlt = (info.SenderAlt ?? '').trim();
  const isGroup = info.IsGroup === true || chat.endsWith('@g.us');
  const isFromMe = info.IsFromMe === true;
  const timestamp = epochSecondsFromAny(info.Timestamp);

  const key: Record<string, unknown> = {
    remoteJid: chat,
    fromMe: isFromMe,
    id: (info.ID ?? '').trim()
  };
  if (isGroup) {
    if (senderJid) key.participant = senderJid;
    if (senderAlt) key.participantAlt = senderAlt;
  }

  const adaptedMessage = adaptMessageNode(data.Message);
  const evoGoBase64 = extractEvoGoMediaBase64(data.Message);

  // SenderAlt + Chat (em DMs): o whatsmeow expõe o JID alternativo
  // (PN↔LID) sempre que o WhatsApp moderno entrega a mensagem por um
  // dos dois formatos. Em DMs entregues pelo LID (`@lid`), `Sender` é o
  // LID e `SenderAlt` traz o PN (`@s.whatsapp.net`). Repassamos ambos
  // para o controller persistir no `whatsapp_chat_identities` — assim o
  // mapping LID↔PN cresce sozinho a cada mensagem recebida, sem o
  // operador precisar clicar em "Buscar perfil".
  const evoGoDirectIdentity: Record<string, string> | undefined =
    !isGroup && (chat || senderJid || senderAlt)
      ? {
          chat: chat || '',
          sender: senderJid || '',
          senderAlt: senderAlt || ''
        }
      : undefined;

  return {
    event: 'messages.upsert',
    instance: body.instance ?? body.session,
    session: body.session ?? body.instance,
    data: {
      key,
      message: adaptedMessage,
      messageTimestamp: timestamp,
      pushName: typeof info.PushName === 'string' ? info.PushName : undefined,
      status: undefined,
      /**
       * Custom — não faz parte da Evolution v2. O `whatsappWebhookController`
       * lê esse campo no payload e propaga para `mediaBase64` no
       * `WhatsappProviderMessagePayload` para o service persistir em disco.
       */
      evoGoMediaBase64: evoGoBase64,
      evoGoDirectIdentity
    }
  };
}

function adaptEvoGoReceiptEvent(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as EvolutionGoData | undefined;
  if (!data || typeof data !== 'object') return body;

  // EvoGo Receipt: pode trazer `MessageIDs: []` + `Type: "read"|"delivery"|...`
  // e `Sender`/`Chat` no topo OU em Info.
  const info = (data.Info ?? {}) as EvolutionGoInfo;
  const chat = ((data.Chat ?? info.Chat) || '').trim();
  const sender = ((data.Sender ?? info.Sender) || '').trim();
  const type = (data.Type ?? '').toString().trim();
  const messageIds: string[] = Array.isArray(data.MessageIDs) ? data.MessageIDs : [];

  if (messageIds.length === 0) {
    return { event: 'unhandled-receipt', instance: body.instance ?? body.session, data };
  }

  const status = whatsmeowReceiptTypeToBaileysStatus(type);
  // No WhatsApp os receipts são SEMPRE sobre mensagens enviadas por nós
  // (a outra ponta confirmou recebimento/leitura).
  const updates = messageIds.map((id) => ({
    key: {
      remoteJid: chat,
      fromMe: true,
      id: String(id),
      participant: chat.endsWith('@g.us') && sender ? sender : undefined
    },
    update: { status },
    status
  }));

  return {
    event: 'messages.update',
    instance: body.instance ?? body.session,
    session: body.session ?? body.instance,
    data: updates
  };
}

function adaptEvoGoPushNameEvent(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as EvolutionGoData | undefined;
  if (!data || typeof data !== 'object') return body;
  const info = (data.Info ?? {}) as EvolutionGoInfo;
  const chat = ((data.JID ?? data.Chat ?? info.Chat) || '').trim();
  const pushName = (data.NewPushName ?? info.PushName ?? '').toString().trim();
  if (!chat) {
    return { event: 'noop', instance: body.instance ?? body.session, data };
  }
  return {
    event: 'contacts.update',
    instance: body.instance ?? body.session,
    session: body.session ?? body.instance,
    data: [
      {
        remoteJid: chat,
        pushName,
        notify: pushName
      }
    ]
  };
}

function adaptEvoGoConnectionEvent(
  body: Record<string, unknown>,
  state: 'open' | 'close'
): Record<string, unknown> {
  return {
    event: 'connection.update',
    instance: body.instance ?? body.session,
    session: body.session ?? body.instance,
    data: { state, statusReason: 0 }
  };
}

function adaptEvoGoChatPresenceEvent(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as EvolutionGoData | undefined;
  if (!data || typeof data !== 'object') return body;
  const info = (data.Info ?? {}) as EvolutionGoInfo;
  const chat = ((data.Chat ?? info.Chat) || '').trim();
  const state = (data.State ?? '').toString().trim().toLowerCase();
  if (!chat) {
    return { event: 'noop', instance: body.instance ?? body.session, data };
  }
  const mediaRaw = (data as Record<string, unknown>).Media;
  const media = typeof mediaRaw === 'string' ? mediaRaw.toLowerCase() : '';
  // Map whatsmeow ChatPresence ("composing", "paused", "recording") para
  // Baileys presence ("composing", "recording", "paused", "available").
  let lastKnownPresence: string = 'available';
  if (state === 'composing') {
    lastKnownPresence = media === 'audio' ? 'recording' : 'composing';
  } else if (state === 'paused') {
    lastKnownPresence = 'paused';
  }

  return {
    event: 'presence.update',
    instance: body.instance ?? body.session,
    session: body.session ?? body.instance,
    data: {
      id: chat,
      presences: {
        [chat]: { lastKnownPresence }
      }
    }
  };
}

/**
 * Public API: adapta um body raw do webhook para o formato Evolution v2.
 *
 * Retorna o body original quando:
 * - O body já é Evolution v2 (não é EvoGo).
 * - O evento não é mapeável (devolvido como event="noop" ou como veio).
 *
 * IMPORTANTE: nunca lança — é chamada antes do switch principal do controller,
 * que decide o que fazer com `body.event`.
 */
export function adaptEvolutionGoWebhookBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  if (!body || typeof body !== 'object') return body;
  if (!isEvolutionGoBody(body)) return body;

  const event = typeof body.event === 'string' ? body.event.trim() : '';
  switch (event) {
    case 'Message':
    case 'UndecryptableMessage':
      return adaptEvoGoMessageEvent(body);
    case 'Receipt':
      return adaptEvoGoReceiptEvent(body);
    case 'PushName':
      return adaptEvoGoPushNameEvent(body);
    case 'Connected':
    case 'PairSuccess':
      return adaptEvoGoConnectionEvent(body, 'open');
    case 'Disconnected':
    case 'LoggedOut':
    case 'StreamReplaced':
      return adaptEvoGoConnectionEvent(body, 'close');
    case 'ChatPresence':
      return adaptEvoGoChatPresenceEvent(body);
    default:
      return body;
  }
}

/** Exportado para testes. */
export const __test = {
  isEvolutionGoBody,
  epochSecondsFromAny,
  whatsmeowReceiptTypeToBaileysStatus
};
