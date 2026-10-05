import { prisma } from '../lib/prisma';

export const TIPOS_REFERENCIA_CHEGADA = ['ORCAMENTO', 'PEDIDO_COMPRA', 'NF'] as const;
export type TipoReferenciaChegada = (typeof TIPOS_REFERENCIA_CHEGADA)[number];

export interface ItemPrevisaoChegadaInput {
  itemKey: string;
  descricao?: string | null;
  materialId?: string | null;
}

export interface DefinirPrevisaoChegadaInput {
  itens: ItemPrevisaoChegadaInput[];
  dataChegada: string;
  tipoReferencia?: string | null;
  referencia?: string | null;
}

export interface UsuarioPrevisao {
  id?: string | null;
  nome?: string | null;
}

const LIMITE_ITENS_POR_LOTE = 500;

export function parseDataChegadaYmd(valor: unknown): Date {
  const str = String(valor ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!m) throw new Error('Data de chegada inválida (use AAAA-MM-DD)');
  const [, y, mo, d] = m;
  const data = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (
    isNaN(data.getTime()) ||
    data.getUTCFullYear() !== Number(y) ||
    data.getUTCMonth() !== Number(mo) - 1 ||
    data.getUTCDate() !== Number(d)
  ) {
    throw new Error('Data de chegada inválida (use AAAA-MM-DD)');
  }
  return data;
}

export function normalizarTipoReferencia(valor: unknown): TipoReferenciaChegada | null {
  const str = String(valor ?? '').trim().toUpperCase();
  if (!str) return null;
  if ((TIPOS_REFERENCIA_CHEGADA as readonly string[]).includes(str)) {
    return str as TipoReferenciaChegada;
  }
  throw new Error('Tipo de referência inválido (ORCAMENTO, PEDIDO_COMPRA ou NF)');
}

function normalizarItens(itens: unknown): ItemPrevisaoChegadaInput[] {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Selecione ao menos um item para definir a chegada');
  }
  if (itens.length > LIMITE_ITENS_POR_LOTE) {
    throw new Error(`Máximo de ${LIMITE_ITENS_POR_LOTE} itens por vez`);
  }
  const vistos = new Map<string, ItemPrevisaoChegadaInput>();
  for (const raw of itens) {
    const itemKey = String((raw as any)?.itemKey ?? '').trim();
    if (!itemKey) throw new Error('Itens inválidos: itemKey obrigatório');
    vistos.set(itemKey, {
      itemKey,
      descricao: (raw as any)?.descricao ? String((raw as any).descricao).slice(0, 500) : null,
      materialId: (raw as any)?.materialId ? String((raw as any).materialId) : null,
    });
  }
  return [...vistos.values()];
}

async function garantirProjeto(projetoId: string): Promise<void> {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId }, select: { id: true } });
  if (!projeto) throw new Error('Projeto não encontrado');
}

export async function listarPrevisoesChegada(projetoId: string) {
  await garantirProjeto(projetoId);
  return prisma.previsaoChegadaMaterialOs.findMany({
    where: { projetoId },
    orderBy: { dataChegada: 'asc' },
  });
}

export async function definirPrevisoesChegada(
  projetoId: string,
  input: DefinirPrevisaoChegadaInput,
  usuario?: UsuarioPrevisao,
) {
  await garantirProjeto(projetoId);
  const itens = normalizarItens(input?.itens);
  const dataChegada = parseDataChegadaYmd(input?.dataChegada);
  const tipoReferencia = normalizarTipoReferencia(input?.tipoReferencia);
  const referencia = String(input?.referencia ?? '').trim().slice(0, 120) || null;

  const dadosComuns = {
    dataChegada,
    tipoReferencia,
    referencia,
    definidoPorId: usuario?.id ?? null,
    definidoPorNome: usuario?.nome ?? null,
  };

  await prisma.$transaction(
    itens.map((item) =>
      prisma.previsaoChegadaMaterialOs.upsert({
        where: { projetoId_itemKey: { projetoId, itemKey: item.itemKey } },
        create: {
          projetoId,
          itemKey: item.itemKey,
          descricao: item.descricao,
          materialId: item.materialId,
          ...dadosComuns,
        },
        update: {
          descricao: item.descricao,
          materialId: item.materialId,
          ...dadosComuns,
        },
      }),
    ),
  );

  return listarPrevisoesChegada(projetoId);
}

export async function removerPrevisoesChegada(projetoId: string, itemKeys: unknown) {
  await garantirProjeto(projetoId);
  if (!Array.isArray(itemKeys) || itemKeys.length === 0) {
    throw new Error('Itens inválidos: informe ao menos um itemKey');
  }
  const keys = itemKeys.map((k) => String(k ?? '').trim()).filter(Boolean);
  await prisma.previsaoChegadaMaterialOs.deleteMany({
    where: { projetoId, itemKey: { in: keys } },
  });
  return listarPrevisoesChegada(projetoId);
}
