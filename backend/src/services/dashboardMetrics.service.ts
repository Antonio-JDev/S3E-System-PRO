import { prisma } from '../lib/prisma';
import type { ProjetoStatus } from '@prisma/client';

export type ProgressoProjetoEntry = {
  tasksTotal: number;
  tasksConcluidas: number;
  obrasTotal: number;
  obrasConcluidas: number;
  percentual: number;
};

/** Mesma regra de GET /api/projetos/progresso (barra na página Ordem de Serviços). */
export async function calcularMapaProgressoProjetos(
  projetoIds: string[],
): Promise<Record<string, ProgressoProjetoEntry>> {
  const map: Record<string, ProgressoProjetoEntry> = {};
  if (projetoIds.length === 0) return map;

  const projetos = await prisma.projeto.findMany({
    where: { id: { in: projetoIds } },
    select: { id: true, status: true, semObra: true },
  });

  const groups = await prisma.task.groupBy({
    by: ['projetoId', 'status'],
    where: { projetoId: { in: projetoIds } },
    _count: { id: true },
  });

  projetos.forEach((p) => {
    map[p.id] = {
      tasksTotal: 0,
      tasksConcluidas: 0,
      obrasTotal: 0,
      obrasConcluidas: 0,
      percentual: 0,
    };
  });

  groups.forEach((g) => {
    const pid = g.projetoId as string;
    const count = g._count?.id ?? 0;
    if (!map[pid]) {
      map[pid] = {
        tasksTotal: 0,
        tasksConcluidas: 0,
        obrasTotal: 0,
        obrasConcluidas: 0,
        percentual: 0,
      };
    }
    map[pid].tasksTotal += count;
    const statusStr = String(g.status || '').toLowerCase();
    if (
      statusStr === 'done' ||
      statusStr === 'concluído' ||
      statusStr === 'concluido' ||
      statusStr === 'concluded'
    ) {
      map[pid].tasksConcluidas += count;
    }
  });

  projetos.forEach((p) => {
    const entry = map[p.id];
    const obrasTotal = p.semObra ? 0 : p.status === 'EXECUCAO' || p.status === 'CONCLUIDO' ? 1 : 0;
    const obrasConcluidas = p.semObra ? 0 : p.status === 'CONCLUIDO' ? 1 : 0;
    entry.obrasTotal = obrasTotal;
    entry.obrasConcluidas = obrasConcluidas;

    let percentual = 0;
    if (p.semObra) {
      if (p.status === 'CONCLUIDO') percentual = 100;
      else if (entry.tasksTotal === 0) percentual = 0;
      else {
        percentual = Math.round((entry.tasksConcluidas / entry.tasksTotal) * 100);
        if (entry.tasksConcluidas === entry.tasksTotal) percentual = 100;
      }
    } else {
      const totalItens = entry.tasksTotal + entry.obrasTotal;
      const totalConcluidos = entry.tasksConcluidas + entry.obrasConcluidas;
      percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    }
    entry.percentual = percentual;
  });

  return map;
}

export function classificarOsPorProgresso(
  status: ProjetoStatus,
  percentual: number,
): 'concluido' | 'comProgresso' | 'aguardando' | 'cancelado' {
  if (status === 'CANCELADO') return 'cancelado';
  if (status === 'CONCLUIDO' && percentual >= 100) return 'concluido';
  if (percentual > 0 && percentual < 100) return 'comProgresso';
  if (percentual >= 100) return 'concluido';
  return 'aguardando';
}

export const OS_STATUS_LABEL: Record<string, string> = {
  PROPOSTA: 'Proposta',
  VALIDADO: 'Validado',
  APROVADO: 'Aprovado',
  EXECUCAO: 'Em Execução',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export async function contarOsEmAndamento(): Promise<number> {
  const projetos = await prisma.projeto.findMany({
    where: { status: { not: 'CANCELADO' } },
    select: { id: true, status: true, semObra: true },
  });
  const map = await calcularMapaProgressoProjetos(projetos.map((p) => p.id));
  return projetos.filter((p) => {
    const pct = map[p.id]?.percentual ?? 0;
    return classificarOsPorProgresso(p.status, pct) === 'comProgresso';
  }).length;
}

export async function contarClientesComOrcamentoAprovado(): Promise<number> {
  const rows = await prisma.orcamento.findMany({
    where: { status: { contains: 'aprovado', mode: 'insensitive' } },
    select: { clienteId: true },
    distinct: ['clienteId'],
  });
  return rows.length;
}

export async function contarQuadrosProduzidosMesAtual(): Promise<number> {
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return prisma.projeto.count({
    where: {
      createdAt: { gte: inicio },
      status: { in: ['EXECUCAO', 'CONCLUIDO'] },
      OR: [
        { titulo: { contains: 'Quadro', mode: 'insensitive' } },
        { titulo: { contains: 'Painel', mode: 'insensitive' } },
        { descricao: { contains: 'Quadro', mode: 'insensitive' } },
      ],
    },
  });
}

export function calcularTendenciaPct(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

export type BucketOsRow = {
  name: string;
  concluido: number;
  comProgresso: number;
  aguardando: number;
  proposta: number;
  validado: number;
  aprovado: number;
  emExecucao: number;
  /** @deprecated use aguardando — mantido para compatibilidade */
  planejadas?: number;
  emAndamento?: number;
  concluidas?: number;
};

export function agregarOsBucket(
  projetos: Array<{ id: string; status: ProjetoStatus }>,
  progressoMap: Record<string, ProgressoProjetoEntry>,
  label: string,
): BucketOsRow {
  let concluido = 0;
  let comProgresso = 0;
  let aguardando = 0;
  let proposta = 0;
  let validado = 0;
  let aprovado = 0;
  let emExecucao = 0;

  for (const p of projetos) {
    const pct = progressoMap[p.id]?.percentual ?? 0;
    const cls = classificarOsPorProgresso(p.status, pct);
    if (cls === 'cancelado') continue;
    if (cls === 'concluido') concluido++;
    else if (cls === 'comProgresso') comProgresso++;
    else aguardando++;

    if (p.status === 'PROPOSTA') proposta++;
    else if (p.status === 'VALIDADO') validado++;
    else if (p.status === 'APROVADO') aprovado++;
    else if (p.status === 'EXECUCAO') emExecucao++;
  }

  return {
    name: label,
    concluido,
    comProgresso,
    aguardando,
    proposta,
    validado,
    aprovado,
    emExecucao,
    concluidas: concluido,
    emAndamento: comProgresso,
    planejadas: aguardando,
  };
}

export async function buildProgressoMapForProjetos(
  projetos: Array<{ id: string }>,
): Promise<Record<string, ProgressoProjetoEntry>> {
  return calcularMapaProgressoProjetos(projetos.map((p) => p.id));
}
