/**
 * Proxy autenticado para o Chat Controller da Evolution API v2 (testes e integrações avançadas).
 */
import { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import * as EvoChat from '../services/whatsappEvolutionChat.service';
import { isEvolutionProviderKind } from '../services/whatsappProvider.evolution';
import { canonicalWhatsappChatId } from '../utils/whatsappChat.util';
import { persistWhatsappContactCache } from '../services/whatsappChat.service';

function denyIfNotEvolution(res: Response): boolean {
  if (!isEvolutionProviderKind()) {
    res.status(400).json({
      success: false,
      error: 'Estes endpoints só se aplicam ao provedor Evolution API (WHATSAPP_PROVIDER_KIND=evolution).'
    });
    return false;
  }
  return true;
}

export async function postEvolutionWhatsappNumbers(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const numbers = Array.isArray(req.body?.numbers) ? (req.body.numbers as unknown[]) : [];
  const str = numbers.map((n) => String(n).trim()).filter(Boolean);
  if (str.length === 0) {
    res.status(400).json({ success: false, error: 'Informe numbers: string[]' });
    return;
  }
  try {
    const data = await EvoChat.evolutionWhatsappNumbers(str);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFindContacts(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const where = req.body?.where && typeof req.body.where === 'object' ? req.body.where : {};
  try {
    const data = await EvoChat.evolutionFindContacts(where as Record<string, unknown>);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFindChats(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  try {
    const data = await EvoChat.evolutionFindChats(body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFindMessages(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  try {
    const data = await EvoChat.evolutionFindMessages(body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFindStatusMessage(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  try {
    const data = await EvoChat.evolutionFindStatusMessage(body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionMarkMessageAsRead(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const readMessages = Array.isArray(req.body?.readMessages) ? req.body.readMessages : [];
  try {
    const data = await EvoChat.evolutionMarkMessageAsRead(readMessages as unknown[]);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionMarkChatUnread(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const lastMessageRaw = (req.body as Record<string, unknown> | undefined)?.lastMessage;
  const chat = typeof req.body?.chat === 'string' ? req.body.chat : '';
  const lastMessage =
    Array.isArray(lastMessageRaw)
      ? (lastMessageRaw as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      : lastMessageRaw && typeof lastMessageRaw === 'object'
        ? [lastMessageRaw as Record<string, unknown>]
        : [];
  if (lastMessage.length === 0 || !chat) {
    res.status(400).json({ success: false, error: 'lastMessage (objeto/array) e chat (remoteJid) são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionMarkChatUnread({
      lastMessage: lastMessage as Array<Record<string, unknown>>,
      chat
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionArchiveChat(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const data = await EvoChat.evolutionArchiveChat(body as Parameters<typeof EvoChat.evolutionArchiveChat>[0]);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function deleteEvolutionMessageForEveryone(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const data = await EvoChat.evolutionDeleteMessageForEveryone(body as Parameters<typeof EvoChat.evolutionDeleteMessageForEveryone>[0]);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdateMessage(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const number = typeof body.number === 'number' && Number.isInteger(body.number) ? body.number : null;
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const key = body.key && typeof body.key === 'object' ? (body.key as Record<string, unknown>) : null;
  const remoteJid = typeof key?.remoteJid === 'string' ? key.remoteJid.trim() : '';
  const fromMe = typeof key?.fromMe === 'boolean' ? key.fromMe : null;
  const id = typeof key?.id === 'string' ? key.id.trim() : '';
  if (number === null || !text || !remoteJid || fromMe === null || !id) {
    res.status(400).json({
      success: false,
      error: 'Payload inválido para update-message. Esperado: { number: integer, text, key: { remoteJid, fromMe, id } }'
    });
    return;
  }
  try {
    const data = await EvoChat.evolutionUpdateMessage({
      number,
      text,
      key: { remoteJid, fromMe, id }
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendPresence(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const number = typeof body.number === 'string' ? body.number.trim() : '';
  const options = body.options && typeof body.options === 'object' ? (body.options as Record<string, unknown>) : null;
  const delay = typeof options?.delay === 'number' && Number.isInteger(options.delay) ? options.delay : null;
  const presence =
    options?.presence === 'composing' ? 'composing' : options?.presence === 'recording' ? 'recording' : '';
  const optionsNumber = typeof options?.number === 'string' ? options.number.trim() : '';
  if (!number || delay === null || !presence || !optionsNumber) {
    res.status(400).json({
      success: false,
      error:
        'Payload inválido para send-presence. Esperado: { number: string, options: { delay: integer, presence: composing|recording, number: string } }'
    });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendPresence({
      number,
      options: { delay, presence, number: optionsNumber }
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSetInstancePresence(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const presence = req.body?.presence === 'unavailable' ? 'unavailable' : req.body?.presence === 'available' ? 'available' : '';
  if (!presence) {
    res.status(400).json({ success: false, error: 'presence deve ser available ou unavailable' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSetInstancePresence(presence);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdateBlockStatus(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const number = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
  const status = req.body?.status === 'unblock' ? 'unblock' : req.body?.status === 'block' ? 'block' : '';
  if (!number || !status) {
    res.status(400).json({ success: false, error: 'number e status (block|unblock) são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionUpdateBlockStatus({ number, status });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFetchProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const number = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
  if (!number) {
    res.status(400).json({ success: false, error: 'number (remoteJid) é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionFetchProfilePictureUrl(number);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGetBase64Media(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  try {
    const data = await EvoChat.evolutionGetBase64FromMediaMessage(body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFetchContactProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const number = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
  if (!number) {
    res.status(400).json({ success: false, error: 'number é obrigatório (DDI + número ou JID)' });
    return;
  }
  try {
    const raw = await EvoChat.evolutionFetchProfile(number);

    const top = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const nested =
      top.data && typeof top.data === 'object' && !Array.isArray(top.data)
        ? (top.data as Record<string, unknown>)
        : null;
    const obj = nested ? { ...top, ...nested } : top;

    const pick = (keys: string[]): string | null => {
      for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string') {
          const t = v.trim();
          if (t) return t;
        }
      }
      return null;
    };

    const displayName = pick(['name', 'pushName', 'pushname', 'notify', 'verifiedName', 'shortName']);
    const profilePictureUrl = pick(['picture', 'pictureUrl', 'profilePictureUrl', 'profilePicUrl', 'photoUrl']);

    // Best-effort: se o front chamar o endpoint diretamente, já deixa persistido.
    const cid = canonicalWhatsappChatId(number);
    if (displayName || profilePictureUrl) {
      await persistWhatsappContactCache({
        chatId: cid,
        displayName: displayName ?? null,
        profilePictureUrl: profilePictureUrl ?? null
      });
    }

    res.json({ success: true, data: { displayName, profilePictureUrl, raw } });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionFetchBusinessProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const number = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
  if (!number) {
    res.status(400).json({ success: false, error: 'number é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionFetchBusinessProfile(number);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdateSessionProfileName(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const name = typeof req.body?.name === 'string' ? req.body.name : '';
  if (!name.trim()) {
    res.status(400).json({ success: false, error: 'name é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionUpdateSessionProfileName(name);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdateSessionProfileStatus(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const status = typeof req.body?.status === 'string' ? req.body.status : '';
  if (!status.trim()) {
    res.status(400).json({ success: false, error: 'status é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionUpdateSessionProfileStatus(status);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdateSessionProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const picture = typeof req.body?.picture === 'string' ? req.body.picture : '';
  if (!picture.trim()) {
    res.status(400).json({ success: false, error: 'picture é obrigatório (URL ou base64 conforme Evolution)' });
    return;
  }
  try {
    const data = await EvoChat.evolutionUpdateSessionProfilePicture(picture);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function deleteEvolutionSessionProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  try {
    const data = await EvoChat.evolutionRemoveSessionProfilePicture();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionPrivacySettings(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  try {
    const data = await EvoChat.evolutionFetchPrivacySettings();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionUpdatePrivacySettings(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const readreceipts = b.readreceipts === 'all' || b.readreceipts === 'none' ? b.readreceipts : '';
  const profile =
    b.profile === 'all' ||
    b.profile === 'contacts' ||
    b.profile === 'contact_blacklist' ||
    b.profile === 'none'
      ? b.profile
      : '';
  const status =
    b.status === 'all' ||
    b.status === 'contacts' ||
    b.status === 'contact_blacklist' ||
    b.status === 'none'
      ? b.status
      : '';
  const online = b.online === 'all' || b.online === 'match_last_seen' ? b.online : '';
  const last =
    b.last === 'all' || b.last === 'contacts' || b.last === 'contact_blacklist' || b.last === 'none' ? b.last : '';
  const groupadd =
    b.groupadd === 'all' || b.groupadd === 'contacts' || b.groupadd === 'contact_blacklist' ? b.groupadd : '';

  if (!readreceipts || !profile || !status || !online || !last || !groupadd) {
    res.status(400).json({
      success: false,
      error:
        'Campos obrigatórios: readreceipts (all|none), profile, status, last (all|contacts|contact_blacklist|none), online (all|match_last_seen), groupadd (all|contacts|contact_blacklist)'
    });
    return;
  }

  try {
    const data = await EvoChat.evolutionUpdatePrivacySettings({
      readreceipts,
      profile,
      status,
      online,
      last,
      groupadd
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  Message Controller  — /evolution/message/*
// ═══════════════════════════════════════════════════════════════

function bodyObj(req: AuthRequest): Record<string, unknown> {
  return req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
}

export async function postEvolutionSendText(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.text) {
    res.status(400).json({ success: false, error: 'number e text são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendText(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendStatus(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.type || !b.content) {
    res.status(400).json({ success: false, error: 'type e content são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendStatus(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendMedia(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.media) {
    res.status(400).json({ success: false, error: 'number e media são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendMediaMsg(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendWhatsAppAudio(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.audio) {
    res.status(400).json({ success: false, error: 'number e audio são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendWhatsAppAudio(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendSticker(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.sticker) {
    res.status(400).json({ success: false, error: 'number e sticker são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendSticker(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendLocation(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  const number = typeof b.number === 'string' ? b.number.trim() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const latitude = typeof b.latitude === 'number' ? b.latitude : Number.NaN;
  const longitude = typeof b.longitude === 'number' ? b.longitude : Number.NaN;
  if (!number || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({
      success: false,
      error: 'number, latitude e longitude são obrigatórios'
    });
    return;
  }
  const payload: Record<string, unknown> = {
    ...b,
    number,
    name: name || `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`,
    address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    latitude,
    longitude
  };
  try {
    const data = await EvoChat.evolutionSendLocation(payload);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendContact(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !Array.isArray(b.contact) || b.contact.length === 0) {
    res.status(400).json({ success: false, error: 'number e contact[] são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendContact(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendReaction(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.key || !b.reaction) {
    res.status(400).json({ success: false, error: 'key e reaction são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendReaction(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendPoll(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.name || !Array.isArray(b.values)) {
    res.status(400).json({ success: false, error: 'number, name e values[] são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendPoll(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionSendList(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.number || !b.title || !Array.isArray(b.sections)) {
    res.status(400).json({ success: false, error: 'number, title e sections[] são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionSendList(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  Group Controller  — /evolution/group/*
// ═══════════════════════════════════════════════════════════════

function reqGroupJid(req: AuthRequest): string {
  return (typeof req.body?.groupJid === 'string' ? req.body.groupJid : typeof req.query?.groupJid === 'string' ? req.query.groupJid : '').trim();
}

export async function postEvolutionGroupCreate(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.subject || !Array.isArray(b.participants) || b.participants.length === 0) {
    res.status(400).json({ success: false, error: 'subject e participants[] são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupCreate(b);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupUpdatePicture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const image = typeof req.body?.image === 'string' ? req.body.image.trim() : '';
  if (!groupJid || !image) {
    res.status(400).json({ success: false, error: 'groupJid e image são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupUpdatePicture(groupJid, image);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupUpdateSubject(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  if (!groupJid || !subject) {
    res.status(400).json({ success: false, error: 'groupJid e subject são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupUpdateSubject(groupJid, subject);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupUpdateDescription(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const description = typeof req.body?.description === 'string' ? req.body.description : '';
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupUpdateDescription(groupJid, description);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionGroupFetchInviteCode(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório (query param)' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupFetchInviteCode(groupJid);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupRevokeInviteCode(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupRevokeInviteCode(groupJid);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupSendInvite(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const b = bodyObj(req);
  if (!b.groupJid || !Array.isArray(b.numbers) || b.numbers.length === 0) {
    res.status(400).json({ success: false, error: 'groupJid, description e numbers[] são obrigatórios' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupSendInvite(b);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionGroupFindByInviteCode(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const inviteCode = typeof req.query?.inviteCode === 'string' ? req.query.inviteCode.trim() : '';
  if (!inviteCode) {
    res.status(400).json({ success: false, error: 'inviteCode é obrigatório (query param)' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupFindByInviteCode(inviteCode);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionGroupFindByJid(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório (query param)' });
    return;
  }
  try {
    const data = await EvoChat.evolutionFindGroupByJid(groupJid);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionGroupFetchAll(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const getParticipants = req.query?.getParticipants === 'true';
  try {
    const data = await EvoChat.evolutionFetchAllGroups(getParticipants);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function getEvolutionGroupFindMembers(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório (query param)' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupFindMembers(groupJid);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupUpdateMembers(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const b = bodyObj(req);
  const action = b.action as string;
  const participants = Array.isArray(b.participants) ? (b.participants as string[]) : [];
  if (!groupJid || !['add', 'remove', 'promote', 'demote'].includes(action) || participants.length === 0) {
    res.status(400).json({
      success: false,
      error: 'groupJid, action (add|remove|promote|demote) e participants[] são obrigatórios'
    });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupUpdateMembers(groupJid, {
      action: action as 'add' | 'remove' | 'promote' | 'demote',
      participants
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupUpdateSetting(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  if (!groupJid || !['announcement', 'not_announcement', 'locked', 'unlocked'].includes(action)) {
    res.status(400).json({
      success: false,
      error: 'groupJid e action (announcement|not_announcement|locked|unlocked) são obrigatórios'
    });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupUpdateSetting(
      groupJid,
      action as 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function postEvolutionGroupToggleEphemeral(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  const expiration = typeof req.body?.expiration === 'number' ? req.body.expiration : 0;
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupToggleEphemeral(groupJid, expiration);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}

export async function deleteEvolutionGroupLeave(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user?.userId || !denyIfNotEvolution(res)) return;
  const groupJid = reqGroupJid(req);
  if (!groupJid) {
    res.status(400).json({ success: false, error: 'groupJid é obrigatório' });
    return;
  }
  try {
    const data = await EvoChat.evolutionGroupLeave(groupJid);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro' });
  }
}
