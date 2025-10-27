import { apiService } from './api';

export interface ConfiguracaoFiscal {
  id: string;
  empresaId: string;
  regime: 'SimplesNacional' | 'LucroPresumido' | 'LucroReal';
  aliquotaICMS: number;
  aliquotaIPI: number;
  aliquotaPIS: number;
  aliquotaCOFINS: number;
  aliquotaIR: number;
  aliquotaCSLL: number;
  certificadoDigital?: string;
  senhacertificado?: string;
  ambienteNFe: 'Producao' | 'Homologacao';
  serieNFe: number;
  ultimoNumeroNFe: number;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

class ConfigFiscalService {
  /**
   * Listar todas as configurações fiscais
   */
  async getConfiguracoes(params?: {
    empresaId?: string;
    ativo?: boolean;
  }) {
    return apiService.get<ConfiguracaoFiscal[]>('/api/configuracoes-fiscais', params);
  }

  /**
   * Buscar configuração fiscal por ID
   */
  async getConfiguracaoById(id: string) {
    return apiService.get<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`);
  }

  /**
   * Criar nova configuração fiscal
   */
  async createConfiguracao(data: {
    empresaId: string;
    regime: 'SimplesNacional' | 'LucroPresumido' | 'LucroReal';
    aliquotaICMS: number;
    aliquotaIPI: number;
    aliquotaPIS: number;
    aliquotaCOFINS: number;
    aliquotaIR: number;
    aliquotaCSLL: number;
    certificadoDigital?: string;
    senhacertificado?: string;
    ambienteNFe: 'Producao' | 'Homologacao';
    serieNFe: number;
    observacoes?: string;
  }) {
    return apiService.post<ConfiguracaoFiscal>('/api/configuracoes-fiscais', data);
  }

  /**
   * Atualizar configuração fiscal
   */
  async updateConfiguracao(id: string, data: Partial<ConfiguracaoFiscal>) {
    return apiService.put<ConfiguracaoFiscal>(`/api/configuracoes-fiscais/${id}`, data);
  }

  /**
   * Deletar configuração fiscal
   */
  async deleteConfiguracao(id: string) {
    return apiService.delete<void>(`/api/configuracoes-fiscais/${id}`);
  }
}

export const configFiscalService = new ConfigFiscalService();
