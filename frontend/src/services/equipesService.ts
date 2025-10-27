import { apiService } from './api';

export interface Equipe {
  id: string;
  nome: string;
  responsavel: string;
  membros: string[];
  especialidades: string[];
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipeData {
  nome: string;
  responsavel: string;
  membros: string[];
  especialidades: string[];
}

export interface UpdateEquipeData extends Partial<CreateEquipeData> {}

export interface MembroEquipe {
  nome: string;
  funcao: string;
  especialidade?: string;
}

export interface EstatisticasEquipes {
  totalEquipes: number;
  equipesAtivas: number;
  equipesInativas: number;
  totalMembros: number;
  mediaMembrosPorEquipe: number;
}

class EquipesService {
  async listarEquipes(params?: {
    ativa?: boolean;
    especialidade?: string;
  }) {
    return apiService.get<Equipe[]>('/api/equipes', params);
  }

  async getEstatisticas() {
    return apiService.get<EstatisticasEquipes>('/api/equipes/estatisticas');
  }

  async buscarEquipesDisponiveis(params?: {
    dataInicio?: string;
    dataFim?: string;
    especialidade?: string;
  }) {
    return apiService.get<Equipe[]>('/api/equipes/disponiveis', params);
  }

  async buscarEquipePorId(id: string) {
    return apiService.get<Equipe>(`/api/equipes/${id}`);
  }

  async criarEquipe(data: CreateEquipeData) {
    return apiService.post<Equipe>('/api/equipes', data);
  }

  async atualizarEquipe(id: string, data: UpdateEquipeData) {
    return apiService.put<Equipe>(`/api/equipes/${id}`, data);
  }

  async desativarEquipe(id: string) {
    return apiService.delete<void>(`/api/equipes/${id}`);
  }

  async adicionarMembro(id: string, membro: MembroEquipe) {
    return apiService.post<Equipe>(`/api/equipes/${id}/membros`, membro);
  }

  async removerMembro(id: string, membroId: string) {
    return apiService.delete<void>(`/api/equipes/${id}/membros/${membroId}`);
  }
}

export const equipesService = new EquipesService();
