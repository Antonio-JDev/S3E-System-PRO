/**
 * Testes — unificação de contas a pagar (util + service)
 * Rodar: npm test -- contasPagarUnificacao
 */

import {
  calcularValoresParcelas,
  isContaElegivelParaUnificacao,
  montarDescricaoUnificada,
  sugerirContasRelacionadas,
  validarSelecaoUnificacao,
  type ContaParaUnificacao,
} from '../utils/contasPagarUnificacao.util';

function contaBase(overrides: Partial<ContaParaUnificacao> = {}): ContaParaUnificacao {
  return {
    id: 'c1',
    status: 'Pendente',
    tipo: 'FORNECEDOR',
    fornecedorId: 'f1',
    compraId: 'compra-1',
    descricao: 'NF 100 - Parcela 1/2',
    valorParcela: 500,
    dataVencimento: '2026-09-10',
    compra: { id: 'compra-1', numeroNF: '100' },
    fornecedor: { id: 'f1', nome: 'Fornecedor A' },
    ...overrides,
  };
}

describe('contasPagarUnificacao.util', () => {
  describe('isContaElegivelParaUnificacao', () => {
    it('aceita conta fornecedor pendente', () => {
      expect(isContaElegivelParaUnificacao(contaBase()).ok).toBe(true);
    });

    it('rejeita conta paga', () => {
      const r = isContaElegivelParaUnificacao(contaBase({ status: 'Pago' }));
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/não está em aberto/i);
    });

    it('rejeita cartão de crédito', () => {
      const r = isContaElegivelParaUnificacao(
        contaBase({ meioPagamento: 'CARTAO_CREDITO', cartaoCreditoId: 'card-1' })
      );
      expect(r.ok).toBe(false);
    });

    it('rejeita tipo RH', () => {
      const r = isContaElegivelParaUnificacao(contaBase({ tipo: 'RH', funcionarioId: 'func-1' }));
      expect(r.ok).toBe(false);
    });
  });

  describe('validarSelecaoUnificacao', () => {
    it('exige ao menos 2 contas', () => {
      const r = validarSelecaoUnificacao([contaBase()]);
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/ao menos 2/i);
    });

    it('soma valores e exige mesmo fornecedor', () => {
      const r = validarSelecaoUnificacao([
        contaBase({ id: 'a', valorParcela: 100.1 }),
        contaBase({ id: 'b', valorParcela: 200.2, compraId: 'compra-2', dataVencimento: '2026-09-20' }),
      ]);
      expect(r.ok).toBe(true);
      expect(r.valorTotal).toBeCloseTo(300.3, 2);
      expect(r.fornecedorId).toBe('f1');
      expect(r.compraId).toBeNull(); // compras diferentes
      expect(r.compraIds).toHaveLength(2);
    });

    it('rejeita fornecedores diferentes', () => {
      const r = validarSelecaoUnificacao([
        contaBase({ id: 'a' }),
        contaBase({ id: 'b', fornecedorId: 'f2' }),
      ]);
      expect(r.ok).toBe(false);
      expect(r.motivo).toMatch(/mesmo fornecedor/i);
    });

    it('mantém compraId quando todas compartilham a mesma compra', () => {
      const r = validarSelecaoUnificacao([
        contaBase({ id: 'a' }),
        contaBase({ id: 'b', dataVencimento: '2026-10-10' }),
      ]);
      expect(r.ok).toBe(true);
      expect(r.compraId).toBe('compra-1');
      expect(r.numerosNF).toEqual(['100']);
    });
  });

  describe('calcularValoresParcelas', () => {
    it('divide com centavos corretos na última parcela', () => {
      expect(calcularValoresParcelas(100, 3)).toEqual([33.33, 33.33, 33.34]);
    });

    it('mantém valor integral em 1 parcela', () => {
      expect(calcularValoresParcelas(250.55, 1)).toEqual([250.55]);
    });
  });

  describe('sugerirContasRelacionadas', () => {
    const selecionadas = [
      contaBase({ id: 'sel-1', dataVencimento: '2026-09-15' }),
    ];

    it('prioriza mesma compra/NF', () => {
      const sugestoes = sugerirContasRelacionadas(selecionadas, [
        contaBase({
          id: 'cand-nf',
          compraId: 'compra-1',
          dataVencimento: '2026-12-01',
        }),
        contaBase({
          id: 'cand-forn',
          compraId: 'outra',
          compra: { id: 'outra', numeroNF: '999' },
          dataVencimento: '2026-09-16',
        }),
      ]);

      expect(sugestoes[0].contaId).toBe('cand-nf');
      expect(sugestoes[0].motivos).toContain('MESMA_NOTA');
      expect(sugestoes.some((s) => s.contaId === 'cand-forn')).toBe(true);
    });

    it('não sugere só por vencimento de outro fornecedor', () => {
      const sugestoes = sugerirContasRelacionadas(selecionadas, [
        contaBase({
          id: 'outro-forn',
          fornecedorId: 'f-outro',
          compraId: 'x',
          compra: { id: 'x', numeroNF: '777' },
          dataVencimento: '2026-09-16',
        }),
      ]);
      expect(sugestoes).toHaveLength(0);
    });

    it('ignora contas já selecionadas', () => {
      const sugestoes = sugerirContasRelacionadas(selecionadas, [
        contaBase({ id: 'sel-1' }),
      ]);
      expect(sugestoes).toHaveLength(0);
    });
  });

  describe('montarDescricaoUnificada', () => {
    it('usa descrição customizada', () => {
      expect(montarDescricaoUnificada(['1'], 2, '  Acordo parcelado  ')).toBe('Acordo parcelado');
    });

    it('monta texto com NF', () => {
      expect(montarDescricaoUnificada(['555'], 3)).toMatch(/NF 555/);
    });
  });
});

