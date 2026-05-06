import { axiosApiService } from './axiosApi';

export interface Empresa {
  id: string;
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone?: string;
  email?: string;
  regimeTributario: string;
  certificadoPath?: string;
  certificadoSenha?: string;
  certificadoValidade?: string;
  /** Alíquota % DAS sobre venda de materiais (Simples Nacional). Usado em orçamentos para custo agregado e lucro líquido. */
  aliquotaMaterial?: number;
  /** Alíquota % DAS sobre venda de serviços (Simples Nacional). */
  aliquotaServico?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmpresaData {
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone?: string;
  email?: string;
  regimeTributario: string;
  certificadoPath?: string;
  certificadoSenha?: string;
  certificadoValidade?: string;
}

export interface UpdateEmpresaData extends Partial<CreateEmpresaData> {
  ativo?: boolean;
  aliquotaMaterial?: number;
  aliquotaServico?: number;
}

export interface EmpresaFilters {
  ativo?: boolean;
  search?: string;
}

class EmpresasService {
  async listar(filters?: EmpresaFilters) {
    return axiosApiService.get<Empresa[]>('/api/empresas', filters);
  }

  async buscar(id: string) {
    return axiosApiService.get<Empresa>(`/api/empresas/${id}`);
  }

  async criar(data: CreateEmpresaData) {
    return axiosApiService.post<Empresa>('/api/empresas', data);
  }

  async atualizar(id: string, data: UpdateEmpresaData) {
    return axiosApiService.put<Empresa>(`/api/empresas/${id}`, data);
  }

  async desativar(id: string) {
    return axiosApiService.delete<Empresa>(`/api/empresas/${id}`);
  }
}

export const empresasService = new EmpresasService();
