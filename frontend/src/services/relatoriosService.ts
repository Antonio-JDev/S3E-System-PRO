import { apiService } from './api';

export interface DashboardCompleto {
  vendasMes: number;
  receitaMes: number;
  despesasMes: number;
  lucroMes: number;
  contasReceberPendentes: number;
  contasPagarPendentes: number;
  projetosAtivos: number;
  ticketMedioVendas: number;
  alertas: Array<{
    tipo: string;
    mensagem: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
}

export interface DadosFinanceiros {
  periodo: string;
  receitas: number;
  despesas: number;
  lucro: number;
  receitasAcumuladas: number;
  despesasAcumuladas: number;
  lucroAcumulado: number;
}

export interface ResumoFinanceiro {
  receitaTotal: number;
  despesaTotal: number;
  lucroTotal: number;
  margemLucro: number;
  contasReceberPendentes: number;
  contasPagarPendentes: number;
  fluxoCaixaProjetado: number;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export interface EstatisticasVendas {
  totalVendas: number;
  ticketMedio: number;
  vendasPorPeriodo: Array<{
    periodo: string;
    quantidade: number;
    valor: number;
  }>;
  vendasPorStatus: Array<{
    status: string;
    quantidade: number;
    valor: number;
  }>;
  conversaoOrcamentos: {
    total: number;
    aprovados: number;
    convertidos: number;
    taxaConversao: number;
  };
}

export interface TopCliente {
  id: string;
  nome: string;
  totalCompras: number;
  valorTotal: number;
  ultimaCompra: string;
  ticketMedio: number;
}

class RelatoriosService {
  /**
   * Dashboard completo (admin e gerentes)
   */
  async getDashboardCompleto() {
    return apiService.get<DashboardCompleto>('/api/relatorios/dashboard');
  }

  /**
   * Dados financeiros mensais para gráficos
   */
  async getDadosFinanceiros(params?: {
    dataInicio?: string;
    dataFim?: string;
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
