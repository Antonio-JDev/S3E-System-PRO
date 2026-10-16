import { axiosApiService } from './axiosApi';

export interface RegraFiscalNfe {
  id: string;
  empresaFiscalId: string | null;
  regime: 'SimplesNacional' | 'RegimeNormal';
  cfop: string | null;
  ncm: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalvarRegraFiscalNfe {
  empresaFiscalId?: string | null;
  regime: 'SimplesNacional' | 'RegimeNormal';
  cfop?: string | null;
  ncm?: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib: boolean;
}

class RegraFiscalNfeService {
  async listar() {
    return axiosApiService.get<RegraFiscalNfe[]>('/api/regras-fiscais-nfe');
  }

  async criar(data: SalvarRegraFiscalNfe) {
    return axiosApiService.post<RegraFiscalNfe>('/api/regras-fiscais-nfe', data);
  }

  async atualizar(id: string, data: SalvarRegraFiscalNfe) {
    return axiosApiService.put<RegraFiscalNfe>(`/api/regras-fiscais-nfe/${id}`, data);
  }

  async desativar(id: string) {
    return axiosApiService.patch<RegraFiscalNfe>(`/api/regras-fiscais-nfe/${id}/desativar`, {});
  }
}

export const regraFiscalNfeService = new RegraFiscalNfeService();
