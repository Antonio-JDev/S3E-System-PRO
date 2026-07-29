import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';
import type { CockpitResumoItem } from '../utils/osCockpit.util';

export type StatusVistoriaCelesc =
  | 'PENDENTE_PROTOCOLO'
  | 'AGUARDANDO_CELESC'
  | 'REPROVADO'
  | 'VISTORIA_APROVADA';

export interface HistoricoReprovacaoVistoria {
  id: string;
  projetoId: string;
  dataReprovacao: string;
  motivos: string;
  itensReprovados: string[] | unknown;
  criadoEm: string;
  criadoPorId?: string | null;
  criadoPor?: { id: string; name: string } | null;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  tipo: string;
  clienteId: string;
  responsavelId: string;
  dataInicio: string;
  dataPrevisao: string;
  dataConclusao?: string;
  orcamentoId?: string;
  valorTotal?: number;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  valorHoraEngenharia?: number | null;
  valorDiariaEquipe?: number | null;
  semObra?: boolean;
  iniciadoSemEstoque?: boolean;
  exigeVistoriaCelesc?: boolean;
  statusVistoria?: StatusVistoriaCelesc | null;
  dataProtocoloVistoria?: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: string;
    nome: string;
  };
  responsavel?: {
    id: string;
    nome: string;
  };
  orcamento?: {
    id: string;
    titulo: string;
    precoVenda: number;
    numeroSequencial?: number;
  };
}

export interface VistoriaCelescItem extends Projeto {
  diasDecorridos?: number | null;
  diasRestantes?: number | null;
  atrasado?: boolean;
  qtdReprovacoes?: number;
  historicoReprovacoesVistoria?: HistoricoReprovacaoVistoria[];
  engenharia?: {
    id: string;
    statusCelesc?: string[] | null;
    statusEngenharia?: string;
    nomeProjeto?: string | null;
  } | null;
}

export interface CreateProjetoData {
  titulo: string;
  descricao: string;
  tipo: string;
  clienteId: string;
  responsavelId: string;
  dataInicio: string;
  dataPrevisao: string;
  orcamentoId?: string;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  valorHoraEngenharia?: number | null;
  valorDiariaEquipe?: number | null;
  exigeVistoriaCelesc?: boolean;
}

export interface UpdateProjetoData extends Partial<CreateProjetoData> {
  status?: string;
  dataConclusao?: string;
}

export interface ProjetoFilters {
  status?: string;
  tipo?: string;
  clienteId?: string;
  responsavelId?: string;
  search?: string;
}

export interface ReprovarVistoriaPayload {
  dataReprovacao: string;
  motivos: string;
  itensReprovados: string[] | string;
}

class OrdemServicosService {
  async listar(filters?: ProjetoFilters) {
    return axiosApiService.get<Projeto[]>(ENDPOINTS.PROJETOS, filters);
  }

  async buscarPorTermo(q: string, limit = 20) {
    return axiosApiService.get<
      Array<{
        id: string;
        titulo: string;
        numeroOs?: string;
        cliente?: { nome: string };
        status: string;
        obra?: { id: string; nomeObra: string; status: string } | null;
        semObra?: boolean;
      }>
    >(`${ENDPOINTS.PROJETOS}/busca`, { q, limit });
  }

  async buscar(id: string) {
    return axiosApiService.get<Projeto>(`${ENDPOINTS.PROJETOS}/${id}`);
  }

  async criar(data: CreateProjetoData) {
    return axiosApiService.post<Projeto>(ENDPOINTS.PROJETOS, data);
  }

  async atualizar(id: string, data: UpdateProjetoData) {
    return axiosApiService.put<Projeto>(`${ENDPOINTS.PROJETOS}/${id}`, data);
  }

  async atualizarStatus(id: string, status: string, ignorarEstoque?: boolean) {
    return axiosApiService.put<Projeto>(`${ENDPOINTS.PROJETOS}/${id}/status`, {
      status,
      ...(ignorarEstoque ? { ignorarEstoque: true } : {}),
    });
  }

  async reverterStatus(id: string, status: 'PROPOSTA' | 'APROVADO') {
    return axiosApiService.put<Projeto>(`${ENDPOINTS.PROJETOS}/${id}/reverter-status`, { status });
  }

  async desativar(id: string) {
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}`);
  }

  async excluirPermanentemente(id: string) {
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}?permanent=true`);
  }

  async getCockpitResumo(ids: string[]) {
    if (!ids.length) return { success: true, data: {} as Record<string, CockpitResumoItem> };
    return axiosApiService.get<Record<string, CockpitResumoItem>>(
      `${ENDPOINTS.PROJETOS}/cockpit-resumo`,
      { ids: ids.join(',') }
    );
  }

  async getRelatorioCumprimentoEstimativa(status?: string) {
    return axiosApiService.get<
      Array<{
        projetoId: string;
        numeroOS: string;
        titulo: string;
        clienteNome: string;
        engenheiroResponsavel: string | null;
        status: string;
        diasEstimados: number;
        diasReais: number;
        horasEstimadas: number;
        horasReais: number;
        custoOrcado: number;
        custoRealizado: number;
        lucroPerdaPrazo: number;
        resultadoOs: number;
        cumpriuEstimativa: boolean;
      }>
    >(`${ENDPOINTS.PROJETOS}/relatorios/cumprimento-estimativa`, status ? { status } : undefined);
  }

  async listarVistoriasCelesc() {
    return axiosApiService.get<VistoriaCelescItem[]>(`${ENDPOINTS.PROJETOS}/vistorias-celesc`);
  }

  async protocolarVistoria(id: string) {
    return axiosApiService.patch<VistoriaCelescItem>(
      `${ENDPOINTS.PROJETOS}/${id}/protocolar-vistoria`,
      {},
    );
  }

  async reprovarVistoria(id: string, payload: ReprovarVistoriaPayload) {
    return axiosApiService.post<VistoriaCelescItem>(
      `${ENDPOINTS.PROJETOS}/${id}/reprovar-vistoria`,
      payload,
    );
  }

  async aprovarVistoria(id: string) {
    return axiosApiService.patch<VistoriaCelescItem>(
      `${ENDPOINTS.PROJETOS}/${id}/aprovar-vistoria`,
      {},
    );
  }
}

export const ordemServicosService = new OrdemServicosService();
