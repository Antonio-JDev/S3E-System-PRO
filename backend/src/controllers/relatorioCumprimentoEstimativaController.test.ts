/**
 * GET /api/projetos/relatorios/cumprimento-estimativa
 * Rodar: npm test -- relatorioCumprimentoEstimativaController.test.ts
 */

jest.mock('../services/relatorioCumprimentoEstimativa.service', () => ({
  gerarRelatorioCumprimentoEstimativa: jest.fn(),
}));

import { Request, Response } from 'express';
import { getRelatorioCumprimentoEstimativa } from './relatorioCumprimentoEstimativaController';
import { gerarRelatorioCumprimentoEstimativa } from '../services/relatorioCumprimentoEstimativa.service';

describe('getRelatorioCumprimentoEstimativa', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    mockRequest = { query: {} } as any;
    (mockRequest as any).user = { role: 'admin' };
    mockResponse = { json, status };
  });

  it('nega acesso para usuário sem permissão', async () => {
    (mockRequest as any).user = { role: 'eletricista' };
    await getRelatorioCumprimentoEstimativa(mockRequest as Request, mockResponse as Response);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('retorna relatório para admin', async () => {
    const mockRows = [
      {
        projetoId: 'p1',
        numeroOS: 'OS-0001',
        titulo: 'Teste',
        clienteNome: 'Cliente',
        engenheiroResponsavel: 'João',
        status: 'EXECUCAO',
        diasEstimados: 5,
        diasReais: 3,
        horasEstimadas: 10,
        horasReais: 8,
        custoOrcado: 1000,
        custoRealizado: 800,
        lucroPerdaPrazo: 200,
        resultadoOs: 500,
        cumpriuEstimativa: true,
      },
    ];
    (gerarRelatorioCumprimentoEstimativa as jest.Mock).mockResolvedValue(mockRows);

    await getRelatorioCumprimentoEstimativa(mockRequest as Request, mockResponse as Response);

    expect(gerarRelatorioCumprimentoEstimativa).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: mockRows,
      total: 1,
    });
  });

  it('repassa filtro de status na query', async () => {
    mockRequest.query = { status: 'CONCLUIDO' };
    (gerarRelatorioCumprimentoEstimativa as jest.Mock).mockResolvedValue([]);

    await getRelatorioCumprimentoEstimativa(mockRequest as Request, mockResponse as Response);

    expect(gerarRelatorioCumprimentoEstimativa).toHaveBeenCalledWith({
      status: ['CONCLUIDO'],
    });
  });
});
