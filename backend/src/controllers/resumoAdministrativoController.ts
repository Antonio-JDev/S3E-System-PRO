import { Request, Response } from 'express';
import { ResumoAdministrativoService } from '../services/resumoAdministrativo.service';

export class ResumoAdministrativoController {
  /**
   * GET /api/resumo-administrativo/completo
   * Resumo administrativo completo com todas as métricas
   */
  static async getResumoCompleto(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getResumoAdministrativoCompleto(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar resumo administrativo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar resumo administrativo',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/lucro-material
   * Lucro mensal por venda de material
   */
  static async getLucroMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getLucroPorMaterial(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar lucro por material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar lucro por material',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/lucro-servico
   * Lucro por venda de serviço
   */
  static async getLucroServico(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getLucroPorServico(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar lucro por serviço:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar lucro por serviço',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/bdi-orcamentos
   * Resumo de arrecadação do BDI por cada orçamento
   */
  static async getBDIOrcamentos(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getBDIPorOrcamento(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar BDI por orçamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar BDI por orçamento',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/lucro-mao-de-obra
   * Resumo do lucro por mão de obra (serviço)
   */
  static async getLucroMaoDeObra(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getLucroMaoDeObra(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar lucro por mão de obra:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar lucro por mão de obra',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/resumo-mensal
   * Resumo mensal consolidado
   */
  static async getResumoMensal(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)',
        });
        return;
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);
      fim.setHours(23, 59, 59, 999);

      const resultado = await ResumoAdministrativoService.getResumoMensal(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar resumo mensal:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar resumo mensal',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/resumo-administrativo/evolucao-financeira
   * Evolução financeira da empresa (mensal, 6 meses, anual)
   */
  static async getEvolucaoFinanceira(req: Request, res: Response): Promise<void> {
    try {
      const { periodo = 'mensal' } = req.query;

      const hoje = new Date();
      let dataInicio: Date;
      let dataFim = hoje;

      switch (periodo) {
        case 'mensal':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        case '6meses':
          dataInicio = new Date(hoje);
          dataInicio.setMonth(dataInicio.getMonth() - 6);
          break;
        case 'anual':
          dataInicio = new Date(hoje.getFullYear(), 0, 1);
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      }

      const resultado = await ResumoAdministrativoService.getEvolucaoFinanceira(
        dataInicio,
        dataFim,
        periodo as 'mensal' | '6meses' | 'anual'
      );

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar evolução financeira:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar evolução financeira',
        message: error.message,
      });
    }
  }
}
