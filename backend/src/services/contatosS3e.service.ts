import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId, waJidToDigits } from '../utils/whatsappChat.util';
import { normalizePhoneDigitsKey, recordWhatsappChatIdentity } from './whatsappIdentity.service';
import * as EvoChat from './whatsappEvolutionChat.service';
import { isEvolutionProviderKind } from './whatsappProvider.evolution';
import { sanitizeBrPhone } from '../utils/brPhoneNumber.util';

export async function persistContatoS3eJidAndInteraction(
  phoneDigitsRaw: string,
  jid: string,
  pushName?: string | null
): Promise<void> {
  const key = normalizePhoneDigitsKey(String(phoneDigitsRaw || '').replace(/\D/g, ''));
  if (!key || !isPlausibleBrPhoneDigits(key)) return;
  const resolvedJid = canonicalWhatsappChatId(jid);
  await prisma.contatoS3e.upsert({
    where: { numero: key },
    create: {
      numero: key,
      jid: resolvedJid,
      pushName: pushName?.trim() || null,
      ultimaInteracao: new Date(),
      origem: 'pre_send'
    },
    update: {
      jid: resolvedJid,
      ...(pushName?.trim() ? { pushName: pushName.trim() } : {}),
      ultimaInteracao: new Date()
    }
  });
}

function isPlausibleBrPhoneDigits(d: string): boolean {
  if (!d) return false;
  const len = d.length;
  return len >= 10 && len <= 15;
}

/**
 * Consulta o provedor (whatsappNumbers / user check), persiste JID em `contatos_s3e` e identidades.
 * Chamado antes de cada envio para refrescar @lid quando aplicável.
 */
export async function refreshContatoS3eFromWhatsappNumbers(chatIdRaw: string): Promise<void> {
  if (!isEvolutionProviderKind()) return;

  const chatId = canonicalWhatsappChatId((chatIdRaw || '').trim());
  if (!chatId || chatId.toLowerCase().endsWith('@g.us') || chatId.toLowerCase().endsWith('@newsletter')) {
    return;
  }

  const digits = waJidToDigits(chatId);
  const phoneKey = normalizePhoneDigitsKey(digits);
  if (!phoneKey || !isPlausibleBrPhoneDigits(phoneKey)) return;

  try {
    const { numberExists, chatId: jid, pushName } = await EvoChat.evolutionCheckPhoneExists(phoneKey);
    if (!numberExists || !jid) return;

    const resolvedJid = canonicalWhatsappChatId(jid);
    await recordWhatsappChatIdentity({
      phoneDigitsKey: phoneKey,
      primaryChatId: resolvedJid,
      source: 'pre_send_whatsappNumbers',
      extraJids: [chatId]
    });

    await persistContatoS3eJidAndInteraction(phoneKey, resolvedJid, pushName);
  } catch {
    /* best-effort */
  }
}

/**
 * Resolve o nome da agenda S3E + telefone real do contato para um chatId.
 *
 * Há 3 caminhos de match (em ordem):
 *  1) `contatos_s3e.jid = canon` (mais rápido quando o registro já foi
 *      vinculado pelo webhook ou pela tela de "Buscar perfil").
 *  2) `contatos_s3e.numero = digits` (PN: `5547...@c.us` → digits do JID).
 *  3) `@lid` → consulta `whatsapp_chat_identities` para descobrir o
 *      `phoneDigits` real e então bate em `contatos_s3e.numero`. Sem este
 *      passo o JID `@lid` (que NÃO carrega o telefone) acaba "vazando" na
 *      UI como um número longo (ex.: 214787053113450), porque o frontend
 *      cai em `formatPhoneForDisplay` sem ter o nome.
 *
 * Retorna `{ nomeAgenda, numero }`: o telefone real é útil para o
 * cabeçalho do chat exibir "(47) 9 9675-1153" em vez do LID.
 */
