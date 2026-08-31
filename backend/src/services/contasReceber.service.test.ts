/**
 * Testes — ContasReceberService (manual, juros/desconto, exclusão)
 * Rodar: npm test -- contasReceber.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    contaReceber: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recebimentoParcial: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import { ContasReceberService } from './contasReceber.service';
import { ContaStatus } from '../types/index';

describe('ContasReceberService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarContaReceberManual', () => {
    it('grava valorParcela líquido e juros/desconto previstos na conta', async () => {
      (prisma.contaReceber.create as jest.Mock).mockResolvedValue({ id: 'cr-1' });

      await ContasReceberService.criarContaReceberManual({
        tipo: 'ENTRADA',
        descricao: 'Reembolso',
        valorParcela: 1000,
        valorJuros: 10,
        valorDesconto: 50,
        dataVencimento: new Date('2026-05-28T12:00:00'),
      });

      expect(prisma.contaReceber.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valorParcela: 960,
          valorJuros: 10,
          valorDesconto: 50,
          status: ContaStatus.Pendente,
          vendaId: null,
        }),
      });
    });

    it('rejeita criação com valor a registrar inválido', async () => {
      await expect(
        ContasReceberService.criarContaReceberManual({
          tipo: 'ENTRADA',
          descricao: 'X',
          valorParcela: 100,
          valorJuros: 0,
          valorDesconto: 100,
          dataVencimento: new Date(),
        })
      ).rejects.toThrow('Valor a registrar deve ser maior que zero');
      expect(prisma.contaReceber.create).not.toHaveBeenCalled();
    });
  });

  describe('atualizarContaReceber', () => {
    it('recalcula valorParcela com juros e desconto', async () => {
      (prisma.contaReceber.findUnique as jest.Mock).mockResolvedValue({
        id: 'cr-1',
        vendaId: null,
        status: ContaStatus.Pendente,
        valorJuros: 0,
        valorDesconto: 0,
      });
      (prisma.contaReceber.update as jest.Mock).mockResolvedValue({ id: 'cr-1' });

      await ContasReceberService.atualizarContaReceber('cr-1', {
        valorParcela: 500,
        valorJuros: 20,
        valorDesconto: 5,
      });

      expect(prisma.contaReceber.update).toHaveBeenCalledWith({
        where: { id: 'cr-1' },
        data: expect.objectContaining({
          valorParcela: 515,
          valorJuros: 20,
          valorDesconto: 5,
        }),
      });
    });

    it('não permite editar conta vinculada a venda', async () => {
      (prisma.contaReceber.findUnique as jest.Mock).mockResolvedValue({
        id: 'cr-v',
        vendaId: 'venda-1',
      });

      await expect(
        ContasReceberService.atualizarContaReceber('cr-v', { descricao: 'X' })
      ).rejects.toThrow('Não é permitido editar conta vinculada a venda');
    });

    it('não permite editar conta já recebida', async () => {
      (prisma.contaReceber.findUnique as jest.Mock).mockResolvedValue({
        id: 'cr-paga',
        vendaId: null,
        status: ContaStatus.Pago,
      });

      await expect(
        ContasReceberService.atualizarContaReceber('cr-paga', { valorParcela: 10 })
      ).rejects.toThrow('Não é possível alterar uma conta já recebida');
    });
  });

  describe('excluirContaReceber', () => {
    it('exclui conta manual', async () => {
      (prisma.contaReceber.findUnique as jest.Mock).mockResolvedValue({
        id: 'cr-1',
        vendaId: null,
      });
      (prisma.contaReceber.delete as jest.Mock).mockResolvedValue({});

      const result = await ContasReceberService.excluirContaReceber('cr-1');

      expect(prisma.contaReceber.delete).toHaveBeenCalledWith({ where: { id: 'cr-1' } });
      expect(result.message).toContain('excluída');
    });

    it('não permite excluir conta de venda', async () => {
      (prisma.contaReceber.findUnique as jest.Mock).mockResolvedValue({
        id: 'cr-v',
        vendaId: 'venda-1',
      });

      await expect(ContasReceberService.excluirContaReceber('cr-v')).rejects.toThrow(
        'Não é permitido excluir conta vinculada a venda'
      );
    });
  });
});
