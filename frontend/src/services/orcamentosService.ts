import { apiService } from './api';

export interface Orcamento {
  id: number;
  numero: string;
  clienteId: number;
  projetoId?: number;
  dataEmissao: string;
  dataValidade: string;
  valorTotal: number;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
  observacao?: string;
  itens?: ItemOrcamento[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemOrcamento {
  id: number;
  orcamentoId: number;
  materialId?: number;
  servicoId?: number;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
}

export interface CreateOrcamentoDto {
  numero: string;
  clienteId: number;
  projetoId?: number;
  dataEmissao: string;
  dataValidade: string;
  observacao?: string;
  itens: {
    materialId?: number;
    servicoId?: number;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

export interface UpdateOrcamentoStatusDto {
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
  observacao?: string;
}

class OrcamentosService {
  /**
   * Listar todos os orçamentos
   */
  async listarOrcamentos(params?: {
    clienteId?: number;
    projetoId?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Orcamento[]>('/api/orcamentos', params);
  }

  /**
   * Buscar orçamento por ID
   */
  async buscarOrcamentoPorId(id: number) {
    return apiService.get<Orcamento>(`/api/orcamentos/${id}`);
  }

  /**
   * Criar novo orçamento
   */
  async criarOrcamento(data: CreateOrcamentoDto) {
    return apiService.post<Orcamento>('/api/orcamentos', data);
  }

  /**
   * Atualizar status do orçamento
   */
  async atualizarStatusOrcamento(id: number, data: UpdateOrcamentoStatusDto) {
    return apiService.patch<Orcamento>(`/api/orcamentos/${id}/status`, data);
  }
}

export const orcamentosService = new OrcamentosService();
