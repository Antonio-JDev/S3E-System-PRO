import { apiService } from './api';

export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo?: number;
  categoria?: string;
  fornecedorPrincipalId?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialData {
  codigo: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo?: number;
  categoria?: string;
  fornecedorPrincipalId?: string;
}

export interface UpdateMaterialData extends Partial<CreateMaterialData> {}

export interface MovimentacaoData {
  materialId: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo?: string;
  observacoes?: string;
}

export interface Movimentacao {
  id: string;
  materialId: string;
  tipo: string;
  quantidade: number;
  motivo?: string;
  observacoes?: string;
  createdAt: string;
  material?: Material;
}

class MateriaisService {
  async getMateriais(params?: {
    search?: string;
    categoria?: string;
    ativo?: boolean;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<Material[]>('/api/materiais', params);
  }

  async getMaterialById(id: string) {
    return apiService.get<Material>(`/api/materiais/${id}`);
  }

  async createMaterial(data: CreateMaterialData) {
    return apiService.post<Material>('/api/materiais', data);
  }

  async updateMaterial(id: string, data: UpdateMaterialData) {
    return apiService.put<Material>(`/api/materiais/${id}`, data);
  }

  async deleteMaterial(id: string) {
    return apiService.delete<void>(`/api/materiais/${id}`);
  }

  async registrarMovimentacao(data: MovimentacaoData) {
    return apiService.post<Movimentacao>('/api/materiais/movimentacao', data);
  }

  async getMovimentacoes(params?: {
    materialId?: string;
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Movimentacao[]>('/api/materiais/movimentacoes/historico', params);
  }
}

export const materiaisService = new MateriaisService();
