import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export type EventoStatus = 'PREVISAO' | 'VALIDO';
export type EventoTipo = 'OBRA' | 'REUNIAO' | 'VISITA';

export interface FuncionarioEquipeResumo {
  id: string;
  nome: string;
  cargo: string;
  valorHora?: number | string | null;
  valorDiaria?: number | string | null;
  status?: string;
}

export interface OrcamentoEventoResumo {
  id: string;
  titulo: string;
  numeroSequencial: number;
  previsaoInicio?: string | null;
  previsaoTermino?: string | null;
  status: string;
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  descricao?: string | null;
  dataInicio: string;
  dataFim: string;
  status: EventoStatus;
  tipo: string;
  orcamentoId?: string | null;
  custoVeiculo?: number | string | null;
  createdAt: string;
  updatedAt: string;
  equipe: FuncionarioEquipeResumo[];
  orcamento?: OrcamentoEventoResumo | null;
  diasCalendario?: number;
  horasComerciais?: number;
  custoEquipe?: number;
  custoProjetado?: number;
}

export interface CriarEventoDTO {
  titulo: string;
  descricao?: string | null;
  dataInicio: string;
  dataFim: string;
  status?: EventoStatus;
  tipo?: string;
  orcamentoId?: string | null;
  custoVeiculo?: number | null;
  equipeIds?: string[];
}

export interface ListarEventosParams {
  dataInicio: string;
  dataFim: string;
  status?: EventoStatus;
  tipo?: string;
  busca?: string;
}

export interface OrcamentoPreenchido {
  id: string;
  titulo: string;
  previsaoInicio?: string | null;
  previsaoTermino?: string | null;
}

export interface EquipePreMontadaResumo {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string | null;
  totalMembros: number;
}

export interface ResolverEquipeResponse {
  equipeNome: string;
  funcionarios: FuncionarioEquipeResumo[];
  membrosNaoVinculados?: number;
}

export interface CapacidadeDia {
  data: string;
  horasEngenhariaDemanda: number;
  diariasEquipeDemanda: number;
  homemHoraDemanda: number;
  capacidadeHomemHora: number;
  gargalo: boolean;
  projetos: Array<{ id: string; titulo: string; responsavelId: string | null; status: string }>;
}

export interface CapacidadeCalendarioResponse {
  dias: CapacidadeDia[];
  capacidadeDiariaHomemHora: number;
}

class EventosCalendarioService {
  async listar(params: ListarEventosParams) {
    return axiosApiService.get<EventoCalendario[]>(ENDPOINTS.EVENTOS_CALENDARIO, params);
  }

  async buscar(id: string) {
    return axiosApiService.get<EventoCalendario>(`${ENDPOINTS.EVENTOS_CALENDARIO}/${id}`);
  }

  async criar(data: CriarEventoDTO) {
    return axiosApiService.post<EventoCalendario>(ENDPOINTS.EVENTOS_CALENDARIO, data);
  }

  async atualizar(id: string, data: Partial<CriarEventoDTO>) {
    return axiosApiService.put<EventoCalendario>(`${ENDPOINTS.EVENTOS_CALENDARIO}/${id}`, data);
  }

  async excluir(id: string) {
    return axiosApiService.delete(`${ENDPOINTS.EVENTOS_CALENDARIO}/${id}`);
  }

  async buscarFuncionarios(q: string, excluirIds: string[] = []) {
    return axiosApiService.get<FuncionarioEquipeResumo[]>(
      `${ENDPOINTS.EVENTOS_CALENDARIO}/equipe/busca`,
      {
        q: q.trim() || undefined,
        excluirIds: excluirIds.length > 0 ? excluirIds.join(',') : undefined,
      }
    );
  }

  /** @deprecated use buscarFuncionarios */
  async buscarEquipe(q: string, excluirIds: string[] = []) {
    return this.buscarFuncionarios(q, excluirIds);
  }

  async buscarEquipesPreMontadas(q: string) {
    return axiosApiService.get<EquipePreMontadaResumo[]>(
      `${ENDPOINTS.EVENTOS_CALENDARIO}/equipes/busca`,
      { q: q.trim() || undefined }
    );
  }

  async resolverFuncionariosEquipe(equipeId: string, excluirIds: string[] = []) {
    return axiosApiService.get<ResolverEquipeResponse>(
      `${ENDPOINTS.EVENTOS_CALENDARIO}/equipes/${equipeId}/funcionarios`,
      { excluirIds: excluirIds.length > 0 ? excluirIds.join(',') : undefined }
    );
  }

  async obterCapacidade(params: {
    dataInicio: string;
    dataFim: string;
    responsavelId?: string;
    status?: string;
  }) {
    return axiosApiService.get<CapacidadeCalendarioResponse>(
      `${ENDPOINTS.EVENTOS_CALENDARIO}/capacidade`,
      params
    );
  }
}

export const eventosCalendarioService = new EventosCalendarioService();
