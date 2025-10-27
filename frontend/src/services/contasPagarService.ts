import { apiService } from './api';

export interface ContaPagar {
  id: number;
  fornecedorId: number;
  compraId?: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA';
  categoria: string;
  formaPagamento?: string;
  observacao?: string;
  numeroParcela?: number;
  totalParcelas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContaDto {
  fornecedorId: number;
  compraId?: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
  observacao?: string;
}

export interface CreateContasParceladasDto {
  fornecedorId: number;
  compraId?: number;
  descricao: string;
  valorTotal: number;
  numeroParcelas: number;
  dataVencimentoPrimeiraParcela: string;
  categoria: string;
  observacao?: string;
}

export interface PagarContaDto {
  dataPagamento: string;
  formaPagamento: string;
  observacao?: string;
}

export interface AtualizarVencimentoDto {
  novaDataVencimento: string;
  observacao?: string;
}

class ContasPagarService {
  /**
   * Criar conta a pagar única
   */
  async criarConta(data: CreateContaDto) {
    return apiService.post<ContaPagar>('/api/contas-pagar', data);
  }

  /**
   * Criar contas a pagar parceladas
   */
  async criarContasParceladas(data: CreateContasParceladasDto) {
    return apiService.post<ContaPagar[]>('/api/contas-pagar/parceladas', data);
  }

  /**
   * Listar contas a pagar
   */
  async listarContas(params?: {
    fornecedorId?: number;
    status?: string;
    categoria?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<ContaPagar[]>('/api/contas-pagar', params);
  }

  /**
   * Buscar conta específica
   */
  async buscarConta(id: number) {
    return apiService.get<ContaPagar>(`/api/contas-pagar/${id}`);
  }

  /**
   * Marcar conta como paga
   */
  async pagarConta(id: number, data: PagarContaDto) {
    return apiService.put<ContaPagar>(`/api/contas-pagar/${id}/pagar`, data);
  }

  /**
   * Cancelar conta
   */
  async cancelarConta(id: number, observacao?: string) {
    return apiService.put(`/api/contas-pagar/${id}/cancelar`, { observacao });
  }

  /**
   * Atualizar vencimento
   */
  async atualizarVencimento(id: number, data: AtualizarVencimentoDto) {
    return apiService.put(`/api/contas-pagar/${id}/vencimento`, data);
  }

  /**
   * Buscar contas em atraso
   */
  async getContasEmAtraso() {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/atrasadas');
  }

  /**
   * Buscar contas a vencer
   */
  async getContasAVencer(dias: number = 7) {
    return apiService.get<ContaPagar[]>('/api/contas-pagar/alertas/a-vencer', { dias });
  }
}

export const contasPagarService = new ContasPagarService();
