import { Request, Response } from 'express';
import { BIService } from '../services/bi.service';

export class BIController {
  /**
   * GET /api/bi/investimentos-produtos
   * Investimentos em produtos (compras) por período
   */
  static async getInvestimentosProdutos(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999); // Incluir o dia inteiro

      const resultado = await BIService.getInvestimentosProdutos(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar investimentos em produtos:', error);
      res.status(500).json({
        error: 'Erro ao buscar investimentos em produtos',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/gastos-fornecedor
   * Gastos agrupados por fornecedor
   */
  static async getGastosFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getGastosPorFornecedor(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar gastos por fornecedor:', error);
      res.status(500).json({
        error: 'Erro ao buscar gastos por fornecedor',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/custos-quadros
   * Custos de montagem de quadros
   */
  static async getCustosQuadros(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getCustosQuadros(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar custos de quadros:', error);
      res.status(500).json({
        error: 'Erro ao buscar custos de quadros',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/lucros-quadros
   * Lucros por montagem de quadros
   */
  static async getLucrosQuadros(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getLucrosQuadros(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar lucros de quadros:', error);
      res.status(500).json({
        error: 'Erro ao buscar lucros de quadros',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/vendas
   * Estatísticas de vendas
   */
  static async getVendas(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getVendas(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar vendas:', error);
      res.status(500).json({
        error: 'Erro ao buscar vendas',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/markup-itens
   * Markup % por tipo de item
   */
  static async getMarkupItens(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getMarkupItens(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar markup de itens:', error);
      res.status(500).json({
        error: 'Erro ao buscar markup de itens',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/resumo-geral
   * Resumo consolidado de todas as métricas
   */
  static async getResumoGeral(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await BIService.getResumoGeral(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar resumo geral:', error);
      res.status(500).json({
        error: 'Erro ao buscar resumo geral',
        message: error.message,
      });
    }
  }
}