export async function findContatoS3eNomeAgendaForChat(
  chatId: string
): Promise<{ nomeAgenda: string | null; numero: string | null }> {
  const canon = canonicalWhatsappChatId(chatId.trim());
  if (!canon || canon.toLowerCase().endsWith('@g.us')) return { nomeAgenda: null, numero: null };
  const isLid = canon.toLowerCase().endsWith('@lid');
  const digits = normalizePhoneDigitsKey(waJidToDigits(canon));

  // 1) Match por JID (incluindo @lid).
  if (canon.includes('@')) {
    const byJid = await prisma.contatoS3e.findFirst({
      where: { jid: canon },
      select: { nomeAgenda: true, numero: true }
    });
    if (byJid?.numero) {
      return { nomeAgenda: byJid.nomeAgenda?.trim() || null, numero: byJid.numero };
    }
  }

  // 2) Match por número (somente para PN — para LID o `digits` é o ID interno).
  if (!isLid && digits) {
    const byNum = await prisma.contatoS3e.findUnique({
      where: { numero: digits },
      select: { nomeAgenda: true, numero: true }
    });
    if (byNum?.numero) {
      return { nomeAgenda: byNum.nomeAgenda?.trim() || null, numero: byNum.numero };
    }
  }

  // 3) Fallback LID → resolve telefone real via `whatsapp_chat_identities`.
  if (isLid) {
    const identity = await prisma.whatsappChatIdentity.findFirst({
      where: {
        OR: [
          { primaryChatId: canon },
          // `aliases` é Json `string[]`; usamos `array_contains` para varrer.
          { aliases: { array_contains: canon } as Prisma.JsonNullableFilter }
        ]
      },
      select: { phoneDigits: true }
    });
    const phone = identity?.phoneDigits?.trim();
    if (phone) {
      const byNum = await prisma.contatoS3e.findUnique({
        where: { numero: phone },
        select: { nomeAgenda: true, numero: true }
      });
      if (byNum?.numero) {
        return { nomeAgenda: byNum.nomeAgenda?.trim() || null, numero: byNum.numero };
      }
      // Encontrou identidade (telefone conhecido) mas o S3E ainda não tem
      // o registro — devolve só o telefone para o header formatá-lo.
      return { nomeAgenda: null, numero: phone };
    }
  }

  return { nomeAgenda: null, numero: null };
}

export type ContatoS3eImportRow = {
  numero: string;
  jid?: string | null;
  nomeAgenda?: string | null;
  pushName?: string | null;
  empresa?: string | null;
};

export type ContatoS3eImportResult = {
  numero_original: string;
  numero?: string;
  ok: boolean;
  reason?: string;
  /** 'created' | 'updated' quando ok=true */
  outcome?: 'created' | 'updated';
};

export type ContatoS3eImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: ContatoS3eImportResult[];
};

/**
 * Upsert pontual (uma linha) usado pela tela "Novo contato" e pelo legado.
 * Mantém o comportamento histórico: marca `revisado=true` (origem 'import_csv').
 */
export async function upsertContatoS3eFromImport(row: ContatoS3eImportRow): Promise<void> {
  const sanitized = sanitizeBrPhone(row.numero, '47');
  const numero = sanitized.valid ? sanitized.digits : normalizePhoneDigitsKey(row.numero.replace(/\D/g, ''));
  if (!numero) return;
  await prisma.contatoS3e.upsert({
    where: { numero },
    create: {
      numero,
      jid: row.jid?.trim() || null,
      nomeAgenda: row.nomeAgenda?.trim() || null,
      pushName: row.pushName?.trim() || null,
      empresa: row.empresa?.trim() || null,
      ultimaInteracao: new Date(),
      revisado: true,
      origem: 'import_csv'
    },
    update: {
      ...(row.jid?.trim() ? { jid: row.jid.trim() } : {}),
      ...(row.nomeAgenda?.trim() ? { nomeAgenda: row.nomeAgenda.trim() } : {}),
      ...(row.pushName?.trim() ? { pushName: row.pushName.trim() } : {}),
      ...(row.empresa?.trim() ? { empresa: row.empresa.trim() } : {}),
      revisado: true,
      ultimaInteracao: new Date()
    }
  });
}

