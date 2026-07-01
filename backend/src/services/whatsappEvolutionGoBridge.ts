/**
 * Adapta chamadas feitas no formato Evolution API v2 (Node) para a API REST do Evolution Go.
 * Usado quando WHATSAPP_PROVIDER_KIND=evolution-go.
 *
 * Auth Evolution Go:
 * - Rotas /instance/create (admin): header `apikey` = GLOBAL_API_KEY (WHATSAPP_PROVIDER_API_KEY).
 * - Demais rotas autenticadas: header `apikey` = token da instância (WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN).
 */

const baseUrl = (): string =>
  (process.env.WHATSAPP_PROVIDER_BASE_URL || 'http://whatsapp-provider:8080').replace(/\/$/, '');

const instanceName = (): string => process.env.WHATSAPP_PROVIDER_SESSION || 'default';

const globalApiKey = (): string => process.env.WHATSAPP_PROVIDER_API_KEY || '';

/** Token da instância no Evolution Go (obrigatório em produção; fallback só para dev). */
const instanceApiKey = (): string => {
  const t = process.env.WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN?.trim();
  if (t) return t;
  return globalApiKey();
};

function adminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  const k = globalApiKey();
  if (k) h.apikey = k;
  return h;
}

function instanceHeaders(contentTypeJson = true): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (contentTypeJson) h['Content-Type'] = 'application/json';
  const k = instanceApiKey();
  if (k) h.apikey = k;
  return h;
}

/**
 * Normaliza o JID para o formato aceito pela Evolution Go (whatsmeow nativo):
 *  - `<digits>@c.us`             → `<digits>@s.whatsapp.net` (whatsmeow não conhece `@c.us`)
 *  - `<digits>@lid`              → mantém (LID nativo)
 *  - `<digits>@g.us` / `@newsletter` → mantém
 *  - Outros formatos             → mantém o input (best-effort)
 *
 * O Baileys/Evolution v2 aceita `@c.us`, mas o whatsmeow só aceita
 * `@s.whatsapp.net`. Esta função é aplicada em TODOS os pontos do bridge
 * que repassam `number` para a EvoGo (avatar, info, send/*, etc.).
 */
function normalizeJidForEvoGo(jidOrNumber: string): string {
  const raw = (jidOrNumber || '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (lower.endsWith('@c.us')) {
    return raw.slice(0, raw.length - '@c.us'.length) + '@s.whatsapp.net';
  }
  return raw;
}

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function notPorted(path: string): Response {
  return jsonResponse(
    { error: `Evolution Go: endpoint ainda não mapeado pelo CRM (${path}). Consulte whatsappEvolutionGoBridge.ts.` },
    502
  );
}

/** Resposta compatível com unwrapArray usado em evolutionCheckPhoneExists. */
function userCheckToWhatsappNumbersShape(goBody: Record<string, unknown>, numbers: string[]): unknown {
  const data = goBody.data;
  const users =
    data && typeof data === 'object' && 'Users' in (data as Record<string, unknown>)
      ? ((data as Record<string, unknown>).Users as unknown[])
      : data && typeof data === 'object' && 'users' in (data as Record<string, unknown>)
        ? ((data as Record<string, unknown>).users as unknown[])
        : [];
  const first = Array.isArray(users) && users[0] && typeof users[0] === 'object' ? (users[0] as Record<string, unknown>) : null;
  const jid =
    first &&
    (typeof first.JID === 'string'
      ? first.JID
      : typeof first.jid === 'string'
        ? first.jid
        : typeof first.RemoteJID === 'string'
          ? first.RemoteJID
          : typeof first.remoteJid === 'string'
            ? first.remoteJid
            : '');
  const exists =
    first &&
    (first.IsInWhatsapp === true ||
      first.isInWhatsapp === true ||
      (typeof first.IsInWhatsapp === 'boolean' ? first.IsInWhatsapp : false));
  const rows = numbers.map((num, idx) => {
    if (idx === 0 && first) {
      return {
        exists: Boolean(exists),
        jid: typeof jid === 'string' && jid ? jid : `${num}@s.whatsapp.net`,
        remoteJid: typeof jid === 'string' && jid ? jid : undefined
      };
    }
    return { exists: false, jid: null };
  });
  return { data: rows };
}

