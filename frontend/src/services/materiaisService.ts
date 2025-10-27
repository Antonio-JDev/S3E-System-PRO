import { apiService } from './api';

export interface Material {
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  categoria?: string;
  fornecedorId?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movimentacao {
  id: number;
  materialId: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  observacao?: string;
  usuarioId: number;
  createdAt: string;
}

export interface CreateMaterialDto {
  codigo: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  categoria?: string;
  fornecedorId?: number;
}

export interface UpdateMaterialDto {
  codigo?: string;
  descricao?: string;
  unidade?: string;
  precoUnitario?: number;
  quantidadeEstoque?: number;
  estoqueMinimo?: number;
  categoria?: string;
  fornecedorId?: number;
  ativo?: boolean;
}

export interface RegistrarMovimentacaoDto {
  materialId: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  observacao?: string;
}

class MateriaisService {
  /**
   * Listar todos os materiais
   */
  async listarMateriais(params?: {
    search?: string;
    categoria?: string;
    ativo?: boolean;
  }) {
    return apiService.get<Material[]>('/api/materiais', params);
  }

  /**
   * Buscar material por ID
   */
  async buscarMaterialPorId(id: number) {
    return apiService.get<Material>(`/api/materiais/${id}`);
  }

  /**
   * Criar novo material
   */
  async criarMaterial(data: CreateMaterialDto) {
    return apiService.post<Material>('/api/materiais', data);
  }

  /**
   * Atualizar material
   */
  async atualizarMaterial(id: number, data: UpdateMaterialDto) {
    return apiService.put<Material>(`/api/materiais/${id}`, data);
  }

  /**
   * Deletar material
   */
  async deletarMaterial(id: number) {
    return apiService.delete(`/api/materiais/${id}`);
  }

  /**
   * Registrar movimentação de estoque
   */
  async registrarMovimentacao(data: RegistrarMovimentacaoDto) {
    return apiService.post<Movimentacao>('/api/materiais/movimentacao', data);
  }

  /**
   * Listar movimentações de estoque
   */
  async listarMovimentacoes(params?: {
    materialId?: number;
    tipo?: 'ENTRADA' | 'SAIDA';
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Movimentacao[]>('/api/materiais/movimentacoes/historico', params);
  }
}

export const materiaisService = new MateriaisService();
