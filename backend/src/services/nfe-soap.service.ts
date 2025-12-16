import * as soap from 'soap';
import * as https from 'https';
import * as fs from 'fs';
import * as forge from 'node-forge';

type NFeModoEnvio = 'NORMAL' | 'SVC-AN' | 'SVC-RS';

/**
 * Serviço de Comunicação SOAP com SEFAZ
 * Implementa comunicação mTLS (mutual TLS) com certificado A1
 */
export class NFeSoapService {
  private static readonly cUF_SC = '42';

  private static getAutorizacaoWsdl(
    ambiente: '1' | '2',
    modo: NFeModoEnvio
  ): string {
    // Ambiente padrão SVRS (SC)
    const normalUrl =
      ambiente === '1'
        ? 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx?wsdl'
        : 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx?wsdl';

    if (modo === 'SVC-AN') {
      return process.env.NFE_SVC_AN_AUT_WSDL || normalUrl;
    }

    if (modo === 'SVC-RS') {
      return process.env.NFE_SVC_RS_AUT_WSDL || normalUrl;
    }

    return normalUrl;
  }

  private static getRetAutorizacaoWsdl(
    ambiente: '1' | '2',
    modo: NFeModoEnvio
  ): string {
    const normalUrl =
      ambiente === '1'
        ? 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx?wsdl'
        : 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx?wsdl';

    if (modo === 'SVC-AN') {
      return process.env.NFE_SVC_AN_RETAUT_WSDL || normalUrl;
    }

    if (modo === 'SVC-RS') {
      return process.env.NFE_SVC_RS_RETAUT_WSDL || normalUrl;
    }

    return normalUrl;
  }

  private static getConsultaWsdl(
    ambiente: '1' | '2'
  ): string {
    return ambiente === '1'
      ? 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx?wsdl'
      : 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx?wsdl';
  }

  private static getStatusServicoWsdl(
    ambiente: '1' | '2',
    modo: NFeModoEnvio
  ): string {
    const normalUrl =
      ambiente === '1'
        ? 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx?wsdl'
        : 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx?wsdl';

    if (modo === 'SVC-AN') {
      return process.env.NFE_SVC_AN_STATUS_WSDL || normalUrl;
    }

    if (modo === 'SVC-RS') {
      return process.env.NFE_SVC_RS_STATUS_WSDL || normalUrl;
    }

    return normalUrl;
  }

  /**
   * WSDL de Inutilização de Numeração
   */
  private static getInutilizacaoWsdl(ambiente: '1' | '2'): string {
    return ambiente === '1'
      ? 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao4/nfeinutilizacao4.asmx?wsdl'
      : 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao4/nfeinutilizacao4.asmx?wsdl';
  }

  /**
   * Cria cliente SOAP com autenticação mTLS
   */
  static async criarClienteSOAP(
    wsdlUrl: string,
    certPem: string,
    keyPem: string
  ): Promise<any> {
    try {
      // Converter PEM para formato que o soap aceita
      const cert = forge.pki.certificateFromPem(certPem);
      const key = forge.pki.privateKeyFromPem(keyPem);

      // Criar opções HTTPS com certificado
      const httpsAgent = new https.Agent({
        cert: certPem,
        key: keyPem,
        rejectUnauthorized: true
      });

      // Criar cliente SOAP
      const client = await soap.createClientAsync(wsdlUrl, {
        wsdl_options: {
          httpsAgent: httpsAgent,
          rejectUnauthorized: true
        }
      });

      return client;
    } catch (error: any) {
      console.error('Erro ao criar cliente SOAP:', error);
      throw new Error(`Erro ao criar cliente SOAP: ${error.message}`);
    }
  }

