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
   * GET /api/bi/evolucao-orcamentos-servicos
   * Evolução de orçamentos por tipo de serviço
   */
  static async getEvolucaoOrcamentosServicos(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getEvolucaoOrcamentosPorServico(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar evolução de orçamentos por serviço:', error);
      res.status(500).json({
        error: 'Erro ao buscar evolução de orçamentos por serviço',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/gastos-fixos
   * Gastos fixos no período
   */
  static async getGastosFixos(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getGastosFixos(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar gastos fixos:', error);
      res.status(500).json({
        error: 'Erro ao buscar gastos fixos',
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

  /**
   * GET /api/bi/dashboard
   * Métricas principais do dashboard: Vendas Total, CPV, Margem Bruta, Custos Fixos
   * Inclui dados para gráficos: Investimentos por Mês e Gastos por Fornecedor Top 10
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getDashboardMetrics(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar métricas do dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar métricas do dashboard',
        message: error.message,
      });
    }
  }

  

  /**
   * GET /api/bi/orcamentos-por-status
   * Estatísticas de orçamentos por status (Aprovado, Pendente, Expirado, Declinado)
   */
  static async getOrcamentosPorStatus(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getEstatisticasOrcamentosPorStatus(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas de orçamentos por status:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas de orçamentos por status',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/orcamentos-por-tipo-servico-classificado
   * Evolução de orçamentos por tipo de serviço com classificação
   */
  static async getOrcamentosPorTipoServicoClassificado(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getEvolucaoOrcamentosPorTipoServicoClassificado(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar orçamentos por tipo de serviço classificado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar orçamentos por tipo de serviço classificado',
        message: error.message,
      });
    }
  }

  

  /**
   * GET /api/bi/vendas-compras-classificacao
   * Receita (orçamentos aprovados) vs compras por classificação no período
   */
  static async getVendasEComprasPorClassificacao(req: Request, res: Response): Promise<void> {
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

      const resultado = await BIService.getVendasEComprasPorClassificacao(inicio, fim);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Erro ao buscar vendas e compras por classificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar vendas e compras por classificação',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bi/materiais-mais-comprados-periodo?dataInicio=&dataFim= (ou ?dias=30|60)
   */
  static async getMateriaisMaisCompradosPeriodo(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim, dias: diasRaw } = req.query;

      let inicio: Date;
      let fim: Date;

      if (dataInicio && dataFim) {
        inicio = new Date(dataInicio as string);
        inicio.setHours(0, 0, 0, 0);
        fim = new Date(dataFim as string);
        fim.setHours(23, 59, 59, 999);
      } else {
        const dias = diasRaw === '60' ? 60 : 30;
        fim = new Date();
        fim.setHours(23, 59, 59, 999);
        inicio = new Date(fim);
        inicio.setDate(inicio.getDate() - dias);
        inicio.setHours(0, 0, 0, 0);
      }

      const materiais = await BIService.getMateriaisMaisComprados(inicio, fim, 25);

      res.json({
        success: true,
        data: {
          dataInicio: inicio.toISOString(),
          dataFim: fim.toISOString(),
          materiais,
        },
      });
    } catch (error: any) {
      console.error('Erro ao buscar materiais mais comprados (período):', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar materiais mais comprados',
        message: error.message,
      });
    }
  }

  static async getGastosCartaoCredito(req: Request, res: Response): Promise<void> {
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
      const resultado = await BIService.getGastosCartaoCredito(inicio, fim);
      res.json({ success: true, data: resultado });
    } catch (error: any) {
      console.error('Erro ao buscar gastos cartão:', error);
      res.status(500).json({
        error: 'Erro ao buscar gastos em cartão de crédito',
        message: error.message,
      });
    }
  }

  static async getMetodosPagamentoComparativo(req: Request, res: Response): Promise<void> {
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
      const resultado = await BIService.getMetodosPagamentoComparativo(inicio, fim);
      res.json({ success: true, data: resultado });
    } catch (error: any) {
      console.error('Erro ao buscar comparativo métodos:', error);
      res.status(500).json({
        error: 'Erro ao buscar comparativo de métodos de pagamento',
        message: error.message,
      });
    }
  }

  static async getEvolucaoFaturasCartao(req: Request, res: Response): Promise<void> {
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
      const resultado = await BIService.getEvolucaoFaturasCartao(inicio, fim);
      res.json({ success: true, data: resultado });
    } catch (error: any) {
      console.error('Erro ao buscar evolução faturas:', error);
      res.status(500).json({
        error: 'Erro ao buscar evolução de faturas de cartão',
        message: error.message,
      });
    }
  }
}

