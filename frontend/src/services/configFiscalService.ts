import { apiService } from './api';

export interface ConfiguracaoFiscal {
  id: string;
  empresaId: string;
  certificadoDigital?: string;
  certificadoSenha?: string;
  ambiente: 'producao' | 'homologacao';
  serieNFe?: string;
  proximoNumeroNFe?: number;
  regimeTributario: 'simples' | 'lucroPresumido' | 'lucroReal';
  aliquotaICMS?: number;
  aliquotaPIS?: number;
  aliquotaCOFINS?: number;
  aliquotaIPI?: number;
  observacoesFiscais?: string;
  ativo: boolean;
  empresa?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigFiscalData {
  empresaId: string;
  certificadoDigital?: string;
  certificadoSenha?: string;
  ambiente: 'producao' | 'homologacao';
  serieNFe?: string;
  proximoNumeroNFe?: number;
  regimeTributario: 'simples' | 'lucroPresumido' | 'lucroReal';
  aliquotaICMS?: number;
  aliquotaPIS?: number;
  aliquotaCOFINS?: number;
  aliquotaIPI?: number;
  observacoesFiscais?: string;
}

export interface UpdateConfigFiscalData extends Partial<CreateConfigFiscalData> {}

class ConfigFiscalService {
  async getConfiguracoes(params?: {
    empresaId?: string;
    ativo?: boolean;
  }) {
    return apiService.get<ConfiguracaoFiscal[]>('/api/configuracoes-fiscais', params);
  }

  async getConfiguracaoById(id: string) {
    return apiService.get<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`);
  }

  async createConfiguracao(data: CreateConfigFiscalData) {
    return apiService.post<ConfiguracaoFiscal>('/api/configuracoes-fiscais', data);
  }

  async updateConfiguracao(id: string, data: UpdateConfigFiscalData) {
    return apiService.put<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`, data);
  }

  async deleteConfiguracao(id: string) {
    return apiService.delete<void>(`/api/configuracoes-fiscais/${id}`);
  }
}

export const configFiscalService = new ConfigFiscalService();
