import {
  dataReferenciaDiaCivilUtc,
  ymdCivilBrasilia,
  ymdDeDataDiaCivil,
} from './datetime-sp.util';

/** Intervalo entre o prazo de cada tarefa do checklist gerado. */
export const INTERVALO_DIAS_TASK_WORKFLOW = 5;

export function titulosWorkflowConhecidos(
  templates: Record<string, readonly string[]>,
): string[] {
  const titulos = new Set<string>();
  for (const lista of Object.values(templates)) {
    for (const titulo of lista) titulos.add(titulo);
  }
  return [...titulos];
}

function dataBaseWorkflow(dataInicio?: Date | null): Date {
  const ymd = ymdDeDataDiaCivil(dataInicio ?? undefined);
  if (ymd) {
    const [ano, mes, dia] = ymd.split('-').map(Number);
    return dataReferenciaDiaCivilUtc(ano, mes, dia);
  }
  const hoje = ymdCivilBrasilia();
  return dataReferenciaDiaCivilUtc(hoje.ano, hoje.mes, hoje.dia);
}

/** Prazo da tarefa `indice` (0 = data base, 1 = +5 dias, 2 = +10…). Meio-dia UTC. */
export function prazoTaskWorkflow(dataInicio: Date | null | undefined, indice: number): Date {
  const base = dataBaseWorkflow(dataInicio);
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + indice * INTERVALO_DIAS_TASK_WORKFLOW,
      12,
      0,
      0,
      0,
    ),
  );
}

export function dadosTasksWorkflow(input: {
  projetoId: string;
  titulos: readonly string[];
  criadoPorId?: string | null;
  dataInicio?: Date | null;
}) {
  return input.titulos.map((titulo, ordem) => {
    const dia = prazoTaskWorkflow(input.dataInicio, ordem);
    return {
      projetoId: input.projetoId,
      titulo,
      status: 'ToDo' as const,
      prioridade: 'Media' as const,
      ordem,
      criadoPorId: input.criadoPorId ?? null,
      dataInicio: dia,
      prazo: dia,
    };
  });
}