jest.mock('../lib/prisma', () => ({
  prisma: {
    contaPagar: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cartaoCredito: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../lib/prisma';
import { ContasPagarService } from '../services/contasPagar.service';
import { ContaStatus } from '../types/index';

describe('ContasPagarService.unificarContasPagar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancela origens e cria parcelamento', async () => {
    const origemA = {
      id: 'a',
      status: ContaStatus.Pendente,
      tipo: 'FORNECEDOR',
      fornecedorId: 'f1',
      compraId: 'compra-1',
      valorParcela: 100,
      dataVencimento: new Date(2026, 8, 10, 12),
      observacoes: null,
      classificacao: null,
      meioPagamento: null,
      cartaoCreditoId: null,
      faturaCartaoId: null,
      despesaFixaId: null,
      funcionarioId: null,
      compra: { id: 'compra-1', numeroNF: '100', numeroSequencial: 1 },
      fornecedor: { id: 'f1', nome: 'Fornecedor A' },
    };
    const origemB = {
      ...origemA,
      id: 'b',
      valorParcela: 200,
      dataVencimento: new Date(2026, 8, 20, 12),
    };

    (prisma.contaPagar.findMany as jest.Mock).mockResolvedValue([origemA, origemB]);

    const criadas: any[] = [];
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        contaPagar: {
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockImplementation(async ({ data }: any) => {
            const row = { id: `nova-${criadas.length + 1}`, ...data };
            criadas.push(row);
            return row;
          }),
        },
      };
      return fn(tx);
    });

    const result = await ContasPagarService.unificarContasPagar({
      contaIds: ['a', 'b'],
      parcelas: 3,
      dataPrimeiroVencimento: '2026-10-01',
      intervaloDias: 30,
      descricao: 'Acordo unificado',
    });

    expect(result.valorTotal).toBe(300);
    expect(result.contasCanceladas).toBe(2);
    expect(result.contasCriadas).toHaveLength(3);
    expect(result.contasCriadas[0].valorParcela).toBe(100);
    expect(result.contasCriadas[2].valorParcela).toBe(100);
    expect(result.contasCriadas[0].unificacaoContasOrigemIds).toEqual(['a', 'b']);
    expect(result.contasCriadas[0].descricao).toMatch(/Parcela 1\/3/);
  });

  it('bloqueia unificação com fornecedores distintos', async () => {
    (prisma.contaPagar.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'a',
        status: ContaStatus.Pendente,
        tipo: 'FORNECEDOR',
        fornecedorId: 'f1',
        valorParcela: 10,
        dataVencimento: new Date(),
        compra: null,
        fornecedor: { id: 'f1', nome: 'A' },
      },
      {
        id: 'b',
        status: ContaStatus.Pendente,
        tipo: 'FORNECEDOR',
        fornecedorId: 'f2',
        valorParcela: 20,
        dataVencimento: new Date(),
        compra: null,
        fornecedor: { id: 'f2', nome: 'B' },
      },
    ]);

    await expect(
      ContasPagarService.unificarContasPagar({ contaIds: ['a', 'b'], parcelas: 1 })
    ).rejects.toThrow(/mesmo fornecedor/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
