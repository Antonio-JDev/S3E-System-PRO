import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Servico {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  tipo: string;
  preco: number;
  unidade: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Alias para compatibilidade
export type Service = Servico;

export interface CreateServicoData {
  nome: string;
  codigo: string;
  descricao?: string;
  tipo: string;
  preco: number;
  unidade?: string;
}

export interface UpdateServicoData extends Partial<CreateServicoData> {
  ativo?: boolean;
}

export interface ServicoFilters {
  tipo?: string;
  ativo?: boolean;
  search?: string;
}

class ServicosService {
  async listar(filters?: ServicoFilters) {
    return axiosApiService.get<Servico[]>(ENDPOINTS.SERVICOS, filters);
  }

  async buscar(id: string) {
    return axiosApiService.get<Servico>(`${ENDPOINTS.SERVICOS}/${id}`);
  }

  async criar(data: CreateServicoData) {
    return axiosApiService.post<Servico>(ENDPOINTS.SERVICOS, data);
  }

  async atualizar(id: string, data: UpdateServicoData) {
    return axiosApiService.put<Servico>(`${ENDPOINTS.SERVICOS}/${id}`, data);
  }

  async desativar(id: string) {
    return axiosApiService.delete<{ message: string }>(`${ENDPOINTS.SERVICOS}/${id}`);
  }

  /**
   * Importa serviços via JSON
   */
  async importarJSON(servicos: any[]) {
    return axiosApiService.post(`${ENDPOINTS.SERVICOS}/import/json`, { servicos });
  }

  /**
   * Exporta serviços para JSON
   */
  async exportarJSON(ativo?: boolean) {
    const params = ativo !== undefined ? { ativo } : {};
    return axiosApiService.get(`${ENDPOINTS.SERVICOS}/export/json`, params);
  }
}

export const servicosService = new ServicosService();
