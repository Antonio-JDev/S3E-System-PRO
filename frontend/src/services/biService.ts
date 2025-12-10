import { axiosApiService } from './axiosApi';

export interface InvestimentosProdutos {
  total: number;
  porMes: Array<{ mes: string; valor: number }>;
}

export interface GastoFornecedor {
  fornecedorId: string;
  fornecedorNome: string;
  total: number;
  quantidadeCompras: number;
}

export interface CustosQuadros {
  total: number;
  quantidade: number;
  media: number;
}

export interface LucrosQuadros {
  total: number;
  quantidade: number;
  media: number;
  margemMedia: number;
}

export interface VendasStats {
  quantidade: number;
  valorTotal: number;
  media: number;
}

export interface MarkupItem {
  tipo: 'MATERIAL' | 'KIT' | 'QUADRO_PRONTO' | 'SERVICO' | 'COTACAO';
  markupMedio: number;
  quantidade: number;
}

export interface EvolucaoOrcamentosPorServico {
  data: string;
  [key: string]: string | number;
}

export interface GastosFixos {
  totalMensal: number;
  totalAnual: number;
  porCategoria: Record<string, number>;
  evolucaoMensal: Array<{ mes: string; valor: number }>;
}

export interface ResumoGeral {
  investimentos: InvestimentosProdutos;
  gastosFornecedor: GastoFornecedor[];
  custosQuadros: CustosQuadros;
  lucrosQuadros: LucrosQuadros;
  vendas: VendasStats;
  markupItens: { porTipo: MarkupItem[] };
  evolucaoOrcamentosPorServico: EvolucaoOrcamentosPorServico[];
  gastosFixos: GastosFixos;
}

export interface DashboardMetrics {
  // Métricas principais
  vendasTotal: number; // Receita Bruta
  cpv: number; // Custo dos Produtos Vendidos
  margemBruta: number; // Lucro Bruto (Vendas Total - CPV)
  custosFixosTotal: number; // Total de custos fixos no período
  
  // Dados para gráficos
  investimentosPorMes: Array<{ mes: string; cpv: number }>; // CPV por mês
  gastosPorFornecedorTop10: Array<{ nomeFornecedor: string; valorGasto: number }>; // Top 10 fornecedores
}

export interface BIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class BIService {
  /**
   * Busca investimentos em produtos (compras) por período
   */
  async getInvestimentosProdutos(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<InvestimentosProdutos>> {
    try {
      const response = await axiosApiService.get('/api/bi/investimentos-produtos', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar investimentos em produtos:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar investimentos em produtos',
      };
    }
  }

  /**
   * Busca gastos agrupados por fornecedor
   */
  async getGastosFornecedor(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<GastoFornecedor[]>> {
    try {
      const response = await axiosApiService.get('/api/bi/gastos-fornecedor', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar gastos por fornecedor:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar gastos por fornecedor',
      };
    }
  }

  /**
   * Busca custos de montagem de quadros
   */
  async getCustosQuadros(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<CustosQuadros>> {
    try {
      const response = await axiosApiService.get('/api/bi/custos-quadros', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar custos de quadros:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar custos de quadros',
      };
    }
  }

  /**
   * Busca lucros por montagem de quadros
   */
  async getLucrosQuadros(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<LucrosQuadros>> {
    try {
      const response = await axiosApiService.get('/api/bi/lucros-quadros', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar lucros de quadros:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar lucros de quadros',
      };
    }
  }

  /**
   * Busca estatísticas de vendas
   */
  async getVendas(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<VendasStats>> {
    try {
      const response = await axiosApiService.get('/api/bi/vendas', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar vendas:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar vendas',
      };
    }
  }

  /**
   * Busca markup % por tipo de item
   */
  async getMarkupItens(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<{ porTipo: MarkupItem[] }>> {
    try {
      const response = await axiosApiService.get('/api/bi/markup-itens', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar markup de itens:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar markup de itens',
      };
    }
  }

  /**
   * Busca evolução de orçamentos por tipo de serviço
   */
  async getEvolucaoOrcamentosServicos(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<EvolucaoOrcamentosPorServico[]>> {
    try {
      const response = await axiosApiService.get('/api/bi/evolucao-orcamentos-servicos', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar evolução de orçamentos por serviço:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar evolução de orçamentos por serviço',
      };
    }
  }

  /**
   * Busca gastos fixos no período
   */
  async getGastosFixos(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<GastosFixos>> {
    try {
      const response = await axiosApiService.get('/api/bi/gastos-fixos', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar gastos fixos:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar gastos fixos',
      };
    }
  }

  /**
   * Busca resumo consolidado de todas as métricas
   */
  async getResumoGeral(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<ResumoGeral>> {
    try {
      const response = await axiosApiService.get('/api/bi/resumo-geral', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar resumo geral:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar resumo geral',
      };
    }
  }

  /**
   * Busca métricas principais do dashboard: Vendas Total, CPV, Margem Bruta, Custos Fixos
   * Inclui dados para gráficos: Investimentos por Mês e Gastos por Fornecedor Top 10
   */
  async getDashboardMetrics(
    dataInicio: string,
    dataFim: string
  ): Promise<BIServiceResponse<DashboardMetrics>> {
    try {
      const response = await axiosApiService.get('/api/bi/dashboard', {
        dataInicio,
        dataFim,
      });
      return { success: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erro ao buscar métricas do dashboard:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao buscar métricas do dashboard',
      };
    }
  }
}

export const biService = new BIService();

