export type BancoHorasExtratoMovimentoTipo =
  | 'CREDITO'
  | 'DEBITO'
  | 'PAGAMENTO'
  | 'AJUSTE';

export type BancoHorasExtratoMovimento = {
  tipo: BancoHorasExtratoMovimentoTipo;
  horas: number;
  descricao: string;
  /** Dia civil 1–31 quando aplicável */
  dia?: number | null;
  dataReferencia?: string | null;
};

export type BancoHorasExtratoResumo = {
  referenciaAno: number;
  referenciaMes: number;
  saldoInicialPositivas: number;
  saldoInicialNegativas: number;
  saldoInicialLiquido: number;
  creditosMes: number;
  debitosMes: number;
  pagamentosMes: number;
  saldoFinalPositivas: number;
  saldoFinalNegativas: number;
  saldoFinalLiquido: number;
  /** líquido projetado = inicial + créditos − débitos − pagamentos */
  liquidoProjetado: number;
  movimentos: BancoHorasExtratoMovimento[];
  origemAtualizacao: string;
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Monta o extrato mensal a partir de:
 * - saldo inicial (mês anterior ou derivado)
 * - créditos/débitos do mês (comentários A/B/P/D)
 * - pagamentos do banco na folha
 * - saldo final vivo do cadastro (após import/folha)
 */
export function montarExtratoBancoHorasMes(params: {
  referenciaAno: number;
  referenciaMes: number;
  saldoInicialPositivas: number;
  saldoInicialNegativas: number;
  creditosMes: number;
  debitosMes: number;
  pagamentosMes: number;
  saldoFinalPositivas: number;
  saldoFinalNegativas: number;
  movimentos?: BancoHorasExtratoMovimento[];
  origemAtualizacao?: string;
}): BancoHorasExtratoResumo {
  const saldoInicialPositivas = round2(Math.max(0, params.saldoInicialPositivas));
  const saldoInicialNegativas = round2(Math.max(0, params.saldoInicialNegativas));
  const creditosMes = round2(Math.max(0, params.creditosMes));
  const debitosMes = round2(Math.max(0, params.debitosMes));
  const pagamentosMes = round2(Math.max(0, params.pagamentosMes));
  const saldoFinalPositivas = round2(Math.max(0, params.saldoFinalPositivas));
  const saldoFinalNegativas = round2(Math.max(0, params.saldoFinalNegativas));

  const saldoInicialLiquido = round2(saldoInicialPositivas - saldoInicialNegativas);
  const saldoFinalLiquido = round2(saldoFinalPositivas - saldoFinalNegativas);
  const liquidoProjetado = round2(saldoInicialLiquido + creditosMes - debitosMes - pagamentosMes);

  return {
    referenciaAno: params.referenciaAno,
    referenciaMes: params.referenciaMes,
    saldoInicialPositivas,
    saldoInicialNegativas,
    saldoInicialLiquido,
    creditosMes,
    debitosMes,
    pagamentosMes,
    saldoFinalPositivas,
    saldoFinalNegativas,
    saldoFinalLiquido,
    liquidoProjetado,
    movimentos: params.movimentos ?? [],
    origemAtualizacao: params.origemAtualizacao ?? 'FOLHA',
  };
}

/**
 * Quando não há extrato do mês anterior, deriva o saldo inicial a partir do
 * saldo vivo atual menos o líquido dos movimentos do mês.
 * (adequado ao fluxo: XLS no fim do mês → saldo vivo já inclui o mês)
 */
export function derivarSaldoInicialSemExtratoAnterior(params: {
  saldoFinalPositivas: number;
  saldoFinalNegativas: number;
  creditosMes: number;
  debitosMes: number;
  pagamentosMes: number;
}): { positivas: number; negativas: number } {
  const liquidoFinal = round2(
    Math.max(0, params.saldoFinalPositivas) - Math.max(0, params.saldoFinalNegativas),
  );
  const liquidoInicial = round2(
    liquidoFinal - Math.max(0, params.creditosMes) + Math.max(0, params.debitosMes) + Math.max(0, params.pagamentosMes),
  );
  if (liquidoInicial >= 0) {
    return { positivas: round2(liquidoInicial), negativas: 0 };
  }
  return { positivas: 0, negativas: round2(Math.abs(liquidoInicial)) };
}

export function competenciaAnterior(ano: number, mes: number): { ano: number; mes: number } {
  if (mes <= 1) return { ano: ano - 1, mes: 12 };
  return { ano, mes: mes - 1 };
}
