import { apiService } from './api';

export interface Venda {
  id: number;
  orcamentoId: number;
  clienteId: number;
  dataVenda: string;
  valorTotal: number;
  desconto: number;
  valorFinal: number;
  status: 'ATIVA' | 'CANCELADA';
  observacao?: string;
  contasReceber?: ContaReceber[];
  createdAt: string;
  updatedAt: string;
}

export interface ContaReceber {
  id: number;
  vendaId: number;
  numeroParcela: number;
  totalParcelas: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA';
  formaPagamento?: string;
  observacao?: string;
}

export interface RealizarVendaDto {
  orcamentoId: number;
  dataVenda: string;
  desconto?: number;
  observacao?: string;
  parcelamento: {
    numeroParcelas: number;
    formaPagamento: string;
    dataVencimento: string;
  };
}

export interface PagarContaDto {
  dataPagamento: string;
  valorPago: number;
  formaPagamento: string;
  observacao?: string;
}

export interface DashboardFinanceiro {
  totalVendas: number;
  totalReceber: number;
  totalRecebido: number;
  contasAtrasadas: number;
  vendasMes: number;
  receitaMes: number;
}

class VendasService {
  /**
   * Buscar dashboard financeiro
   */
  async getDashboard(params?: {
    mes?: number;
    ano?: number;
  }) {
    return apiService.get<DashboardFinanceiro>('/api/vendas/dashboard', params);
  }

  /**
   * Verificar disponibilidade de estoque para orçamento
   */
  async verificarEstoque(orcamentoId: number) {
    return apiService.get(`/api/vendas/estoque/${orcamentoId}`);
  }

  /**
   * Listar vendas
   */
  async listarVendas(params?: {
    clienteId?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<Venda[]>('/api/vendas', params);
  }

  /**
   * Buscar venda por ID
   */
  async buscarVenda(id: number) {
    return apiService.get<Venda>(`/api/vendas/${id}`);
  }

  /**
   * Realizar nova venda
   */
  async realizarVenda(data: RealizarVendaDto) {
    return apiService.post<Venda>('/api/vendas/realizar', data);
  }

  /**
   * Cancelar venda
   */
  async cancelarVenda(id: number, observacao?: string) {
    return apiService.put(`/api/vendas/${id}/cancelar`, { observacao });
  }

  /**
   * Pagar conta a receber
   */
  async pagarConta(contaId: number, data: PagarContaDto) {
    return apiService.put(`/api/vendas/contas/${contaId}/pagar`, data);
  }
}

export const vendasService = new VendasService();
