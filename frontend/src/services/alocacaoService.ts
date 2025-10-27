import { apiService } from './api';

export interface Equipe {
  id: string;
  nome: string;
  especialidade: string;
  lider: string;
  membros: string[];
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
  status: 'Planejada' | 'EmAndamento' | 'Concluida' | 'Cancelada';
  observacoes?: string;
  equipe?: Equipe;
  projeto?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AlocacaoCalendario {
  id: string;
  title: string;
  start: string;
  end: string;
  equipe: string;
  projeto: string;
  status: string;
}

export interface Estatisticas {
  totalEquipes: number;
  equipesAtivas: number;
  totalAlocacoes: number;
  alocacoesAtivas: number;
  taxaOcupacao: number;
}

class AlocacaoService {
  // =============================================
  // EQUIPES
  // =============================================

  async criarEquipe(data: Partial<Equipe>) {
    return apiService.post<Equipe>('/api/obras/equipes', data);
  }

  async listarEquipes(todas?: boolean) {
    const params = todas ? { todas: 'true' } : {};
    return apiService.get<Equipe[]>('/api/obras/equipes', params);
  }

  async buscarEquipe(id: string) {
    return apiService.get<Equipe>(`/api/obras/equipes/${id}`);
  }

  async getEquipesDisponiveis(dataInicio: string, dataFim: string) {
    return apiService.get<Equipe[]>('/api/obras/equipes/disponiveis', {
      dataInicio,
      dataFim,
    });
  }

  async atualizarEquipe(id: string, data: Partial<Equipe>) {
    return apiService.put<Equipe>(`/api/obras/equipes/${id}`, data);
  }

  async desativarEquipe(id: string) {
    return apiService.delete<void>(`/api/obras/equipes/${id}`);
  }

  // =============================================
  // ALOCAÇÕES
  // =============================================

  async alocarEquipe(data: {
    equipeId: string;
    projetoId: string;
    dataInicio: string;
    dataFim: string;
    observacoes?: string;
  }) {
    return apiService.post<Alocacao>('/api/obras/alocar', data);
  }

  async listarAlocacoes(filtros?: {
    equipeId?: string;
    projetoId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Alocacao[]>('/api/obras/alocacoes', filtros);
  }

  async buscarAlocacao(id: string) {
    return apiService.get<Alocacao>(`/api/obras/alocacoes/${id}`);
  }

  async getAlocacoesCalendario(mes?: number, ano?: number) {
    const params: any = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    return apiService.get<AlocacaoCalendario[]>('/api/obras/alocacoes/calendario', params);
  }

  async atualizarAlocacao(id: string, data: Partial<Alocacao>) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}`, data);
  }

  async iniciarAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/iniciar`);
  }

  async concluirAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/concluir`);
  }

  async cancelarAlocacao(id: string) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}/cancelar`);
  }

  // =============================================
  // ESTATÍSTICAS
  // =============================================

  async getEstatisticas() {
    return apiService.get<Estatisticas>('/api/obras/estatisticas');
  }
}

export const alocacaoService = new AlocacaoService();
