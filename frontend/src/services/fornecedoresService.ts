import { axiosApiService } from './axiosApi';

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
  categoria: string;
  classificacao?: 'Fabricante' | 'Representante_Vendedor' | null;
  cnae_fiscal?: number | null;
  codigo_municipio_ibge?: number | null;
  situacao_cadastral?: number | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFornecedorData {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  categoria: string;
  classificacao?: 'Fabricante' | 'Representante_Vendedor' | '';
  bairro?: string;
  cnae_fiscal?: number | null;
  codigo_municipio_ibge?: number | null;
  situacao_cadastral?: number | null;
}

export interface UpdateFornecedorData extends Partial<CreateFornecedorData> {
  ativo?: boolean;
}

export interface FornecedorFilters {
  categoria?: string;
  ativo?: boolean;
  search?: string;
}

class FornecedoresService {
  async listar(filters?: FornecedorFilters) {
    return axiosApiService.get<Fornecedor[]>('/api/fornecedores', filters);
  }

  async buscar(id: string) {
    return axiosApiService.get<Fornecedor>(`/api/fornecedores/${id}`);
  }

  async criar(data: CreateFornecedorData) {
    return axiosApiService.post<Fornecedor>('/api/fornecedores', data);
  }

  async atualizar(id: string, data: UpdateFornecedorData) {
    return axiosApiService.put<Fornecedor>(`/api/fornecedores/${id}`, data);
  }

  async desativar(id: string) {
    return axiosApiService.delete<Fornecedor>(`/api/fornecedores/${id}`);
  }

  async reativar(id: string) {
    return axiosApiService.put<Fornecedor>(`/api/fornecedores/${id}/reativar`);
  }
}

export const fornecedoresService = new FornecedoresService();
