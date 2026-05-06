import * as soap from 'soap';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';

type NFeModoEnvio = 'NORMAL' | 'SVC-AN' | 'SVC-RS';

/**
 * Serviço de Comunicação SOAP com SEFAZ
 * Implementa comunicação mTLS (mutual TLS) com certificado A1
 */
export class NFeSoapService {
  private static readonly cUF_SC = '42';
  private static readonly svrsAutorizacaoProd = 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx?wsdl';
  private static readonly svrsAutorizacaoHom = 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx?wsdl';
  private static readonly svrsStatusProd = 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx?wsdl';
  private static readonly svrsStatusHom = 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx?wsdl';

  private static stripXmlDeclaration(xml: string): string {
    return xml.replace(/^\s*<\?xml[^>]*\?>\s*/i, '').trim();
  }

  private static gerarIdLote(): string {
    return Date.now().toString().slice(-15).padStart(15, '0');
  }

  /**
   * Determina cUF do webservice em uso (SC primário / SVRS fallback / SVAN).
   */
  private static getCUFByWsdl(wsdlUrl: string): string {
    const wsdl = (wsdlUrl || '').toLowerCase();
    if (wsdl.includes('svrs.rs.gov.br')) return '43'; // RS (SVRS)
    if (wsdl.includes('sefazvirtual.fazenda.gov.br')) return '91'; // AN (SVAN/SVC-AN)
    return this.cUF_SC; // SC
  }

  /**
   * Aplica cabeçalho SOAP nfeCabecMsg exigido pelos serviços NF-e.
   */
  private static aplicarCabecalhoNFe(client: any, wsdlUrl: string, cUF: string) {
    const wsdl = wsdlUrl || '';
    let namespace = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
    if (/NfeStatusServico4|NFeStatusServico4/i.test(wsdl)) {
      namespace = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4';
    } else if (/NFeAutorizacao4|NfeAutorizacao4/i.test(wsdl)) {
      namespace = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
    }

    const cabecalho = `<nfeCabecMsg xmlns="${namespace}"><cUF>${cUF}</cUF><versaoDados>4.00</versaoDados></nfeCabecMsg>`;
    try {
      if (typeof client.clearSoapHeaders === 'function') {
        client.clearSoapHeaders();
      }
      client.addSoapHeader(cabecalho);
      console.log('🧾 [SOAP Header] nfeCabecMsg aplicado:', { cUF, namespace });
    } catch (error) {
      console.warn('⚠️ Falha ao aplicar nfeCabecMsg no cliente SOAP:', error);
    }
  }

