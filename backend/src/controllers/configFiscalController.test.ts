/**
 * Testes do módulo fiscal - ConfigFiscalController
 * Rodar: npm test -- configFiscalController.test.ts
 */

import { Request, Response } from 'express';
import * as configFiscalController from './configFiscalController';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    empresaFiscal: {
      get findMany() {
        return mockFindMany;
      },
      get findUnique() {
        return mockFindUnique;
      },
    },
  })),
}));

describe('ConfigFiscalController (módulo fiscal)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
  });

  describe('getConfiguracoes', () => {
    it('deve retornar lista de configurações quando o banco retorna dados', async () => {
      const lista = [
        { id: '1', cnpj: '12345678000199', razaoSocial: 'Empresa Teste', ativo: true },
      ];
      mockFindMany.mockResolvedValue(lista);

      mockReq = {};
      await (configFiscalController as any).getConfiguracoes(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockFindMany).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(lista);
    });

    it('deve retornar 500 quando o banco lança erro', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        mockFindMany.mockRejectedValue(new Error('DB error'));
        mockReq = {};
        await (configFiscalController as any).getConfiguracoes(
          mockReq as Request,
          mockRes as Response
        );
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Erro ao buscar configurações fiscais' })
        );
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('getConfiguracaoById', () => {
    it('deve retornar 404 quando configuração não existe', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockReq = { params: { id: 'id-inexistente' } };

      await (configFiscalController as any).getConfiguracaoById(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'id-inexistente' } })
      );
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Configuração não encontrada' });
    });

    it('deve retornar configuração quando encontrada', async () => {
      const config = {
        id: 'cfg-1',
        cnpj: '12345678000199',
        razaoSocial: 'Empresa Fiscal',
        ativo: true,
      };
      mockFindUnique.mockResolvedValue(config);
      mockReq = { params: { id: 'cfg-1' } };

      await (configFiscalController as any).getConfiguracaoById(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(config);
    });
  });
});
