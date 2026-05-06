import { prisma } from '../lib/prisma';

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
  return prisma.configuracaoPonto.upsert({
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
}