  private static getAutorizacaoWsdlCandidates(
    ambiente: '1' | '2',
    modo: NFeModoEnvio
  ): string[] {
    // Prioriza endpoint oficial de SC; mantém SVRS como fallback automático.
    const scNormalUrl =
      process.env.NFE_SC_AUT_WSDL ||
      (ambiente === '1'
        ? 'https://nfe.faz.sc.gov.br/NFe/NFeAutorizacao4?wsdl'
        : 'https://nfe-homolog.faz.sc.gov.br/NFe/NFeAutorizacao4?wsdl');
    const svrsNormalUrl = ambiente === '1' ? this.svrsAutorizacaoProd : this.svrsAutorizacaoHom;

    if (modo === 'SVC-AN') {
      return [process.env.NFE_SVC_AN_AUT_WSDL || svrsNormalUrl];
    }

    if (modo === 'SVC-RS') {
      return [process.env.NFE_SVC_RS_AUT_WSDL || svrsNormalUrl];
    }

    return [scNormalUrl, svrsNormalUrl];
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

  private static getStatusServicoWsdlCandidates(
    ambiente: '1' | '2',
    modo: NFeModoEnvio
  ): string[] {
    // Prioriza endpoint oficial de SC para status; SVRS permanece como fallback.
    const scStatusUrl =
      process.env.NFE_SC_STATUS_WSDL ||
      (ambiente === '1'
        ? 'https://nfe.faz.sc.gov.br/NFe/NFeStatusServico4?wsdl'
        : 'https://nfe-homolog.faz.sc.gov.br/NFe/NFeStatusServico4?wsdl');
    const svrsStatusUrl = ambiente === '1' ? this.svrsStatusProd : this.svrsStatusHom;

    if (modo === 'SVC-AN') {
      return [process.env.NFE_SVC_AN_STATUS_WSDL || svrsStatusUrl];
    }

    if (modo === 'SVC-RS') {
      return [process.env.NFE_SVC_RS_STATUS_WSDL || svrsStatusUrl];
    }

    return [scStatusUrl, svrsStatusUrl];
  }

  private static async criarClienteSOAPComFallback(
    wsdlCandidates: string[],
    certPem: string,
    keyPem: string,
    opts?: { pfxPath?: string; pfxPassword?: string }
  ): Promise<{ client: any; wsdl: string }> {
    let ultimoErro: any;
    for (const wsdl of wsdlCandidates) {
      try {
        const client = await this.criarClienteSOAP(wsdl, certPem, keyPem, opts);
        return { client, wsdl };
      } catch (error) {
        ultimoErro = error;
        console.warn('⚠️ Falha ao criar cliente SOAP para WSDL, tentando fallback:', wsdl);
      }
    }
    throw ultimoErro || new Error('Não foi possível criar cliente SOAP em nenhum endpoint.');
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
   * @param opts Opcional: { pfxPath, pfxPassword } — quando informado, o agent usa o PFX (cadeia completa), recomendado para SEFAZ
   */
  static async criarClienteSOAP(
    wsdlUrl: string,
    certPem: string,
    keyPem: string,
    opts?: { pfxPath?: string; pfxPassword?: string }
  ): Promise<any> {
    try {
      // Preferir PFX passado pelo caller (certificado da empresa); senão ENV; senão cert/key PEM
      let finalCertPem = certPem;
      let finalKeyPem = keyPem;

      const pfxPath = opts?.pfxPath || process.env.NFE_CERT_PFX_PATH;
      const pfxPassword = opts?.pfxPassword ?? process.env.NFE_CERT_PFX_PASSWORD ?? '';

      let pfxBinary: string | null = null;
      let pfxBuffer: Buffer | null = null;
      if (pfxPath) {
        pfxBinary = fs.readFileSync(pfxPath, { encoding: 'binary' });
        pfxBuffer = Buffer.from(pfxBinary, 'binary');
        console.log('🔐 [NFE TLS] PFX path:', pfxPath);
        console.log('🔐 [NFE TLS] Tamanho do PFX (bytes):', pfxBuffer ? pfxBuffer.length : 0);
        const p12Asn1 = forge.asn1.fromDer(pfxBinary);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pfxPassword);

        let extractedKey: any = null;
        let extractedCert: any = null;

        for (const safeContent of p12.safeContents || []) {
          for (const safeBag of safeContent.safeBags || []) {
            // chave privada
            if (
              safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag ||
              safeBag.type === forge.pki.oids.keyBag
            ) {
              extractedKey = safeBag.key || extractedKey;
            }
            // certificado
            if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
              extractedCert = safeBag.cert;
            }
          }
        }

        if (!extractedCert || !extractedKey) {
          throw new Error('PFX inválido: não foi possível extrair cert/key do arquivo PFX');
        }

        finalCertPem = forge.pki.certificateToPem(extractedCert);
        finalKeyPem = forge.pki.privateKeyToPem(extractedKey);
      }

      // Criar opções HTTPS com certificado mTLS.
      // CAs ICP-Brasil (v5, v6, v7, v10, v11, v12) em certs/ca-bundle-br.pem
      const caPath = path.join(process.cwd(), 'certs', 'ca-bundle-br.pem');
      const caBundle = fs.readFileSync(caPath);
      if (process.env.NFE_TLS_DEBUG !== 'false') {
        console.log('🔐 [NFE TLS] CA bundle ICP-Brasil carregado:', caPath);
      }

      const httpsAgentOptions: any = {
        ca: caBundle,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      };
      if (pfxBuffer != null) {
        // Usar PFX diretamente (preferível para mTLS) — passphrase pode ser string vazia
        httpsAgentOptions.pfx = pfxBuffer;
        httpsAgentOptions.passphrase = pfxPassword;
      } else {
        // Fallback: usar cert/key em PEM
        httpsAgentOptions.cert = finalCertPem;
        httpsAgentOptions.key = finalKeyPem;
      }
      const httpsAgent = new https.Agent(httpsAgentOptions);

      // Criar cliente SOAP com o agente HTTPS personalizado (mTLS + CA ICP-Brasil).
      // Passar agent e httpsAgent: algumas versões do node-soap usam um ou outro na carga do WSDL.
      // 403 ao buscar WSDL pode ocorrer em ambiente local/Docker (IP residencial); em produção o mesmo código costuma funcionar.
      let client: any;
      try {
        client = await soap.createClientAsync(wsdlUrl, {
          wsdl_options: {
            agent: httpsAgent,
            httpsAgent: httpsAgent,
            rejectUnauthorized: true
          }
        });
      } catch (createErr: any) {
        // Log detalhado para problemas TLS/SSL
        console.error('❌ Falha ao criar cliente SOAP (tentativa 1):', createErr && createErr.message ? createErr.message : createErr);
        if (process.env.NFE_TLS_DEBUG !== 'false') {
          console.error('--- DEBUG: detalhes do erro de criação do cliente SOAP ---');
          console.error('WSDL:', wsdlUrl);
          console.error('Erro.code:', createErr?.code);
          console.error('Erro.stack:', createErr?.stack);
          try {
            // Log fingerprint do cert cliente para ajudar debug
            const certObj = forge.pki.certificateFromPem(finalCertPem);
            const asn1 = forge.pki.certificateToAsn1(certObj);
            const der = forge.asn1.toDer(asn1).getBytes();
            const sha1 = forge.md.sha1.create().update(der).digest().toHex();
            console.error('Client cert SHA1 fingerprint (hex):', sha1);
          } catch (ferr) {
            console.warn('⚠️ Não foi possível calcular fingerprint do certificado cliente:', ferr);
          }
          console.error('--- fim debug ---');
        }

        // Tentativa de fallback: recriar cliente forçando opções extra (garantir agent)
        try {
          console.log('🔁 Tentando fallback: recriar cliente SOAP forçando agent HTTPS (fallback).');
          client = await soap.createClientAsync(wsdlUrl, {
            wsdl_options: {
              agent: httpsAgent,
              httpsAgent: httpsAgent,
              rejectUnauthorized: false,
              strictSSL: false
            }
          });
        } catch (fallbackErr: any) {
          console.error('❌ Fallback também falhou ao criar cliente SOAP:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
          throw fallbackErr;
        }
      }

      // NOTA: NÃO usamos ClientSSLSecurity aqui pois ela espera *caminhos de arquivo*,
      // não strings PEM diretamente — isso causaria ENAMETOOLONG no SO.
      // O httpsAgent já está configurado com pfx/cert/key para autenticação mTLS,
      // então não é necessário chamar setSecurity.
      
      // Forçar uso do httpsAgent em todas as requisições SOAP subsequentes.
      // O node-soap usa Axios; no adapter Node o Axios espera "httpsAgent" (não só "agent").
      // Garantir ambos para compatibilidade e que o mTLS seja aplicado em cada chamada.
      try {
        if (client && client.httpClient && typeof client.httpClient.request === 'function') {
          const originalRequest = client.httpClient.request.bind(client.httpClient);
          client.httpClient.request = (rurl: any, data: any, callback: any, exheaders?: any, exoptions?: any) => {
            exoptions = exoptions || {};
            exoptions.httpsAgent = httpsAgent;
            exoptions.agent = httpsAgent;
            exoptions.rejectUnauthorized = false;
            return originalRequest(rurl, data, callback, exheaders, exoptions);
          };
        }
      } catch (patchErr) {
        console.warn('⚠️ Falha ao forçar agente HTTPS no cliente SOAP:', patchErr);
      }
      
      // Extra: expor informações úteis para debug no ambiente (quando habilitado)
      if (process.env.NFE_TLS_DEBUG !== 'false') {
        console.log('🔒 Cliente SOAP criado com sucesso.', {
          wsdl: wsdlUrl,
          agentRejectUnauthorized: false,
          certPresent: !!finalCertPem,
          keyPresent: !!finalKeyPem
        });
      }

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
    modo: NFeModoEnvio = 'NORMAL',
    pfxPath?: string,
    pfxPassword?: string
  ): Promise<{
    sucesso: boolean;
    recibo?: string;
    protocolo?: string;
    erro?: string;
    codigoStatus?: string;
    mensagem?: string;
  }> {
    try {
      const certOpts = pfxPath ? { pfxPath, pfxPassword: pfxPassword ?? '' } : undefined;
      // 0. Verificar status do serviço da SEFAZ antes de enviar (apenas modo NORMAL); pode ser pulado com NFE_SKIP_STATUS_CHECK=1
      if (modo === 'NORMAL' && process.env.NFE_SKIP_STATUS_CHECK !== '1') {
        console.log('🔍 Verificando status do serviço da SEFAZ...');
        const status = await this.consultarStatusServico(ambiente, certPem, keyPem, modo, pfxPath, pfxPassword);
        if (!status.online) {
          const codigo = status.codigoStatus || '';
          const msg = status.mensagem || 'Serviço da SEFAZ indisponível para autorização de NF-e';
          const isRejeicaoSchema = codigo === '215' || (msg && /schema|Schema/i.test(msg));
          const erroMsg = isRejeicaoSchema
            ? `Rejeição SEFAZ (${codigo}): ${msg}`
            : `SEFAZ indisponível: ${msg}`;
          console.warn('⚠️ Status SEFAZ não permitiu envio:', erroMsg);
          return {
            sucesso: false,
            erro: erroMsg,
            codigoStatus: status.codigoStatus,
            mensagem: status.mensagem
          };
        }
      } else if (modo === 'NORMAL' && process.env.NFE_SKIP_STATUS_CHECK === '1') {
        console.log('⚠️ NFE_SKIP_STATUS_CHECK=1: pulando consulta de status, enviando NF-e diretamente.');
      }

      // Determinar WSDL baseado no ambiente e modo (SC prioritário com fallback SVRS)
      const wsdlCandidates = this.getAutorizacaoWsdlCandidates(ambiente, modo);
      const { client, wsdl: wsdlUrl } = await this.criarClienteSOAPComFallback(
        wsdlCandidates,
        certPem,
        keyPem,
        certOpts
      );
      console.log('🔗 [NFe SOAP] Endpoint de autorização em uso:', wsdlUrl);
      const cUFAutorizacao = this.getCUFByWsdl(wsdlUrl);
      this.aplicarCabecalhoNFe(client, wsdlUrl, cUFAutorizacao);

      // A SEFAZ exige envio no envelope enviNFe (lote). O XML assinado da NF-e vai dentro deste envelope.
      // Importante: remover declaração XML interna antes de embutir para evitar erro de schema 215.
      const xmlAssinadoSemDeclaracao = this.stripXmlDeclaration(xmlAssinado);
      const idLote = this.gerarIdLote();
      const nfeDadosMsg = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>0</indSinc>${xmlAssinadoSemDeclaracao}</enviNFe>`;

      // A. Auditoria do XML final (pós-assinatura) antes do envio à SEFAZ — diagnóstico erro 215
      const temDeclaracao = /^\s*<\?xml\s+version=/.test(nfeDadosMsg);
      const declaracoes = (nfeDadosMsg.match(/<\?xml\s+version=/g) || []);
      const duplicidadeDeclaracao = declaracoes.length > 1;
      console.log('📋 [AUDIT XML ENVIO] Tamanho:', nfeDadosMsg.length, '| Declaração <?xml presente:', temDeclaracao, '| Duplicidade declaração:', duplicidadeDeclaracao);
      if (!temDeclaracao) console.warn('⚠️ [AUDIT XML ENVIO] XML sem cabeçalho <?xml version="1.0" encoding="UTF-8"?>');
      if (duplicidadeDeclaracao) console.warn('⚠️ [AUDIT XML ENVIO] Mais de uma declaração XML no conteúdo.');
      // Log dos primeiros e últimos 400 caracteres para inspeção sem poluir o log
      console.log('📋 [AUDIT XML ENVIO] Início (400 chars):', nfeDadosMsg.slice(0, 400));
      console.log('📋 [AUDIT XML ENVIO] Fim (400 chars):', nfeDadosMsg.slice(-400));

      // node-soap: XML literal no corpo usa a chave $xml (padrão xmlKey), não _xml — _xml vira elemento inválido e causa 215 na SEFAZ.
      const [result] = await client.nfeAutorizacaoLoteAsync({
        nfeDadosMsg: {
          $xml: nfeDadosMsg
        }
      });

      // DEBUG: Resposta bruta da SEFAZ
      console.log('🔍 DEBUG RESPOSTA BRUTA SEFAZ:', JSON.stringify(result, null, 2));

      // Processar resposta
      const resposta = result.nfeResultMsg;
      const xmlResposta = resposta?._xml || '';
      
      // Parse da resposta (XML)
      // A resposta geralmente vem em formato XML dentro do envelope SOAP
      if (resposta && xmlResposta) {
        // Extrair recibo ou protocolo da resposta
        const reciboMatch = xmlResposta.match(/<nRec>(\d+)<\/nRec>/);
        const recibo = reciboMatch ? reciboMatch[1] : null;

        if (recibo) {
          console.log('✅ Recibo obtido da SEFAZ:', recibo);
          return {
            sucesso: true,
            recibo: recibo
          };
        }
      }

      // Se não encontrou recibo, pode ser que já foi autorizado (protocolo direto)
      const protocoloMatch = xmlResposta?.match(/<protNFe[^>]*>[\s\S]*?<chNFe>(\d{44})<\/chNFe>/);
      if (protocoloMatch) {
        console.log('✅ Protocolo direto obtido da SEFAZ:', protocoloMatch[1]);
        return {
          sucesso: true,
          protocolo: protocoloMatch[1]
        };
      }

      // DEBUG: Sem recibo nem protocolo - mostrar conteúdo da resposta
      console.error(
        '❌ CONTEÚDO DA RESPOSTA (sem recibo/protocolo):',
        xmlResposta || JSON.stringify(result, null, 2)
      );

      // Extrair código de status e motivo de rejeição da SEFAZ
      const cStatMatch = xmlResposta?.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = xmlResposta?.match(/<xMotivo>([^<]+)<\/xMotivo>/);
      const codigoStatus =
        cStatMatch?.[1] ||
        result?.retEnviNFe?.cStat ||
        result?.retConsReciNFe?.cStat;
      const mensagemSefaz =
        xMotivoMatch?.[1] ||
        result?.retEnviNFe?.xMotivo ||
        result?.retConsReciNFe?.xMotivo;

      if (codigoStatus || mensagemSefaz) {
        console.error(`❌ SEFAZ retornou: cStat=${codigoStatus} | xMotivo=${mensagemSefaz}`);
        return {
          sucesso: false,
          codigoStatus,
          mensagem: mensagemSefaz,
          erro: mensagemSefaz 
            ? `Rejeição SEFAZ (${codigoStatus}): ${mensagemSefaz}` 
            : `Rejeição SEFAZ: código ${codigoStatus}`
        };
      }

      return {
        sucesso: false,
        erro: 'Resposta da SEFAZ não contém recibo, protocolo ou mensagem de erro'
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
    keyPem: string,
    pfxPath?: string,
    pfxPassword?: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    chaveAcesso?: string;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const certOpts = pfxPath ? { pfxPath, pfxPassword: pfxPassword ?? '' } : undefined;
      // Determinar WSDL (usa sempre ambiente NORMAL para retorno, mesmo se enviado via SVC)
      const wsdlUrl = this.getRetAutorizacaoWsdl(ambiente, 'NORMAL');

      // Criar cliente SOAP (usar PFX quando informado)
      const client = await this.criarClienteSOAP(wsdlUrl, certPem, keyPem, certOpts);

      // Chamar método de consulta
      const [result] = await client.nfeRetAutorizacaoLoteAsync({
        nfeDadosMsg: {
          $xml: `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${ambiente}</tpAmb><nRec>${recibo}</nRec></consReciNFe>`
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
          $xml: xmlConsulta
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
          $xml: xmlEvento
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
          $xml: xmlInut
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
          $xml: xmlEvento
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
    modo: NFeModoEnvio = 'NORMAL',
    pfxPath?: string,
    pfxPassword?: string
  ): Promise<{
    online: boolean;
    codigoStatus?: string;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const wsdlCandidates = this.getStatusServicoWsdlCandidates(ambiente, modo);
      const certOpts = pfxPath ? { pfxPath, pfxPassword: pfxPassword ?? '' } : undefined;
      const { client, wsdl: wsdlUrl } = await this.criarClienteSOAPComFallback(
        wsdlCandidates,
        certPem,
        keyPem,
        certOpts
      );
      console.log('🔗 [NFe SOAP] Endpoint de status em uso:', wsdlUrl);
      const cUFStatus = this.getCUFByWsdl(wsdlUrl);
      this.aplicarCabecalhoNFe(client, wsdlUrl, cUFStatus);

      // consStatServ sem espaços entre tags, no formato esperado pelo manual.
      const xmlStatus = `<?xml version="1.0" encoding="UTF-8"?><consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${ambiente}</tpAmb><cUF>${cUFStatus}</cUF><xServ>STATUS</xServ></consStatServ>`;
      const nsOk = xmlStatus.includes('xmlns="http://www.portalfiscal.inf.br/nfe"');
      const versaoOk = xmlStatus.includes('versao="4.00"');
      console.log('🔍 [Status] XML consStatServ (envio):', xmlStatus);
      console.log('🔍 [AUDIT consStatServ] xmlns presente:', nsOk, '| versao 4.00:', versaoOk);
      if (!nsOk || !versaoOk) console.warn('⚠️ [AUDIT consStatServ] Schema pode rejeitar (215): namespace ou versao ausente.');

      const [result] = await client.nfeStatusServicoNFAsync({
        nfeDadosMsg: {
          $xml: xmlStatus
        }
      });

      // DEBUG: Resposta bruta do status
      console.log('🔍 DEBUG RESPOSTA STATUS SEFAZ:', JSON.stringify(result, null, 2));

      const resposta = result.nfeResultMsg;
      const xmlResposta = resposta?._xml || '';
      const cStatMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
      const codigoStatus =
        cStatMatch?.[1] ||
        result?.retConsStatServ?.cStat;
      const mensagem =
        xMotivoMatch?.[1] ||
        result?.retConsStatServ?.xMotivo;

      if (codigoStatus || mensagem) {
        const online = codigoStatus === '107';

        console.log(`📊 Status SEFAZ: cStat=${codigoStatus} | online=${online} | xMotivo=${mensagem}`);
        if (!online && codigoStatus) {
          console.warn(`⚠️ [Status] Rejeição ${codigoStatus}: ${mensagem || '(sem xMotivo)'}`);
        }

        // Salvar XML de request/response em data/debug para inspeção (quando falha ou NFE_DEBUG_XML=1)
        if ((!online || process.env.NFE_DEBUG_XML === '1') && process.env.NODE_ENV !== 'production' && xmlResposta) {
          try {
            const debugDir = path.join(process.cwd(), 'data', 'debug');
            fs.mkdirSync(debugDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            fs.writeFileSync(path.join(debugDir, `status-request-${ts}.xml`), xmlStatus, 'utf8');
            fs.writeFileSync(path.join(debugDir, `status-response-${ts}.xml`), xmlResposta, 'utf8');
            console.log(`📁 [Status] XMLs salvos em ${debugDir}`);
          } catch (e) {
            // ignorar falha de escrita
          }
        }

        return {
          online,
          codigoStatus,
          mensagem
        };
      }

      console.error('❌ Resposta de status da SEFAZ vazia ou inválida:', xmlResposta?.substring(0, 500));
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