async function getUserContacts(): Promise<unknown> {
  const res = await fetch(`${baseUrl()}/user/contacts`, { headers: instanceHeaders(false) });
  const t = await res.text();
  if (!res.ok) throw new Error(`Evolution Go user/contacts: HTTP ${res.status} ${t}`);
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
}

function mapGoContactToRow(raw: Record<string, unknown>): Record<string, unknown> | null {
  const jid =
    (typeof raw.jid === 'string' && raw.jid) ||
    (typeof raw.Jid === 'string' && raw.Jid) ||
    (typeof raw.JID === 'string' && raw.JID) ||
    '';
  if (!jid) return null;
  const name =
    (typeof raw.name === 'string' && raw.name) ||
    (typeof raw.Name === 'string' && raw.Name) ||
    (typeof raw.pushName === 'string' && raw.pushName) ||
    undefined;
  const num = (typeof raw.number === 'string' && raw.number) || jid.replace(/\D/g, '');
  return {
    id: jid,
    number: num,
    name,
    pushname: typeof raw.pushName === 'string' ? raw.pushName : undefined,
    isGroup: jid.includes('@g.us')
  };
}

function filterFindContacts(all: unknown[], where: Record<string, unknown>): unknown[] {
  const id =
    (typeof where.id === 'string' && where.id) ||
    (typeof where.remoteJid === 'string' && where.remoteJid) ||
    '';
  if (!id) return all.slice(0, 5000);
  const want = id.trim().toLowerCase();
  return all.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const o = row as Record<string, unknown>;
    const jid = String(o.id || o.jid || o.JID || '').toLowerCase();
    return jid === want || jid.includes(want.replace('@s.whatsapp.net', '').replace('@lid', ''));
  });
}

/**
 * Converte readMessages Evolution v2 → MarkReadStruct Go.
 *
 * O endpoint da Evolution Go (`POST /message/markread`) aceita um array de IDs
 * para o mesmo `number`, então agrupamos todas as entradas com o mesmo
 * `remoteJid` em uma única chamada (mais eficiente e gentil com a API).
 *
 * Se vierem JIDs diferentes no array — não deveria, em prática — usamos o
 * remoteJid da primeira entrada como `number` e ignoramos os IDs órfãos.
 */
function mapMarkReadBody(body: Record<string, unknown>): Record<string, unknown> | null {
  const readMessages = body.readMessages;
  if (!Array.isArray(readMessages) || readMessages.length === 0) return null;
  const first = readMessages[0] as Record<string, unknown>;
  const remoteJid = typeof first.remoteJid === 'string' ? first.remoteJid.trim() : '';
  if (!remoteJid) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of readMessages) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.remoteJid === 'string' && e.remoteJid.trim() && e.remoteJid.trim() !== remoteJid) {
      continue;
    }
    const id = typeof e.id === 'string' ? e.id.trim() : '';
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  if (ids.length === 0) return null;
  return { number: remoteJid, id: ids };
}

