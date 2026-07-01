import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';
import type { ResultadoOsCalculado } from '../utils/apropriacaoOs';

export type TipoRecursoApontamento = 'HORA_ENGENHARIA' | 'DIARIA_EQUIPE';

export interface ApontamentoItemPayload {
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
  userId?: string;
  funcionarioId?: string;
}

export interface CriarApontamentoPayload {
  dataApontamento: string;
  observacoes?: string;
  itens: ApontamentoItemPayload[];
}

export interface ApontamentoOsItem {
  id: string;
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
  user?: { id: string; name: string } | null;
  funcionario?: { id: string; nome: string; cargo: string } | null;
}

export interface ApontamentoOs {
  id: string;
  projetoId: string;
  dataApontamento: string;
  observacoes?: string | null;
  createdAt: string;
  criadoPor?: { id: string; name: string };
  itens: ApontamentoOsItem[];
}

class ApropriacaoOsService {
  async criar(projetoId: string, payload: CriarApontamentoPayload) {
    return axiosApiService.post<ApontamentoOs>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apontamentos`,
      payload
    );
  }

  async listar(projetoId: string, limit = 20) {
    return axiosApiService.get<ApontamentoOs[]>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apontamentos`,
      { limit }
    );
  }

  async obterResumo(projetoId: string) {
    return axiosApiService.get<ResultadoOsCalculado>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apropriacao/resumo`
    );
  }
}

export const apropriacaoOsService = new ApropriacaoOsService();
