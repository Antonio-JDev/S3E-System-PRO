import { apiService } from './api';

export interface ItemOrcamento {
  id: string;
  materialId: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  material?: any;
}

export interface Orcamento {
  id: string;
  clienteId: string;
  projetoId?: string;
  valorTotal: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Convertido';
  validade: string;
  observacoes?: string;
  itens?: ItemOrcamento[];
  cliente?: any;
  projeto?: any;
  createdAt: string;
  updatedAt: string;
}

class OrcamentosService {
  /**
   * Listar todos os orçamentos
   */
  async getOrcamentos(params?: {
    status?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Orcamento[]>('/api/orcamentos', params);
  }

  /**
   * Buscar orçamento por ID
   */
  async getOrcamentoById(id: string) {
    return apiService.get<Orcamento>(`/api/orcamentos/${id}`);
  }

  /**
   * Criar novo orçamento
   */
  async createOrcamento(data: {
    clienteId: string;
    projetoId?: string;
    validade: string;
    observacoes?: string;
    itens: Array<{
      materialId: string;
      quantidade: number;
      precoUnitario: number;
    }>;
  }) {
    return apiService.post<Orcamento>('/api/orcamentos', data);
  }

  /**
   * Atualizar status do orçamento
   */
  async updateOrcamentoStatus(id: string, status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Convertido') {
    return apiService.put<Orcamento>(`/api/orcamentos/${id}/status`, { status });
  }
}

export const orcamentosService = new OrcamentosService();
