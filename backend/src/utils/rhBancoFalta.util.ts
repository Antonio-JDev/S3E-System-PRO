import { chaveDiaCivil, diaElegivelParaFalta } from './datetime-sp.util';

export type TratamentoDebitoFalta = 'A' | 'B' | 'D' | null;

/**
 * Minutos de falta integral que podem ir ao banco / avaliação persistida.
 *
 * - Pendente RH (tratamento null): não grava dívida — só o clique A/B/D lança falta.
 * - Dia futuro ou anterior à admissão: nunca lança falta automática.
 * - Com A/B/D explícito e dia já ocorrido: usa a jornada do dia (ex.: 8h48 da workshift 17:18).
 */
export function minutosFaltaParaBanco(params: {
  minutosFaltaIntegral: number;
  tratamentoDebito: TratamentoDebitoFalta;
  ano: number;
  mes: number;
  dia: number;
  dataAdmissao?: Date | null;
  agora?: Date;
}): number {
  const bruto = Math.max(0, Math.round(Number(params.minutosFaltaIntegral ?? 0) || 0));
  if (bruto <= 0) return 0;
  if (params.tratamentoDebito == null) return 0;
  if (
    !diaElegivelParaFalta(params.ano, params.mes, params.dia, {
      dataAdmissao: params.dataAdmissao,
      agora: params.agora,
    })
  ) {
    return 0;
  }
  return bruto;
}

export { chaveDiaCivil, diaElegivelParaFalta };
