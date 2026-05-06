import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export type ContatoLeadStatus =
  | 'AGUARDANDO_DOCUMENTO'
  | 'EM_ANALISE_TECNICA'
  | 'PRONTO_PARA_ORCAR'
  | 'NAO_ATENDE'
  | 'CONVERTIDO';

export interface ContatoLead {
  id: string;
  nome: string;
  whatsapp?: string | null;
  cpfCnpj?: string | null;
  necessidade?: string | null;
  mediaKwhMes?: number | null;
  contaEnergiaUrl?: string | null;
  /** Até 8 URLs de anexos (conta de energia, fotos, PDFs) */
  anexosUrls?: string[] | null;
  observacoesTecnicas?: string | null;
  viabilidadeTecnica?: boolean | null;
  condicoesNaoAtender?: string | null;
  observacoes?: string | null;
  status: ContatoLeadStatus;
  etapa: number;
  clienteId?: string | null;
  cliente?: { id: string; nome: string; cpfCnpj: string } | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Preenchido na listagem do CRM: quantidade de orçamentos vinculados ao lead */
  _count?: { orcamentos?: number };
}

export interface CreateContatoLeadInput {
  nome: string;
  whatsapp?: string;
  cpfCnpj?: string;
  necessidade?: string;
  mediaKwhMes?: number;
  observacoes?: string;
  status?: ContatoLeadStatus;
  etapa?: number;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
}

export interface UpdateContatoLeadInput {
  nome?: string;
  whatsapp?: string;
  cpfCnpj?: string;
  necessidade?: string;
  mediaKwhMes?: number;
  contaEnergiaUrl?: string;
  observacoesTecnicas?: string;
  viabilidadeTecnica?: boolean;
  condicoesNaoAtender?: string;
  observacoes?: string;
  status?: ContatoLeadStatus;
  etapa?: number;
  clienteId?: string | null;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
}

const base = ENDPOINTS.ATENDIMENTO_CRM;

export const atendimentoCrmService = {
  async listar(filters?: { status?: string; etapa?: number }): Promise<{ success: boolean; data: ContatoLead[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.etapa != null) params.set('etapa', String(filters.etapa));
    const url = params.toString() ? `${base}?${params}` : base;
    const res = await axiosApiService.get<ContatoLead[]>(url);
    return res as { success: boolean; data: ContatoLead[] };
  },

  async getById(id: string): Promise<{ success: boolean; data: ContatoLead }> {
    const res = await axiosApiService.get<{ success: boolean; data: ContatoLead }>(`${base}/${id}`);
    return res.data as { success: boolean; data: ContatoLead };
  },

  async criar(data: CreateContatoLeadInput): Promise<{ success: boolean; data: ContatoLead }> {
    const res = await axiosApiService.post<{ success: boolean; data: ContatoLead }>(base, data);
    return res.data as { success: boolean; data: ContatoLead };
  },

  async atualizar(id: string, data: UpdateContatoLeadInput): Promise<{ success: boolean; data: ContatoLead }> {
    const res = await axiosApiService.put<{ success: boolean; data: ContatoLead }>(`${base}/${id}`, data);
    return res.data as { success: boolean; data: ContatoLead };
  },

  async uploadContaEnergia(id: string, files: File[]): Promise<{ success: boolean; data?: ContatoLead; error?: string }> {
    if (!files.length) {
      return { success: true };
    }
    const form = new FormData();
    for (const f of files) {
      form.append('contaEnergia', f);
    }
    const res = await axiosApiService.post<ContatoLead>(`${base}/${id}/upload-conta`, form);
    if (!res.success) {
      return { success: false, error: res.error || res.message };
    }
    return { success: true, data: res.data as ContatoLead };
  },

  async excluir(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await axiosApiService.delete(`${base}/${id}`);
    if (!res.success) {
      return { success: false, error: res.error || res.message };
    }
    return { success: true };
  },
};
