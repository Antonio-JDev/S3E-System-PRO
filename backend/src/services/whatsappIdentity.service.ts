import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId, digitsOnly, waJidToDigits } from '../utils/whatsappChat.util';
import { evolutionCheckPhoneExists } from './whatsappEvolutionChat.service';
import { isEvolutionProviderKind } from './whatsappProvider.evolution';

function parseAliasesJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

/** Dígitos normalizados para chave única (DDI 55 quando aplicável ao BR). */
export function normalizePhoneDigitsKey(digitsRaw: string): string {
  const d0 = digitsOnly(digitsRaw || '');
  if (!d0) return '';
  let d = d0;
  if (d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return d;
}

function isPlausibleBrPhoneDigits(d: string): boolean {
  if (!d) return false;
  const len = d.length;
  return len >= 10 && len <= 15;
}

export async function recordWhatsappChatIdentity(params: {
  phoneDigitsKey: string;
  primaryChatId: string;
  source?: string | null;
  /** JIDs adicionais para manter no array aliases (ex.: conversa antiga @c.us). */
  extraJids?: string[];
}): Promise<void> {
  const phoneDigitsKey = normalizePhoneDigitsKey(params.phoneDigitsKey);
  if (!phoneDigitsKey || !params.primaryChatId.trim()) return;

  const primary = canonicalWhatsappChatId(params.primaryChatId.trim());
  const extras = (params.extraJids || []).map((j) => canonicalWhatsappChatId(j.trim())).filter(Boolean);

  // Proteção: o caller só deve gravar identity quando temos o telefone REAL.
  // Em alguns webhooks o `phoneDigitsKey` chega como `digitsOnly(jid@lid)`
  // (o ID interno do WhatsApp, não o telefone). Isso polui a tabela e
  // depois aparece como "número" no header do chat. Detectamos esse caso
  // comparando com a parte local do próprio LID — se forem iguais, o
  // valor não é confiável.
  if (primary.toLowerCase().endsWith('@lid')) {
    const lidLocal = digitsOnly(primary.split('@')[0] || '');
    if (lidLocal && lidLocal === digitsOnly(phoneDigitsKey)) {
      return;
    }
  }

  const existing = await prisma.whatsappChatIdentity.findUnique({
    where: { phoneDigits: phoneDigitsKey },
    select: { aliases: true, primaryChatId: true }
  });

  // Política de "qual JID vira o primaryChatId":
  //  - Se EM PRIMEIRO LUGAR o caller forneceu um `@lid`: usa ele (o WhatsApp
  //    moderno emite ACK/foto pelo LID — é o JID "canônico" do contato).
  //  - Se já existe um primary `@lid` no banco: NÃO sobrescreve com PN
  //    (`@c.us`/`@s.whatsapp.net`). Apenas anexa o novo JID aos aliases.
  //  - Caso contrário (todos PN): mantém o último primary informado.
  const existingPrimary = existing?.primaryChatId
    ? canonicalWhatsappChatId(existing.primaryChatId)
    : null;
  const existingIsLid = !!existingPrimary && existingPrimary.toLowerCase().endsWith('@lid');
  const newIsLid = primary.toLowerCase().endsWith('@lid');
  const nextPrimary = existingIsLid && !newIsLid ? existingPrimary! : primary;

  const merged = new Set<string>(parseAliasesJson(existing?.aliases));
  merged.add(primary);
  merged.add(nextPrimary);
  if (existingPrimary) merged.add(existingPrimary);
  for (const e of extras) merged.add(e);

  await prisma.whatsappChatIdentity.upsert({
    where: { phoneDigits: phoneDigitsKey },
    create: {
      phoneDigits: phoneDigitsKey,
      primaryChatId: nextPrimary,
      aliases: [...merged] as Prisma.InputJsonValue,
      source: params.source?.trim() || null
    },
    update: {
      primaryChatId: nextPrimary,
      aliases: [...merged] as Prisma.InputJsonValue,
      ...(params.source?.trim() ? { source: params.source.trim() } : {})
    }
  });
}

type IdentityRow = { phoneDigits: string; primaryChatId: string; aliases: unknown };

/** Carrega identidades para merge de lista / resolução. */
export async function loadWhatsappChatIdentities(): Promise<IdentityRow[]> {
  return prisma.whatsappChatIdentity.findMany({
    select: { phoneDigits: true, primaryChatId: true, aliases: true }
  });
}

/**
 * Dado um chatId armazenado no CRM, devolve o JID preferido para envio/lista
 * (Evolution: @lid ou PN conforme mapa / whatsappNumbers).
 */
/**
 * Coleta TODAS as identidades cujo primary ou aliases batem com o JID alvo.
 * Existem cenários reais com duplicatas: BR mobile aceita o mesmo contato com
 * ou sem o "nono dígito" (`554796751153` vs `5547996751153`), e cada
 * representação vira uma linha no identities. Em vez de retornar a primeira
 * match (que pode ter primary PN antigo), olhamos todas e priorizamos a que
 * tem primary `@lid` — esse é o JID que recebe ACK/foto no WhatsApp moderno.
 */
function collectMatchingIdentities(canon: string, identities: IdentityRow[]): IdentityRow[] {
  const matches: IdentityRow[] = [];
  for (const row of identities) {
    const primary = canonicalWhatsappChatId(row.primaryChatId);
    if (primary === canon) {
      matches.push(row);
      continue;
    }
    const als = parseAliasesJson(row.aliases);
    if (als.some((a) => canonicalWhatsappChatId(a) === canon)) {
      matches.push(row);
    }
  }
  return matches;
}

function pickBestPrimaryFromMatches(matches: IdentityRow[]): string | null {
  if (matches.length === 0) return null;
  // 1ª prioridade: matches cujo primary é `@lid`.
  const lidFirst = matches.find((m) => canonicalWhatsappChatId(m.primaryChatId).toLowerCase().endsWith('@lid'));
  if (lidFirst) return canonicalWhatsappChatId(lidFirst.primaryChatId);
  return canonicalWhatsappChatId(matches[0].primaryChatId);
}

export async function resolvePreferredChatIdForOutbound(chatIdRaw: string): Promise<string> {
  const chatId = (chatIdRaw || '').trim();
  if (!chatId) return chatId;

  const lower = chatId.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return canonicalWhatsappChatId(chatId);
  }

  const canon = canonicalWhatsappChatId(chatId);
  const identities = await loadWhatsappChatIdentities();

  const directMatches = collectMatchingIdentities(canon, identities);
  const preferred = pickBestPrimaryFromMatches(directMatches);
  if (preferred) return preferred;

  const digits = waJidToDigits(canon);
  const phoneKey = normalizePhoneDigitsKey(digits);
  if (phoneKey && isPlausibleBrPhoneDigits(phoneKey)) {
    // Considera variantes BR com/sem o "nono dígito" — a entrada do
    // identities pode ter sido criada por um lado e o JID consultado pelo
    // outro lado (ex.: agenda velha tem 12 dígitos, mas o WhatsApp moderno
    // registrou 13). Procuramos as duas e priorizamos LID.
    const altKeys = new Set<string>([phoneKey]);
    if (phoneKey.length === 12 && phoneKey.startsWith('55')) {
      // 55 + DDD(2) + 8 dígitos → adiciona o 9
      altKeys.add(`${phoneKey.slice(0, 4)}9${phoneKey.slice(4)}`);
    }
    if (phoneKey.length === 13 && phoneKey.startsWith('55') && phoneKey[4] === '9') {
      // 55 + DDD(2) + 9 + 8 dígitos → remove o 9
      altKeys.add(`${phoneKey.slice(0, 4)}${phoneKey.slice(5)}`);
    }
    const phoneRows = identities.filter((r) => altKeys.has(r.phoneDigits));
    const preferredPhone = pickBestPrimaryFromMatches(phoneRows);
    if (preferredPhone) return preferredPhone;
  }

  if (isEvolutionProviderKind() && phoneKey && isPlausibleBrPhoneDigits(phoneKey)) {
    try {
      const { numberExists, chatId: jid } = await evolutionCheckPhoneExists(phoneKey);
      if (numberExists && jid) {
        const resolved = canonicalWhatsappChatId(jid);
        await recordWhatsappChatIdentity({
          phoneDigitsKey: phoneKey,
          primaryChatId: resolved,
          source: 'resolve_outbound',
          extraJids: [canon]
        });
        return resolved;
      }
    } catch {
      // mantém canon
    }
  }

  return canon;
}

