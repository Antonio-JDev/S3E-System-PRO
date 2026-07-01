/**
 * GET /api/projetos/cockpit-resumo
 * Rodar: npm test -- projetosController.cockpitResumo.test.ts
 */

jest.mock('../services/apropriacaoOs.service', () => ({
  apropriacaoOsService: {
    obterCockpitResumoBatch: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { getProjetosCockpitResumo } from './projetosController';
import { apropriacaoOsService } from '../services/apropriacaoOs.service';

describe('getProjetosCockpitResumo', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    mockRequest = { query: {} };
    mockResponse = { json, status };
  });

  it('retorna 400 quando ids ausente', async () => {
    await getProjetosCockpitResumo(mockRequest as Request, mockResponse as Response);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('ids') })
    );
  });

  it('retorna 400 quando ids inválido', async () => {
    mockRequest.query = { ids: '  ,  ' };
    await getProjetosCockpitResumo(mockRequest as Request, mockResponse as Response);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('retorna resumo em lote com sucesso', async () => {
    mockRequest.query = { ids: 'p1,p2' };
    (apropriacaoOsService.obterCockpitResumoBatch as jest.Mock).mockResolvedValue({
      p1: {
        diariasEquipeOrcadas: 5,
        diariasEquipeRealizadas: 1,
        custoTempoOrcado: 2000,
        dataPrevisao: null,
        diasCorridos: 3,
        estouroDiarias: false,
        estouroDiasCorridos: false,
      },
    });

    await getProjetosCockpitResumo(mockRequest as Request, mockResponse as Response);

    expect(apropriacaoOsService.obterCockpitResumoBatch).toHaveBeenCalledWith(['p1', 'p2']);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ p1: expect.any(Object) }),
    });
  });
});
