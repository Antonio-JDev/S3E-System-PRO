/**
 * Testes Unitários para o Serviço de Vendas
 * 
 * Para rodar os testes:
 * npm test -- vendas.service.test.ts
 */

import { VendasService, VendaPayload } from './vendas.service';
import { PrismaClient } from '@prisma/client';
import { VendaStatus, ContaStatus } from '../types/index';

// Mock do Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    venda: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    contaReceber: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orcamento: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projeto: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock do EstoqueService
jest.mock('./estoque.service', () => ({
  EstoqueService: {
    processarBaixaOrcamento: jest.fn().mockResolvedValue({ success: true }),
    verificarDisponibilidadeOrcamento: jest.fn().mockResolvedValue({ disponivel: true }),
  },
}));

describe('VendasService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('realizarVenda', () => {
    const mockOrcamento = {
      id: 'orc-123',
      clienteId: 'cliente-123',
      precoVenda: 10000,
      status: 'Aprovado',
      projeto: null,
    };

    const mockVenda = {
      id: 'venda-123',
      numeroVenda: 'VND-1234567890',
      orcamentoId: 'orc-123',
      valorTotal: 10000,
      status: VendaStatus.Pendente,
    };

    it('deve criar venda à vista com 1 parcela apenas', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          venda: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockVenda),
          },
          orcamento: {
            findUnique: jest.fn().mockResolvedValue(mockOrcamento),
            update: jest.fn(),
          },
          projeto: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'proj-123' }),
          },
          contaReceber: {
            create: jest.fn().mockResolvedValue({
              id: 'conta-1',
              numeroParcela: 1,
              valorParcela: 10000,
              status: ContaStatus.Pendente,
            }),
          },
        };
        return callback(tx);
      });

      const vendaData: VendaPayload = {
        orcamentoId: 'orc-123',
        clienteId: 'cliente-123',
        valorTotal: 10000,
        formaPagamento: 'À vista',
        parcelas: 1,
        valorEntrada: 0,
      };

      const resultado = await VendasService.realizarVenda(vendaData);

      expect(resultado.venda).toBeDefined();
      expect(resultado.venda.status).toBe(VendaStatus.Pendente);
      expect(resultado.contasReceber).toHaveLength(1);
      expect((resultado.contasReceber[0] as any).numeroParcela).toBe(1);
      expect((resultado.contasReceber[0] as any).valorParcela).toBe(10000);
    });

    it('deve criar venda com entrada separada das parcelas', async () => {
      const contasCriadas: any[] = [];
      
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          venda: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockVenda),
          },
          orcamento: {
            findUnique: jest.fn().mockResolvedValue(mockOrcamento),
            update: jest.fn(),
          },
          projeto: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'proj-123' }),
          },
          contaReceber: {
            create: jest.fn().mockImplementation((data: any) => {
              const conta = {
                id: `conta-${contasCriadas.length + 1}`,
                ...data.data,
              };
              contasCriadas.push(conta);
              return Promise.resolve(conta);
            }),
          },
        };
        return callback(tx);
      });

      const vendaData: VendaPayload = {
        orcamentoId: 'orc-123',
        clienteId: 'cliente-123',
        valorTotal: 10000,
        formaPagamento: 'Parcelado',
        parcelas: 3,
        valorEntrada: 3000,
      };

      const resultado = await VendasService.realizarVenda(vendaData);

      // Deve criar: 1 conta de entrada + 3 parcelas = 4 contas
      expect(resultado.contasReceber).toHaveLength(4);
      
      // Verificar entrada (numeroParcela = 0)
      const entrada = (resultado.contasReceber as any[]).find((c: any) => c.numeroParcela === 0);
      expect(entrada).toBeDefined();
      expect(entrada.valorParcela).toBe(3000);
      expect(entrada.descricao).toContain('Entrada');

      // Verificar parcelas (numeroParcela 1, 2, 3)
      const parcelas = (resultado.contasReceber as any[]).filter((c: any) => c.numeroParcela > 0);
      expect(parcelas).toHaveLength(3);
      parcelas.forEach((parcela: any) => {
        expect(parcela.valorParcela).toBeCloseTo(2333.33, 2); // (10000 - 3000) / 3
      });
    });

    it('deve rejeitar venda à vista com mais de 1 parcela', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          venda: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          orcamento: {
            findUnique: jest.fn().mockResolvedValue(mockOrcamento),
          },
        };
        return callback(tx);
      });

      const vendaData: VendaPayload = {
        orcamentoId: 'orc-123',
        clienteId: 'cliente-123',
        valorTotal: 10000,
        formaPagamento: 'À vista',
        parcelas: 3, // ❌ Inválido: à vista deve ter apenas 1 parcela
        valorEntrada: 0,
      };

      await expect(VendasService.realizarVenda(vendaData)).rejects.toThrow(
        'Vendas à vista devem ter exatamente 1 parcela'
      );
    });

    it('deve criar venda com status Pendente inicialmente', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          venda: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockVenda),
          },
          orcamento: {
            findUnique: jest.fn().mockResolvedValue(mockOrcamento),
            update: jest.fn(),
          },
          projeto: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'proj-123' }),
          },
          contaReceber: {
            create: jest.fn().mockResolvedValue({
              id: 'conta-1',
              numeroParcela: 1,
              valorParcela: 10000,
              status: ContaStatus.Pendente,
            }),
          },
        };
        return callback(tx);
      });

      const vendaData: VendaPayload = {
        orcamentoId: 'orc-123',
        clienteId: 'cliente-123',
        valorTotal: 10000,
        formaPagamento: 'À vista',
        parcelas: 1,
        valorEntrada: 0,
      };

      const resultado = await VendasService.realizarVenda(vendaData);

      expect(resultado.venda.status).toBe(VendaStatus.Pendente);
    });
  });

  describe('pagarConta', () => {
    it('deve marcar conta como paga e atualizar status da venda para Concluida quando todas as parcelas forem pagas', async () => {
      const conta = {
        id: 'conta-1',
        vendaId: 'venda-123',
        status: ContaStatus.Pendente,
        observacoes: null,
      };

      const contasDaVenda = [
        { id: 'conta-1', status: ContaStatus.Pendente },
        { id: 'conta-2', status: ContaStatus.Pago },
        { id: 'conta-3', status: ContaStatus.Pago },
      ];

      mockPrisma.contaReceber.findUnique.mockResolvedValue(conta);
      mockPrisma.contaReceber.update.mockResolvedValue({
        ...conta,
        status: ContaStatus.Pago,
        dataPagamento: new Date(),
      });
      mockPrisma.contaReceber.findMany.mockResolvedValue([
        { id: 'conta-1', status: ContaStatus.Pago },
        { id: 'conta-2', status: ContaStatus.Pago },
        { id: 'conta-3', status: ContaStatus.Pago },
      ]);
      mockPrisma.venda.update.mockResolvedValue({
        id: 'venda-123',
        status: VendaStatus.Concluida,
      });

      const resultado = await VendasService.pagarConta('conta-1', {
        dataPagamento: new Date().toISOString(),
      });

      expect(resultado.status).toBe(ContaStatus.Pago);
      expect(mockPrisma.venda.update).toHaveBeenCalledWith({
        where: { id: 'venda-123' },
        data: {
          status: VendaStatus.Concluida,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('deve marcar conta como paga mas NÃO atualizar venda se ainda houver parcelas pendentes', async () => {
      const conta = {
        id: 'conta-1',
        vendaId: 'venda-123',
        status: ContaStatus.Pendente,
        observacoes: null,
      };

      mockPrisma.contaReceber.findUnique.mockResolvedValue(conta);
      mockPrisma.contaReceber.update.mockResolvedValue({
        ...conta,
        status: ContaStatus.Pago,
        dataPagamento: new Date(),
      });
      mockPrisma.contaReceber.findMany.mockResolvedValue([
        { id: 'conta-1', status: ContaStatus.Pago },
        { id: 'conta-2', status: ContaStatus.Pendente }, // Ainda pendente
        { id: 'conta-3', status: ContaStatus.Pendente }, // Ainda pendente
      ]);

      const resultado = await VendasService.pagarConta('conta-1');

      expect(resultado.status).toBe(ContaStatus.Pago);
      expect(mockPrisma.venda.update).not.toHaveBeenCalled(); // Não deve atualizar venda
    });

    it('deve rejeitar pagamento de conta já paga', async () => {
      const conta = {
        id: 'conta-1',
        vendaId: 'venda-123',
        status: ContaStatus.Pago,
        observacoes: null,
      };

      mockPrisma.contaReceber.findUnique.mockResolvedValue(conta);

      await expect(VendasService.pagarConta('conta-1')).rejects.toThrow(
        'Esta parcela já está marcada como paga'
      );
    });
  });
});