export async function evolutionGoProxyRequest(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<Response> {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

  if (method === 'GET' && /\/chat\/fetchPrivacySettings\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/privacy`, { headers: instanceHeaders(false) });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && /\/chat\/removeProfilePicture\//.test(path)) {
    return jsonResponse({ message: 'success' });
  }

  if (method === 'DELETE' && /\/group\/leaveGroup\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = u.searchParams.get('groupJid') || '';
    const res = await fetch(`${baseUrl()}/group/leave`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: groupJid })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  // --- /chat/whatsappNumbers/:inst ---
  if (method === 'POST' && /\/chat\/whatsappNumbers\//.test(path)) {
    const numbers = Array.isArray(b.numbers) ? (b.numbers as unknown[]).map((x) => String(x).trim()).filter(Boolean) : [];
    const res = await fetch(`${baseUrl()}/user/check`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: numbers, formatJid: true })
    });
    const t = await res.text();
    if (!res.ok) return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    let parsed: Record<string, unknown> = {};
    try {
      parsed = t ? (JSON.parse(t) as Record<string, unknown>) : {};
    } catch {
      return new Response(t, { status: res.status });
    }
    return new Response(JSON.stringify(userCheckToWhatsappNumbersShape(parsed, numbers)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // --- /chat/findContacts/:inst ---
  if (method === 'POST' && /\/chat\/findContacts\//.test(path)) {
    try {
      const raw = await getUserContacts();
      const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const inner = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
      const list =
        (Array.isArray(inner.contacts) && inner.contacts) ||
        (Array.isArray(inner.Contacts) && inner.Contacts) ||
        (Array.isArray(root.contacts) && root.contacts) ||
        [];
      const mapped = (list as unknown[])
        .map((x) => (x && typeof x === 'object' ? mapGoContactToRow(x as Record<string, unknown>) : null))
        .filter(Boolean);
      const where = (b.where && typeof b.where === 'object' ? b.where : {}) as Record<string, unknown>;
      const filtered = filterFindContacts(mapped as unknown[], where);
      return jsonResponse({ data: filtered });
    } catch (e) {
      return jsonResponse({ error: e instanceof Error ? e.message : 'findContacts' }, 500);
    }
  }

  if (method === 'POST' && /\/chat\/findChats\//.test(path)) {
    return jsonResponse({ data: [] });
  }

  if (method === 'POST' && /\/chat\/findMessages\//.test(path)) {
    return jsonResponse({ data: [] });
  }

  if (method === 'POST' && /\/chat\/findStatusMessage\//.test(path)) {
    return jsonResponse({ data: null });
  }

  if (method === 'POST' && /\/chat\/markMessageAsRead\//.test(path)) {
    const mapped = mapMarkReadBody(b);
    if (!mapped) return jsonResponse({ error: 'readMessages vazio' }, 400);
    const res = await fetch(`${baseUrl()}/message/markread`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(mapped)
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/markChatUnread\//.test(path)) {
    return jsonResponse({ message: 'ok' });
  }

  if (method === 'POST' && /\/chat\/archiveChat\//.test(path)) {
    const chat = typeof b.chat === 'string' ? b.chat : '';
    const archive = b.archive === true;
    const url = archive ? `${baseUrl()}/chat/archive` : `${baseUrl()}/chat/unarchive`;
    const res = await fetch(url, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ chat })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && /\/chat\/deleteMessageForEveryone\//.test(path)) {
    const remoteJid = typeof b.remoteJid === 'string' ? b.remoteJid : '';
    const id = typeof b.id === 'string' ? b.id : '';
    const chat = normalizeJidForEvoGo(remoteJid);
    const goBody: Record<string, unknown> = { chat, messageId: id };
    if (typeof b.fromMe === 'boolean') goBody.fromMe = b.fromMe;
    const participant = typeof b.participant === 'string' ? b.participant.trim() : '';
    if (participant) goBody.participant = normalizeJidForEvoGo(participant);
    const res = await fetch(`${baseUrl()}/message/delete`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(goBody)
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/updateMessage\//.test(path)) {
    const key = b.key && typeof b.key === 'object' ? (b.key as Record<string, unknown>) : {};
    const chat = typeof key.remoteJid === 'string' ? key.remoteJid : '';
    const messageId = typeof key.id === 'string' ? key.id : '';
    const text = typeof b.text === 'string' ? b.text : '';
    const res = await fetch(`${baseUrl()}/message/edit`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ chat, messageId, message: text })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/sendPresence\//.test(path)) {
    const rawNumber =
      (typeof b.number === 'string' && b.number) ||
      (b.options && typeof b.options === 'object' && typeof (b.options as Record<string, unknown>).number === 'string'
        ? String((b.options as Record<string, unknown>).number)
        : '');
    const number = normalizeJidForEvoGo(rawNumber);
    const opts = b.options && typeof b.options === 'object' ? (b.options as Record<string, unknown>) : {};
    const presence = typeof opts.presence === 'string' ? opts.presence : 'composing';
    const delay = typeof opts.delay === 'number' ? opts.delay : 0;
    const res = await fetch(`${baseUrl()}/message/presence`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number, presence, delay })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/fetchProfilePictureUrl\//.test(path)) {
    const number = normalizeJidForEvoGo(typeof b.number === 'string' ? b.number : '');
    // EvoGo `GetProfilePictureInfo` faz um IQ ao WhatsApp que pode demorar até
    // ~1m15s no whatsmeow quando o servidor não responde (contato com foto
    // privada, contato fora da rede, link com WhatsApp degradado). Limitamos
    // a 3s no bridge — se passar disso, devolvemos null e o cache negativo
    // do `whatsappProvider.service` (TTL 10min) impede novas tentativas.
    const AVATAR_BRIDGE_TIMEOUT_MS = 3000;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), AVATAR_BRIDGE_TIMEOUT_MS);
    let res: globalThis.Response;
    try {
      res = await fetch(`${baseUrl()}/user/avatar`, {
        method: 'POST',
        headers: instanceHeaders(),
        body: JSON.stringify({ number, preview: true }),
        signal: controller.signal
      });
    } catch {
      clearTimeout(tid);
      return jsonResponse({ profilePictureUrl: null });
    }
    clearTimeout(tid);
    const t = await res.text();
    if (!res.ok) return jsonResponse({ profilePictureUrl: null });
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      // EvoGo devolve `{error: "info query timed out"}` quando o IQ do
      // whatsmeow não responde — geralmente significa que o link com o
      // WhatsApp está degradado / desconectado silenciosamente. Disparamos
      // reconexão em background (cooldown global de 60s no requestEvoGoReconnect).
      if (typeof o.error === 'string' && o.error) {
        const errLower = o.error.toLowerCase();
        if (errLower.includes('timed out') || errLower.includes('client disconnected')) {
          // Import dinâmico evita ciclo (`whatsappProvider.service` → bridge).
          void import('./whatsappProvider.service').then((m) =>
            m.requestEvoGoReconnect(`bridge:user/avatar:${o.error}`).catch(() => undefined)
          );
        }
        return jsonResponse({ profilePictureUrl: null });
      }
      // Formato nativo EvoGo (v0.7+): `{ success: true, avatar: "<base64-png>" }`.
      // Empacotamos como data URI — o frontend usa direto em `<img src>` sem
      // precisar de rota/cache no backend. Avatars são pequenos (~5-20KB).
      const avatarB64 = typeof o.avatar === 'string' ? o.avatar.trim() : '';
      if (avatarB64) {
        const clean = avatarB64.startsWith('data:') ? avatarB64 : `data:image/png;base64,${avatarB64}`;
        return jsonResponse({ profilePictureUrl: clean });
      }
      // Fallback: alguns wrappers da Evolution v2 ainda devolvem `url`/`URL`.
      const data = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o;
      const urlPic =
        (typeof data.url === 'string' && data.url) ||
        (typeof data.URL === 'string' && data.URL) ||
        (typeof data.profilePictureUrl === 'string' && data.profilePictureUrl) ||
        '';
      return jsonResponse({ profilePictureUrl: urlPic || null });
    } catch {
      return jsonResponse({ profilePictureUrl: null });
    }
  }

  if (method === 'POST' && /\/chat\/getBase64FromMediaMessage\//.test(path)) {
    const res = await fetch(`${baseUrl()}/message/downloadmedia`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/updateBlockStatus\//.test(path)) {
    const number = normalizeJidForEvoGo(typeof b.number === 'string' ? b.number : '');
    const status = typeof b.status === 'string' ? b.status.toLowerCase() : '';
    const url = status === 'unblock' ? `${baseUrl()}/user/unblock` : `${baseUrl()}/user/block`;
    const res = await fetch(url, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/sendText\//.test(path)) {
    const quoted =
      b.quoted && typeof b.quoted === 'object' ? (b.quoted as Record<string, unknown>) : undefined;
    const res = await fetch(`${baseUrl()}/send/text`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({
        number: normalizeJidForEvoGo(typeof b.number === 'string' ? b.number : ''),
        text: b.text,
        delay: typeof b.delay === 'number' ? b.delay : 0,
        ...(quoted ? { quoted } : {})
      })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/sendStatus\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'POST' && /\/message\/sendMedia\//.test(path)) {
    const number = normalizeJidForEvoGo(typeof b.number === 'string' ? String(b.number) : '');
    const mediatype = typeof b.mediatype === 'string' ? b.mediatype.toLowerCase() : 'document';
    const caption = typeof b.caption === 'string' ? b.caption : '';
    const filename = typeof b.fileName === 'string' ? b.fileName : typeof b.filename === 'string' ? b.filename : 'file';
    const media = typeof b.media === 'string' ? b.media : '';
    const mimetype = typeof b.mimetype === 'string' ? b.mimetype : '';
    const quoted =
      b.quoted && typeof b.quoted === 'object' ? (b.quoted as Record<string, unknown>) : undefined;
    if (mediatype === 'sticker') {
      const res = await fetch(`${baseUrl()}/send/sticker`, {
        method: 'POST',
        headers: instanceHeaders(),
        body: JSON.stringify({
          number,
          sticker: media,
          ...(typeof b.delay === 'number' ? { delay: b.delay } : {}),
          ...(quoted ? { quoted } : {})
        })
      });
      const t = await res.text();
      return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }
    // PTT: o caller marca `ptt: true` no body OU usa `mediatype: 'ptt'`. Ambos
    // significam "nota de voz" — repassamos para a EvoGo como `type: 'audio'`
    // com a flag `ptt: true` no body para que o WhatsApp do cliente renderize
    // como áudio gravado (player + foto), não como arquivo .ogg.
    const ptt = b.ptt === true || mediatype === 'ptt';
    const type =
      mediatype === 'image' || mediatype === 'ImageMessage'
        ? 'image'
        : mediatype === 'video' || mediatype === 'VideoMessage'
          ? 'video'
          : mediatype === 'audio' || mediatype === 'ptt'
            ? 'audio'
            : 'document';
    const goBody: Record<string, unknown> = {
      number,
      url: media,
      type,
      caption,
      filename
    };
    if (ptt) goBody.ptt = true;
    if (mimetype) goBody.mimetype = mimetype;
    if (quoted) goBody.quoted = quoted;
    const res = await fetch(`${baseUrl()}/send/media`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(goBody)
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/sendWhatsAppAudio\//.test(path)) {
    // Endpoint dedicado para nota de voz na Evolution v2 — sempre é PTT por
    // definição. Garantimos `ptt: true` e o mimetype correto na chamada à EvoGo.
    const number = normalizeJidForEvoGo(typeof b.number === 'string' ? String(b.number) : '');
    const media = typeof b.audio === 'string' ? String(b.audio) : typeof b.media === 'string' ? String(b.media) : '';
    const res = await fetch(`${baseUrl()}/send/media`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({
        number,
        url: media,
        type: 'audio',
        ptt: true,
        mimetype: 'audio/ogg; codecs=opus',
        caption: typeof b.caption === 'string' ? b.caption : '',
        filename: 'audio.ogg'
      })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/sendSticker\//.test(path)) {
    const res = await fetch(`${baseUrl()}/send/sticker`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/sendLocation\//.test(path)) {
    const res = await fetch(`${baseUrl()}/send/location`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  // --- /message/sendContact/{instance} → /send/contact ---
  // O path é o mesmo conceito mas os bodies divergem:
  //   Evolution v2: { number, contact: [{ fullName, wuid, phoneNumber, organization }, ...] }
  //   Evolution Go: { number, vcard: { fullName, organization, phone }, delay?, quoted? }
  // A EvoGo aceita APENAS UM contato por requisição (vcard é objeto, não array).
  // Quando o caller envia múltiplos, iteramos sequencialmente — mantemos o ritmo
  // entre eles pelo mesmo `delay` que a EvoGo já respeita por chamada.
  if (method === 'POST' && /\/message\/sendContact\//.test(path)) {
    const number = normalizeJidForEvoGo(typeof b.number === 'string' ? String(b.number) : '');
    const delay = typeof b.delay === 'number' ? b.delay : undefined;
    const quoted = b.quoted && typeof b.quoted === 'object' ? (b.quoted as Record<string, unknown>) : undefined;
    const contacts = Array.isArray(b.contact) ? (b.contact as unknown[]) : [];
    if (!number || contacts.length === 0) {
      return jsonResponse({ error: 'sendContact: number e contact[] são obrigatórios' }, 400);
    }
    const pickStr = (o: Record<string, unknown>, k: string): string =>
      typeof o[k] === 'string' ? String(o[k]).trim() : '';
    const mapContact = (raw: unknown): { fullName: string; organization: string; phone: string } | null => {
      if (!raw || typeof raw !== 'object') return null;
      const o = raw as Record<string, unknown>;
      const fullName = pickStr(o, 'fullName') || pickStr(o, 'displayName') || pickStr(o, 'name');
      const organization = pickStr(o, 'organization') || pickStr(o, 'org');
      // EvoGo espera string em `phone`. Preferimos `phoneNumber` (formato E.164
      // legível, ex.: +55 47 99999-9999) e caímos para `wuid` (apenas dígitos +
      // sufixo @c.us) só se o primeiro não vier. Remove o sufixo `@c.us`/`@s.whatsapp.net`
      // se for o caso, para não corromper o vcard renderizado no celular.
      let phone = pickStr(o, 'phoneNumber') || pickStr(o, 'phone') || pickStr(o, 'wuid');
      phone = phone.replace(/@[^\s]+$/, '').trim();
      if (!fullName || !phone) return null;
      return { fullName, organization, phone };
    };

    const sendOne = async (c: { fullName: string; organization: string; phone: string }): Promise<unknown> => {
      const goBody: Record<string, unknown> = {
        number,
        vcard: c
      };
      if (typeof delay === 'number') goBody.delay = delay;
      if (quoted) goBody.quoted = quoted;
      const r = await fetch(`${baseUrl()}/send/contact`, {
        method: 'POST',
        headers: instanceHeaders(),
        body: JSON.stringify(goBody)
      });
      const txt = await r.text();
      if (!r.ok) {
        throw new Error(`evogo /send/contact HTTP ${r.status}: ${txt.slice(0, 400)}`);
      }
      try {
        return JSON.parse(txt) as unknown;
      } catch {
        return { raw: txt };
      }
    };

    const mapped = contacts.map(mapContact).filter(Boolean) as Array<{
      fullName: string;
      organization: string;
      phone: string;
    }>;
    if (mapped.length === 0) {
      return jsonResponse(
        {
          error:
            'sendContact: cada contato precisa de fullName e phoneNumber/wuid. Estrutura esperada: { fullName, phoneNumber, organization? }.'
        },
        400
      );
    }

    const results: unknown[] = [];
    for (const c of mapped) {
      // sequencial: a EvoGo só aceita 1 vcard por chamada, e enviar vários
      // contatos seguidos via paralelismo poderia disparar throttling/ban.
      // eslint-disable-next-line no-await-in-loop
      results.push(await sendOne(c));
    }
    // Mantém o shape Evolution v2 quando há um único contato (retorna a resposta
    // bruta da EvoGo). Para múltiplos, encapsula em `{ success, results }`.
    if (results.length === 1) {
      return jsonResponse(results[0] as Record<string, unknown>, 200);
    }
    return jsonResponse({ success: true, results }, 200);
  }

  // --- /message/sendReaction/{instance} → /message/react ---
  // Evolution v2 body: { key: { remoteJid, fromMe, id, participant? }, reaction }
  // Evolution Go body: { number, id, reaction, fromMe?, participant? }
  if (method === 'POST' && /\/message\/sendReaction\//.test(path)) {
    const key = b.key && typeof b.key === 'object' ? (b.key as Record<string, unknown>) : null;
    const remoteJid = key && typeof key.remoteJid === 'string' ? key.remoteJid.trim() : '';
    const id = key && typeof key.id === 'string' ? key.id.trim() : '';
    const reaction = typeof b.reaction === 'string' ? b.reaction : '';
    if (!remoteJid || !id) {
      return jsonResponse({ error: 'sendReaction: key.remoteJid e key.id obrigatórios' }, 400);
    }
    const goBody: Record<string, unknown> = {
      number: normalizeJidForEvoGo(remoteJid),
      id,
      reaction
    };
    if (typeof key?.fromMe === 'boolean') goBody.fromMe = key.fromMe;
    const participant = key && typeof key.participant === 'string' ? key.participant.trim() : '';
    if (participant) goBody.participant = normalizeJidForEvoGo(participant);
    const res = await fetch(`${baseUrl()}/message/react`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(goBody)
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/message\/(sendPoll|sendList)\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'GET' && /\/instance\/fetchInstances/.test(path)) {
    const res = await fetch(`${baseUrl()}/instance/all`, { headers: adminHeaders() });
    const t = await res.text();
    if (!res.ok) return new Response(t, { status: res.status });
    try {
      const parsed = JSON.parse(t) as Record<string, unknown>;
      const data = parsed.data ?? parsed;
      const arr = Array.isArray(data) ? data : [];
      const want = instanceName();
      const row = arr.find((x) => {
        if (!x || typeof x !== 'object') return false;
        const o = x as Record<string, unknown>;
        const n = typeof o.name === 'string' ? o.name : typeof o.Name === 'string' ? o.Name : '';
        const id = typeof o.id === 'string' ? o.id : typeof o.Id === 'string' ? o.Id : '';
        return n === want || id === want;
      });
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        return jsonResponse({ response: [{ instance: o }] });
      }
      return jsonResponse({ response: [] });
    } catch {
      return new Response(t, { status: res.status });
    }
  }

  if (method === 'POST' && /\/instance\/setPresence\//.test(path)) {
    return jsonResponse({ message: 'noop' });
  }

  if (method === 'POST' && /\/chat\/fetchProfile\//.test(path)) {
    // EvoGo `/user/info` exige `number: []string` (NÃO string única) — ele
    // reaproveita o struct do `/user/check`. Encapsulamos sempre em array.
    //
    // O retorno tem a forma:
    //   {
    //     "data": {
    //       "Users": {
    //         "55XXXX@s.whatsapp.net": {
    //           "VerifiedName": null|string,
    //           "Status": string,
    //           "PictureID": string,
    //           "Devices": [string, ...],
    //           "LID": "<digits>@lid"   ← mapeamento PN↔LID gratuito
    //         }
    //       }
    //     },
    //     "message": "success"
    //   }
    //
    // Achatamos para `{ data: { ... } }` (compat com controller) e
    // anexamos `chatId` (PN) + `lid` (LID alternativo) para que o caller
    // possa registrar a identidade.
    const single = normalizeJidForEvoGo((b.number as string) || '').trim();
    if (!single) return jsonResponse({ data: null });
    const res = await fetch(`${baseUrl()}/user/info`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: [single] })
    });
    const t = await res.text();
    if (!res.ok) return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    try {
      const o = t ? (JSON.parse(t) as Record<string, unknown>) : {};
      const data = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : null;
      const users = data?.Users && typeof data.Users === 'object' ? (data.Users as Record<string, unknown>) : null;
      if (users) {
        const keys = Object.keys(users);
        const firstJid = keys[0];
        const u =
          firstJid && users[firstJid] && typeof users[firstJid] === 'object'
            ? (users[firstJid] as Record<string, unknown>)
            : null;
        if (u) {
          const verifiedName = typeof u.VerifiedName === 'string' ? u.VerifiedName.trim() : '';
          const status = typeof u.Status === 'string' ? u.Status.trim() : '';
          const pictureId = typeof u.PictureID === 'string' ? u.PictureID.trim() : '';
          const lid = typeof u.LID === 'string' ? u.LID.trim() : '';
          return jsonResponse({
            message: o.message ?? 'success',
            data: {
              chatId: firstJid,
              jid: firstJid,
              lid: lid || null,
              VerifiedName: verifiedName || null,
              name: verifiedName || null,
              verifiedName: verifiedName || null,
              status: status || null,
              pictureId: pictureId || null,
              raw: u
            }
          });
        }
      }
      return jsonResponse(o);
    } catch {
      return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (method === 'POST' && /\/chat\/fetchBusinessProfile\//.test(path)) {
    return evolutionGoProxyRequest('POST', `/chat/fetchProfile/${instanceName()}`, b);
  }

  if (method === 'POST' && /\/chat\/updateProfileName\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/profileName`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ name: b.name })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/updateProfileStatus\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/profileStatus`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ status: b.status })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/updateProfilePicture\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/profilePicture`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ image: b.picture })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'DELETE' && /\/chat\/removeProfilePicture\//.test(path)) {
    return jsonResponse({ message: 'noop' }, 200);
  }

  if (method === 'GET' && /\/chat\/fetchPrivacySettings\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/privacy`, { headers: instanceHeaders(false) });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/chat\/updatePrivacySettings\//.test(path)) {
    const res = await fetch(`${baseUrl()}/user/privacy`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  // --- Grupos (subset) ---
  if (method === 'GET' && /\/group\/fetchAllGroups\//.test(path)) {
    const res = await fetch(`${baseUrl()}/group/list`, { headers: instanceHeaders(false) });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'GET' && /\/group\/findGroupInfos\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = (u.searchParams.get('groupJid') || '').trim();
    if (!groupJid) {
      return new Response(JSON.stringify({ error: 'groupJid query param vazio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // EvoGo /group/info espera `groupJID` (não `number`). Enviamos ambos por
    // compatibilidade com possíveis variações entre minor versions.
    const res = await fetch(`${baseUrl()}/group/info`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ groupJID: groupJid, number: groupJid })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'GET' && /\/group\/inviteCode\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = (u.searchParams.get('groupJid') || '').trim();
    if (!groupJid) {
      return new Response(JSON.stringify({ error: 'groupJid query param vazio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const res = await fetch(`${baseUrl()}/group/invitelink`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ groupJID: groupJid, number: groupJid })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'GET' && /\/group\/participants\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'GET' && /\/group\/inviteInfo\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'POST' && /\/group\/create\//.test(path)) {
    const res = await fetch(`${baseUrl()}/group/create`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/updateGroupSubject\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = u.searchParams.get('groupJid') || '';
    const res = await fetch(`${baseUrl()}/group/name`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: groupJid, name: (b as { subject?: string }).subject })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/updateGroupDescription\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = u.searchParams.get('groupJid') || '';
    const res = await fetch(`${baseUrl()}/group/description`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: groupJid, description: (b as { description?: string }).description })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/revokeInviteCode\//.test(path)) {
    const u = new URL(`http://local${path}`);
    const groupJid = u.searchParams.get('groupJid') || '';
    const res = await fetch(`${baseUrl()}/group/invitelink`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify({ number: groupJid, revoke: true })
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/sendInvite\//.test(path)) {
    const res = await fetch(`${baseUrl()}/group/join`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/updateParticipant\//.test(path)) {
    const res = await fetch(`${baseUrl()}/group/participant`, {
      method: 'POST',
      headers: instanceHeaders(),
      body: JSON.stringify(body ?? {})
    });
    const t = await res.text();
    return new Response(t, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST' && /\/group\/updateSetting\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'POST' && /\/group\/toggleEphemeral\//.test(path)) {
    return notPorted(path);
  }

  if (method === 'POST' && /\/group\/updateGroupPicture\//.test(path)) {
    return notPorted(path);
  }

  return notPorted(`${method} ${path}`);
}

export async function evolutionGoLogout(): Promise<Response> {
  return fetch(`${baseUrl()}/instance/logout`, {
    method: 'DELETE',
    headers: instanceHeaders(false)
  });
}

/** Cria instância no Go (admin). */
export async function evolutionGoCreateInstance(): Promise<Response> {
  const name = instanceName();
  const token = instanceApiKey();
  return fetch(`${baseUrl()}/instance/create`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ name, token })
  });
}

/** GET /instance/status — Evolution Go. */
export async function evolutionGoInstanceStatus(): Promise<Response> {
  return fetch(`${baseUrl()}/instance/status`, { headers: instanceHeaders(false) });
}

/** GET /instance/qr — Evolution Go. */
export async function evolutionGoInstanceQr(): Promise<Response> {
  return fetch(`${baseUrl()}/instance/qr`, { headers: instanceHeaders(false) });
}

/**
 * POST /instance/reconnect — Evolution Go.
 *
 * Reabre o link com o WhatsApp sem invalidar a sessão (whatsmeow chama
 * `Client.Connect()`). Útil quando o webhook reporta `Disconnected` ou quando
 * detectamos IQ timeouts repetidos (`info query timed out` indica que o
 * WebSocket caiu silenciosamente — `connected` no banco fica `true` mas IQ
 * trava 75s no whatsmeow). NÃO requer escanear QR de novo.
 */
export async function evolutionGoInstanceReconnect(): Promise<Response> {
  return fetch(`${baseUrl()}/instance/reconnect`, {
    method: 'POST',
    headers: instanceHeaders(),
    body: JSON.stringify({})
  });
}
