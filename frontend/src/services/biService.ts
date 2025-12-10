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

export interface ResumoGeral {
  investimentos: InvestimentosProdutos;
  gastosFornecedor: GastoFornecedor[];
  custosQuadros: CustosQuadros;
  lucrosQuadros: LucrosQuadros;
  vendas: VendasStats;
  markupItens: { porTipo: MarkupItem[] };
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar investimentos em produtos:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar investimentos em produtos',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar gastos por fornecedor:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar gastos por fornecedor',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar custos de quadros:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar custos de quadros',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar lucros de quadros:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar lucros de quadros',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar vendas:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar vendas',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar markup de itens:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar markup de itens',
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
        params: { dataInicio, dataFim },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Erro ao buscar resumo geral:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar resumo geral',
      };
    }
  }
}

export const biService = new BIService();

