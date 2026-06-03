import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId } from '../utils/whatsappChat.util';

/**
 * Service de listas/etiquetas personalizadas (estilo "Listas" do WhatsApp Business).
 * Listas privadas (`isGlobal: false`) ou compartilhadas com todos (`isGlobal: true`).
 */

export interface WhatsappChatLabelDto {
  id: string;
  userId: string;
  isGlobal: boolean;
  nome: string;
  cor: string | null;
  emoji: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
  /** chatIds que pertencem à lista (canonicalizados). */
  chatIds: string[];
  /** Quantidade total de chats associados (== `chatIds.length`). */
  total: number;
}

type LabelWithMemberships = Prisma.WhatsappChatLabelGetPayload<{
  include: { memberships: true };
}>;

function toDto(label: LabelWithMemberships): WhatsappChatLabelDto {
  const chatIds = label.memberships.map((m) => canonicalWhatsappChatId(m.chatId));
  return {
    id: label.id,
    userId: label.userId,
    isGlobal: label.isGlobal,
    nome: label.nome,
    cor: label.cor ?? null,
    emoji: label.emoji ?? null,
    ordem: label.ordem,
    createdAt: label.createdAt.toISOString(),
    updatedAt: label.updatedAt.toISOString(),
    chatIds,
    total: chatIds.length
  };
}

/** Lista etiquetas do usuário (privadas) + listas globais do sistema. */
export async function listLabelsForUser(userId: string): Promise<WhatsappChatLabelDto[]> {
  const rows = await prisma.whatsappChatLabel.findMany({
    where: {
      OR: [{ userId, isGlobal: false }, { isGlobal: true }]
    },
    include: { memberships: true },
    orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }]
  });
  return rows.map(toDto);
}

export interface CreateLabelInput {
  userId: string;
  nome: string;
  cor?: string | null;
  emoji?: string | null;
  ordem?: number;
  chatIds?: string[];
  /** Se true, todos os usuários veem este filtro. */
  isGlobal?: boolean;
}

export async function createLabel(input: CreateLabelInput): Promise<WhatsappChatLabelDto> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Nome da lista é obrigatório.');

  const isGlobal = !!input.isGlobal;

  if (isGlobal) {
    const dup = await prisma.whatsappChatLabel.findFirst({
      where: { isGlobal: true, nome }
    });
    if (dup) throw new Error('Já existe uma lista global com esse nome.');
  }

  const chatIds = Array.from(
    new Set(
      (input.chatIds ?? [])
        .map((c) => canonicalWhatsappChatId(c).trim())
        .filter(Boolean)
    )
  );

  const created = await prisma.$transaction(async (tx) => {
    const label = await tx.whatsappChatLabel.create({
      data: {
        userId: input.userId,
        isGlobal,
        nome,
        cor: input.cor?.trim() || null,
        emoji: input.emoji?.trim() || null,
        ordem: input.ordem ?? 0
      }
    });
    if (chatIds.length > 0) {
      await tx.whatsappChatLabelMembership.createMany({
        data: chatIds.map((cid) => ({ labelId: label.id, chatId: cid })),
        skipDuplicates: true
      });
    }
    return tx.whatsappChatLabel.findUniqueOrThrow({
      where: { id: label.id },
      include: { memberships: true }
    });
  });

  return toDto(created);
}

export interface UpdateLabelInput {
  nome?: string;
  cor?: string | null;
  emoji?: string | null;
  ordem?: number;
}

/** Leitura: lista privada do dono ou qualquer lista global. */
async function findLabelReadable(
  id: string,
  userId: string
): Promise<LabelWithMemberships | null> {
  const row = await prisma.whatsappChatLabel.findUnique({
    where: { id },
    include: { memberships: true }
  });
  if (!row) return null;
  if (row.isGlobal) return row;
  if (row.userId === userId) return row;
  return null;
}

export interface LabelMutationOptions {
  /** Admin CRM pode editar/apagar listas globais de outros usuários. */
  isAdmin?: boolean;
}

/** Mutação: criador da lista; admin pode alterar listas globais de qualquer um. */
async function findLabelMutable(
  id: string,
  userId: string,
  opts?: LabelMutationOptions
): Promise<LabelWithMemberships | null> {
  const row = await prisma.whatsappChatLabel.findUnique({
    where: { id },
    include: { memberships: true }
  });
  if (!row) return null;
  if (row.userId === userId) return row;
  if (opts?.isAdmin && row.isGlobal) return row;
  return null;
}

