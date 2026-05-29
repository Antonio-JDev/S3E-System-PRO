/**
 * Testes — ContasPagarService (criação e pagamento com juros/desconto)
 * Rodar: npm test -- contasPagar.financeiro.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    contaPagar: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('./notificacoes.service', () => ({
  criarNotificacao: jest.fn(),
}));

import { prisma } from '../lib/prisma';
import { ContasPagarService } from './contasPagar.service';
import { ContaStatus } from '../types/index';

describe('ContasPagarService — juros e desconto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarContaPagar', () => {
    it('persiste valorParcela líquido ao criar conta manual', async () => {
      (prisma.contaPagar.create as jest.Mock).mockResolvedValue({
        id: 'cp-1',
        valorParcela: 960,
        descricao: 'Aluguel',
      });

      await ContasPagarService.criarContaPagar({
        descricao: 'Aluguel',
        valorParcela: 1000,
        valorJuros: 10,
        valorDesconto: 50,
        dataVencimento: new Date('2026-05-28T12:00:00'),
        tipo: 'DESPESA_FIXA',
        credorNome: 'Locador',
        origemCadastro: 'DESPESA_FIXA',
      });

      expect(prisma.contaPagar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valorParcela: 960,
            status: ContaStatus.Pendente,
          }),
        })
      );
    });
  });

  describe('pagarConta', () => {
    it('registra valorJuros e valorDesconto explícitos no pagamento', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-1',
        valorParcela: 72.05,
        status: ContaStatus.Pendente,
        observacoes: null,
        descricao: 'NF 577',
        tipo: 'FORNECEDOR',
      });
      (prisma.contaPagar.update as jest.Mock).mockResolvedValue({
        id: 'cp-1',
        status: ContaStatus.Pago,
        valorParcela: 72.05,
        descricao: 'NF 577',
      });

      await ContasPagarService.pagarConta(
        'cp-1',
        '2026-05-28',
        72.05,
        'ok',
        'PIX',
        5,
        2
      );

      expect(prisma.contaPagar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cp-1' },
          data: expect.objectContaining({
            status: ContaStatus.Pago,
            valorJuros: 5,
            valorDesconto: 2,
          }),
        })
      );
    });

    it('calcula valor efetivo: base + juros − desconto', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-2',
        valorParcela: 100,
        status: ContaStatus.Pendente,
        observacoes: null,
        descricao: 'Teste',
        tipo: 'FORNECEDOR',
      });
      (prisma.contaPagar.update as jest.Mock).mockResolvedValue({
        id: 'cp-2',
        status: ContaStatus.Pago,
        valorParcela: 100,
        descricao: 'Teste',
        dataPagamento: new Date(),
      });

      await ContasPagarService.pagarConta(
        'cp-2',
        undefined,
        100,
        undefined,
        undefined,
        10,
        50
      );

      expect(prisma.contaPagar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valorJuros: 10,
            valorDesconto: 50,
          }),
        })
      );
    });

    it('rejeita pagamento de conta já paga', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-3',
        status: ContaStatus.Pago,
      });

      await expect(
        ContasPagarService.pagarConta('cp-3', undefined, 10, undefined, undefined, 0, 0)
      ).rejects.toThrow('Conta já está paga');
    });
  });
});
