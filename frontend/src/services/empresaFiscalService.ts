import { axiosApiService } from './axiosApi';

export interface EmpresaFiscal {
  id: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
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
  certificadoValidade?: string;
  ativo: boolean;
  createdAt: string;
}

export interface CreateEmpresaFiscalData {
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
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
  certificadoBase64?: string;
  certificadoSenha?: string;
}

export interface UpdateEmpresaFiscalData {
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  regimeTributario?: string;
  certificadoBase64?: string;
  certificadoSenha?: string;
}

class EmpresaFiscalService {
  /**
   * Listar todas as empresas fiscais cadastradas
   */
  async listar() {
    return axiosApiService.get<EmpresaFiscal[]>('/api/configuracoes-fiscais');
  }

  /**
   * Buscar empresa fiscal por ID
   */
  async buscarPorId(id: string) {
    return axiosApiService.get<EmpresaFiscal>(`/api/configuracoes-fiscais/${id}`);
  }

  /**
   * Criar nova empresa fiscal
   */
  async criar(data: CreateEmpresaFiscalData) {
    return axiosApiService.post<EmpresaFiscal>('/api/configuracoes-fiscais', data);
  }

  /**
   * Atualizar empresa fiscal existente
   */
  async atualizar(id: string, data: UpdateEmpresaFiscalData) {
    return axiosApiService.put<EmpresaFiscal>(`/api/configuracoes-fiscais/${id}`, data);
  }

  /**
   * Deletar empresa fiscal
   */
  async deletar(id: string) {
    return axiosApiService.delete(`/api/configuracoes-fiscais/${id}`);
  }

  /**
   * Converter arquivo de certificado para Base64
   */
  async converterCertificadoParaBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:application/x-pkcs12;base64," ou similar
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const empresaFiscalService = new EmpresaFiscalService();

