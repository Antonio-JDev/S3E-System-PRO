/**
 * Testes — ContasReceberController (POST com juros/desconto)
 * Rodar: npm test -- contasReceberController.test.ts
 */

jest.mock('../services/contasReceber.service', () => ({
  ContasReceberService: {
    criarContaReceberManual: jest.fn(),
    listarTodas: jest.fn(),
    historicoRecebimentos: jest.fn(),
    atualizarContaReceber: jest.fn(),
    excluirContaReceber: jest.fn(),
  },
}));

import { ContasReceberController } from './contasReceberController';
import { ContasReceberService } from '../services/contasReceber.service';
import type { Request, Response } from 'express';

describe('ContasReceberController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('criar', () => {
    it('repassa valorJuros e valorDesconto ao service', async () => {
      (ContasReceberService.criarContaReceberManual as jest.Mock).mockResolvedValue({ id: 'cr-1' });
      req.body = {
        tipo: 'ENTRADA',
        descricao: 'Serviço',
        valorParcela: 1000,
        valorJuros: 10,
        valorDesconto: 50,
        dataVencimento: '2026-05-28',
      };

      await ContasReceberController.criar(req as Request, res as Response);

      expect(ContasReceberService.criarContaReceberManual).toHaveBeenCalledWith(
        expect.objectContaining({
          valorParcela: 1000,
          valorJuros: 10,
          valorDesconto: 50,
          dataVencimento: expect.any(Date),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando faltam campos obrigatórios', async () => {
      req.body = { descricao: 'Só descrição' };

      await ContasReceberController.criar(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ContasReceberService.criarContaReceberManual).not.toHaveBeenCalled();
    });
  });

  describe('excluir', () => {
    it('chama service e retorna sucesso', async () => {
      req.params = { id: 'cr-1' };
      (ContasReceberService.excluirContaReceber as jest.Mock).mockResolvedValue({
        message: 'Conta a receber excluída com sucesso',
      });

      await ContasReceberController.excluir(req as Request, res as Response);

      expect(ContasReceberService.excluirContaReceber).toHaveBeenCalledWith('cr-1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
