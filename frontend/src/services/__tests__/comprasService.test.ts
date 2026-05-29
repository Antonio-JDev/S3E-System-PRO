/**
 * Testes do módulo de Compras (frontend) - Vitest
 * Rodar: npm run test -- comprasService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { comprasService } from '../comprasService';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('comprasService (módulo compras)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCompra (payload compra avulsa OS/Obra)', () => {
    it('envia destinoTipo, projetoId e destinoEstoque por item ao POST /api/compras', async () => {
      mockPost.mockResolvedValue({ success: true, data: { id: 'c1' } });
      const payload = {
        fornecedorNome: 'F',
        fornecedorCNPJ: '12345678000199',
        numeroNF: '1',
        destinoTipo: 'PROJETO',
        projetoId: 'proj-1',
        items: [
          { nomeProduto: 'A', quantidade: 2, valorUnit: 10, destinoEstoque: false },
          { nomeProduto: 'B', quantidade: 1, valorUnit: 5, destinoEstoque: true },
        ],
      };
      await comprasService.createCompra(payload);
      expect(mockPost).toHaveBeenCalledWith('/api/compras', payload);
    });
  });

  describe('mapCompraToPurchaseOrder', () => {
    it('deve mapear DTO do backend para PurchaseOrder', () => {
      const dto = {
        id: 'compra-1',
        fornecedorId: 'for-1',
        fornecedorNome: 'Fornecedor XYZ',
        numeroNF: '12345',
        dataCompra: '2024-01-15',
        status: 'Pendente',
        valorTotal: 1000,
        items: [
          {
            id: 'item-1',
            materialId: 'mat-1',
            nomeProduto: 'Produto A',
            quantidade: 2,
            valorUnit: 50,
            material: { ncm: '12345678', sku: 'SKU-A', unidadeMedida: 'UN' },
          },
        ],
      };

      const result = comprasService.mapCompraToPurchaseOrder(dto);

      expect(result.id).toBe('compra-1');
      expect(result.supplierName).toBe('Fornecedor XYZ');
      expect(result.invoiceNumber).toBe('12345');
      expect(result.status).toBe('Pendente');
      expect(result.totalAmount).toBe(1000);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe('Produto A');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitCost).toBe(50);
      expect((result.items[0] as any).ncm).toBe('12345678');
      expect((result.items[0] as any).sku).toBe('SKU-A');
    });

    it('deve usar fallbacks quando itens ou fornecedor estão incompletos', () => {
      const dto = {
        id: 'c2',
        fornecedorId: 'f2',
        numeroNF: '999',
        status: 'Recebido',
        valorTotal: 0,
        items: [],
      };

      const result = comprasService.mapCompraToPurchaseOrder(dto);

      expect(result.supplierName).toBe('Fornecedor');
      expect(result.items).toEqual([]);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('excluir', () => {
    it('deve retornar success quando API retorna sucesso', async () => {
      mockDelete.mockResolvedValue({ success: true });

      const result = await comprasService.excluir('compra-id');

      expect(mockDelete).toHaveBeenCalledWith('/api/compras/compra-id');
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('deve retornar success: false quando API retorna erro', async () => {
      mockDelete.mockResolvedValue({ success: false, error: 'Não autorizado' });

      const result = await comprasService.excluir('compra-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não autorizado');
    });

    it('deve retornar success: false em caso de exceção', async () => {
      mockDelete.mockRejectedValue(new Error('Network error'));

      const result = await comprasService.excluir('compra-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('excluir');
    });
  });
});
