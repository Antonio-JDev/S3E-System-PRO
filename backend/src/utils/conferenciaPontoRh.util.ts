/** Entrada mínima para elegibilidade dos botões A/B/P/D na conferência de ponto. */
export type ConferenciaDiaElegibilidadeInput = {
  temRegistro: boolean;
  ehFimDeSemana: boolean;
  ehFeriado: boolean;
  faltaJustificada: boolean;
  minutosAtraso?: number;
  minutosHorasDevidas?: number;
  minutosExtraTotal?: number;
  minutosExtra20?: number;
  horasLiquidas?: number;
  tratamentoDebito?: 'A' | 'B' | 'D' | null;
  tratamentoCredito?: 'B' | 'P' | null;
};

export function ehFaltaDiaConferencia(d: ConferenciaDiaElegibilidadeInput): boolean {
  return !d.temRegistro && !d.ehFimDeSemana && !d.ehFeriado && !d.faltaJustificada;
}

export function temDebitoAvaliacaoConferencia(d: ConferenciaDiaElegibilidadeInput): boolean {
  return (
    (d.minutosAtraso ?? 0) > 0 ||
    (d.minutosHorasDevidas ?? 0) > 0 ||
    ehFaltaDiaConferencia(d) ||
    d.tratamentoDebito === 'A' ||
    d.tratamentoDebito === 'B' ||
    d.tratamentoDebito === 'D'
  );
}

export function temCreditoAvaliacaoConferencia(d: ConferenciaDiaElegibilidadeInput): boolean {
  return (
    (d.minutosExtraTotal ?? 0) > 0 ||
    (d.minutosExtra20 ?? 0) > 0 ||
    (d.ehFimDeSemana && d.temRegistro && Number(d.horasLiquidas ?? 0) > 0) ||
    d.tratamentoCredito === 'P' ||
    d.tratamentoCredito === 'B'
  );
}

export function botaoHabilitadoConferencia(
  botao: 'A' | 'B' | 'P' | 'D',
  d: ConferenciaDiaElegibilidadeInput,
): boolean {
  const temDebito = temDebitoAvaliacaoConferencia(d);
  const temCredito = temCreditoAvaliacaoConferencia(d);
  if (botao === 'A' || botao === 'D') return temDebito;
  if (botao === 'P') return temCredito;
  return temDebito || temCredito;
}
