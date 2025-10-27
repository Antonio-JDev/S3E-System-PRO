import { apiService } from './api';

export interface ContaReceber {
  id: string;
  vendaId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  observacoes?: string;
}

export interface Venda {
  id: string;
  orcamentoId: string;
  clienteId: string;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  dataVenda: string;
  status: 'Ativa' | 'Cancelada' | 'Finalizada';
  formaPagamento: string;
  numeroParcelas: number;
  observacoes?: string;
  contasReceber?: ContaReceber[];
  orcamento?: any;
  cliente?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardVendas {
  vendasMes: number;
  receitaMes: number;
  contasReceber: number;
  contasAtrasadas: number;
  ticketMedio: number;
  vendasPorPeriodo: Array<{
    periodo: string;
    total: number;
  }>;
  contasPorStatus: Array<{
    status: string;
    quantidade: number;
    valor: number;
  }>;
}

export interface VerificacaoEstoque {
  disponivel: boolean;
  itensIndisponiveis: Array<{
    materialId: string;
    material: string;
    necessario: number;
    disponivel: number;
    faltando: number;
  }>;
}

class VendasService {
  /**
   * Buscar dashboard de vendas
   */
  async getDashboard() {
    return apiService.get<DashboardVendas>('/api/vendas/dashboard');
  }

  /**
   * Verificar disponibilidade de estoque para orçamento
   */
  async verificarEstoque(orcamentoId: string) {
    return apiService.get<VerificacaoEstoque>(`/api/vendas/estoque/${orcamentoId}`);
  }

  /**
   * Listar vendas com paginação
   */
  async listarVendas(params?: {
    page?: number;
    limit?: number;
    status?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<{
      vendas: Venda[];
      total: number;
      page: number;
      totalPages: number;
    }>('/api/vendas', params);
  }

  /**
   * Buscar venda específica
   */
  async buscarVenda(id: string) {
    return apiService.get<Venda>(`/api/vendas/${id}`);
  }

  /**
   * Realizar nova venda
   */
  async realizarVenda(data: {
    orcamentoId: string;
    clienteId: string;
    formaPagamento: string;
    numeroParcelas: number;
    dataVencimentoPrimeiraParcela: string;
    observacoes?: string;
  }) {
    return apiService.post<Venda>('/api/vendas/realizar', data);
  }

  /**
   * Cancelar venda
   */
  async cancelarVenda(id: string, motivo?: string) {
    return apiService.put<Venda>(`/api/vendas/${id}/cancelar`, { motivo });
  }

  /**
   * Pagar conta a receber
   */
  async pagarConta(id: string, data: {
    dataPagamento: string;
    valorPago: number;
    observacoes?: string;
  }) {
    return apiService.put<ContaReceber>(`/api/vendas/contas/${id}/pagar`, data);
  }
}

export const vendasService = new VendasService();
