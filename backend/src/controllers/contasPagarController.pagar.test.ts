/**
 * Testes — ContasPagarController.pagarConta (juros/desconto)
 * Rodar: npm test -- contasPagarController.pagar.test.ts
 */

jest.mock('../services/contasPagar.service', () => ({
  ContasPagarService: {
    pagarConta: jest.fn(),
  },
}));

import { ContasPagarController } from './contasPagarController';
import { ContasPagarService } from '../services/contasPagar.service';
import type { Request, Response } from 'express';

describe('ContasPagarController.pagarConta', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: 'cp-1' },
      body: {
        dataPagamento: '2026-05-28',
        valorPago: 72.05,
        valorJuros: 5,
        valorDesconto: 2,
        meioPagamento: 'PIX',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('repassa valorJuros e valorDesconto ao service', async () => {
    (ContasPagarService.pagarConta as jest.Mock).mockResolvedValue({ id: 'cp-1', status: 'Pago' });

    await ContasPagarController.pagarConta(req as Request, res as Response);

    expect(ContasPagarService.pagarConta).toHaveBeenCalledWith(
      'cp-1',
      '2026-05-28',
      72.05,
      undefined,
      'PIX',
      5,
      2
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('retorna 400 sem id', async () => {
    req.params = {} as any;

    await ContasPagarController.pagarConta(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(ContasPagarService.pagarConta).not.toHaveBeenCalled();
  });
});
