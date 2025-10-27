import { apiService } from './api';

export interface Venda {
  id: string;
  orcamentoId: string;
  clienteId: string;
  dataVenda: string;
  valorTotal: number;
  status: 'ativa' | 'cancelada';
  observacoes?: string;
  contasReceber?: ContaReceber[];
  orcamento?: any;
  cliente?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ContaReceber {
  id: string;
  vendaId: string;
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
  status: 'pendente' | 'paga' | 'atrasada' | 'cancelada';
  dataPagamento?: string;
  valorPago?: number;
  formaPagamento?: string;
  observacoes?: string;
}

export interface RealizarVendaData {
  orcamentoId: string;
  dataVenda: string;
  observacoes?: string;
  parcelas: {
    numeroParcela: number;
    dataVencimento: string;
    valor: number;
  }[];
}

export interface PagarContaData {
  dataPagamento: string;
  valorPago: number;
  formaPagamento: string;
  observacoes?: string;
}

export interface DashboardVendas {
  totalVendas: number;
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  vendasPorPeriodo: any[];
  contasProximasVencer: ContaReceber[];
}

class VendasService {
  async getDashboard(params?: { dataInicio?: string; dataFim?: string }) {
    return apiService.get<DashboardVendas>('/api/vendas/dashboard', params);
  }

  async verificarEstoque(orcamentoId: string) {
    return apiService.get<any>(`/api/vendas/estoque/${orcamentoId}`);
  }

  async listarVendas(params?: {
    clienteId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<Venda[]>('/api/vendas', params);
  }

  async buscarVenda(id: string) {
    return apiService.get<Venda>(`/api/vendas/${id}`);
  }

  async realizarVenda(data: RealizarVendaData) {
    return apiService.post<Venda>('/api/vendas/realizar', data);
  }

  async cancelarVenda(id: string, observacoes?: string) {
    return apiService.put<Venda>(`/api/vendas/${id}/cancelar`, { observacoes });
  }

  async pagarConta(id: string, data: PagarContaData) {
    return apiService.put<ContaReceber>(`/api/vendas/contas/${id}/pagar`, data);
  }
}

export const vendasService = new VendasService();
