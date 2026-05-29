/**
 * Épico 3 — Reserva de material por OS (compra avulsa sem obra)
 * Rodar: npm test -- reservaMaterialProjeto.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    reservaMaterialProjeto: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    obra: { findUnique: jest.fn() },
    material: { findUnique: jest.fn(), update: jest.fn() },
    movimentacaoEstoque: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      material: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      movimentacaoEstoque: { create: jest.fn() },
      reservaMaterialProjeto: { delete: jest.fn() },
    })),
  },
}));

import { prisma } from '../lib/prisma';
import { ReservaMaterialProjetoService } from './reservaMaterialProjeto.service';

describe('ReservaMaterialProjetoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarReserva', () => {
    it('persiste reserva vinculada à compra e ao item', async () => {
      (prisma.reservaMaterialProjeto.create as jest.Mock).mockResolvedValue({ id: 'res-1' });
      await ReservaMaterialProjetoService.criarReserva({
        projetoId: 'proj-1',
        materialId: 'mat-1',
        quantidade: 4,
        compraId: 'compra-1',
        compraItemId: 'ci-1',
      });
      expect(prisma.reservaMaterialProjeto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projetoId: 'proj-1',
          materialId: 'mat-1',
          quantidade: 4,
          compraId: 'compra-1',
          compraItemId: 'ci-1',
        }),
      });
    });
  });

  describe('resolverObraIdParaDestino', () => {
    it('retorna obraId para destino OBRA', async () => {
      const r = await ReservaMaterialProjetoService.resolverObraIdParaDestino('OBRA', 'obra-99', null);
      expect(r).toEqual({ obraId: 'obra-99', projetoId: null });
    });

    it('resolve obra existente quando destino é PROJETO com obra criada', async () => {
      (prisma.obra.findUnique as jest.Mock).mockResolvedValue({ id: 'obra-de-proj' });
      const r = await ReservaMaterialProjetoService.resolverObraIdParaDestino(
        'PROJETO',
        null,
        'proj-1',
      );
      expect(r).toEqual({ obraId: 'obra-de-proj', projetoId: 'proj-1' });
    });

    it('mantém só projetoId quando OS ainda não tem obra', async () => {
      (prisma.obra.findUnique as jest.Mock).mockResolvedValue(null);
      const r = await ReservaMaterialProjetoService.resolverObraIdParaDestino(
        'PROJETO',
        null,
        'proj-2',
      );
      expect(r).toEqual({ obraId: null, projetoId: 'proj-2' });
    });
  });

  describe('consumirReservasAoIniciarObra', () => {
    it('retorna consumidas 0 quando não há reservas', async () => {
      (prisma.reservaMaterialProjeto.findMany as jest.Mock).mockResolvedValue([]);
      const r = await ReservaMaterialProjetoService.consumirReservasAoIniciarObra('proj-1', 'obra-1');
      expect(r.consumidas).toBe(0);
    });

    it('baixa estoque, registra saída OBRA e remove reserva', async () => {
      const txMaterialFind = jest.fn().mockResolvedValue({
        id: 'mat-1',
        nome: 'Cabo',
        estoque: 10,
      });
      const txMaterialUpdate = jest.fn().mockResolvedValue({});
      const txMovCreate = jest.fn().mockResolvedValue({});
      const txReservaDelete = jest.fn().mockResolvedValue({});

      (prisma.reservaMaterialProjeto.findMany as jest.Mock).mockResolvedValue([
        { id: 'res-1', materialId: 'mat-1', quantidade: 3 },
      ]);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          material: { findUnique: txMaterialFind, update: txMaterialUpdate },
          movimentacaoEstoque: { create: txMovCreate },
          reservaMaterialProjeto: { delete: txReservaDelete },
        }),
      );

      const r = await ReservaMaterialProjetoService.consumirReservasAoIniciarObra('proj-1', 'obra-1');
      expect(r.consumidas).toBe(1);
      expect(txMaterialUpdate).toHaveBeenCalledWith({
        where: { id: 'mat-1' },
        data: { estoque: { decrement: 3 } },
      });
      expect(txMovCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'SAIDA',
          motivo: 'OBRA',
          referencia: 'obra-1',
          quantidade: 3,
        }),
      });
      expect(txReservaDelete).toHaveBeenCalledWith({ where: { id: 'res-1' } });
    });

    it('falha quando estoque é insuficiente para consumir reserva', async () => {
      (prisma.reservaMaterialProjeto.findMany as jest.Mock).mockResolvedValue([
        { id: 'res-2', materialId: 'mat-x', quantidade: 5 },
      ]);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
        fn({
          material: {
            findUnique: jest.fn().mockResolvedValue({ id: 'mat-x', nome: 'X', estoque: 1 }),
            update: jest.fn(),
          },
          movimentacaoEstoque: { create: jest.fn() },
          reservaMaterialProjeto: { delete: jest.fn() },
        }),
      );

      await expect(
        ReservaMaterialProjetoService.consumirReservasAoIniciarObra('proj-1', 'obra-1'),
      ).rejects.toThrow(/Estoque insuficiente/);
    });
  });
});