  /**
   * Envia lote de NF-e para autorização
   */
  static async autorizarNFe(
    xmlAssinado: string,
    ambiente: '1' | '2',
    certPem: string,
    keyPem: string,
    modo: NFeModoEnvio = 'NORMAL'
  ): Promise<{
    sucesso: boolean;
    recibo?: string;
    protocolo?: string;
    erro?: string;
    codigoStatus?: string;
    mensagem?: string;
  }> {
    try {
      // 0. Verificar status do serviço da SEFAZ antes de enviar (apenas modo NORMAL)
      if (modo === 'NORMAL') {
        console.log('🔍 Verificando status do serviço da SEFAZ...');
        const status = await this.consultarStatusServico(ambiente, certPem, keyPem, modo);
        if (!status.online) {
          const msg = status.mensagem || 'Serviço da SEFAZ indisponível para autorização de NF-e';
          console.warn('⚠️ SEFAZ indisponível para autorização de NF-e:', msg);
          return {
            sucesso: false,
            erro: `SEFAZ indisponível: ${msg}`,
            codigoStatus: status.codigoStatus,
            mensagem: status.mensagem
          };
        }
      }

      // Determinar WSDL baseado no ambiente e modo
      const wsdlUrl = this.getAutorizacaoWsdl(ambiente, modo);

      // Criar cliente SOAP
      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      // Preparar envelope SOAP
      const nfeDadosMsg = xmlAssinado;

      // Chamar método de autorização
      const [result] = await client.nfeAutorizacaoLoteAsync({
        nfeDadosMsg: {
          _xml: nfeDadosMsg
        }
      });

      // Processar resposta
      const resposta = result.nfeResultMsg;
      
      // Parse da resposta (XML)
      // A resposta geralmente vem em formato XML dentro do envelope SOAP
      if (resposta && resposta._xml) {
        // Extrair recibo ou protocolo da resposta
        const reciboMatch = resposta._xml.match(/<nRec>(\d+)<\/nRec>/);
        const recibo = reciboMatch ? reciboMatch[1] : null;

        if (recibo) {
          return {
            sucesso: true,
            recibo: recibo
          };
        }
      }

      // Se não encontrou recibo, pode ser que já foi autorizado
      const protocoloMatch = resposta?._xml?.match(/<protNFe[^>]*>[\s\S]*?<chNFe>(\d{44})<\/chNFe>/);
      if (protocoloMatch) {
        return {
          sucesso: true,
          protocolo: protocoloMatch[1]
        };
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ não contém recibo ou protocolo válido'
      };
    } catch (error: any) {
      console.error('Erro ao autorizar NF-e:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro ao comunicar com SEFAZ'
      };
    }
  }

