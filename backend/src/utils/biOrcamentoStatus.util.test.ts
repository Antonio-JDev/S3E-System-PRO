import {
  calcularCpvLinhaItem,
  classificarOrcamentoBI,
  isOrcamentoAprovadoBI,
  whereVendasBI,
} from './biOrcamentoStatus.util';

describe('biOrcamentoStatus.util', () => {
  const hoje = new Date('2026-06-25T12:00:00');

  it('classifica status alinhado ao módulo de orçamentos', () => {
    expect(classificarOrcamentoBI('Aprovado', null, hoje)).toBe('aprovados');
    expect(classificarOrcamentoBI('Concretizado', null, hoje)).toBe('aprovados');
    expect(classificarOrcamentoBI('Recusado', null, hoje)).toBe('declinados');
    expect(classificarOrcamentoBI('Cancelado', null, hoje)).toBe('declinados');
    expect(classificarOrcamentoBI('Pendente', new Date('2026-01-01'), hoje)).toBe('expirados');
    expect(classificarOrcamentoBI('Pendente', new Date('2026-12-31'), hoje)).toBe('pendentes');
  });

  it('identifica orçamentos aprovados para BI', () => {
    expect(isOrcamentoAprovadoBI('Aprovado')).toBe(true);
    expect(isOrcamentoAprovadoBI('Concretizado')).toBe(true);
    expect(isOrcamentoAprovadoBI('Pendente')).toBe(false);
  });

  it('filtra vendas por dataVenda e exclui canceladas', () => {
    const inicio = new Date('2026-01-01');
    const fim = new Date('2026-06-30');
    expect(whereVendasBI(inicio, fim)).toEqual({
      dataVenda: { gte: inicio, lte: fim },
      status: { not: 'Cancelada' },
    });
  });

  it('calcula CPV com MO em quadros e ignora venda direta', () => {
    expect(
      calcularCpvLinhaItem({
        tipo: 'QUADRO_PRONTO',
        quantidade: 2,
        custoUnit: 100,
      })
    ).toBe(230);

    expect(
      calcularCpvLinhaItem({
        tipo: 'MATERIAL',
        quantidade: 3,
        custoUnit: 10,
        vendaDiretaFornecedor: true,
      })
    ).toBe(0);

    expect(
      calcularCpvLinhaItem({
        tipo: 'SERVICO',
        quantidade: 1,
        custoUnit: 50,
      })
    ).toBe(0);
  });
});
