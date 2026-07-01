import { ProjetoStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HORAS_COMERCIAIS_POR_DIA } from '../utils/custoEventoCalendario';
import { calcularHomemHoraTotal } from '../utils/apropriacaoOs.util';

export { HORAS_COMERCIAIS_POR_DIA };

export interface CapacidadeDia {
  data: string;
  horasEngenhariaDemanda: number;
  diariasEquipeDemanda: number;
  homemHoraDemanda: number;
  capacidadeHomemHora: number;
  gargalo: boolean;
  projetos: Array<{
    id: string;
    titulo: string;
    responsavelId: string | null;
    status: ProjetoStatus;
  }>;
}

export interface ListarCapacidadeParams {
  dataInicio: Date;
  dataFim: Date;
  responsavelId?: string;
  status?: ProjetoStatus[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eachDayInclusive(inicio: Date, fim: Date): Date[] {
  const days: Date[] = [];
  const cur = startOfDay(inicio);
  const end = startOfDay(fim);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function overlaps(aInicio: Date, aFim: Date, bInicio: Date, bFim: Date): boolean {
  return aInicio <= bFim && bInicio <= aFim;
}

export async function calcularCapacidadeCalendario(
  params: ListarCapacidadeParams
): Promise<{ dias: CapacidadeDia[]; capacidadeDiariaHomemHora: number }> {
  const statusFiltro =
    params.status && params.status.length > 0
      ? params.status
      : (['APROVADO', 'EXECUCAO'] as ProjetoStatus[]);

  const funcionariosAtivos = await prisma.funcionario.count({
    where: { status: 'Ativo' },
  });
  const capacidadeDiariaHomemHora = funcionariosAtivos * HORAS_COMERCIAIS_POR_DIA;

  const projetos = await prisma.projeto.findMany({
    where: {
      status: { in: statusFiltro },
      ...(params.responsavelId ? { responsavelId: params.responsavelId } : {}),
      dataInicio: { lte: params.dataFim },
      OR: [
        { dataPrevisao: { gte: params.dataInicio } },
        { dataPrevisao: null, dataInicio: { gte: params.dataInicio } },
      ],
    },
    select: {
      id: true,
      titulo: true,
      responsavelId: true,
      status: true,
      dataInicio: true,
      dataPrevisao: true,
      horasEngenhariaOrcadas: true,
      diariasEquipeOrcadas: true,
    },
  });

  const rangeDays = eachDayInclusive(params.dataInicio, params.dataFim);
  const mapa = new Map<string, CapacidadeDia>();

  for (const day of rangeDays) {
    const key = toYmd(day);
    mapa.set(key, {
      data: key,
      horasEngenhariaDemanda: 0,
      diariasEquipeDemanda: 0,
      homemHoraDemanda: 0,
      capacidadeHomemHora: capacidadeDiariaHomemHora,
      gargalo: false,
      projetos: [],
    });
  }

  for (const projeto of projetos) {
    const inicio = startOfDay(new Date(projeto.dataInicio));
    const fim = startOfDay(
      projeto.dataPrevisao ? new Date(projeto.dataPrevisao) : new Date(projeto.dataInicio)
    );
    const diasProjeto = eachDayInclusive(inicio, fim).filter((d) =>
      overlaps(inicio, fim, params.dataInicio, params.dataFim) &&
      d >= startOfDay(params.dataInicio) &&
      d <= startOfDay(params.dataFim)
    );
    const nDias = Math.max(1, diasProjeto.length);
    const horasPorDia = (Number(projeto.horasEngenhariaOrcadas) || 0) / nDias;
    const diariasPorDia = (Number(projeto.diariasEquipeOrcadas) || 0) / nDias;

    for (const day of diasProjeto) {
      const key = toYmd(day);
      const slot = mapa.get(key);
      if (!slot) continue;
      slot.horasEngenhariaDemanda += horasPorDia;
      slot.diariasEquipeDemanda += diariasPorDia;
      if (!slot.projetos.some((p) => p.id === projeto.id)) {
        slot.projetos.push({
          id: projeto.id,
          titulo: projeto.titulo,
          responsavelId: projeto.responsavelId,
          status: projeto.status,
        });
      }
    }
  }

  const dias = Array.from(mapa.values()).map((d) => {
    const homemHoraDemanda = calcularHomemHoraTotal(
      d.horasEngenhariaDemanda,
      d.diariasEquipeDemanda
    );
    return {
      ...d,
      horasEngenhariaDemanda: Math.round(d.horasEngenhariaDemanda * 100) / 100,
      diariasEquipeDemanda: Math.round(d.diariasEquipeDemanda * 100) / 100,
      homemHoraDemanda: Math.round(homemHoraDemanda * 100) / 100,
      gargalo: homemHoraDemanda > d.capacidadeHomemHora,
    };
  });

  return { dias, capacidadeDiariaHomemHora };
}
