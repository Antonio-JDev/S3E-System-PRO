/**
 * Testes do módulo fiscal - Empresa Fiscal (frontend) - Vitest
 * Rodar: npm run test -- empresaFiscalService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { empresaFiscalService } from '../empresaFiscalService';

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

describe('empresaFiscalService (módulo fiscal - empresas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listar', () => {
    it('deve chamar GET /api/configuracoes-fiscais', async () => {
      const lista = [
        { id: '1', cnpj: '12345678000199', razaoSocial: 'Empresa A', ativo: true },
      ];
      mockGet.mockResolvedValue({ success: true, data: lista });

      await empresaFiscalService.listar();

      expect(mockGet).toHaveBeenCalledWith('/api/configuracoes-fiscais');
    });
  });

  describe('buscarPorId', () => {
    it('deve chamar GET /api/configuracoes-fiscais/:id', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { id: 'cfg-1', cnpj: '12345678000199', razaoSocial: 'Empresa' },
      });

      await empresaFiscalService.buscarPorId('cfg-1');

      expect(mockGet).toHaveBeenCalledWith('/api/configuracoes-fiscais/cfg-1');
    });
  });

  describe('criar', () => {
    it('deve chamar POST /api/configuracoes-fiscais com dados', async () => {
      mockPost.mockResolvedValue({ success: true, data: { id: 'novo' } });

      await empresaFiscalService.criar({
        cnpj: '12345678000199',
        inscricaoEstadual: '123',
        razaoSocial: 'Nova Empresa',
        endereco: 'Rua X',
        numero: '1',
        bairro: 'Centro',
        cidade: 'Cidade',
        estado: 'SC',
        cep: '88000-000',
        regimeTributario: 'SimplesNacional',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/api/configuracoes-fiscais',
        expect.objectContaining({
          cnpj: '12345678000199',
          razaoSocial: 'Nova Empresa',
          regimeTributario: 'SimplesNacional',
        })
      );
    });
  });

  describe('atualizar', () => {
    it('deve chamar PUT /api/configuracoes-fiscais/:id', async () => {
      mockPut.mockResolvedValue({ success: true });

      await empresaFiscalService.atualizar('cfg-1', { razaoSocial: 'Nome Atualizado' });

      expect(mockPut).toHaveBeenCalledWith(
        '/api/configuracoes-fiscais/cfg-1',
        expect.objectContaining({ razaoSocial: 'Nome Atualizado' })
      );
    });
  });

  describe('deletar', () => {
    it('deve chamar DELETE /api/configuracoes-fiscais/:id', async () => {
      mockDelete.mockResolvedValue({ success: true });

      await empresaFiscalService.deletar('cfg-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/configuracoes-fiscais/cfg-1');
    });
  });

  describe('converterCertificadoParaBase64', () => {
    it('deve chamar readAsDataURL no arquivo e retornar Promise', async () => {
      const blob = new Blob(['x'], { type: 'application/x-pkcs12' });
      const file = new File([blob], 'cert.pfx', { type: 'application/x-pkcs12' });
      let onload: (() => void) | null = null;
      vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
        onload = () => {
          Object.defineProperty(this, 'result', {
            value: 'data:application/x-pkcs12;base64,Y29udGVudA==',
            configurable: true,
          });
          this.onload?.({} as ProgressEvent);
        };
        setTimeout(onload, 0);
      });

      const resultPromise = empresaFiscalService.converterCertificadoParaBase64(file);
      expect(resultPromise).toBeInstanceOf(Promise);
      const result = await resultPromise;
      expect(typeof result).toBe('string');
      expect(result).toBe('Y29udGVudA==');
    });
  });
});
