import { Request, Response } from 'express';
import { FaturaCartaoService } from '../services/faturaCartao.service';

export const FaturaCartaoController = {
  async listar(req: Request, res: Response) {
    try {
      const cartaoCreditoId = req.query.cartaoCreditoId as string | undefined;
      const mesCompetencia = req.query.mesCompetencia
        ? Number(req.query.mesCompetencia)
        : undefined;
      const anoCompetencia = req.query.anoCompetencia
        ? Number(req.query.anoCompetencia)
        : undefined;
      const status = req.query.status as string | undefined;

      const data = await FaturaCartaoService.listarFaturas({
        cartaoCreditoId,
        mesCompetencia,
        anoCompetencia,
        status,
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao listar faturas:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar faturas',
      });
    }
  },

  async preview(req: Request, res: Response) {
    try {
      const cartaoCreditoId = String(req.query.cartaoCreditoId || '');
      const mesCompetencia = Number(req.query.mesCompetencia);
      const anoCompetencia = Number(req.query.anoCompetencia);

      if (!cartaoCreditoId || !mesCompetencia || !anoCompetencia) {
        return res.status(400).json({
          success: false,
          message: 'Informe cartaoCreditoId, mesCompetencia e anoCompetencia',
        });
      }

      const data = await FaturaCartaoService.preview(
        cartaoCreditoId,
        mesCompetencia,
        anoCompetencia
      );
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro no preview da fatura:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao gerar preview da fatura',
      });
    }
  },

  async gerarEPagar(req: Request, res: Response) {
    try {
      const {
        cartaoCreditoId,
        mesCompetencia,
        anoCompetencia,
        dataPagamento,
        observacoes,
      } = req.body || {};

      if (!cartaoCreditoId || !mesCompetencia || !anoCompetencia) {
        return res.status(400).json({
          success: false,
          message: 'Informe cartaoCreditoId, mesCompetencia e anoCompetencia',
        });
      }

      const data = await FaturaCartaoService.gerarEPagar({
        cartaoCreditoId,
        mesCompetencia: Number(mesCompetencia),
        anoCompetencia: Number(anoCompetencia),
        dataPagamento,
        observacoes,
      });

      return res.json({
        success: true,
        data,
        message: 'Fatura gerada e liquidada com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao gerar e pagar fatura:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao liquidar fatura do cartão',
      });
    }
  },
};
