import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

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

export interface CreateProjetoData {
  titulo: string;
  descricao: string;
  tipo: string;
  clienteId: string;
  responsavelId: string;
  dataInicio: string;
  dataPrevisao: string;
  orcamentoId?: string;
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

  async atualizarStatus(id: string, status: string) {
    return axiosApiService.put<Projeto>(`${ENDPOINTS.PROJETOS}/${id}/status`, { status });
  }

  async reverterStatus(id: string, status: 'PROPOSTA' | 'VALIDADO' | 'APROVADO') {
    return axiosApiService.put<Projeto>(`${ENDPOINTS.PROJETOS}/${id}/reverter-status`, { status });
  }

  async desativar(id: string) {
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}`);
  }

  async excluirPermanentemente(id: string) {
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}?permanent=true`);
  }
}

export const ordemServicosService = new OrdemServicosService();
