import { Request, Response } from 'express';
import { CartaoCreditoService } from '../services/cartaoCredito.service';

export const CartaoCreditoController = {
  async listar(req: Request, res: Response) {
    try {
      const { ativo } = req.query;
      const filtro =
        ativo === 'true' ? true : ativo === 'false' ? false : undefined;
      const data = await CartaoCreditoService.listar(filtro);
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao listar cartões:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar cartões de crédito',
      });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const cartao = await CartaoCreditoService.buscarPorId(req.params.id);
      if (!cartao) {
        return res.status(404).json({ success: false, message: 'Cartão não encontrado' });
      }
      return res.json({ success: true, data: cartao });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar cartão',
      });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const data = await CartaoCreditoService.criar(req.body);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao criar cartão:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar cartão de crédito',
      });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const data = await CartaoCreditoService.atualizar(req.params.id, req.body);
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao atualizar cartão:', error);
      const status = error.message?.includes('não encontrado') ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erro ao atualizar cartão',
      });
    }
  },

  async excluir(req: Request, res: Response) {
    try {
      const data = await CartaoCreditoService.excluir(req.params.id);
      return res.json({ success: true, data, message: 'Cartão removido/inativado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao excluir cartão:', error);
      const status = error.message?.includes('não encontrado') ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erro ao excluir cartão',
      });
    }
  },
};
