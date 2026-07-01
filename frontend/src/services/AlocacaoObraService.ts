import { axiosApiService, type ApiResponse } from './axiosApi';

export interface AlocacaoDTO {
  id: string;
  equipe?: {
    id: string;
    nome: string;
    tipo: string;
  } | null;
  eletricista?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  eletricistaId?: string | null;
  projeto: {
    id: string;
    titulo: string;
    cliente?: string;
  };
  dataInicio: string | Date;
  dataFimPrevisto: string | Date;
  dataFimReal?: string | Date | null;
  status: 'Planejada' | 'EmAndamento' | 'Concluida' | 'Cancelada' | string;
  observacoes?: string | null;
}

export interface AlocacaoCalendarioDTO {
  id: string;
  equipeId?: string | null;
  eletricistaId?: string | null;
  projetoId: string;
  equipe?: {
    id: string;
    nome: string;
    tipo: string;
  } | null;
  eletricista?: {
    id: string;
    nome: string;
    email?: string | null;
    role?: string;
  } | null;
  projeto: {
    id: string;
    titulo: string;
    cliente: string;
  };
  dataInicio: string | Date;
  dataFimPrevisto: string | Date;
  dataFimReal?: string | Date | null;
  status: string;
  observacoes?: string | null;
}

export interface AlocarEquipeInput {
  equipeId: string;
  projetoId: string;
  dataInicio: string | Date;
  duracaoDias: number;
  observacoes?: string;
}

export interface AlocarEletricistaInput {
  eletricistaId: string;
  projetoId: string;
  dataInicio: string | Date;
  duracaoDias: number;
  observacoes?: string;
}

export interface AlocacaoRecursoLinhaDTO {
  id: string;
  projetoId: string;
  osTitulo: string;
  osNumero: string | null;
  clienteNome: string;
  dataInicio: string;
  dataFimPrevisto: string;
  status: string;
  projetoStatus: string;
  obraStatus: string | null;
}

export interface RecursoOcupacaoLinhaDTO {
  tipo: 'equipe' | 'eletricista';
  id: string;
  nome: string;
  ocupadoHoje: boolean;
  osVinculadas: number;
  previsaoLiberacao: string | null;
  alocacoes: AlocacaoRecursoLinhaDTO[];
}

export interface RelatorioOcupacaoResumoDTO {
  totalRecursos: number;
  recursosOcupadosHoje: number;
  recursosLivresHoje: number;
  osComAlocacaoAtiva: number;
  osEmExecucao: number;
  horizonteOcupacaoGlobal: string | null;
  proximaLiberacaoRecurso: string | null;
}

export interface RelatorioOcupacaoDTO {
  resumo: RelatorioOcupacaoResumoDTO;
  porRecurso: RecursoOcupacaoLinhaDTO[];
}

class AlocacaoObraService {
  private unwrap<T>(res: ApiResponse<any>): ApiResponse<T> {
    if (!res.success) return res as unknown as ApiResponse<T>;
    const payload = res.data as any;
    const data = payload?.data ?? payload;
    return { success: true, data } as ApiResponse<T>;
  }

  async alocarEquipe(data: AlocarEquipeInput): Promise<ApiResponse<AlocacaoDTO>> {
    const res = await axiosApiService.post<any>('/api/obras/alocar', data);
    return this.unwrap<AlocacaoDTO>(res);
  }

  async alocarEletricista(data: AlocarEletricistaInput): Promise<ApiResponse<AlocacaoDTO>> {
    const res = await axiosApiService.post<any>('/api/obras/alocar-eletricista', data);
    return this.unwrap<AlocacaoDTO>(res);
  }

  async getAlocacoesPorProjeto(projetoId: string): Promise<ApiResponse<AlocacaoDTO[]>> {
    const res = await axiosApiService.get<any>('/api/obras/alocacoes', { projetoId });
    return this.unwrap<AlocacaoDTO[]>(res);
  }

  async getAlocacoesCalendario(
    mes: number,
    ano: number,
    projetoId?: string
  ): Promise<ApiResponse<AlocacaoCalendarioDTO[]>> {
    const params: Record<string, string | number> = { mes, ano };
    if (projetoId) params.projetoId = projetoId;
    const res = await axiosApiService.get<any>('/api/obras/alocacoes/calendario', params);
    return this.unwrap<AlocacaoCalendarioDTO[]>(res);
  }

  async getRelatorioOcupacao(): Promise<ApiResponse<RelatorioOcupacaoDTO>> {
    const res = await axiosApiService.get<any>('/api/obras/alocacoes/relatorio-ocupacao');
    return this.unwrap<RelatorioOcupacaoDTO>(res);
  }

  async getAllAlocacoes(): Promise<ApiResponse<AlocacaoDTO[]>> {
    const res = await axiosApiService.get<any>('/api/obras/alocacoes');
    return this.unwrap<AlocacaoDTO[]>(res);
  }

  async iniciarAlocacao(id: string): Promise<ApiResponse<AlocacaoDTO>> {
    const res = await axiosApiService.put<any>(`/api/obras/alocacoes/${id}/iniciar`);
    return this.unwrap<AlocacaoDTO>(res);
  }

  async concluirAlocacao(id: string, dataFimReal?: string | Date): Promise<ApiResponse<AlocacaoDTO>> {
    const res = await axiosApiService.put<any>(`/api/obras/alocacoes/${id}/concluir`, { dataFimReal });
    return this.unwrap<AlocacaoDTO>(res);
  }

  async cancelarAlocacao(id: string, motivo?: string): Promise<ApiResponse<AlocacaoDTO>> {
    const res = await axiosApiService.put<any>(`/api/obras/alocacoes/${id}/cancelar`, { motivo });
    return this.unwrap<AlocacaoDTO>(res);
  }
}

export const alocacaoObraService = new AlocacaoObraService();
