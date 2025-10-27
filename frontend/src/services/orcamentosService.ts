import { apiService } from './api';

export interface Orcamento {
  id: string;
  clienteId: string;
  numero: string;
  data: string;
  validade: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado';
  valorTotal: number;
  desconto?: number;
  observacoes?: string;
  itens?: ItemOrcamento[];
  cliente?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ItemOrcamento {
  id: string;
  orcamentoId: string;
  materialId?: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  material?: any;
}

export interface CreateOrcamentoData {
  clienteId: string;
  numero?: string;
  data: string;
  validade: string;
  desconto?: number;
  observacoes?: string;
  itens: {
    materialId?: string;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

export interface UpdateStatusData {
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado';
}

class OrcamentosService {
  async getOrcamentos(params?: {
    clienteId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<Orcamento[]>('/api/orcamentos', params);
  }

  async getOrcamentoById(id: string) {
    return apiService.get<Orcamento>(`/api/orcamentos/${id}`);
  }

  async createOrcamento(data: CreateOrcamentoData) {
    return apiService.post<Orcamento>('/api/orcamentos', data);
  }

  async updateOrcamentoStatus(id: string, data: UpdateStatusData) {
    return apiService.patch<Orcamento>(`/api/orcamentos/${id}/status`, data);
  }
}

export const orcamentosService = new OrcamentosService();
