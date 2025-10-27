import { apiService } from './api';

export interface ContaPagar {
  id: string;
  fornecedorId: string;
  compraId?: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  categoria: string;
  numeroParcela?: number;
  totalParcelas?: number;
  observacoes?: string;
  fornecedor?: any;
  compra?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ContasParceladas {
  contas: ContaPagar[];
  totalParcelas: number;
  valorTotal: number;
}

class ContasPagarService {
  /**
   * Criar conta a pagar única
   */
  async criarConta(data: {
    fornecedorId: string;
    compraId?: string;
    descricao: string;
    valor: number;
    dataVencimento: string;
    categoria: string;
    observacoes?: string;
  }) {
    return apiService.post<ContaPagar>('/api/contas-pagar', data);
  }

  /**
   * Criar contas a pagar parceladas
   */
  async criarContasParceladas(data: {
    fornecedorId: string;
    compraId?: string;
    descricao: string;
    valorTotal: number;
    numeroParcelas: number;
    dataVencimentoPrimeiraParcela: string;
    categoria: string;
    observacoes?: string;
  }) {
    return apiService.post<ContasParceladas>('/api/contas-pagar/parceladas', data);
  }

  /**
   * Listar contas a pagar com filtros
   */
  async listarContas(params?: {
    status?: string;
    fornecedorId?: string;
    categoria?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<{
      contas: ContaPagar[];
      total: number;
      page: number;
      totalPages: number;
    }>('/api/contas-pagar', params);
  }

  /**
   * Buscar conta específica
   */
  async buscarConta(id: string) {
    return apiService.get<ContaPagar>(`/api/contas-pagar/${id}`);
  }

  /**
   * Marcar conta como paga
   */
  async pagarConta(id: string, data: {
    dataPagamento: string;
    observacoes?: string;
  }) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/pagar`, data);
  }

  /**
   * Cancelar conta
   */
  async cancelarConta(id: string, motivo?: string) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/cancelar`, { motivo });
  }

  /**
   * Atualizar vencimento da conta
   */
  async atualizarVencimento(id: string, novaDataVencimento: string, motivo?: string) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/vencimento`, {
      novaDataVencimento,
      motivo
    });
  }

  /**
   * Buscar contas em atraso
   */
  async getContasEmAtraso() {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/atrasadas');
  }

  /**
   * Buscar contas a vencer (próximos dias)
   */
  async getContasAVencer(dias: number = 7) {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/a-vencer', { dias });
  }
}

export const contasPagarService = new ContasPagarService();
