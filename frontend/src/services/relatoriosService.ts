import { apiService } from './api';

export interface DashboardCompleto {
  resumo: {
    totalVendas: number;
    totalRecebido: number;
    totalPendente: number;
    totalPagar: number;
    saldoAtual: number;
  };
  vendasRecentes: any[];
  contasReceberPendentes: any[];
  contasPagarPendentes: any[];
  alertas: {
    contasAtrasadas: number;
    contasVencer: number;
    estoquesBaixos: number;
  };
}

export interface DadosFinanceiros {
  periodo: string;
  receitas: number;
  despesas: number;
  saldo: number;
  graficoMensal: {
    mes: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }[];
}

export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
  contasReceberPendentes: number;
  contasPagarPendentes: number;
  ticketMedio: number;
}

export interface EstatisticasVendas {
  totalVendas: number;
  valorTotalVendas: number;
  ticketMedio: number;
  vendasPorMes: {
    mes: string;
    quantidade: number;
    valor: number;
  }[];
  produtosMaisVendidos: {
    produto: string;
    quantidade: number;
    valor: number;
  }[];
}

export interface TopCliente {
  id: string;
  nome: string;
  totalCompras: number;
  valorTotal: number;
  ultimaCompra: string;
}

class RelatoriosService {
  async getDashboardCompleto() {
    return apiService.get<DashboardCompleto>('/api/relatorios/dashboard');
  }

  async getDadosFinanceiros(params?: {
    dataInicio?: string;
    dataFim?: string;
    periodo?: 'mes' | 'ano';
  }) {
    return apiService.get<DadosFinanceiros>('/api/relatorios/financeiro', params);
  }

  async getResumoFinanceiro(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<ResumoFinanceiro>('/api/relatorios/financeiro/resumo', params);
  }

  async getEstatisticasVendas(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<EstatisticasVendas>('/api/relatorios/vendas', params);
  }

  async getTopClientes(params?: {
    limite?: number;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<TopCliente[]>('/api/relatorios/clientes/top', params);
  }
}

export const relatoriosService = new RelatoriosService();
