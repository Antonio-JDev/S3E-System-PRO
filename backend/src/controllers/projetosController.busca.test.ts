/**
 * Épico 3 — GET /api/projetos/busca (compra avulsa — vínculo OS)
 * Rodar: npm test -- projetosController.busca.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findMany: jest.fn() },
    obra: { findMany: jest.fn() },
  },
}));

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { buscarProjetos } from './projetosController';

describe('buscarProjetos', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = { query: {} };
    mockResponse = { json: jsonMock, status: statusMock };
  });

  it('retorna lista vazia quando q está vazio', async () => {
    mockRequest.query = { q: '' };
    await buscarProjetos(mockRequest as Request, mockResponse as Response);
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
    expect(prisma.projeto.findMany).not.toHaveBeenCalled();
  });

  it('monta numeroOs e inclui obra vinculada quando existir', async () => {
    mockRequest.query = { q: '2670', limit: '10' };
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-2670',
        titulo: 'Quadro Industrial',
        status: 'APROVADO',
        semObra: false,
        cliente: { id: 'c1', nome: 'Cliente A' },
        orcamento: { numeroSequencial: 2670 },
      },
    ]);
    (prisma.obra.findMany as jest.Mock).mockResolvedValue([
      { id: 'obra-1', projetoId: 'proj-2670', nomeObra: 'Obra 2670', status: 'A_FAZER' },
    ]);

    await buscarProjetos(mockRequest as Request, mockResponse as Response);

    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: 'proj-2670',
          titulo: 'Quadro Industrial',
          numeroOs: 'OS-2670',
          cliente: { id: 'c1', nome: 'Cliente A' },
          obra: { id: 'obra-1', nomeObra: 'Obra 2670', status: 'A_FAZER' },
        }),
      ],
    });
  });

  it('retorna obra null quando OS ainda não tem obra gerada', async () => {
    mockRequest.query = { q: 'Cliente' };
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-sem-obra',
        titulo: 'Projeto Novo',
        status: 'APROVADO',
        semObra: true,
        cliente: { id: 'c2', nome: 'Cliente B' },
        orcamento: { numeroSequencial: 3001 },
      },
    ]);
    (prisma.obra.findMany as jest.Mock).mockResolvedValue([]);

    await buscarProjetos(mockRequest as Request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.data[0].obra).toBeNull();
    expect(payload.data[0].numeroOs).toBe('OS-3001');
  });
});
