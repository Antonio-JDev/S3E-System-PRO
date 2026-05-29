/**
 * Testes unitários - Módulo de Compras (ComprasService)
 * Inclui: listagem, classificação e compra avulsa (destino por item — OS/Obra/reserva)
 * Rodar: npm test -- compras.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    compra: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    obra: { findUnique: jest.fn() },
  },
}));

jest.mock('./reservaMaterialProjeto.service', () => ({
  ReservaMaterialProjetoService: {
    resolverObraIdParaDestino: jest.fn(),
  },
}));

import { prisma } from '../lib/prisma';
import { ComprasService } from './compras.service';

/** Acesso ao método privado de recebimento por item */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const aplicarDestino = (ComprasService as any).aplicarDestinoItemRecebimento.bind(
  ComprasService,
);

describe('ComprasService', () => {
  describe('listarCompras', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (prisma.compra.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.compra.count as jest.Mock).mockResolvedValue(0);
    });

    it('deve incluir contasPagar com select valorParcela (não "valor" — alinhado ao model ContaPagar)', async () => {
      await ComprasService.listarCompras();

      expect(prisma.compra.findMany).toHaveBeenCalledTimes(1);
      const call = (prisma.compra.findMany as jest.Mock).mock.calls[0][0];
      expect(call.include.contasPagar).toEqual({
        select: {
          id: true,
          status: true,
          valorParcela: true,
          dataVencimento: true,
        },
      });
    });

    it('deve retornar compras e paginação quando o Prisma responde', async () => {
      const compraMock = {
        id: 'compra-1',
        numeroSequencial: 42,
        contasPagar: [
          {
            id: 'cp-1',
            status: 'Pendente',
            valorParcela: 150.5,
            dataVencimento: new Date('2026-05-01T12:00:00.000Z'),
          },
        ],
      };
      (prisma.compra.findMany as jest.Mock).mockResolvedValue([compraMock]);
      (prisma.compra.count as jest.Mock).mockResolvedValue(1);

      const result = await ComprasService.listarCompras();

      expect(result.compras).toHaveLength(1);
      const contas = (result.compras[0] as { contasPagar?: Array<{ valorParcela?: number }> }).contasPagar;
      expect(contas?.[0]?.valorParcela).toBe(150.5);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 1000,
        total: 1,
        pages: 1,
      });
    });
  });

  describe('destinoPorClassificacao', () => {
    it('deve retornar "estoque" para COMPOSICAO_ESTOQUE', () => {
      expect(ComprasService.destinoPorClassificacao('COMPOSICAO_ESTOQUE')).toBe('estoque');
    });

    it('deve retornar "estoque" quando classificação é null ou undefined', () => {
      expect(ComprasService.destinoPorClassificacao(null)).toBe('estoque');
      expect(ComprasService.destinoPorClassificacao(undefined)).toBe('estoque');
    });

    it('deve retornar "ferramentas" para FERRAMENTAS', () => {
      expect(ComprasService.destinoPorClassificacao('FERRAMENTAS')).toBe('ferramentas');
    });

    it('deve retornar "rh" para RECURSOS_HUMANOS', () => {
      expect(ComprasService.destinoPorClassificacao('RECURSOS_HUMANOS')).toBe('rh');
    });

    it('deve ser case-insensitive', () => {
      expect(ComprasService.destinoPorClassificacao('ferramentas')).toBe('ferramentas');
      expect(ComprasService.destinoPorClassificacao('recursos_humanos')).toBe('rh');
    });

    it('deve retornar "estoque" para LIMPEZA_INSUMOS e ESCRITORIO_INSUMOS', () => {
      expect(ComprasService.destinoPorClassificacao('LIMPEZA_INSUMOS')).toBe('estoque');
      expect(ComprasService.destinoPorClassificacao('ESCRITORIO_INSUMOS')).toBe('estoque');
    });

    it('deve retornar "despesas_variadas" para DESPESAS_VARIADAS (sem fluxo de estoque)', () => {
      expect(ComprasService.destinoPorClassificacao('DESPESAS_VARIADAS')).toBe('despesas_variadas');
      expect(ComprasService.destinoPorClassificacao('despesas_variadas')).toBe('despesas_variadas');
    });
  });

  describe('aplicarDestinoItemRecebimento (compra avulsa por item)', () => {
    const compraBase = { id: 'compra-1', numeroNF: 'NF-100' };
    const materialId = 'mat-1';
    const qtd = 10;

    function criarTxMock() {
      return {
        material: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
        movimentacaoEstoque: { create: jest.fn().mockResolvedValue({}) },
        obra: { findUnique: jest.fn() },
        reservaMaterialProjeto: { create: jest.fn().mockResolvedValue({}) },
      };
    }

    it('apenas ENTRADA quando destinoEstoque é true (item vai só para estoque)', async () => {
      const tx = criarTxMock();
      await aplicarDestino(tx, {
        compra: { ...compraBase, destinoTipo: 'PROJETO', projetoId: 'proj-1' },
        item: { id: 'ci-1', destinoEstoque: true },
        materialId,
        quantidadeParaEstoque: qtd,
        observacoesEntrada: 'Entrada NF',
      });
      expect(tx.material.update).toHaveBeenCalledTimes(1);
      expect(tx.material.update).toHaveBeenCalledWith({
        where: { id: materialId },
        data: { estoque: { increment: qtd } },
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(1);
      expect(tx.reservaMaterialProjeto.create).not.toHaveBeenCalled();
    });

    it('ENTRADA + SAÍDA OBRA quando destino OBRA e item marcado para destino', async () => {
      const tx = criarTxMock();
      await aplicarDestino(tx, {
        compra: { ...compraBase, destinoTipo: 'OBRA', obraId: 'obra-1' },
        item: { id: 'ci-2', destinoEstoque: false },
        materialId,
        quantidadeParaEstoque: qtd,
        observacoesEntrada: 'Entrada',
      });
      expect(tx.material.update).toHaveBeenCalledTimes(2);
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(2);
      expect(tx.movimentacaoEstoque.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          tipo: 'SAIDA',
          motivo: 'OBRA',
          referencia: 'obra-1',
        }),
      });
    });

    it('compatibilidade legada: compra só com obraId trata todos os itens como destino obra', async () => {
      const tx = criarTxMock();
      await aplicarDestino(tx, {
        compra: { ...compraBase, obraId: 'obra-legada' },
        item: { id: 'ci-3', destinoEstoque: true },
        materialId,
        quantidadeParaEstoque: qtd,
        observacoesEntrada: 'Entrada',
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(2);
    });

    it('PROJETO sem obra: ENTRADA + reserva (sem segunda baixa de estoque)', async () => {
      const tx = criarTxMock();
      tx.obra.findUnique.mockResolvedValue(null);
      await aplicarDestino(tx, {
        compra: { ...compraBase, destinoTipo: 'PROJETO', projetoId: 'proj-os' },
        item: { id: 'ci-4', destinoEstoque: false },
        materialId,
        quantidadeParaEstoque: qtd,
        observacoesEntrada: 'Entrada OS',
      });
      expect(tx.material.update).toHaveBeenCalledTimes(1);
      expect(tx.reservaMaterialProjeto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projetoId: 'proj-os',
          materialId,
          quantidade: qtd,
          compraId: 'compra-1',
          compraItemId: 'ci-4',
        }),
      });
    });

    it('PROJETO com obra já criada: ENTRADA + SAÍDA para obra resolvida', async () => {
      const tx = criarTxMock();
      tx.obra.findUnique.mockResolvedValue({ id: 'obra-da-os' });
      await aplicarDestino(tx, {
        compra: { ...compraBase, destinoTipo: 'PROJETO', projetoId: 'proj-com-obra' },
        item: { id: 'ci-5', destinoEstoque: false },
        materialId,
        quantidadeParaEstoque: qtd,
        observacoesEntrada: 'Entrada',
      });
      expect(tx.material.update).toHaveBeenCalledTimes(2);
      expect(tx.movimentacaoEstoque.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          referencia: 'obra-da-os',
          motivo: 'OBRA',
        }),
      });
      expect(tx.reservaMaterialProjeto.create).not.toHaveBeenCalled();
    });
  });
});
