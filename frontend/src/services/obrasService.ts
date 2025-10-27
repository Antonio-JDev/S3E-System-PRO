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

export interface Alocacao {
  id: string;
  equipeId: string;
  projetoId: string;
  dataInicio: string;
  dataFim: string;
  status: 'Agendada' | 'EmAndamento' | 'Concluida' | 'Cancelada';
  observacoes?: string;
  equipe?: Equipe;
  projeto?: any;
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

export interface CreateAlocacaoData {
  equipeId: string;
  projetoId: string;
  dataInicio: string;
  dataFim: string;
  observacoes?: string;
}

export interface UpdateAlocacaoData {
  equipeId?: string;
  projetoId?: string;
  dataInicio?: string;
  dataFim?: string;
  observacoes?: string;
}

export interface Estatisticas {
  totalEquipes: number;
  equipesAtivas: number;
  equipesInativas: number;
  totalAlocacoes: number;
  alocacoesAgendadas: number;
  alocacoesEmAndamento: number;
  alocacoesConcluidas: number;
}

class ObrasService {
  // Equipes
  async criarEquipe(data: CreateEquipeData) {
    return apiService.post<Equipe>('/api/obras/equipes', data);
  }

  async listarEquipes(params?: { todas?: boolean }) {
    return apiService.get<Equipe[]>('/api/obras/equipes', params);
  }

  async getEquipesDisponiveis(params: { dataInicio: string; dataFim: string }) {
    return apiService.get<Equipe[]>('/api/obras/equipes/disponiveis', params);
  }

  async buscarEquipe(id: string) {
    return apiService.get<Equipe>(`/api/obras/equipes/${id}`);
  }

  async atualizarEquipe(id: string, data: UpdateEquipeData) {
    return apiService.put<Equipe>(`/api/obras/equipes/${id}`, data);
  }

  async desativarEquipe(id: string) {
    return apiService.delete<void>(`/api/obras/equipes/${id}`);
  }

  // Alocações
  async alocarEquipe(data: CreateAlocacaoData) {
    return apiService.post<Alocacao>('/api/obras/alocar', data);
  }

  async listarAlocacoes(params?: {
    equipeId?: string;
    projetoId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Alocacao[]>('/api/obras/alocacoes', params);
  }

  async getAlocacoesCalendario(params?: { mes?: number; ano?: number }) {
    return apiService.get<any[]>('/api/obras/alocacoes/calendario', params);
  }

  async buscarAlocacao(id: string) {
    return apiService.get<Alocacao>(`/api/obras/alocacoes/${id}`);
  }

  async atualizarAlocacao(id: string, data: UpdateAlocacaoData) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}`, data);
  }

  async iniciarAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/iniciar`, {});
  }

  async concluirAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/concluir`, {});
  }

  async cancelarAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/cancelar`, {});
  }

  // Estatísticas
  async getEstatisticas() {
    return apiService.get<Estatisticas>('/api/obras/estatisticas');
  }
}

export const obrasService = new ObrasService();