/** Abre conversa a partir de telefone (Funil / agenda): resolve JID ativo na Evolution e persiste mapa. */
export async function resolveOpenWhatsappChatFromPhone(phoneRaw: string): Promise<{
  chatId: string;
  numberExists: boolean;
  titleHint: string | null;
}> {
  const phoneKey = normalizePhoneDigitsKey(phoneRaw);
  if (!phoneKey) {
    throw new Error('Telefone inválido');
  }

  if (isEvolutionProviderKind()) {
    const { numberExists, chatId: jid } = await evolutionCheckPhoneExists(phoneKey);
    if (numberExists && jid) {
      const chatId = canonicalWhatsappChatId(jid);
      const pnDigits = normalizePhoneDigitsKey(waJidToDigits(chatId));
      await recordWhatsappChatIdentity({
        phoneDigitsKey: pnDigits || phoneKey,
        primaryChatId: chatId,
        source: 'resolve_open',
        extraJids: [`${phoneKey}@c.us`, `${phoneKey}@s.whatsapp.net`].filter((x) => canonicalWhatsappChatId(x) !== chatId)
      });
      return { chatId, numberExists: true, titleHint: null };
    }
    const fallback = canonicalWhatsappChatId(`${phoneKey}@c.us`);
    return { chatId: fallback, numberExists: false, titleHint: null };
  }

  const fallback = canonicalWhatsappChatId(`${phoneKey}@c.us`);
  return { chatId: fallback, numberExists: true, titleHint: null };
}

/**
 * Retorna **todos** os JIDs que pertencem ao mesmo "contato lógico" (PN + LID
 * + variantes BR de 10/11 dígitos). Usado para operações que precisam afetar
 * TODAS as variantes de uma só vez — ex.: marcar como lido. Sem isso, um chat
 * com mensagens em `@c.us` antigo + `@lid` novo só vê metade do
 * `unread_count` zerado e o badge nunca sai do "1".
 */
