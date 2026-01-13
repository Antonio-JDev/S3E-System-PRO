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

class ProjetosService {
  async listar(filters?: ProjetoFilters) {
    return axiosApiService.get<Projeto[]>(ENDPOINTS.PROJETOS, filters);
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

  async desativar(id: string) {
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}`);
  }

  async excluirPermanentemente(id: string) {
    // ⚠️ ATENÇÃO: Exclusão permanente do banco de dados (apenas para desenvolvimento)
    return axiosApiService.delete<Projeto>(`${ENDPOINTS.PROJETOS}/${id}?permanent=true`);
  }
}

export const projetosService = new ProjetosService();
