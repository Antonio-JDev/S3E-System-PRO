import { apiService } from './api';

export interface Equipe {
  id: number;
  nome: string;
  responsavel: string;
  especialidade: string;
  capacidadeMaxima: number;
  membros?: MembroEquipe[];
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembroEquipe {
  id: number;
  equipeId: number;
  nome: string;
  funcao: string;
  contato?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipeDto {
  nome: string;
  responsavel: string;
  especialidade: string;
  capacidadeMaxima: number;
}

export interface UpdateEquipeDto {
  nome?: string;
  responsavel?: string;
  especialidade?: string;
  capacidadeMaxima?: number;
  ativa?: boolean;
}

export interface AddMembroDto {
  nome: string;
  funcao: string;
  contato?: string;
}

export interface EstatisticasEquipes {
  totalEquipes: number;
  equipesAtivas: number;
  totalMembros: number;
  membrosAtivos: number;
}

class EquipesService {
  /**
   * Listar todas as equipes
   */
  async listarEquipes(params?: {
    ativa?: boolean;
    especialidade?: string;
  }) {
    return apiService.get<Equipe[]>('/api/equipes', params);
  }

  /**
   * Buscar estatísticas das equipes
   */
  async getEstatisticas() {
    return apiService.get<EstatisticasEquipes>('/api/equipes/estatisticas');
  }

  /**
   * Buscar equipes disponíveis para alocação
   */
  async buscarEquipesDisponiveis(params?: {
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Equipe[]>('/api/equipes/disponiveis', params);
  }

  /**
   * Buscar equipe por ID
   */
  async buscarEquipePorId(id: number) {
    return apiService.get<Equipe>(`/api/equipes/${id}`);
  }

  /**
   * Criar nova equipe
   */
  async criarEquipe(data: CreateEquipeDto) {
    return apiService.post<Equipe>('/api/equipes', data);
  }

  /**
   * Atualizar equipe
   */
  async atualizarEquipe(id: number, data: UpdateEquipeDto) {
    return apiService.put<Equipe>(`/api/equipes/${id}`, data);
  }

  /**
   * Desativar equipe
   */
  async desativarEquipe(id: number) {
    return apiService.delete(`/api/equipes/${id}`);
  }

  /**
   * Adicionar membro à equipe
   */
  async adicionarMembro(equipeId: number, data: AddMembroDto) {
    return apiService.post<MembroEquipe>(`/api/equipes/${equipeId}/membros`, data);
  }

  /**
   * Remover membro da equipe
   */
  async removerMembro(equipeId: number, membroId: number) {
    return apiService.delete(`/api/equipes/${equipeId}/membros/${membroId}`);
  }
}

export const equipesService = new EquipesService();
