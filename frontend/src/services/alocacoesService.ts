import { apiService } from './api';

export interface Equipe {
  id: number;
  nome: string;
  responsavel: string;
  especialidade: string;
  capacidadeMaxima: number;
  ativa: boolean;
  membros?: MembroEquipe[];
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
}

export interface Alocacao {
  id: number;
  equipeId: number;
  projetoId: number;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  observacao?: string;
  equipe?: Equipe;
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

export interface AlocarEquipeDto {
  equipeId: number;
  projetoId: number;
  dataInicio: string;
  dataFim: string;
  observacao?: string;
}

export interface UpdateAlocacaoDto {
  dataInicio?: string;
  dataFim?: string;
  observacao?: string;
}

export interface EstatisticasObras {
  totalEquipes: number;
  equipesAtivas: number;
  totalAlocacoes: number;
  alocacoesAtivas: number;
  taxaOcupacao: number;
}

class AlocacoesService {
  // ===== EQUIPES =====

  /**
   * Criar nova equipe
   */
  async criarEquipe(data: CreateEquipeDto) {
    return apiService.post<Equipe>('/api/obras/equipes', data);
  }

  /**
   * Listar todas as equipes
   */
  async listarEquipes(params?: {
    todas?: boolean;
  }) {
    return apiService.get<Equipe[]>('/api/obras/equipes', params);
  }

  /**
   * Buscar equipes disponíveis
   */
  async getEquipesDisponiveis(params: {
    dataInicio: string;
    dataFim: string;
  }) {
    return apiService.get<Equipe[]>('/api/obras/equipes/disponiveis', params);
  }

  /**
   * Buscar equipe por ID
   */
  async buscarEquipe(id: number) {
    return apiService.get<Equipe>(`/api/obras/equipes/${id}`);
  }

  /**
   * Atualizar equipe
   */
  async atualizarEquipe(id: number, data: UpdateEquipeDto) {
    return apiService.put<Equipe>(`/api/obras/equipes/${id}`, data);
  }

  /**
   * Desativar equipe
   */
  async desativarEquipe(id: number) {
    return apiService.delete(`/api/obras/equipes/${id}`);
  }

  // ===== ALOCAÇÕES =====

  /**
   * Alocar equipe a um projeto
   */
  async alocarEquipe(data: AlocarEquipeDto) {
    return apiService.post<Alocacao>('/api/obras/alocar', data);
  }

  /**
   * Listar alocações
   */
  async listarAlocacoes(params?: {
    equipeId?: number;
    projetoId?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Alocacao[]>('/api/obras/alocacoes', params);
  }

  /**
   * Buscar alocações para calendário
   */
  async getAlocacoesCalendario(params?: {
    mes?: number;
    ano?: number;
  }) {
    return apiService.get('/api/obras/alocacoes/calendario', params);
  }

  /**
   * Buscar alocação por ID
   */
  async buscarAlocacao(id: number) {
    return apiService.get<Alocacao>(`/api/obras/alocacoes/${id}`);
  }

  /**
   * Atualizar alocação
   */
  async atualizarAlocacao(id: number, data: UpdateAlocacaoDto) {
    return apiService.put<Alocacao>(`/api/obras/alocacoes/${id}`, data);
  }

  /**
   * Iniciar alocação
   */
  async iniciarAlocacao(id: number) {
    return apiService.put(`/api/obras/alocacoes/${id}/iniciar`, {});
  }

  /**
   * Concluir alocação
   */
  async concluirAlocacao(id: number) {
    return apiService.put(`/api/obras/alocacoes/${id}/concluir`, {});
  }

  /**
   * Cancelar alocação
   */
  async cancelarAlocacao(id: number, observacao?: string) {
    return apiService.put(`/api/obras/alocacoes/${id}/cancelar`, { observacao });
  }

  // ===== ESTATÍSTICAS =====

  /**
   * Buscar estatísticas de obras
   */
  async getEstatisticas() {
    return apiService.get<EstatisticasObras>('/api/obras/estatisticas');
  }
}

export const alocacoesService = new AlocacoesService();
