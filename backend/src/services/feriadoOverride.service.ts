import { prisma } from '../lib/prisma';
import { dataReferenciaDiaCivilUtc } from '../utils/datetime-sp.util';
import type { FeriadoOverrideLookup } from '../utils/datetime-sp.util';
import { recalcularMetricasDoDiaCivil } from './ponto.service';

function chaveDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Carrega overrides do mês (ou intervalo) como Map YYYY-MM-DD → lookup. */
export async function listarOverridesFeriadoMes(
  ano: number,
  mes: number,
): Promise<Map<string, FeriadoOverrideLookup>> {
  const inicio = dataReferenciaDiaCivilUtc(ano, mes, 1);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = dataReferenciaDiaCivilUtc(ano, mes, ultimoDia);

  const rows = await prisma.feriadoCalendarioOverride.findMany({
    where: {
      dataReferencia: { gte: inicio, lte: fim },
    },
  });

  const map = new Map<string, FeriadoOverrideLookup>();
  for (const r of rows) {
    const d = r.dataReferencia;
    const key = chaveDia(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    map.set(key, { ehFeriado: r.ehFeriado, nome: r.nome });
  }
  return map;
}

/**
 * Define (ou atualiza) se um dia civil é feriado.
 * Em seguida recalcula métricas de ponto de TODOS os funcionários naquele dia
 * (batidas brutas preservadas; só métricas vs jornada/feriado).
 */
export async function salvarOverrideFeriadoDia(params: {
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  ehFeriado: boolean;
  nome?: string | null;
}) {
  const { referenciaAno: ano, referenciaMes: mes, dia } = params;
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    throw new Error('referenciaAno, referenciaMes e dia são obrigatórios');
  }
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    throw new Error('Data inválida');
  }

  const dataReferencia = dataReferenciaDiaCivilUtc(ano, mes, dia);
  const nome =
    params.ehFeriado && params.nome != null && String(params.nome).trim()
      ? String(params.nome).trim()
      : params.ehFeriado
        ? 'Feriado (ajuste manual)'
        : null;

  const row = await prisma.feriadoCalendarioOverride.upsert({
    where: { dataReferencia },
    create: {
      dataReferencia,
      ehFeriado: params.ehFeriado,
      nome,
    },
    update: {
      ehFeriado: params.ehFeriado,
      nome,
    },
  });

  const recalc = await recalcularMetricasDoDiaCivil(ano, mes, dia);

  return {
    id: row.id,
    dataReferencia: row.dataReferencia,
    ehFeriado: row.ehFeriado,
    nome: row.nome,
    registrosRecalculados: recalc.registrosAtualizados,
  };
}

/** Remove override e volta ao calendário padrão; recalcula o dia. */
export async function limparOverrideFeriadoDia(params: {
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  await prisma.feriadoCalendarioOverride.deleteMany({ where: { dataReferencia } });
  const recalc = await recalcularMetricasDoDiaCivil(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  return { removido: true, registrosRecalculados: recalc.registrosAtualizados };
}
