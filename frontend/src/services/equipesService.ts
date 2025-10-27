import { apiService } from './api';

export interface Membro {
  id: string;
  nome: string;
  funcao: string;
  especialidade?: string;
}

export interface Equipe {
  id: string;
  nome: string;
  especialidade: string;
  lider: string;
  membros: Membro[];
  ativa: boolean;
  capacidade?: number;
  disponivel?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstatisticasEquipes {
  totalEquipes: number;
  equipesAtivas: number;
  equipesDisponiveis: number;
  totalMembros: number;
  taxaOcupacao: number;
}

class EquipesService {
  /**
   * Listar todas as equipes
   */
  async listarEquipes() {
    return apiService.get<Equipe[]>('/api/equipes');
  }

  /**
   * Buscar equipe por ID
   */
  async buscarEquipePorId(id: string) {
    return apiService.get<Equipe>(`/api/equipes/${id}`);
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
  async buscarEquipesDisponiveis(dataInicio?: string, dataFim?: string) {
    const params: any = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    return apiService.get<Equipe[]>('/api/equipes/disponiveis', params);
  }

  /**
   * Criar nova equipe
   */
  async criarEquipe(data: {
    nome: string;
    especialidade: string;
    lider: string;
    membros?: Membro[];
  }) {
    return apiService.post<Equipe>('/api/equipes', data);
  }

  /**
   * Atualizar equipe
   */
  async atualizarEquipe(id: string, data: Partial<Equipe>) {
    return apiService.put<Equipe>(`/api/equipes/${id}`, data);
  }

  /**
   * Desativar equipe
   */
  async desativarEquipe(id: string) {
    return apiService.delete<void>(`/api/equipes/${id}`);
  }

  /**
   * Adicionar membro à equipe
   */
  async adicionarMembro(id: string, membro: {
    nome: string;
    funcao: string;
    especialidade?: string;
  }) {
    return apiService.post<Equipe>(`/api/equipes/${id}/membros`, membro);
  }

  /**
   * Remover membro da equipe
   */
  async removerMembro(id: string, membroId: string) {
    return apiService.delete<void>(`/api/equipes/${id}/membros/${membroId}`);
  }
}

export const equipesService = new EquipesService();
