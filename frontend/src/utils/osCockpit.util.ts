import type { ResultadoOsCalculado } from './apropriacaoOs';

const MS_DAY = 86400000;

export function calcularCustoTempoOrcado(p: {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  valorHoraEngenharia?: number | null;
  valorDiariaEquipe?: number | null;
}): number {
  const horas = Number(p.horasEngenhariaOrcadas) || 0;
  const diarias = Number(p.diariasEquipeOrcadas) || 0;
  const valorHora = Number(p.valorHoraEngenharia) || 0;
  const valorDiaria = Number(p.valorDiariaEquipe) || 0;
  return Math.round((horas * valorHora + diarias * valorDiaria) * 100) / 100;
}

export function calcularDiasCorridos(
  dataInicio: string | Date | null | undefined,
  ref: Date = new Date()
): number {
  if (!dataInicio) return 0;
  const start = new Date(dataInicio);
  if (Number.isNaN(start.getTime())) return 0;
  start.setHours(0, 0, 0, 0);
  const end = new Date(ref);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_DAY));
}

export function calcularDiasEntreDatas(
  dataInicio?: string | Date | null,
  dataFim?: string | Date | null
): number | null {
  if (!dataInicio || !dataFim) return null;
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_DAY));
}

export function calcularDiasEstimadosTexto(
  diariasEquipeOrcadas: number,
  dataInicio?: string | Date | null,
  dataPrevisao?: string | Date | null
): string {
  const diarias = Number(diariasEquipeOrcadas) || 0;
  if (diarias > 0) return `~${diarias} diária${diarias !== 1 ? 's' : ''}`;
  const diasCalendario = calcularDiasEntreDatas(dataInicio, dataPrevisao);
  if (diasCalendario != null && diasCalendario > 0) {
    return `~${diasCalendario} dia${diasCalendario !== 1 ? 's' : ''}`;
  }
  return '—';
}

export function detectarEstouroPrazoExecucao(input: {
  status: string;
  diariasOrcadas: number;
  diariasRealizadas: number;
  diasCorridos: number;
}): { estourou: boolean; motivo: 'diarias' | 'dias_corridos' | null } {
  if (input.status !== 'EXECUCAO') {
    return { estourou: false, motivo: null };
  }
  const orcadas = Number(input.diariasOrcadas) || 0;
  if (orcadas <= 0) {
    return { estourou: false, motivo: null };
  }
  if (input.diariasRealizadas > orcadas) {
    return { estourou: true, motivo: 'diarias' };
  }
  if (input.diasCorridos > orcadas) {
    return { estourou: true, motivo: 'dias_corridos' };
  }
  return { estourou: false, motivo: null };
}

export function calcularLucroPerdaPrazo(
  resumo: Pick<
    ResultadoOsCalculado,
    | 'horasEngenhariaOrcadas'
    | 'horasEngenhariaRealizadas'
    | 'diariasEquipeOrcadas'
    | 'diariasEquipeRealizadas'
  >,
  valores: { valorHoraEngenharia?: number | null; valorDiariaEquipe?: number | null }
): number {
  const valorHora = Number(valores.valorHoraEngenharia) || 0;
  const valorDiaria = Number(valores.valorDiariaEquipe) || 0;
  const diffHoras =
    (Number(resumo.horasEngenhariaOrcadas) || 0) -
    (Number(resumo.horasEngenhariaRealizadas) || 0);
  const diffDiarias =
    (Number(resumo.diariasEquipeOrcadas) || 0) -
    (Number(resumo.diariasEquipeRealizadas) || 0);
  return Math.round((diffHoras * valorHora + diffDiarias * valorDiaria) * 100) / 100;
}

export interface CockpitResumoItem {
  diariasEquipeOrcadas: number;
  diariasEquipeRealizadas: number;
  custoTempoOrcado: number;
  dataPrevisao: string | null;
  diasCorridos: number;
  estouroDiarias: boolean;
  estouroDiasCorridos: boolean;
}
