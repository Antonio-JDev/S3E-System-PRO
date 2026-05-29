import { prisma } from '../lib/prisma';

type TarefaAlocacaoInput = {
  id: string;
  obraId: string;
  equipeId: string | null;
  dataPrevista: Date | null;
  dataPrevistaFim: Date | null;
  observacoes?: string | null;
};

/**
 * Mantém alocacoes_equipe alinhadas com a tarefa (calendário de execução).
 */
export async function syncAlocacaoEquipeFromTarefa(tarefa: TarefaAlocacaoInput): Promise<void> {
  const deveAlocar =
    Boolean(tarefa.equipeId) && Boolean(tarefa.dataPrevista) && Boolean(tarefa.dataPrevistaFim);

  const existentes = await prisma.alocacaoEquipe.findMany({
    where: { tarefaId: tarefa.id },
    orderBy: { createdAt: 'asc' }
  });

  if (!deveAlocar) {
    if (existentes.length > 0) {
      await prisma.alocacaoEquipe.deleteMany({ where: { tarefaId: tarefa.id } });
    }
    return;
  }

  const payload = {
    obraId: tarefa.obraId,
    equipeId: tarefa.equipeId!,
    dataInicio: tarefa.dataPrevista!,
    dataFim: tarefa.dataPrevistaFim!,
    observacoes: tarefa.observacoes ?? null
  };

  const principal = existentes[0];
  if (principal) {
    await prisma.alocacaoEquipe.update({
      where: { id: principal.id },
      data: payload
    });
    if (existentes.length > 1) {
      await prisma.alocacaoEquipe.deleteMany({
        where: {
          tarefaId: tarefa.id,
          id: { not: principal.id }
        }
      });
    }
    return;
  }

  await prisma.alocacaoEquipe.create({
    data: {
      tarefaId: tarefa.id,
      status: 'PLANEJADA',
      ...payload
    }
  });
}

export async function removerAlocacoesPorTarefa(tarefaId: string): Promise<void> {
  await prisma.alocacaoEquipe.deleteMany({ where: { tarefaId } });
}
