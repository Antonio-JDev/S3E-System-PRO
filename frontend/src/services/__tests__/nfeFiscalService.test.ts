/**
 * Testes do módulo fiscal - NFe (frontend) - Vitest
 * Rodar: npm run test -- nfeFiscalService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nfeFiscalService } from '../nfeFiscalService';

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe('nfeFiscalService (módulo fiscal NF-e)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitirNFe', () => {
    it('deve chamar POST /api/nfe/emitir com pedidoId e empresaId', async () => {
      mockPost.mockResolvedValue({ success: true, data: { chaveAcesso: 'chave-123' } });

      await nfeFiscalService.emitirNFe({
        pedidoId: 'pedido-1',
        empresaId: 'empresa-1',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/nfe/emitir', {
        pedidoId: 'pedido-1',
        empresaId: 'empresa-1',
      });
    });
  });

  describe('emitirFracionado', () => {
    it('deve chamar POST /api/nfe/emitir-fracionado com vendaId e fracoes', async () => {
      mockPost.mockResolvedValue({ success: true, data: { notas: [] } });

      await nfeFiscalService.emitirFracionado({
        vendaId: 'venda-1',
        empresaId: 'empresa-1',
        fracoes: [
          { clienteId: 'c1', valor: 100, dataVencimento: '2024-02-01' },
        ],
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/nfe/emitir-fracionado',
        expect.objectContaining({
          vendaId: 'venda-1',
          empresaId: 'empresa-1',
          fracoes: expect.any(Array),
        })
      );
    });
  });

  describe('consultarNFe', () => {
    it('deve chamar GET com chave, empresaId e ambiente', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { situacao: 'Autorizada', chaveAcesso: 'chave' },
      });

      await nfeFiscalService.consultarNFe('44digits', 'emp-1', '2');

      expect(mockGet).toHaveBeenCalledWith('/api/nfe/consultar/44digits', {
        params: { empresaId: 'emp-1', ambiente: '2' },
      });
    });
  });
});
