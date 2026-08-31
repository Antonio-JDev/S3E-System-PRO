import {
  competenciaAnterior,
  derivarSaldoInicialSemExtratoAnterior,
  montarExtratoBancoHorasMes,
} from './bancoHorasExtrato.util';

describe('bancoHorasExtrato.util', () => {
  it('competenciaAnterior volta dezembro no janeiro', () => {
    expect(competenciaAnterior(2026, 1)).toEqual({ ano: 2025, mes: 12 });
    expect(competenciaAnterior(2026, 8)).toEqual({ ano: 2026, mes: 7 });
  });

  it('montarExtrato: saldo inicial + créditos − débitos − pagamentos = líquido projetado', () => {
    const e = montarExtratoBancoHorasMes({
      referenciaAno: 2026,
      referenciaMes: 7,
      saldoInicialPositivas: 4,
      saldoInicialNegativas: 1,
      creditosMes: 2.0, // 10 × 12 min
      debitosMes: 0.5,
      pagamentosMes: 1,
      saldoFinalPositivas: 4.5,
      saldoFinalNegativas: 0,
      movimentos: [
        { tipo: 'CREDITO', horas: 2, descricao: 'HE', dia: 3 },
        { tipo: 'DEBITO', horas: 0.5, descricao: 'Atraso', dia: 5 },
        { tipo: 'PAGAMENTO', horas: 1, descricao: 'Pagamento banco' },
      ],
    });

    expect(e.saldoInicialLiquido).toBe(3);
    expect(e.liquidoProjetado).toBeCloseTo(3 + 2 - 0.5 - 1, 5);
    expect(e.saldoFinalLiquido).toBe(4.5);
    expect(e.movimentos).toHaveLength(3);
  });

  it('derivarSaldoInicialSemExtratoAnterior reconstrói o início a partir do vivo + movimentos', () => {
    // Após XLS: vivo líquido +3; créditos 2; débitos 1 → inicial = 3 - 2 + 1 = 2
    const d = derivarSaldoInicialSemExtratoAnterior({
      saldoFinalPositivas: 3,
      saldoFinalNegativas: 0,
      creditosMes: 2,
      debitosMes: 1,
      pagamentosMes: 0,
    });
    expect(d.positivas).toBe(2);
    expect(d.negativas).toBe(0);
  });

  it('derivarSaldoInicial com líquido negativo no início', () => {
    const d = derivarSaldoInicialSemExtratoAnterior({
      saldoFinalPositivas: 0,
      saldoFinalNegativas: 5,
      creditosMes: 0,
      debitosMes: 9,
      pagamentosMes: 0,
    });
    // final -5; debitos 9 → inicial = -5 + 9 = +4
    expect(d.positivas).toBe(4);
    expect(d.negativas).toBe(0);
  });
});
