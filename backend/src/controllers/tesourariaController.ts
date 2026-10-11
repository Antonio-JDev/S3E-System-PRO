import { Request, Response } from 'express';
import * as TesourariaService from '../services/tesouraria.service';

function statusDoErro(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('não encontrad')) return 404;
  return 400;
}

export const TesourariaController = {
  async listarContas(req: Request, res: Response) {
    try {
      const ativo = req.query.ativo;
      const somenteAtivas = ativo === 'true' ? true : undefined;
      const data = await TesourariaService.listarContas(somenteAtivas);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Erro ao listar contas bancárias:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar contas bancárias',
      });
    }
  },

  async criarConta(req: Request, res: Response) {
    try {
      const data = await TesourariaService.criarConta(req.body);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('Erro ao criar conta bancária:', error);
      return res.status(statusDoErro(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar conta bancária',
      });
    }
  },

  async extratoConta(req: Request, res: Response) {
    try {
      const dataInicio = typeof req.query.dataInicio === 'string' ? req.query.dataInicio : undefined;
      const dataFim = typeof req.query.dataFim === 'string' ? req.query.dataFim : undefined;
      const data = await TesourariaService.extratoConta(req.params.id, dataInicio, dataFim);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Erro ao montar extrato da conta:', error);
      return res.status(statusDoErro(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao montar extrato da conta',
      });
    }
  },

  async definirAtivo(req: Request, res: Response) {
    try {
      const ativo = Boolean(req.body?.ativo);
      const data = await TesourariaService.definirAtivo(req.params.id, ativo);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Erro ao atualizar conta bancária:', error);
      return res.status(statusDoErro(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar conta bancária',
      });
    }
  },

  async criarTransferencia(req: Request, res: Response) {
    try {
      const data = await TesourariaService.criarTransferencia(req.body);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('Erro ao lançar transferência:', error);
      return res.status(statusDoErro(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao lançar transferência',
      });
    }
  },

  async estornarTransferencia(req: Request, res: Response) {
    try {
      const data = await TesourariaService.estornarTransferencia(req.params.id);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Erro ao estornar transferência:', error);
      return res.status(statusDoErro(error)).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao estornar transferência',
      });
    }
  },
};