/**
 * Importa um lote de contatos (chamado pelo controller a partir do upload CSV).
 * Faz sanitização BR, dedup intra-lote por número e upsert no banco em chunks.
 *
 * Retorna um relatório linha-a-linha pra UI mostrar o que entrou, o que não entrou e por quê.
 */
export async function importContatosBatch(
  rows: ContatoS3eImportRow[],
  opts?: { dddPadrao?: string }
): Promise<ContatoS3eImportSummary> {
  const ddd = (opts?.dddPadrao || '47').replace(/\D/g, '');
  const results: ContatoS3eImportResult[] = [];

  type Prepared = {
    indices: number[];
    numero: string;
    payload: ContatoS3eImportRow;
  };
  const prepared = new Map<string, Prepared>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || ({} as ContatoS3eImportRow);
    const raw = String(row.numero ?? '').trim();
    if (!raw) {
      results[i] = { numero_original: raw, ok: false, reason: 'vazio' };
      continue;
    }
    const sanitized = sanitizeBrPhone(raw, ddd);
    if (!sanitized.valid) {
      results[i] = { numero_original: raw, numero: sanitized.digits, ok: false, reason: sanitized.reason };
      continue;
    }
    const numero = sanitized.digits;
    const existing = prepared.get(numero);
    if (existing) {
      existing.indices.push(i);
      existing.payload = {
        numero,
        nomeAgenda: row.nomeAgenda?.trim() || existing.payload.nomeAgenda || null,
        empresa: row.empresa?.trim() || existing.payload.empresa || null,
        pushName: row.pushName?.trim() || existing.payload.pushName || null,
        jid: row.jid?.trim() || existing.payload.jid || null
      };
      results[i] = { numero_original: raw, numero, ok: true, outcome: 'updated' };
      continue;
    }
    prepared.set(numero, {
      indices: [i],
      numero,
      payload: {
        numero,
        nomeAgenda: row.nomeAgenda?.trim() || null,
        empresa: row.empresa?.trim() || null,
        pushName: row.pushName?.trim() || null,
        jid: row.jid?.trim() || null
      }
    });
    results[i] = { numero_original: raw, numero, ok: true, outcome: 'created' };
  }

  const numbers = [...prepared.keys()];
  const existingRows = numbers.length
    ? await prisma.contatoS3e.findMany({
        where: { numero: { in: numbers } },
        select: { numero: true }
      })
    : [];
  const existingSet = new Set(existingRows.map((r) => r.numero));

  let created = 0;
  let updated = 0;
  let errors = 0;

  const chunkSize = 200;
  const items = [...prepared.values()];
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    await Promise.all(
      slice.map(async (item) => {
        const exists = existingSet.has(item.numero);
        try {
          await prisma.contatoS3e.upsert({
            where: { numero: item.numero },
            create: {
              numero: item.numero,
              jid: item.payload.jid?.trim() || null,
              nomeAgenda: item.payload.nomeAgenda?.trim() || null,
              pushName: item.payload.pushName?.trim() || null,
              empresa: item.payload.empresa?.trim() || null,
              ultimaInteracao: new Date(),
              revisado: true,
              origem: 'import_csv'
            },
            update: {
              ...(item.payload.jid?.trim() ? { jid: item.payload.jid.trim() } : {}),
              ...(item.payload.nomeAgenda?.trim() ? { nomeAgenda: item.payload.nomeAgenda.trim() } : {}),
              ...(item.payload.pushName?.trim() ? { pushName: item.payload.pushName.trim() } : {}),
              ...(item.payload.empresa?.trim() ? { empresa: item.payload.empresa.trim() } : {}),
              revisado: true,
              ultimaInteracao: new Date()
            }
          });
          if (exists) updated++;
          else created++;
          for (const idx of item.indices) {
            const r = results[idx];
            if (r?.ok) r.outcome = exists ? 'updated' : 'created';
          }
        } catch (err) {
          errors++;
          for (const idx of item.indices) {
            results[idx] = {
              numero_original: results[idx]?.numero_original ?? item.numero,
              numero: item.numero,
              ok: false,
              reason: err instanceof Error ? err.message : 'erro_desconhecido'
            };
          }
        }
      })
    );
  }

  const skipped = results.filter((r) => !r.ok).length - errors;
  return { total: rows.length, created, updated, skipped, errors, results };
}