export function expandedStorageChatIdVariants(
  chatId: string,
  identities: IdentityRow[]
): string[] {
  const raw = (chatId || '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return [canonicalWhatsappChatId(raw)];
  }

  const canon = canonicalWhatsappChatId(raw);
  const out = new Set<string>([raw, canon]);

  // Para PN: incluir todas as variações de dígitos (com/sem 55).
  if (!lower.endsWith('@lid')) {
    const digits = waJidToDigits(canon);
    if (digits) {
      out.add(`${digits}@c.us`);
      out.add(`${digits}@s.whatsapp.net`);
      if (digits.startsWith('55') && digits.length > 2) {
        const rest = digits.slice(2);
        out.add(`${rest}@c.us`);
        out.add(`${rest}@s.whatsapp.net`);
      } else {
        out.add(`55${digits}@c.us`);
        out.add(`55${digits}@s.whatsapp.net`);
      }
    }
  }

  // CRÍTICO: cruzar com `whatsapp_chat_identities` para incluir LIDs (quando
  // o caller passou um PN) e PNs (quando passou um LID). Sem isso, o read
  // state fica fragmentado por JID e o merge no `listMergedChatPreviews`
  // soma `unread_count`s de variantes que ainda não foram marcadas.
  const matches = collectMatchingIdentities(canon, identities);
  for (const m of matches) {
    out.add(canonicalWhatsappChatId(m.primaryChatId));
    if (Array.isArray(m.aliases)) {
      for (const a of m.aliases) {
        if (typeof a === 'string' && a.trim()) {
          out.add(canonicalWhatsappChatId(a));
        }
      }
    }
  }

  return [...out].filter(Boolean);
}

/**
 * Telefones reais (chaves BR) para cruzar lead/cliente quando o chatId é `@lid`
 * ou PN legado — mesma lógica da lista de chats (`enrichPreviewsWithProviderCache`).
 */
export async function resolvePhoneDigitKeysForChat(chatIdRaw: string): Promise<string[]> {
  const canon = canonicalWhatsappChatId((chatIdRaw || '').trim());
  if (!canon) return [];

  const lower = canon.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return [];
  }

  const out = new Set<string>();
  const addKey = (raw: string) => {
    const k = normalizePhoneDigitsKey(raw);
    if (!k || !isPlausibleBrPhoneDigits(k)) return;
    out.add(k);
    if (k.length === 12 && k.startsWith('55')) {
      out.add(`${k.slice(0, 4)}9${k.slice(4)}`);
    }
    if (k.length === 13 && k.startsWith('55') && k[4] === '9') {
      out.add(`${k.slice(0, 4)}${k.slice(5)}`);
    }
  };

  const identities = await loadWhatsappChatIdentities();
  const isLid = lower.endsWith('@lid');

  if (!isLid) {
    addKey(waJidToDigits(canon));
  }

  for (const m of collectMatchingIdentities(canon, identities)) {
    addKey(m.phoneDigits);
    const primary = canonicalWhatsappChatId(m.primaryChatId);
    if (!primary.toLowerCase().endsWith('@lid')) {
      addKey(waJidToDigits(primary));
    }
    for (const a of parseAliasesJson(m.aliases)) {
      const ac = canonicalWhatsappChatId(a);
      if (!ac.toLowerCase().endsWith('@lid')) {
        addKey(waJidToDigits(ac));
      }
    }
  }

  const variantChatIds = expandedStorageChatIdVariants(canon, identities);
  if (variantChatIds.length > 0) {
    const caches = await prisma.whatsappContactCache.findMany({
      where: { chatId: { in: variantChatIds } },
      select: { phoneDigits: true }
    });
    for (const c of caches) {
      if (c.phoneDigits) addKey(c.phoneDigits);
    }

    const s3eRows = await prisma.contatoS3e.findMany({
      where: { jid: { in: variantChatIds } },
      select: { numero: true }
    });
    for (const s of s3eRows) {
      if (s.numero) addKey(s.numero);
    }
  }

  return [...out];
}

export function mergeKeyForChatPreviewRow(
  chatId: string,
  identities: IdentityRow[]
): string {
  const lower = chatId.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter')) {
    return canonicalWhatsappChatId(chatId);
  }

  const canon = canonicalWhatsappChatId(chatId);

  for (const row of identities) {
    const primary = canonicalWhatsappChatId(row.primaryChatId);
    if (primary === canon) return primary;
    const als = parseAliasesJson(row.aliases);
    if (als.some((a) => canonicalWhatsappChatId(a) === canon)) {
      return primary;
    }
  }

  const digits = waJidToDigits(canon);
  const phoneKey = normalizePhoneDigitsKey(digits);
  if (phoneKey && isPlausibleBrPhoneDigits(phoneKey)) {
    const row = identities.find((r) => r.phoneDigits === phoneKey);
    if (row) return canonicalWhatsappChatId(row.primaryChatId);
  }

  return canon;
}
