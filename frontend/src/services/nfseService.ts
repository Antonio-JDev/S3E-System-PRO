import { axiosApiService } from './axiosApi';

export interface PrestadorNfse {
  cnpj: string;
  inscricaoMunicipal: string;
}

export interface TomadorNfse {
  cnpj?: string;
  cpf?: string;
  razaoSocial: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  /** Código IBGE do município (7 dígitos, ex: 4208203 para Itajaí) */
  codigoMunicipio?: string;
  estado?: string;
  cep?: string;
}

export interface ItemServicoNfse {
  itemListaServico: string; // 6 dígitos (ex: 140101). Sem ISS: 990101
  discriminacao: string;
  valorServicos: number;
  issRetido?: 1 | 2;
  codigoMunicipio?: string;
  // Campos adicionais para Valores e complementos (opcionais)
  valorDeducoes?: number;
  valorPis?: number;
  valorCofins?: number;
  valorInss?: number;
  valorIr?: number;
  valorCsll?: number;
  valorIss?: number;
  valorIssRetido?: number;
  outrasRetencoes?: number;
  baseCalculo?: number;
  aliquota?: number;
  valorLiquidoNfse?: number;
  descontoCondicionado?: number;
  descontoIncondicionado?: number;
  unidadeServico?: string;
  tributosFederais?: string;
  tribMun?: string;
  issConstrucaoCivil?: string;
  informacoesComplementares?: string;
  codigoPais?: string;
  codigoMunicipioLocalPrestacao?: string;
  cNBS?: string;
}

export interface RpsNfsePayload {
  numero: number;
  serie: string;
  tipo: number;
  dataEmissao: string; // ISO
  naturezaOperacao: number;
  optanteSimplesNacional: 1 | 2;
  /** 1 = Sim, 2 = Não */
  incentivadorCultural?: 1 | 2;
  servicos: ItemServicoNfse[];
  tomador: TomadorNfse;
}

export interface EnviarLoteNfseRequest {
  empresaId: string;
  numeroLote: number;
  prestador: PrestadorNfse;
  listaRps: RpsNfsePayload[];
  ambiente?: '1' | '2';
  incluirIBSCBS?: boolean;
}

export interface ConsultarProtocoloNfseRequest {
  empresaId: string;
  protocolo: string;
  ambiente?: '1' | '2';
}

export interface CancelarNfseRequest {
  empresaId: string;
  numeroNfse: string;
  justificativa: string;
  ambiente?: '1' | '2';
}

export interface NfseListItem {
  id: string;
  protocolo: string | null;
  numeroNfse: string | null;
  situacao: string;
  createdAt: string;
}

class NfseService {
  async enviarLote(data: EnviarLoteNfseRequest) {
    return axiosApiService.post<{ protocolo: string; nfseId: string }>('/api/nfse/enviar-lote', data);
  }

  async consultarProtocolo(data: ConsultarProtocoloNfseRequest) {
    return axiosApiService.post<{ situacao?: string; listaNfse?: Array<{ numero: string; codigoVerificacao?: string }> }>(
      '/api/nfse/consultar-protocolo',
      data
    );
  }

  async cancelar(data: CancelarNfseRequest) {
    return axiosApiService.post('/api/nfse/cancelar', data);
  }

  async listar(params?: { empresaId?: string; situacao?: string; limit?: number }) {
    return axiosApiService.get<NfseListItem[]>('/api/nfse', params);
  }

  /** Atualiza último RPS enviado e/ou série RPS da empresa (sincronização com site da prefeitura). */
  async configurarNumeracaoRps(empresaId: string, dados: { ultimoRpsEnviado?: number; serieRps?: string }) {
    return axiosApiService.patch<{ message?: string }>('/api/nfse/configurar-numeracao', { empresaId, ...dados });
  }
}

export const nfseService = new NfseService();
