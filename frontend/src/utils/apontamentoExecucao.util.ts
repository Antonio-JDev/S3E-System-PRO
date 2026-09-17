import { HORAS_COMERCIAIS_POR_DIA } from './apropriacaoOs';

export { HORAS_COMERCIAIS_POR_DIA as HORAS_POR_DIARIA };

/**
 * Jornada padrão do apontamento F1 para cálculo de HE.
 * Equivale a ~8h29 (ex.: 07:30–12:00 / 13:00–17:18).
 * Usar este limite para separar horas regulares de hora extra na mesma data —
 * nunca “vazar” excedente para o dia seguinte.
 */
export const HORAS_JORNADA_APONTAMENTO = 8.48;

export type ModoApontamentoExecucao = 'UM_DIA' | 'VARIOS_DIAS';

/** 4 casas — evita 1h virar 0,13d e reabrir como 1,04h (bug do round2 em 0,125). */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function roundHoras(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Math.abs(r - Math.round(r)) < 0.001 ? Math.round(r) : r;
}

function nNaoNegativo(v: number): number {
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** HE automática: excedente da jornada na mesma data. */
export function calcularHoraExtra(
  horasTotais: number,
  limiteJornada: number = HORAS_JORNADA_APONTAMENTO
): number {
  const h = nNaoNegativo(horasTotais);
  const lim = limiteJornada > 0 ? limiteJornada : HORAS_JORNADA_APONTAMENTO;
  return roundHoras(Math.max(0, h - lim));
}

/**
 * Decompõe um total de horas no dia em regulares + HE (mesma data).
 * Se `heManual` for informado, prevalece; regulares = max(0, total − HE).
 * Para campos separados (regulares + HE), use `horasTotaisDoDia`.
 */
export function decomporHorasDoDia(
  horasTotais: number,
  heManual?: number | null,
  limiteJornada: number = HORAS_JORNADA_APONTAMENTO
): { horasRegulares: number; horaExtra: number; horasTotais: number } {
  const total = roundHoras(nNaoNegativo(horasTotais));
  const he =
    heManual != null && Number.isFinite(heManual)
      ? roundHoras(Math.max(0, heManual))
      : calcularHoraExtra(total, limiteJornada);
  const regulares = roundHoras(Math.max(0, total - he));
  return { horasRegulares: regulares, horaExtra: he, horasTotais: total };
}

/**
 * A partir de um total digitado pelo usuário, separa automaticamente
 * regulares (até a jornada) e HE (excedente) — sem vazar para outro dia.
 */
export function separarTotalEmRegularesEHe(
  horasTotais: number,
  limiteJornada: number = HORAS_JORNADA_APONTAMENTO
): { horasRegulares: number; horaExtra: number; horasTotais: number } {
  const lim = limiteJornada > 0 ? limiteJornada : HORAS_JORNADA_APONTAMENTO;
  const total = roundHoras(nNaoNegativo(horasTotais));
  const horaExtra = calcularHoraExtra(total, lim);
  const horasRegulares = roundHoras(Math.max(0, total - horaExtra));
  return { horasRegulares, horaExtra, horasTotais: total };
}

/** Total do dia = horas regulares + HE (ambos editáveis). */
export function horasTotaisDoDia(horasRegulares: number, horaExtra: number): number {
  return roundHoras(nNaoNegativo(horasRegulares) + nNaoNegativo(horaExtra));
}

/** Converte horas totais do dia em diárias equivalentes (custo), sem split entre dias. */
export function diariasDeHorasTotais(horasTotais: number): number {
  return round4(nNaoNegativo(horasTotais) / HORAS_COMERCIAIS_POR_DIA);
}

/** Inverso: diárias salvas → horas comerciais totais daquele lançamento. */
export function horasTotaisDeDiarias(qtd: number): number {
  return roundHoras(nNaoNegativo(qtd) * HORAS_COMERCIAIS_POR_DIA);
}

/**
 * Converte dias + horas em diárias equivalentes (ex.: 1d + 4h = 1,5d).
 * Horas NÃO viram dias extras — excedente na UI deve ir para HE via decomporHorasDoDia.
 */
export function diariasEquivalentes(dias: number, horas: number): number {
  const d = nNaoNegativo(dias);
  const h = nNaoNegativo(horas);
  return round4(d + h / HORAS_COMERCIAIS_POR_DIA);
}

/** Soma diárias de vários dias (cada um com suas horas totais). */
export function diariasEquivalentesVariosDias(
  dias: Array<{ horas: number }>
): number {
  return round4(
    dias.reduce((acc, dia) => acc + diariasDeHorasTotais(dia.horas), 0)
  );
}

/** Separa quantidade em diárias inteiras + horas restantes (legado / edição). */
export function splitDiariasEquivalentes(qtd: number): { dias: number; horas: number } {
  const total = nNaoNegativo(qtd);
  const diasInteiros = Math.floor(total + 1e-9);
  const fracao = total - diasInteiros;
  const horas = roundHoras(fracao * HORAS_COMERCIAIS_POR_DIA);
  return { dias: diasInteiros, horas };
}

/**
 * Para um lançamento de uma única data: interpreta quantidade como horas do dia
 * e devolve regulares + HE (limite 8,48h).
 */
export function decomporQuantidadeNoDia(
  qtd: number,
  limiteJornada: number = HORAS_JORNADA_APONTAMENTO
): { horasRegulares: number; horaExtra: number; horasTotais: number; diarias: number } {
  const diarias = round4(nNaoNegativo(qtd));
  const horasTotais = horasTotaisDeDiarias(diarias);
  const decomp = decomporHorasDoDia(horasTotais, null, limiteJornada);
  return { ...decomp, diarias };
}

/** Texto legível para exibição (ex.: "1d + 4h (1,5d)"). */
export function formatarExecucaoLegivel(
  dias: number,
  horas: number,
  equivalente?: number
): string {
  const eq = equivalente ?? diariasEquivalentes(dias, horas);
  if (eq <= 0) return '—';
  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (partes.length === 0) {
    return `${eq.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}d`;
  }
  const detalhe = partes.join(' + ');
  if (partes.length === 1 && ((dias > 0 && horas === 0) || (horas > 0 && dias === 0))) {
    return detalhe;
  }
  return `${detalhe} (${eq.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}d)`;
}

/** Formata regulares + HE na mesma data. */
export function formatarExecucaoComHe(
  horasRegulares: number,
  horaExtra: number,
  equivalente?: number
): string {
  const reg = roundHoras(nNaoNegativo(horasRegulares));
  const he = roundHoras(nNaoNegativo(horaExtra));
  const eq =
    equivalente ??
    diariasDeHorasTotais(reg + he);
  if (reg <= 0 && he <= 0) return '—';
  if (he <= 0) {
    return formatarExecucaoLegivel(0, reg, eq);
  }
  const regTxt = `${reg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h`;
  const heTxt = `${he.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h HE`;
  const eqTxt = eq.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `${regTxt} + ${heTxt} (${eqTxt}d)`;
}

/** Formata item de apontamento DIARIA_EQUIPE a partir da quantidade salva (1 data). */
export function formatarExecucaoDeQuantidade(qtd: number): string {
  const { horasRegulares, horaExtra, diarias } = decomporQuantidadeNoDia(qtd);
  if (horaExtra > 0) {
    return formatarExecucaoComHe(horasRegulares, horaExtra, diarias);
  }
  const { dias, horas } = splitDiariasEquivalentes(qtd);
  return formatarExecucaoLegivel(dias, horas, qtd);
}
