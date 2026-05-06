import { ContasPagarController } from './contasPagarController';
import { ContasPagarService } from '../services/contasPagar.service';
import type { Request, Response } from 'express';

jest.mock('../services/contasPagar.service', () => ({
  ContasPagarService: {
    atualizarConta: jest.fn(),
  },
}));

describe('ContasPagarController.atualizarConta', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { id: 'cp-1' }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('retorna 400 quando id não é informado', async () => {
    req.params = {} as any;
    await ContasPagarController.atualizarConta(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('faz parse de dataVencimento YYYY-MM-DD e chama service', async () => {
    (ContasPagarService.atualizarConta as jest.Mock).mockResolvedValue({ id: 'cp-1' });
    req.body = { credorNome: 'Credor', dataVencimento: '2026-04-28', observacoes: 'obs' };

    await ContasPagarController.atualizarConta(req as Request, res as Response);

    expect(ContasPagarService.atualizarConta).toHaveBeenCalledWith(
      'cp-1',
      expect.objectContaining({
        credorNome: 'Credor',
        observacoes: 'obs',
        dataVencimento: expect.any(Date),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.any(String) })
    );
  });
});

