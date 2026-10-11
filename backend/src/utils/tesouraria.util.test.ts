import {
  CLASSIFICACAO_TRANSFERENCIA,
  impactoNoResultado,
  montarExtratoConta,
  saldoContaBancaria,
  somarReceitaOperacional,
} from './tesouraria.util';

describe('tesouraria', () => {
  it('transferência entre contas não entra como receita nem muda o resultado', () => {
    const lancamentos = [
      { tipo: 'ENTRADA', valor: 1000, classificacao: 'VENDA' },
      { tipo: 'SAIDA', valor: 500, classificacao: CLASSIFICACAO_TRANSFERENCIA },
      { tipo: 'ENTRADA', valor: 500, classificacao: 'TRANSFERENCIA' },
    ];

    expect(somarReceitaOperacional(lancamentos)).toBe(1000);
    expect(impactoNoResultado(lancamentos)).toBe(1000);
    expect(impactoNoResultado(lancamentos.slice(1))).toBe(0);
  });

  it('recebimento de cliente continua sendo receita', () => {
    expect(
      somarReceitaOperacional([{ tipo: 'ENTRADA', valor: 300, classificacao: 'VENDA' }]),
    ).toBe(300);
  });

  it('o saldo sai da conta de origem e entra na de destino, sem mudar o caixa da empresa', () => {
    const valor = 200;
    const origem = saldoContaBancaria({
      saldoInicial: 1000,
      movimentacoes: [{ tipo: 'SAIDA', valor }],
    });
    const destino = saldoContaBancaria({
      saldoInicial: 0,
      movimentacoes: [{ tipo: 'ENTRADA', valor }],
    });

    expect(origem).toBe(800);
    expect(destino).toBe(200);
    expect(origem + destino).toBe(1000);
  });

  it('o extrato do período mostra saldo anterior, lançamentos e saldo final da conta', () => {
    const extrato = montarExtratoConta({
      saldoInicial: 1000,
      dataInicio: new Date(2026, 9, 1, 0, 0, 0, 0),
      dataFim: new Date(2026, 9, 31, 23, 59, 59, 999),
      movimentacoes: [
        {
          id: 'antes',
          data: new Date(2026, 8, 20, 12),
          tipo: 'SAIDA',
          valor: 100,
          descricao: 'Setembro',
          contraparte: 'Banco B',
        },
        {
          id: 'outubro',
          data: new Date(2026, 9, 8, 12),
          tipo: 'ENTRADA',
          valor: 50,
          descricao: 'Outubro',
          contraparte: 'Banco B',
        },
        {
          id: 'depois',
          data: new Date(2026, 10, 2, 12),
          tipo: 'SAIDA',
          valor: 20,
          descricao: 'Novembro',
          contraparte: 'Banco C',
        },
      ],
    });

    expect(extrato.saldoAnterior).toBe(900);
    expect(extrato.linhas).toHaveLength(1);
    expect(extrato.linhas[0].contraparte).toBe('Banco B');
    expect(extrato.linhas[0].saldo).toBe(950);
    expect(extrato.saldoFinal).toBe(950);
  });
});
