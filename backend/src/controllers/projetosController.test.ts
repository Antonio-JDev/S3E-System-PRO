/**
 * Testes para o Controller de Projetos
 * Especificamente para verificar se numeroSequencial do orçamento é incluído
 * 
 * Para rodar os testes:
 * npm test -- projetosController.test.ts
 */

import { getProjetos, getProjetoById } from './projetosController';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

// Mock do Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    projeto: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('ProjetosController', () => {
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
    
    mockRequest = {
      query: {},
    };
    
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getProjetos', () => {
    it('deve incluir numeroSequencial do orçamento na resposta', async () => {
      const mockProjetos = [
        {
          id: 'proj-1',
          titulo: 'Projeto Teste',
          orcamento: {
            id: 'orc-1',
            precoVenda: 10000,
            status: 'Aprovado',
            numeroSequencial: 2151, // ✅ Deve estar incluído
          },
          cliente: {
            id: 'cliente-1',
            nome: 'Cliente Teste',
            cpfCnpj: '12345678900',
          },
          tasks: [],
          alocacoes: [],
          vendas: [],
        },
      ];

      mockPrisma.projeto.findMany.mockResolvedValue(mockProjetos);

      await getProjetos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            orcamento: expect.objectContaining({
              numeroSequencial: 2151,
            }),
          }),
        ]),
        total: 1,
      });
    });

    it('deve incluir numeroSequencial mesmo quando orçamento não tem outros campos', async () => {
      const mockProjetos = [
        {
          id: 'proj-1',
          titulo: 'Projeto Teste',
          orcamento: {
            id: 'orc-1',
            precoVenda: 5000,
            status: 'Aprovado',
            numeroSequencial: 2150,
          },
          cliente: {
            id: 'cliente-1',
            nome: 'Cliente Teste',
            cpfCnpj: '12345678900',
          },
          tasks: [],
          alocacoes: [],
          vendas: [],
        },
      ];

      mockPrisma.projeto.findMany.mockResolvedValue(mockProjetos);

      await getProjetos(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const projeto = callArgs.data[0];
      
      expect(projeto.orcamento.numeroSequencial).toBe(2150);
    });
  });

  describe('getProjetoById', () => {
    it('deve incluir numeroSequencial do orçamento ao buscar projeto específico', async () => {
      const mockProjeto = {
        id: 'proj-1',
        titulo: 'Projeto Teste',
        orcamento: {
          id: 'orc-1',
          numeroSequencial: 2151,
          titulo: 'Orçamento Teste',
          items: [],
        },
        cliente: {
          id: 'cliente-1',
          nome: 'Cliente Teste',
        },
        tasks: [],
        alocacoes: [],
        vendas: [],
        notasFiscais: [],
      };

      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockRequest.params = { id: 'proj-1' };

      await getProjetoById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          orcamento: expect.objectContaining({
            numeroSequencial: 2151,
          }),
        }),
      });
    });
  });
});
