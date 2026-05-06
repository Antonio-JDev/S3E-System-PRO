import { axiosApiService, type ApiResponse } from './axiosApi';

export interface AlocacaoEquipeDTO {
  id: string;
  tarefaId: string;
  obraId: string;
  obraNome?: string;
  equipeId: string;
  equipeNome: string;
  membros: Array<{
    id: string;
    nome: string;
    funcao: string;
  }>;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlocacaoInput {
  tarefaId: string;
  obraId: string;
  equipeId: string;
  dataInicio: string;
  dataFim: string;
  observacoes?: string;
}

export interface UpdateAlocacaoInput {
  dataInicio?: string;
  dataFim?: string;
  status?: AlocacaoEquipeDTO['status'];
  observacoes?: string;
}

export interface AlocacoesPorPeriodoParams {
  dataInicio: string;
  dataFim: string;
  equipeId?: string;
  obraId?: string;
}

export interface ConflictCheck {
  temConflito: boolean;
  conflitos: Array<{
    equipeId: string;
    equipeNome: string;
    tarefaId: string;
    tarefaDescricao: string;
    dataInicio: string;
    dataFim: string;
  }>;
}

class AlocacaoService {
  private unwrap<T>(res: ApiResponse<any>): ApiResponse<T> {
    if (!res.success) return res as unknown as ApiResponse<T>;
    const payload = res.data as any;
    const data = payload?.data ?? payload;
    return { success: true, data } as ApiResponse<T>;
  }

  /**
   * Criar alocação de equipe para uma tarefa
   */
  async criar(data: CreateAlocacaoInput): Promise<ApiResponse<AlocacaoEquipeDTO>> {
    const res = await axiosApiService.post<any>('/api/alocacoes', data);
    return this.unwrap<AlocacaoEquipeDTO>(res);
  }

  /**
   * Buscar alocações por período
   */
  async buscarPorPeriodo(params: AlocacoesPorPeriodoParams): Promise<ApiResponse<AlocacaoEquipeDTO[]>> {
    const res = await axiosApiService.get<any>('/api/alocacoes/periodo', params);
    return this.unwrap<AlocacaoEquipeDTO[]>(res);
  }

  /**
   * Buscar alocações de uma obra
   */
  async buscarPorObra(obraId: string): Promise<ApiResponse<AlocacaoEquipeDTO[]>> {
    const res = await axiosApiService.get<any>(`/api/alocacoes/obra/${obraId}`);
    return this.unwrap<AlocacaoEquipeDTO[]>(res);
  }

  /**
   * Buscar alocações de uma equipe
   */
  async buscarPorEquipe(equipeId: string): Promise<ApiResponse<AlocacaoEquipeDTO[]>> {
    const res = await axiosApiService.get<any>(`/api/alocacoes/equipe/${equipeId}`);
    return this.unwrap<AlocacaoEquipeDTO[]>(res);
  }

  /**
   * Verificar conflitos de alocação antes de criar
   */
  async verificarConflitos(equipeId: string, dataInicio: string, dataFim: string): Promise<ApiResponse<ConflictCheck>> {
    const res = await axiosApiService.get<any>('/api/alocacoes/verificar-conflitos', {
      equipeId,
      dataInicio,
      dataFim
    });
    return this.unwrap<ConflictCheck>(res);
  }

  /**
   * Atualizar alocação
   */
  async atualizar(id: string, data: UpdateAlocacaoInput): Promise<ApiResponse<AlocacaoEquipeDTO>> {
    const res = await axiosApiService.put<any>(`/api/alocacoes/${id}`, data);
    return this.unwrap<AlocacaoEquipeDTO>(res);
  }

  /**
   * Excluir alocação
   */
  async excluir(id: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await axiosApiService.delete<any>(`/api/alocacoes/${id}`);
    return this.unwrap<{ success: boolean }>(res);
  }

  /**
   * Obter disponibilidade de equipes em um período
   */
  async obterDisponibilidade(dataInicio: string, dataFim: string): Promise<ApiResponse<Array<{
    equipeId: string;
    equipeNome: string;
    disponivel: boolean;
    percentualOcupacao: number;
    alocacoes: Array<{
      tarefaId: string;
      dataInicio: string;
      dataFim: string;
    }>;
  }>>> {
    const res = await axiosApiService.get<any>('/api/alocacoes/disponibilidade', {
      dataInicio,
      dataFim
    });
    return this.unwrap(res);
  }
}

export const alocacaoService = new AlocacaoService();
