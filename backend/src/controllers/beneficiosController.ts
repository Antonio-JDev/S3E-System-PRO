import { Request, Response } from 'express';
import { BeneficiosService } from '../services/beneficios.service';

export const BeneficiosController = {
  async listar(req: Request, res: Response) {
    try {
      const beneficios = await BeneficiosService.listar();
      return res.json({ success: true, data: beneficios });
    } catch (error: any) {
      console.error('❌ Erro ao listar benefícios:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar benefícios',
        error: error.message,
      });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const beneficio = await BeneficiosService.buscar(id);
      if (!beneficio) {
        return res.status(404).json({
          success: false,
          message: 'Benefício não encontrado',
        });
      }
      return res.json({ success: true, data: beneficio });
    } catch (error: any) {
      console.error('❌ Erro ao buscar benefício:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar benefício',
        error: error.message,
      });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const { nome, valorPadrao, ativo } = req.body;
      if (!nome || valorPadrao === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Campos nome e valorPadrao são obrigatórios',
        });
      }

      const beneficio = await BeneficiosService.criar({
        nome,
        valorPadrao: Number(valorPadrao),
        ativo,
      });

      return res.status(201).json({ success: true, data: beneficio });
    } catch (error: any) {
      console.error('❌ Erro ao criar benefício:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar benefício',
        error: error.message,
      });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, valorPadrao, ativo } = req.body;

      const beneficio = await BeneficiosService.atualizar(id, {
        nome,
        valorPadrao: valorPadrao !== undefined ? Number(valorPadrao) : undefined,
        ativo,
      });

      return res.json({ success: true, data: beneficio });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar benefício:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar benefício',
        error: error.message,
      });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await BeneficiosService.deletar(id);
      return res.json({ success: true, message: 'Benefício excluído com sucesso' });
    } catch (error: any) {
      console.error('❌ Erro ao excluir benefício:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao excluir benefício',
        error: error.message,
      });
    }
  },
};

