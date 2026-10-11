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

  async atualizar(projetoId: string, apontamentoId: string, payload: CriarApontamentoPayload) {
    return axiosApiService.patch<ApontamentoOs>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apontamentos/${apontamentoId}`,
      payload
    );
  }

  async excluir(projetoId: string, apontamentoId: string) {
    return axiosApiService.delete<{ resumoAtualizado: ResultadoOsCalculado }>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apontamentos/${apontamentoId}`
    );
  }

  async obterResumo(projetoId: string) {
    return axiosApiService.get<ResultadoOsCalculado>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/apropriacao/resumo`
    );
  }

  async obterCmv(projetoId: string) {
    return axiosApiService.get<CmvOsResumo>(`${ENDPOINTS.PROJETOS}/${projetoId}/cmv`);
  }
}

export interface LinhaCmvOs {
  id: string;
  materialNome: string;
  sku: string;
  unidade: string;
  quantidade: number;
  custoUnitario: number;
  valorCusto: number;
  custoRetroativo: boolean;
  data: string;
  motivo: string;
}

export interface LinhaComprometidaOs {
  id: string;
  materialNome: string;
  sku: string;
  unidade: string;
  quantidade: number;
  custoUnitario: number;
  valorEstimado: number;
}

export interface CmvOsResumo {
  linhas: LinhaCmvOs[];
  totalCmv: number;
  comprometido: LinhaComprometidaOs[];
  totalComprometido: number;
}

export const apropriacaoOsService = new ApropriacaoOsService();
