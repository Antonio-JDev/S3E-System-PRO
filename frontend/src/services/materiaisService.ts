import { apiService } from './api';

export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco: number;
  estoque: number;
  estoqueMinimo: number;
  categoria?: string;
  fornecedorId?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movimentacao {
  id: string;
  materialId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivoMovimentacao: string;
  observacoes?: string;
  usuarioId?: string;
  material?: Material;
  createdAt: string;
}

class MateriaisService {
  /**
   * Listar todos os materiais
   */
  async getMateriais(params?: {
    categoria?: string;
    ativo?: boolean;
    busca?: string;
  }) {
    return apiService.get<Material[]>('/api/materiais', params);
  }

  /**
   * Buscar material por ID
   */
  async getMaterialById(id: string) {
    return apiService.get<Material>(`/api/materiais/${id}`);
  }

  /**
   * Criar novo material
   */
  async createMaterial(data: {
    codigo: string;
    descricao: string;
    unidade: string;
    preco: number;
    estoque: number;
    estoqueMinimo: number;
    categoria?: string;
    fornecedorId?: string;
  }) {
    return apiService.post<Material>('/api/materiais', data);
  }

  /**
   * Atualizar material
   */
  async updateMaterial(id: string, data: Partial<Material>) {
    return apiService.put<Material>(`/api/materiais/${id}`, data);
  }

  /**
   * Deletar material
   */
  async deleteMaterial(id: string) {
    return apiService.delete<void>(`/api/materiais/${id}`);
  }

  /**
   * Registrar movimentação de estoque
   */
  async registrarMovimentacao(data: {
    materialId: string;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivoMovimentacao: string;
    observacoes?: string;
  }) {
    return apiService.post<Movimentacao>('/api/materiais/movimentacao', data);
  }

  /**
   * Buscar histórico de movimentações
   */
  async getMovimentacoes(params?: {
    materialId?: string;
    tipo?: 'ENTRADA' | 'SAIDA';
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Movimentacao[]>('/api/materiais/movimentacoes/historico', params);
  }
}

export const materiaisService = new MateriaisService();
