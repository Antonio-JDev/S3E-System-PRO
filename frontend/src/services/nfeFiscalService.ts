import { axiosApiService } from './axiosApi';

/**
 * Interfaces
 */
export interface EmissaoNFeRequest {
  pedidoId: string;
  empresaId: string;
}

export interface CancelamentoNFeRequest {
  chaveAcesso: string;
  justificativa: string;
  empresaId: string;
}

export interface CorrecaoNFeRequest {
  chaveAcesso: string;
  textoCorrecao: string;
  sequencia?: number;
  empresaId: string;
}

export interface InutilizacaoNFeRequest {
  empresaId: string;
  ano: string;
  modelo?: string;
  serie: string;
  numeroInicial: string;
  numeroFinal: string;
  justificativa: string;
  ambiente?: '1' | '2';
}

export interface ManifestacaoNFeRequest {
  empresaId: string;
  chaveAcesso: string;
  tipoEvento: '210200' | '210210' | '210220' | '210240';
  justificativa?: string;
  ambiente?: '1' | '2';
}

export interface ConfigFiscalRequest {
  certificadoPFX: string; // Base64
  senhaCertificado: string;
  ambienteFiscal: '1' | '2'; // 1=Produção, 2=Homologação
}

export interface NFeResponse {
  chaveAcesso: string;
  protocolo: string;
  dataAutorizacao: string;
  mensagem: string;
  xml?: string;
}

export interface ConsultaNFeResponse {
  chaveAcesso: string;
  situacao: string;
  protocolo: string;
  dataAutorizacao: string;
  codigoStatus: string;
  mensagem: string;
}

/**
 * Service para operações fiscais de NF-e
 */
class NFeFiscalService {
  /**
   * Emitir NF-e a partir de um pedido
   */
  async emitirNFe(data: EmissaoNFeRequest) {
    console.log('📤 Emitindo NF-e:', data);
    return axiosApiService.post<NFeResponse>('/api/nfe/emitir', data);
  }

  /**
   * Faturamento fracionado: N NF-es para N clientes a partir de um pedido
   */
  async emitirFracionado(data: {
    vendaId: string;
    empresaId: string;
    ambiente?: '1' | '2';
    cfop?: string;
    naturezaOperacao?: string;
    serie?: string;
    fracoes: Array<{ clienteId: string; valor: number; dataVencimento: string }>;
  }) {
    return axiosApiService.post<{ success: boolean; notas: any[]; valorFaturado: number }>('/api/nfe/emitir-fracionado', data);
  }

  /**
   * Cancelar NF-e autorizada
   */
  async cancelarNFe(data: CancelamentoNFeRequest) {
    console.log('🚫 Cancelando NF-e:', data);
    return axiosApiService.post<any>('/api/nfe/cancelar', data);
  }

  /**
   * Enviar Carta de Correção (CC-e)
   */
  async corrigirNFe(data: CorrecaoNFeRequest) {
    console.log('📝 Enviando CC-e:', data);
    return axiosApiService.post<any>('/api/nfe/corrigir', data);
  }

  /**
   * Salvar configurações fiscais (certificado e ambiente)
   */
  async salvarConfigFiscal(data: ConfigFiscalRequest) {
    console.log('🔧 Salvando configurações fiscais');
    return axiosApiService.post<any>('/api/nfe/config', data);
  }

  /** Atualiza último número NF-e e/ou série NF-e da empresa (sincronização manual) */
  async configurarNumeracaoNFe(empresaId: string, dados: { ultimoNumeroNFe?: number; serieNFe?: string }) {
    return axiosApiService.patch(`/api/empresas/${empresaId}/numero-nfe`, dados);
  }

  /**
   * Consultar status de NF-e na SEFAZ
   */
  async consultarNFe(chaveAcesso: string, empresaId: string, ambiente: '1' | '2' = '2') {
    console.log('🔍 Consultando NF-e:', chaveAcesso);
    return axiosApiService.get<ConsultaNFeResponse>(`/api/nfe/consultar/${chaveAcesso}`, {
      params: { empresaId, ambiente }
    });
  }

  /**
   * Inutilizar faixa de numeração de NF-e
   */
  async inutilizarNumeracao(data: InutilizacaoNFeRequest) {
    console.log('🚫 Inutilizando numeração:', data);
    return axiosApiService.post<any>('/api/nfe/inutilizar', data);
  }

  /**
   * Manifestação do destinatário de NF-e
   */
  async manifestarDestinatario(data: ManifestacaoNFeRequest) {
    console.log('📋 Manifestando destinatário:', data);
    return axiosApiService.post<any>('/api/nfe/manifestar', data);
  }

  /**
   * Converter arquivo PFX para Base64
   */
  async converterPFXParaBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:..." se existir
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const nfeFiscalService = new NFeFiscalService();

