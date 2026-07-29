import { prisma } from '../lib/prisma';
import { recalcularMetricasFuncionario } from './ponto.service';

export async function buscarPorFuncionario(funcionarioId: string) {
  return prisma.configuracaoPonto.findUnique({
    where: { funcionarioId },
    include: { workShift: true },
  });
}

export async function upsertPorFuncionario(
  funcionarioId: string,
  data: {
    trabalhaFimDeSemana?: boolean;
    valorHoraFimDeSemana?: number | null;
    workShiftId?: string | null;
    toleranciaMinutos?: number;
    inicioNoturno?: string | null;
  },
) {
  const existente = await prisma.configuracaoPonto.findUnique({
    where: { funcionarioId },
    select: { workShiftId: true, toleranciaMinutos: true },
  });

  const row = await prisma.configuracaoPonto.upsert({
    where: { funcionarioId },
    create: {
      funcionarioId,
      trabalhaFimDeSemana: data.trabalhaFimDeSemana ?? false,
      valorHoraFimDeSemana: data.valorHoraFimDeSemana ?? null,
      workShiftId: data.workShiftId ?? null,
      toleranciaMinutos: data.toleranciaMinutos ?? 5,
      inicioNoturno: data.inicioNoturno ?? '18:00',
    },
    update: {
      ...(data.trabalhaFimDeSemana !== undefined && { trabalhaFimDeSemana: data.trabalhaFimDeSemana }),
      ...(data.valorHoraFimDeSemana !== undefined && { valorHoraFimDeSemana: data.valorHoraFimDeSemana }),
      ...(data.workShiftId !== undefined && { workShiftId: data.workShiftId }),
      ...(data.toleranciaMinutos !== undefined && { toleranciaMinutos: data.toleranciaMinutos }),
      ...(data.inicioNoturno !== undefined && { inicioNoturno: data.inicioNoturno }),
    },
    include: { workShift: true },
  });

  const workShiftMudou =
    data.workShiftId !== undefined &&
    (existente?.workShiftId ?? null) !== (data.workShiftId ?? null);
  const toleranciaMudou =
    data.toleranciaMinutos !== undefined &&
    (existente?.toleranciaMinutos ?? 5) !== data.toleranciaMinutos;

  // Recálculo isolado: só este funcionário; batidas e avaliações RH preservadas.
  // Reavalia atraso, saída antecipada, HE e horas normais com a nova jornada.
  let recalculo: {
    registrosAtualizados: number;
    registrosIgnoradosSemBatidas: number;
  } | null = null;

  if (workShiftMudou || toleranciaMudou) {
    recalculo = await recalcularMetricasFuncionario(funcionarioId);
  }

  return { ...row, recalculo };
}
