/**
 * Testes unitários - Módulo de Compras (ComprasService)
 * Rodar: npm test -- compras.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    compra: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import { ComprasService } from './compras.service';

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
});
