import { apiService } from './api';

export interface ContaPagar {
  id: string;
  fornecedorId: string;
  compraId?: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  valorPago?: number;
  status: 'pendente' | 'paga' | 'atrasada' | 'cancelada';
  formaPagamento?: string;
  observacoes?: string;
  numeroParcela?: number;
  totalParcelas?: number;
  fornecedor?: any;
  compra?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContaData {
  fornecedorId: string;
  compraId?: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  observacoes?: string;
}

export interface CreateContasParceladasData {
  fornecedorId: string;
  compraId?: string;
  descricao: string;
  valorTotal: number;
  numeroParcelas: number;
  dataVencimentoPrimeiraParcela: string;
  observacoes?: string;
}

export interface PagarContaData {
  dataPagamento: string;
  valorPago: number;
  formaPagamento: string;
  observacoes?: string;
}

export interface UpdateVencimentoData {
  dataVencimento: string;
  observacoes?: string;
}

class ContasPagarService {
  async criarConta(data: CreateContaData) {
    return apiService.post<ContaPagar>('/api/contas-pagar', data);
  }

  async criarContasParceladas(data: CreateContasParceladasData) {
    return apiService.post<ContaPagar[]>('/api/contas-pagar/parceladas', data);
  }

  async listarContas(params?: {
    fornecedorId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<ContaPagar[]>('/api/contas-pagar', params);
  }

  async buscarConta(id: string) {
    return apiService.get<ContaPagar>(`/api/contas-pagar/${id}`);
  }

  async pagarConta(id: string, data: PagarContaData) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/pagar`, data);
  }

  async cancelarConta(id: string, observacoes?: string) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/cancelar`, { observacoes });
  }

  async atualizarVencimento(id: string, data: UpdateVencimentoData) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/vencimento`, data);
  }

  async getContasEmAtraso() {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/atrasadas');
  }

  async getContasAVencer(dias: number = 7) {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/a-vencer', { dias });
  }
}

export const contasPagarService = new ContasPagarService();