/**
 * Chamado pelo webhook EvoGo ao receber mensagem de um número novo.
 * - Se o contato já existe (já importado pelo CSV ou criado antes): apenas atualiza
 *   `pushName` e `ultimaInteracao`, sem mexer em `nome_agenda` (que é o nome confiável).
 * - Se não existe: cria com `revisado=false` para o operador revisar depois.
 *
 * Nunca cria contato para grupos (chatId @g.us) nem para o `status@broadcast`.
 */
export async function upsertContatoS3eFromInboundMessage(params: {
  chatId: string;
  pushName?: string | null;
}): Promise<void> {
  const chatId = canonicalWhatsappChatId((params.chatId || '').trim());
  if (!chatId) return;
  const lower = chatId.toLowerCase();
  if (lower.endsWith('@g.us') || lower.endsWith('@newsletter') || lower === 'status@broadcast') return;

  const digits = waJidToDigits(chatId);
  const numero = normalizePhoneDigitsKey(digits);
  if (!numero || !isPlausibleBrPhoneDigits(numero)) return;

  const pushNameClean = params.pushName?.trim() || null;

  const existing = await prisma.contatoS3e.findUnique({
    where: { numero },
    select: { id: true, nomeAgenda: true, pushName: true }
  });

  if (existing) {
    await prisma.contatoS3e.update({
      where: { id: existing.id },
      data: {
        jid: chatId,
        ...(pushNameClean && pushNameClean !== existing.pushName ? { pushName: pushNameClean } : {}),
        ultimaInteracao: new Date()
      }
    });
    return;
  }

  try {
    await prisma.contatoS3e.create({
      data: {
        numero,
        jid: chatId,
        pushName: pushNameClean,
        ultimaInteracao: new Date(),
        revisado: false,
        origem: 'inbound_message'
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return;
    }
    throw e;
  }
}

export type ListContatosS3eParams = {
  search?: string;
  revisado?: 'todos' | 'sim' | 'nao';
  page?: number;
  pageSize?: number;
  orderBy?: 'recentes' | 'nome' | 'criado';
};

export type ContatoS3eDto = {
  id: string;
  numero: string;
  jid: string | null;
  nomeAgenda: string | null;
  pushName: string | null;
  empresa: string | null;
  ultimaInteracao: string | null;
  revisado: boolean;
  origem: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listContatosS3e(params: ListContatosS3eParams): Promise<{
  items: ContatoS3eDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const search = (params.search || '').trim();
  const revisado = params.revisado ?? 'todos';
  const page = Math.max(1, Math.trunc(params.page ?? 1));
  // Default 50 (tabela paginada padrão na UI), teto 5000 — necessário para
  // carregar a agenda inteira de uma vez no modal "Enviar contato" do CRM
  // (~3.000 contatos hoje). Como a consulta é indexada e o payload por linha
  // é pequeno (<200 bytes), buscar 5k é trivial em latência.
  const pageSize = Math.min(5000, Math.max(1, Math.trunc(params.pageSize ?? 50)));

  const where: Prisma.ContatoS3eWhereInput = {};

  if (revisado === 'sim') where.revisado = true;
  else if (revisado === 'nao') where.revisado = false;

  if (search) {
    const digits = search.replace(/\D/g, '');
    const or: Prisma.ContatoS3eWhereInput[] = [
      { nomeAgenda: { contains: search, mode: 'insensitive' } },
      { pushName: { contains: search, mode: 'insensitive' } },
      { empresa: { contains: search, mode: 'insensitive' } }
    ];
    if (digits.length >= 3) or.push({ numero: { contains: digits } });
    where.OR = or;
  }

  const orderBy: Prisma.ContatoS3eOrderByWithRelationInput =
    params.orderBy === 'nome'
      ? { nomeAgenda: 'asc' }
      : params.orderBy === 'criado'
        ? { createdAt: 'desc' }
        : { ultimaInteracao: { sort: 'desc', nulls: 'last' } };

  const [items, total] = await Promise.all([
    prisma.contatoS3e.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.contatoS3e.count({ where })
  ]);

  return {
    items: items.map(toDto),
    total,
    page,
    pageSize
  };
}

export async function getContatoS3eById(id: string): Promise<ContatoS3eDto | null> {
  const row = await prisma.contatoS3e.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function createContatoS3eManual(input: {
  numero: string;
  nomeAgenda?: string | null;
  empresa?: string | null;
  pushName?: string | null;
}): Promise<ContatoS3eDto> {
  const sanitized = sanitizeBrPhone(input.numero, '47');
  if (!sanitized.valid) {
    throw new ContatoS3eValidationError(`Telefone inválido (${sanitized.reason || 'numero'}).`);
  }
  const row = await prisma.contatoS3e.upsert({
    where: { numero: sanitized.digits },
    create: {
      numero: sanitized.digits,
      nomeAgenda: input.nomeAgenda?.trim() || null,
      empresa: input.empresa?.trim() || null,
      pushName: input.pushName?.trim() || null,
      revisado: true,
      origem: 'manual'
    },
    update: {
      ...(input.nomeAgenda !== undefined ? { nomeAgenda: input.nomeAgenda?.trim() || null } : {}),
      ...(input.empresa !== undefined ? { empresa: input.empresa?.trim() || null } : {}),
      ...(input.pushName !== undefined ? { pushName: input.pushName?.trim() || null } : {}),
      revisado: true
    }
  });
  return toDto(row);
}

export async function updateContatoS3e(
  id: string,
  patch: Partial<Pick<ContatoS3eDto, 'nomeAgenda' | 'empresa' | 'pushName' | 'numero' | 'revisado'>>
): Promise<ContatoS3eDto> {
  const data: Prisma.ContatoS3eUpdateInput = {};
  if (patch.nomeAgenda !== undefined) data.nomeAgenda = patch.nomeAgenda?.trim() || null;
  if (patch.empresa !== undefined) data.empresa = patch.empresa?.trim() || null;
  if (patch.pushName !== undefined) data.pushName = patch.pushName?.trim() || null;
  if (patch.revisado !== undefined) data.revisado = !!patch.revisado;
  if (patch.numero !== undefined) {
    const sanitized = sanitizeBrPhone(patch.numero, '47');
    if (!sanitized.valid) throw new ContatoS3eValidationError(`Telefone inválido (${sanitized.reason}).`);
    data.numero = sanitized.digits;
  }
  const row = await prisma.contatoS3e.update({ where: { id }, data });
  return toDto(row);
}

export async function deleteContatoS3e(id: string): Promise<void> {
  await prisma.contatoS3e.delete({ where: { id } });
}

function toDto(row: {
  id: string;
  numero: string;
  jid: string | null;
  nomeAgenda: string | null;
  pushName: string | null;
  empresa: string | null;
  ultimaInteracao: Date | null;
  revisado: boolean;
  origem: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ContatoS3eDto {
  return {
    id: row.id,
    numero: row.numero,
    jid: row.jid,
    nomeAgenda: row.nomeAgenda,
    pushName: row.pushName,
    empresa: row.empresa,
    ultimaInteracao: row.ultimaInteracao ? row.ultimaInteracao.toISOString() : null,
    revisado: !!row.revisado,
    origem: row.origem,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class ContatoS3eValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContatoS3eValidationError';
  }
}
