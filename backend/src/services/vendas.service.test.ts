/**
 * Testes Unitários para o Serviço de Vendas
 * 
 * Para rodar os testes:
 * npm test -- vendas.service.test.ts
 */

import { VendasService, VendaPayload } from './vendas.service';
import { prisma } from '../lib/prisma';
import { VendaStatus, ContaStatus } from '../types/index';
import { ORCAMENTO_STATUS_CONCRETIZADO } from '../utils/orcamentoStatus.util';

// Mock do Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    venda: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    contaReceber: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    recebimentoParcial: {
      create: jest.fn(),
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
    empresaFiscal: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock do EstoqueService
jest.mock('./estoque.service', () => ({
  EstoqueService: {
    processarBaixaOrcamento: jest.fn().mockResolvedValue({ success: true }),
    verificarDisponibilidadeOrcamento: jest.fn().mockResolvedValue({ disponivel: true }),
  },
}));

describe('VendasService', () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('realizarVenda', () => {
    const mockOrcamento = {
      id: 'orc-123',
      clienteId: 'cliente-123',
      precoVenda: 10000,
      status: 'Aprovado',
      projeto: null,
      items: [],
    };

    const mockVenda = {
      id: 'venda-123',
      numeroVenda: 'VND-1234567890',
      orcamentoId: 'orc-123',
      valorTotal: 10000,
      status: VendaStatus.Pendente,
    };

    function mockPosTransacaoConcretizado() {
      mockPrisma.venda.findUnique.mockResolvedValue(mockVenda as any);
      mockPrisma.orcamento.findUnique.mockResolvedValue({
        status: ORCAMENTO_STATUS_CONCRETIZADO,
        aprovedAt: new Date(),
      } as any);
    }

    function buildTxMock(overrides: Record<string, unknown> = {}) {
      return {
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
        empresaFiscal: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        contaReceber: {
          create: jest.fn().mockResolvedValue({
            id: 'conta-1',
            numeroParcela: 1,
            valorParcela: 10000,
            status: ContaStatus.Pendente,
          }),
        },
        ...overrides,
      };
    }

    it('deve criar venda à vista com 1 parcela apenas', async () => {
      const orcamentoUpdate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(buildTxMock({ orcamento: { findUnique: jest.fn().mockResolvedValue(mockOrcamento), update: orcamentoUpdate } }));
      });
      mockPosTransacaoConcretizado();

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
      expect(orcamentoUpdate).toHaveBeenCalledWith({
        where: { id: 'orc-123' },
        data: expect.objectContaining({ status: ORCAMENTO_STATUS_CONCRETIZADO }),
      });
      expect(resultado.orcamentoStatus).toBe(ORCAMENTO_STATUS_CONCRETIZADO);
    });

    it('deve criar venda com entrada separada das parcelas', async () => {
      const contasCriadas: any[] = [];
      
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = buildTxMock({
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
        });
        return callback(tx);
      });
      mockPosTransacaoConcretizado();

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
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(buildTxMock()));
      mockPosTransacaoConcretizado();

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

  describe('ensureOrcamentoConcretizadoAposPedidoVenda', () => {
    it('reconcilia orçamento para Concretizado se PV existir mas status não foi atualizado', async () => {
      mockPrisma.venda.findUnique.mockResolvedValue({ id: 'venda-123' });
      mockPrisma.orcamento.findUnique.mockResolvedValue({ status: 'Aprovado', aprovedAt: new Date() });
      mockPrisma.orcamento.update.mockResolvedValue({ status: ORCAMENTO_STATUS_CONCRETIZADO });

      const status = await VendasService.ensureOrcamentoConcretizadoAposPedidoVenda('orc-123');

      expect(mockPrisma.orcamento.update).toHaveBeenCalledWith({
        where: { id: 'orc-123' },
        data: expect.objectContaining({ status: ORCAMENTO_STATUS_CONCRETIZADO }),
      });
      expect(status).toBe(ORCAMENTO_STATUS_CONCRETIZADO);
    });
  });

  describe('atualizarValorDoOrcamento', () => {
    it('deve recalcular valorTotal do PV/financeiro subtraindo itens vendaDiretaFornecedor', async () => {
      const vendaId = 'venda-123';

      const mockVendaComOrcamento = {
        id: vendaId,
        valorEntrada: 0,
        valorTotal: 12000,
        orcamento: {
          precoVenda: 12000,
          items: [
            { vendaDiretaFornecedor: true, subtotal: 2000 },
            { vendaDiretaFornecedor: false, subtotal: 10000 }
          ]
        }
      };

      mockPrisma.venda.findUnique.mockResolvedValue(mockVendaComOrcamento);

      const contas = [
        {
          id: 'conta-1',
          vendaId,
          numeroParcela: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          valorParcela: 6000
        },
        {
          id: 'conta-2',
          vendaId,
          numeroParcela: 2,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          valorParcela: 6000
        }
      ];

      const tx = {
        venda: {
          update: jest.fn().mockResolvedValue({ id: vendaId, valorTotal: 10000 })
        },
        contaReceber: {
          findMany: jest.fn().mockResolvedValue(contas),
          update: jest.fn().mockResolvedValue(undefined)
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(tx);
      });

      const resultado = await VendasService.atualizarValorDoOrcamento(vendaId);

      // Novo valor = precoVenda - venda direta
      expect(resultado.valorNovo).toBe(10000);
      expect(resultado.valorAnterior).toBe(12000);
      expect(resultado.contasAtualizadas).toBe(2);

      expect(tx.venda.update).toHaveBeenCalledWith({
        where: { id: vendaId },
        data: { valorTotal: 10000 }
      });

      // Deve atualizar valorParcela das 2 parcelas
      expect(tx.contaReceber.update).toHaveBeenCalledWith({
        where: { id: 'conta-1' },
        data: { valorParcela: 5000 }
      });
      expect(tx.contaReceber.update).toHaveBeenCalledWith({
        where: { id: 'conta-2' },
        data: { valorParcela: 5000 }
      });
    });

    it('deve retornar sucesso sem alterar quando valorTotal já está correto', async () => {
      const vendaId = 'venda-456';

      const mockVendaComOrcamento = {
        id: vendaId,
        valorEntrada: 0,
        valorTotal: 10000,
        orcamento: {
          precoVenda: 10000,
          items: [
            { vendaDiretaFornecedor: true, subtotal: 0 },
            { vendaDiretaFornecedor: false, subtotal: 10000 }
          ]
        }
      };

      mockPrisma.venda.findUnique.mockResolvedValue(mockVendaComOrcamento);

      const resultado = await VendasService.atualizarValorDoOrcamento(vendaId);

      expect(resultado.success).toBe(true);
      expect(resultado.valorNovo).toBe(10000);
      expect(resultado.contasAtualizadas).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('pagarConta', () => {
    it('deve marcar conta como paga e atualizar status da venda para Concluida quando todas as parcelas forem pagas', async () => {
      const conta = {
        id: 'conta-1',
        vendaId: 'venda-123',
        valorParcela: 100,
        valorRecebido: 0,
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
        valorParcela: 100,
        valorRecebido: 0,
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

    it('deve registrar recebimento com juros e desconto (valor a registrar = base + juros − desconto)', async () => {
      const conta = {
        id: 'conta-1',
        vendaId: null,
        valorParcela: 960,
        valorRecebido: 0,
        status: ContaStatus.Pendente,
        observacoes: null,
      };

      mockPrisma.contaReceber.findUnique.mockResolvedValue(conta);
      mockPrisma.recebimentoParcial.create.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.contaReceber.update.mockResolvedValue({
        ...conta,
        status: ContaStatus.Pago,
        valorRecebido: 960,
      });

      await VendasService.pagarConta('conta-1', {
        valorRecebido: 1000,
        valorJuros: 10,
        valorDesconto: 50,
        meioPagamento: 'PIX',
      });

      expect(mockPrisma.recebimentoParcial.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valorPago: 960,
          valorJuros: 10,
          valorDesconto: 50,
          meioPagamento: 'PIX',
        }),
      });
      expect(mockPrisma.contaReceber.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valorRecebido: 960,
            valorJuros: 10,
            valorDesconto: 50,
          }),
        })
      );
    });

    it('deve rejeitar quando valor a registrar excede saldo restante', async () => {
      mockPrisma.contaReceber.findUnique.mockResolvedValue({
        id: 'conta-1',
        valorParcela: 100,
        valorRecebido: 0,
        status: ContaStatus.Pendente,
        observacoes: null,
      });

      await expect(
        VendasService.pagarConta('conta-1', {
          valorRecebido: 100,
          valorJuros: 50,
          valorDesconto: 0,
        })
      ).rejects.toThrow('não pode ser maior que o saldo restante');
    });
  });

  describe('atualizarVenda', () => {
    it('deve atualizar datas/valores das parcelas fornecidas e retornar a venda atualizada', async () => {
      const vendaMock = {
        id: 'venda-123',
        orcamentoId: 'orc-1',
        contasReceber: [{ id: 'conta-1' }, { id: 'conta-2' }],
      };

      mockPrisma.venda.findUnique.mockResolvedValue(vendaMock);

      const contaUpdate = jest.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          contaReceber: { update: contaUpdate },
          orcamentoItem: {
            findMany: jest.fn(),
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      const buscarSpy = jest
        .spyOn(VendasService, 'buscarVenda')
        .mockResolvedValue({ id: 'venda-123', atualizado: true } as any);

      const res = await VendasService.atualizarVenda('venda-123', {
        parcelas: [
          { id: 'conta-1', dataVencimento: '2026-03-01', valorParcela: 123.45 },
          // Deve ser ignorada por não pertencer à venda
          { id: 'conta-xyz', dataVencimento: '2026-04-01', valorParcela: 999 },
        ],
      });

      expect(contaUpdate).toHaveBeenCalledTimes(1);
      expect(contaUpdate).toHaveBeenCalledWith({
        where: { id: 'conta-1' },
        data: expect.objectContaining({
          updatedAt: expect.any(Date),
          dataVencimento: new Date(2026, 2, 1, 12, 0, 0, 0),
          valorParcela: 123.45,
        }),
      });

      expect(res).toEqual({ id: 'venda-123', atualizado: true });
      buscarSpy.mockRestore();
    });
  });
});
