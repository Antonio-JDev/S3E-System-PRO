import { apiService } from './api';

export interface DashboardCompleto {
  estatisticas: {
    totalVendas: number;
    totalClientes: number;
    totalProjetos: number;
    estoqueValor: number;
  };
  vendasMes: {
    valor: number;
    quantidade: number;
    crescimento: number;
  };
  contasPagar: {
    total: number;
    atrasadas: number;
    aVencer: number;
  };
  contasReceber: {
    total: number;
    atrasadas: number;
    aVencer: number;
  };
  projetos: {
    emAndamento: number;
    concluidos: number;
    atrasados: number;
  };
}

export interface DadosFinanceiros {
  periodo: string;
  receitas: number;
  despesas: number;
  lucro: number;
  margemLucro: number;
}

export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
  contasReceber: {
    total: number;
    recebidas: number;
    pendentes: number;
    atrasadas: number;
  };
  contasPagar: {
    total: number;
    pagas: number;
    pendentes: number;
    atrasadas: number;
  };
}

export interface EstatisticasVendas {
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
  vendasPorMes: {
    mes: string;
    quantidade: number;
    valor: number;
  }[];
  vendasPorCategoria: {
    categoria: string;
    quantidade: number;
    valor: number;
  }[];
}

export interface TopCliente {
  id: number;
  nome: string;
  totalCompras: number;
  valorTotal: number;
  ultimaCompra: string;
}

class RelatoriosService {
  /**
   * Dashboard completo
   */
  async getDashboardCompleto(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<DashboardCompleto>('/api/relatorios/dashboard', params);
  }

  /**
   * Dados financeiros mensais
   */
  async getDadosFinanceiros(params?: {
    ano?: number;
    meses?: number;
  }) {
    return apiService.get<DadosFinanceiros[]>('/api/relatorios/financeiro', params);
  }

  /**
   * Resumo financeiro geral
   */
  async getResumoFinanceiro(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<ResumoFinanceiro>('/api/relatorios/financeiro/resumo', params);
  }

  /**
   * Estatísticas de vendas
   */
  async getEstatisticasVendas(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<EstatisticasVendas>('/api/relatorios/vendas', params);
  }

  /**
   * Top clientes
   */
  async getTopClientes(params?: {
    limite?: number;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<TopCliente[]>('/api/relatorios/clientes/top', params);
  }
}

export const relatoriosService = new RelatoriosService();
