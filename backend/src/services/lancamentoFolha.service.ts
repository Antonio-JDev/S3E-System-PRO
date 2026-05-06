import { LancamentoFolhaCategoria } from '@prisma/client';
import { prisma } from '../lib/prisma';

const CATEGORIAS = Object.values(LancamentoFolhaCategoria);

export async function listarPorMes(funcionarioId: string, ano: number, mes: number) {
  return prisma.lancamentoFolha.findMany({
    where: { funcionarioId, referenciaAno: ano, referenciaMes: mes },
    orderBy: { createdAt: 'asc' },
  });
}

export async function criar(data: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  categoria: LancamentoFolhaCategoria;
  valor: number;
  descricao?: string | null;
}) {
  if (!CATEGORIAS.includes(data.categoria)) {
    throw new Error('Categoria inválida');
  }
  if (data.valor < 0 || Number.isNaN(data.valor)) {
    throw new Error('Valor deve ser um número positivo');
  }
  return prisma.lancamentoFolha.create({
    data: {
      funcionarioId: data.funcionarioId,
      referenciaAno: data.referenciaAno,
      referenciaMes: data.referenciaMes,
      categoria: data.categoria,
      valor: data.valor,
      descricao: data.descricao ?? null,
    },
  });
}

export async function excluir(id: string) {
  const existing = await prisma.lancamentoFolha.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Lançamento não encontrado');
  }
  await prisma.lancamentoFolha.delete({
    where: { id },
  });
  return existing;
}
