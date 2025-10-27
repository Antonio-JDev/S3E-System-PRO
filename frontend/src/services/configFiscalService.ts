import { apiService } from './api';

export interface ConfiguracaoFiscal {
  id: number;
  empresaId: number;
  ncm: string;
  descricao: string;
  cfop: string;
  aliquotaIcms: number;
  aliquotaIpi: number;
  aliquotaPis: number;
  aliquotaCofins: number;
  cst: string;
  csosn?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigFiscalDto {
  empresaId: number;
  ncm: string;
  descricao: string;
  cfop: string;
  aliquotaIcms: number;
  aliquotaIpi: number;
  aliquotaPis: number;
  aliquotaCofins: number;
  cst: string;
  csosn?: string;
}

export interface UpdateConfigFiscalDto {
  ncm?: string;
  descricao?: string;
  cfop?: string;
  aliquotaIcms?: number;
  aliquotaIpi?: number;
  aliquotaPis?: number;
  aliquotaCofins?: number;
  cst?: string;
  csosn?: string;
  ativo?: boolean;
}

class ConfigFiscalService {
  /**
   * Listar todas as configurações fiscais
   */
  async listarConfiguracoes(params?: {
    empresaId?: number;
    ncm?: string;
    ativo?: boolean;
  }) {
    return apiService.get<ConfiguracaoFiscal[]>('/api/configuracoes-fiscais', params);
  }

  /**
   * Buscar configuração por ID
   */
  async buscarConfiguracaoPorId(id: number) {
    return apiService.get<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`);
  }

  /**
   * Criar nova configuração fiscal
   */
  async criarConfiguracao(data: CreateConfigFiscalDto) {
    return apiService.post<ConfiguracaoFiscal>('/api/configuracoes-fiscais', data);
  }

  /**
   * Atualizar configuração fiscal
   */
  async atualizarConfiguracao(id: number, data: UpdateConfigFiscalDto) {
    return apiService.put<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`, data);
  }

  /**
   * Deletar configuração fiscal
   */
  async deletarConfiguracao(id: number) {
    return apiService.delete(`/api/configuracoes-fiscais/${id}`);
  }
}

export const configFiscalService = new ConfigFiscalService();
