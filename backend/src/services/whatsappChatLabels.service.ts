import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId } from '../utils/whatsappChat.util';

/**
 * Service de listas/etiquetas personalizadas por usuário (estilo "Listas"
 * do WhatsApp Business). Cada lista é privada ao operador, agrupa um
 * conjunto de `chatId`s e aparece como chip extra na barra de filtros
 * do CRM ao lado de `Tudo / Não lidas / Favoritas / Grupos`.
 */

export interface WhatsappChatLabelDto {
  id: string;
  userId: string;
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

/** Lista todas as etiquetas do usuário, com chatIds embutidos. */
export async function listLabelsForUser(userId: string): Promise<WhatsappChatLabelDto[]> {
  const rows = await prisma.whatsappChatLabel.findMany({
    where: { userId },
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
}

/**
 * Cria uma nova lista. `chatIds` opcional — se vier, já cadastra as
 * membership iniciais na mesma transação (mais robusto que duas chamadas
 * separadas porque um erro no insert da pivô não deixa lista "vazia"
 * cadastrada).
 */
export async function createLabel(input: CreateLabelInput): Promise<WhatsappChatLabelDto> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Nome da lista é obrigatório.');

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

export async function updateLabel(
  id: string,
  userId: string,
  patch: UpdateLabelInput
): Promise<WhatsappChatLabelDto | null> {
  const existing = await prisma.whatsappChatLabel.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const data: Prisma.WhatsappChatLabelUpdateInput = {};
  if (patch.nome !== undefined) {
    const t = patch.nome.trim();
    if (!t) throw new Error('Nome da lista é obrigatório.');
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

export async function deleteLabel(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.whatsappChatLabel.findFirst({ where: { id, userId } });
  if (!existing) return false;
  // `onDelete: Cascade` na FK do membership cuida das pivôs.
  await prisma.whatsappChatLabel.delete({ where: { id } });
  return true;
}

/**
 * Substitui completamente o conjunto de chats de uma lista (replace-set).
 * Usado pelo modal "Selecionar conversas para a lista" no frontend —
 * o usuário marca/desmarca chats e enviamos a lista final.
 */
export async function setLabelChats(
  id: string,
  userId: string,
  chatIds: string[]
): Promise<WhatsappChatLabelDto | null> {
  const existing = await prisma.whatsappChatLabel.findFirst({ where: { id, userId } });
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

/**
 * Adiciona um ou mais chats a uma lista sem mexer no que já existe.
 * Útil quando o operador faz "Adicionar à lista X" pelo menu de cada
 * conversa.
 */
export async function addChatsToLabel(
  id: string,
  userId: string,
  chatIds: string[]
): Promise<WhatsappChatLabelDto | null> {
  const existing = await prisma.whatsappChatLabel.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const normalized = Array.from(
    new Set(chatIds.map((c) => canonicalWhatsappChatId(c).trim()).filter(Boolean))
  );
  if (normalized.length === 0) {
    const fresh = await prisma.whatsappChatLabel.findUniqueOrThrow({
      where: { id },
      include: { memberships: true }
    });
    return toDto(fresh);
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
  chatIds: string[]
): Promise<WhatsappChatLabelDto | null> {
  const existing = await prisma.whatsappChatLabel.findFirst({ where: { id, userId } });
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