export async function updateLabel(
  id: string,
  userId: string,
  patch: UpdateLabelInput,
  opts?: LabelMutationOptions
): Promise<WhatsappChatLabelDto | null> {
  const existing = await findLabelMutable(id, userId, opts);
  if (!existing) return null;
  const data: Prisma.WhatsappChatLabelUpdateInput = {};
  if (patch.nome !== undefined) {
    const t = patch.nome.trim();
    if (!t) throw new Error('Nome da lista é obrigatório.');
    if (existing.isGlobal) {
      const dup = await prisma.whatsappChatLabel.findFirst({
        where: { isGlobal: true, nome: t, id: { not: id } }
      });
      if (dup) throw new Error('Já existe uma lista global com esse nome.');
    }
    data.nome = t;
  }
  if (patch.cor !== undefined) data.cor = patch.cor?.trim() || null;
  if (patch.emoji !== undefined) data.emoji = patch.emoji?.trim() || null;
  if (patch.ordem !== undefined) data.ordem = patch.ordem;

  const updated = await prisma.whatsappChatLabel.update({
    where: { id },
    data,
    include: { memberships: true }
  });
  return toDto(updated);
}

export async function deleteLabel(
  id: string,
  userId: string
): Promise<boolean> {
  // Regra de negócio: somente o criador pode excluir a lista
  // (incluindo listas globais "para todos").
  const existing = await prisma.whatsappChatLabel.findUnique({
    where: { id },
    include: { memberships: true }
  });
  if (!existing) return false;
  if (existing.userId !== userId) return false;
  await prisma.whatsappChatLabel.delete({ where: { id } });
  return true;
}

export async function setLabelChats(
  id: string,
  userId: string,
  chatIds: string[],
  opts?: LabelMutationOptions
): Promise<WhatsappChatLabelDto | null> {
  const existing = await findLabelMutable(id, userId, opts);
  if (!existing) return null;

  const normalized = Array.from(
    new Set(chatIds.map((c) => canonicalWhatsappChatId(c).trim()).filter(Boolean))
  );

  await prisma.$transaction(async (tx) => {
    await tx.whatsappChatLabelMembership.deleteMany({ where: { labelId: id } });
    if (normalized.length > 0) {
      await tx.whatsappChatLabelMembership.createMany({
        data: normalized.map((cid) => ({ labelId: id, chatId: cid })),
        skipDuplicates: true
      });
    }
  });

  const fresh = await prisma.whatsappChatLabel.findUniqueOrThrow({
    where: { id },
    include: { memberships: true }
  });
  return toDto(fresh);
}

export async function addChatsToLabel(
  id: string,
  userId: string,
  chatIds: string[],
  opts?: LabelMutationOptions
): Promise<WhatsappChatLabelDto | null> {
  const existing = await findLabelMutable(id, userId, opts);
  if (!existing) return null;

  const normalized = Array.from(
    new Set(chatIds.map((c) => canonicalWhatsappChatId(c).trim()).filter(Boolean))
  );
  if (normalized.length === 0) {
    return toDto(existing);
  }

  await prisma.whatsappChatLabelMembership.createMany({
    data: normalized.map((cid) => ({ labelId: id, chatId: cid })),
    skipDuplicates: true
  });

  const fresh = await prisma.whatsappChatLabel.findUniqueOrThrow({
    where: { id },
    include: { memberships: true }
  });
  return toDto(fresh);
}

export async function removeChatsFromLabel(
  id: string,
  userId: string,
  chatIds: string[],
  opts?: LabelMutationOptions
): Promise<WhatsappChatLabelDto | null> {
  const existing = await findLabelMutable(id, userId, opts);
  if (!existing) return null;

  const normalized = Array.from(
    new Set(chatIds.map((c) => canonicalWhatsappChatId(c).trim()).filter(Boolean))
  );
  if (normalized.length > 0) {
    await prisma.whatsappChatLabelMembership.deleteMany({
      where: { labelId: id, chatId: { in: normalized } }
    });
  }

  const fresh = await prisma.whatsappChatLabel.findUniqueOrThrow({
    where: { id },
    include: { memberships: true }
  });
  return toDto(fresh);
}

/** Exportado para testes/diagnóstico se necessário. */
export { findLabelReadable };