  /**
   * Consulta recibo de processamento
   */
  static async consultarRecibo(
    recibo: string,
    ambiente: '1' | '2',
    certPem: string,
    keyPem: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    chaveAcesso?: string;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      // Determinar WSDL (usa sempre ambiente NORMAL para retorno, mesmo se enviado via SVC)
      const wsdlUrl = this.getRetAutorizacaoWsdl(ambiente, 'NORMAL');

      // Criar cliente SOAP
      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      // Chamar método de consulta
      const [result] = await client.nfeRetAutorizacaoLoteAsync({
        nfeDadosMsg: {
          _xml: `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${ambiente}</tpAmb><nRec>${recibo}</nRec></consReciNFe>`
        }
      });

      // Processar resposta
      const resposta = result.nfeResultMsg;
      
      if (resposta && resposta._xml) {
        // Extrair status
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);
        const chNFeMatch = resposta._xml.match(/<chNFe>(\d{44})<\/chNFe>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : null;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : null;
        const chaveAcesso = chNFeMatch ? chNFeMatch[1] : null;

        // 104 = Lote processado com sucesso
        if (codigoStatus === '104') {
          return {
            sucesso: true,
            protocolo: resposta._xml,
            chaveAcesso: chaveAcesso || undefined,
            codigoStatus,
            mensagem: mensagem || undefined
          };
        } else {
          return {
            sucesso: false,
            codigoStatus,
            mensagem: mensagem || 'Erro no processamento',
            erro: `Status ${codigoStatus}: ${mensagem}`
          };
        }
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ inválida'
      };
    } catch (error: any) {
      console.error('Erro ao consultar recibo:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro ao consultar recibo na SEFAZ'
      };
    }
  }

  /**
   * Consulta status de uma NF-e pela chave de acesso
   */
  static async consultarNFe(
    chaveAcesso: string,
    ambiente: '1' | '2',
    certPem: string,
    keyPem: string
  ): Promise<{
    sucesso: boolean;
    situacao?: string;
    protocolo?: string;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      // Determinar WSDL
      const wsdlUrl = this.getConsultaWsdl(ambiente);

      // Criar cliente SOAP
      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      // Montar XML de consulta
      const xmlConsulta = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chaveAcesso}</chNFe></consSitNFe>`;

      // Chamar método
      const [result] = await client.nfeConsultaNFAsync({
        nfeDadosMsg: {
          _xml: xmlConsulta
        }
      });

      // Processar resposta
      const resposta = result.nfeResultMsg;
      
      if (resposta && resposta._xml) {
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : null;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : null;

        return {
          sucesso: true,
          situacao: mensagem || undefined,
          protocolo: resposta._xml,
          codigoStatus: codigoStatus || undefined,
          mensagem: mensagem || undefined
        };
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ inválida'
      };
    } catch (error: any) {
      console.error('Erro ao consultar NF-e:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro ao consultar NF-e na SEFAZ'
      };
    }
  }

  /**
   * Cancela uma NF-e autorizada
   */
  static async cancelarNFe(
    chaveAcesso: string,
    justificativa: string,
    ambiente: '1' | '2',
    certPem: string,
    keyPem: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      // Determinar WSDL
      const wsdlUrl = ambiente === '1'
        ? 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx?wsdl'
        : 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx?wsdl';

      // Criar cliente SOAP
      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      // Montar XML de cancelamento (será assinado antes)
      // Por enquanto, retornar estrutura básica
      const xmlEvento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <infEvento Id="ID110111${chaveAcesso}01">
          <cOrgao>42</cOrgao>
          <tpAmb>${ambiente}</tpAmb>
          <chNFe>${chaveAcesso}</chNFe>
          <dhEvento>${new Date().toISOString()}</dhEvento>
          <tpEvento>110111</tpEvento>
          <nSeqEvento>1</nSeqEvento>
          <verEvento>1.00</verEvento>
          <detEvento versao="1.00">
            <descEvento>Cancelamento</descEvento>
            <xJust>${justificativa}</xJust>
          </detEvento>
        </infEvento>
      </evento>`;

      // Chamar método (o XML já deve estar assinado)
      const [result] = await client.nfeRecepcaoEventoAsync({
        nfeDadosMsg: {
          _xml: xmlEvento
        }
      });

      // Processar resposta
      const resposta = result.nfeResultMsg;
      
      if (resposta && resposta._xml) {
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : null;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : null;

        // 135 = Evento registrado e vinculado à NF-e
        if (codigoStatus === '135') {
          return {
            sucesso: true,
            protocolo: resposta._xml,
            codigoStatus,
            mensagem: mensagem || undefined
          };
        } else {
          return {
            sucesso: false,
            codigoStatus,
            mensagem: mensagem || 'Erro no cancelamento',
            erro: `Status ${codigoStatus}: ${mensagem}`
          };
        }
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ inválida'
      };
    } catch (error: any) {
      console.error('Erro ao cancelar NF-e:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro ao cancelar NF-e na SEFAZ'
      };
    }
  }

  /**
   * Inutiliza uma faixa de numeração de NF-e
   */
  static async inutilizarNumeracao(
    params: {
      cnpj: string;
      ano: string;
      modelo: string;
      serie: string;
      numeroInicial: string;
      numeroFinal: string;
      justificativa: string;
      ambiente: '1' | '2';
    },
    certPem: string,
    keyPem: string
  ): Promise<{
    sucesso: boolean;
    codigoStatus?: string;
    mensagem?: string;
    protocolo?: string;
    erro?: string;
  }> {
    const { cnpj, ano, modelo, serie, numeroInicial, numeroFinal, justificativa, ambiente } =
      params;

    try {
      const wsdlUrl = this.getInutilizacaoWsdl(ambiente);

      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      // cUF fixo SC (42) por enquanto
      const cUF = this.cUF_SC;

      const id = `ID${cUF}${ano}${cnpj}${modelo}${serie}${numeroInicial
        .padStart(9, '0')}${numeroFinal.padStart(9, '0')}`;

      const xmlInut = `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <infInut Id="${id}">
    <tpAmb>${ambiente}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>${cUF}</cUF>
    <ano>${ano}</ano>
    <CNPJ>${cnpj}</CNPJ>
    <mod>${modelo}</mod>
    <serie>${serie}</serie>
    <nNFIni>${numeroInicial}</nNFIni>
    <nNFFin>${numeroFinal}</nNFFin>
    <xJust>${justificativa}</xJust>
  </infInut>
</inutNFe>`;

      const [result] = await client.nfeInutilizacaoNFAsync({
        nfeDadosMsg: {
          _xml: xmlInut
        }
      });

      const resposta = result.nfeResultMsg;

      if (resposta && resposta._xml) {
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : null;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : null;

        // 102 = Inutilização de número homologado
        if (codigoStatus === '102') {
          return {
            sucesso: true,
            protocolo: resposta._xml,
            codigoStatus,
            mensagem: mensagem || undefined
          };
        }

        return {
          sucesso: false,
          codigoStatus,
          mensagem: mensagem || 'Erro na inutilização',
          erro: `Status ${codigoStatus}: ${mensagem}`
        };
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ inválida na inutilização'
      };
    } catch (error: any) {
      console.error('Erro ao inutilizar numeração de NF-e:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro ao inutilizar numeração na SEFAZ'
      };
    }
  }

  /**
   * Manifestação do destinatário (confirmação, ciência, desconhecimento, operação não realizada)
   */
  static async manifestarDestinatario(
    params: {
      chaveAcesso: string;
      cnpj: string;
      tipoEvento: '210200' | '210210' | '210220' | '210240';
      justificativa?: string;
      ambiente: '1' | '2';
    },
    certPem: string,
    keyPem: string
  ): Promise<{
    sucesso: boolean;
    codigoStatus?: string;
    mensagem?: string;
    protocolo?: string;
    erro?: string;
  }> {
    const { chaveAcesso, cnpj, tipoEvento, justificativa, ambiente } = params;

    try {
      const wsdlUrl =
        ambiente === '1'
          ? 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx?wsdl'
          : 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx?wsdl';

      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      const descEventoMap: Record<string, string> = {
        '210200': 'Confirmacao da Operacao',
        '210210': 'Ciencia da Operacao',
        '210220': 'Desconhecimento da Operacao',
        '210240': 'Operacao nao Realizada'
      };

      const descEvento = descEventoMap[tipoEvento];

      const id = `ID${tipoEvento}${chaveAcesso}01`;

      const xJustXml =
        tipoEvento === '210240' && justificativa
          ? `<xJust>${justificativa}</xJust>`
          : '';

      const xmlEvento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <infEvento Id="${id}">
    <cOrgao>91</cOrgao>
    <tpAmb>${ambiente}</tpAmb>
    <CNPJ>${cnpj}</CNPJ>
    <chNFe>${chaveAcesso}</chNFe>
    <dhEvento>${new Date().toISOString()}</dhEvento>
    <tpEvento>${tipoEvento}</tpEvento>
    <nSeqEvento>1</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>${descEvento}</descEvento>
      ${xJustXml}
    </detEvento>
  </infEvento>
</evento>`;

      const [result] = await client.nfeRecepcaoEventoAsync({
        nfeDadosMsg: {
          _xml: xmlEvento
        }
      });

      const resposta = result.nfeResultMsg;

      if (resposta && resposta._xml) {
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : null;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : null;

        // 135 = Evento registrado e vinculado à NF-e
        if (codigoStatus === '135') {
          return {
            sucesso: true,
            protocolo: resposta._xml,
            codigoStatus,
            mensagem: mensagem || undefined
          };
        }

        return {
          sucesso: false,
          codigoStatus,
          mensagem: mensagem || 'Erro na manifestação',
          erro: `Status ${codigoStatus}: ${mensagem}`
        };
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ inválida na manifestação'
      };
    } catch (error: any) {
      console.error('Erro na manifestação do destinatário:', error);
      return {
        sucesso: false,
        erro: error.message || 'Erro na manifestação do destinatário na SEFAZ'
      };
    }
  }

  /**
   * Consulta o status geral do serviço da SEFAZ (serviço em operação / indisponível)
   * cStat esperado para "Serviço em Operação" = 107
   */
  static async consultarStatusServico(
    ambiente: '1' | '2',
    certPem: string,
    keyPem: string,
    modo: NFeModoEnvio = 'NORMAL'
  ): Promise<{
    online: boolean;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const wsdlUrl = this.getStatusServicoWsdl(ambiente, modo);

      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem);

      const xmlStatus = `<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${ambiente}</tpAmb><cUF>${this.cUF_SC}</cUF><xServ>STATUS</xServ></consStatServ>`;

      const [result] = await client.nfeStatusServicoNFAsync({
        nfeDadosMsg: {
          _xml: xmlStatus
        }
      });

      const resposta = result.nfeResultMsg;

      if (resposta && resposta._xml) {
        const cStatMatch = resposta._xml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = resposta._xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        const codigoStatus = cStatMatch ? cStatMatch[1] : undefined;
        const mensagem = xMotivoMatch ? xMotivoMatch[1] : undefined;

        const online = codigoStatus === '107';

        return {
          online,
          codigoStatus,
          mensagem
        };
      }

      return {
        online: false,
        erro: 'Resposta de status da SEFAZ inválida'
      };
    } catch (error: any) {
      console.error('Erro ao consultar status do serviço da SEFAZ:', error);
      return {
        online: false,
        erro: error.message || 'Erro ao consultar status do serviço da SEFAZ'
      };
    }
  }
}

