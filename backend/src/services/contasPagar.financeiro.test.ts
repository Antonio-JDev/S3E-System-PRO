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
            valorJuros: 10,
            valorDesconto: 50,
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
        valorParcela: 75.05,
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
        140,
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

    it('rejeita pagamento com desconto duplicado (valor líquido menor que a parcela)', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-desc',
        valorParcela: 900,
        valorJuros: 0,
        valorDesconto: 100,
        status: ContaStatus.Pendente,
        observacoes: null,
        descricao: 'NF com desconto',
        tipo: 'FORNECEDOR',
      });

      await expect(
        ContasPagarService.pagarConta('cp-desc', '2026-05-28', 900, 'ok', 'PIX', 0, 100)
      ).rejects.toThrow('deve quitar o saldo da parcela');
      expect(prisma.contaPagar.update).not.toHaveBeenCalled();
    });

    it('quita conta criada com desconto quando base e desconto batem com a parcela', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-desc-ok',
        valorParcela: 900,
        valorJuros: 0,
        valorDesconto: 100,
        status: ContaStatus.Pendente,
        observacoes: null,
        descricao: 'NF com desconto',
        tipo: 'FORNECEDOR',
      });
      (prisma.contaPagar.update as jest.Mock).mockResolvedValue({
        id: 'cp-desc-ok',
        status: ContaStatus.Pago,
        valorParcela: 900,
        descricao: 'NF com desconto',
      });

      await ContasPagarService.pagarConta('cp-desc-ok', '2026-05-28', 1000, 'ok', 'PIX', 0, 100);

      expect(prisma.contaPagar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContaStatus.Pago,
            valorDesconto: 100,
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

  describe('atualizarConta', () => {
    it('recalcula valor de conta manual com juros e desconto', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-m',
        compraId: null,
        despesaFixaId: null,
        status: ContaStatus.Pendente,
        valorParcela: 1000,
        valorJuros: 0,
        valorDesconto: 0,
      });
      (prisma.contaPagar.update as jest.Mock).mockResolvedValue({ id: 'cp-m' });

      await ContasPagarService.atualizarConta('cp-m', {
        valorParcela: 1000,
        valorJuros: 20,
        valorDesconto: 50,
      });

      expect(prisma.contaPagar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cp-m' },
          data: expect.objectContaining({
            valorParcela: 970,
            valorJuros: 20,
            valorDesconto: 50,
          }),
        })
      );
    });

    it('bloqueia alteração de valor em conta gerada por XML/compra', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-xml',
        compraId: 'compra-1',
        despesaFixaId: null,
        status: ContaStatus.Pendente,
        valorParcela: 500,
      });

      await expect(
        ContasPagarService.atualizarConta('cp-xml', { valorParcela: 400 })
      ).rejects.toThrow('Não é permitido alterar valor, juros ou desconto');
      expect(prisma.contaPagar.update).not.toHaveBeenCalled();
    });

    it('permite alterar vencimento de conta de XML sem mexer no valor', async () => {
      (prisma.contaPagar.findUnique as jest.Mock).mockResolvedValue({
        id: 'cp-xml',
        compraId: 'compra-1',
        status: ContaStatus.Pendente,
        valorParcela: 500,
      });
      (prisma.contaPagar.update as jest.Mock).mockResolvedValue({ id: 'cp-xml' });
      const novaData = new Date('2026-06-10T12:00:00');

      await ContasPagarService.atualizarConta('cp-xml', { dataVencimento: novaData });

      expect(prisma.contaPagar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dataVencimento: novaData }),
        })
      );
    });
  });
});
