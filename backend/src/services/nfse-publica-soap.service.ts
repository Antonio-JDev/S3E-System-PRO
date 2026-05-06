/**
 * Serviço SOAP NFS-e Pública Informática (Itajaí/SC)
 * Regras: SOAPAction com nome exato do método; XML de negócio em <XML><![CDATA[ ... ]]></XML>
 * Certificado ICP-Brasil para autenticação da conexão (mTLS).
 */

import * as https from 'https';
import * as http from 'http';
import { X509Certificate } from 'crypto';

const WSDL_OPERACOES_HOMOLOG =
  'http://nfse-teste.publica.inf.br/homologa_nfse_integracao/Services?wsdl';
const WSDL_CONSULTAS_HOMOLOG =
  'http://nfse-teste.publica.inf.br/homologa_nfse_integracao/Consultas?wsdl';

/** URL do endpoint de operações (POST) - sem ?wsdl para envio */
function getUrlOperacoes(homolog: boolean): string {
  return homolog
    ? 'https://nfse-teste.publica.inf.br/homologa_nfse_integracao/Services'
    : process.env.NFSE_PUBLICA_URL_SERVICES || 'https://nfse.publica.inf.br/nfse_integracao/Services';
}

function getUrlConsultas(homolog: boolean): string {
  return homolog
    ? 'https://nfse-teste.publica.inf.br/homologa_nfse_integracao/Consultas'
    : process.env.NFSE_PUBLICA_URL_CONSULTAS || 'https://nfse.publica.inf.br/nfse_integracao/Consultas';
}

/**
 * Monta o envelope SOAP com o XML de negócio dentro de <XML><![CDATA[ ... ]]></XML>
 */
function envelopeSoap(metodo: string, xmlNegocio: string): string {
  const cdata = xmlNegocio
    .replace(/]]>/g, ']]]]><![CDATA[>')
    .replace(/<!\[CDATA\[/g, '');
  // Monta envelope SOAP com prefixo ser (namespace do serviço pública) conforme manual
  // NOTE: serviço pública usa targetNamespace ending with a trailing slash.
  // Use the exact namespace with trailing slash to match WSDL: http://service.nfse.integracao.ws.publica/
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:ser="http://service.nfse.integracao.ws.publica/">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    `<ser:${metodo}>` +
    '<XML><![CDATA[' +
    xmlNegocio +
    ']]></XML>' +
    `</ser:${metodo}>` +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  );
}

/**
 * Faz POST SOAP com SOAPAction e certificado (mTLS).
 */
function postSoap(
  url: string,
  soapAction: string,
  body: string,
  certPem: string,
  keyPem: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';

    const agent =
      isHttps &&
      new https.Agent({
        cert: certPem,
        key: keyPem,
        rejectUnauthorized: false // Servidores de prefeitura/governo podem usar cadeias que o Node não confia
      });

    const options: https.RequestOptions | http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        // SOAPAction deve conter o nome do método conforme manual (sem chaves). Alguns servidores
        // não aceitam o valor entre aspas, então enviamos sem aspas.
        SOAPAction: soapAction,
        Accept: 'text/xml',
        'User-Agent': 'S3E-System-PRO/1.0',
        'Content-Length': Buffer.byteLength(body, 'utf8')
      },
      ...(isHttps && { agent: agent as https.Agent })
    };

    // Log do SOAP enviado (início) para diagnóstico
    try {
      console.log('[NFS-e] SOAP Request (start):', body.substring(0, 800));
    } catch (_) {}

    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
}

/**
 * Envia lote de RPS (RecepcionarLoteRps) - assíncrono; retorna número do Protocolo.
 */
export async function recepcionarLoteRps(
  xmlAssinado: string,
  homolog: boolean,
  certPem: string,
  keyPem: string
): Promise<{ sucesso: boolean; protocolo?: string; erro?: string; xmlResposta?: string }> {
  const url = getUrlOperacoes(homolog);
  const metodo = 'RecepcionarLoteRps';
  const body = envelopeSoap(metodo, xmlAssinado);

  try {
    // Log subject do certificado (facilita diagnostico de autorização)
    try {
      const x509 = new X509Certificate(certPem);
      console.log('🔐 [NFS-e] Certificado subject:', x509.subject);
      console.log('🔐 [NFS-e] Certificado issuer:', x509.issuer);
    } catch (e) {
      console.warn('[NFS-e] Falha ao parsear certificado para extrair subject:', e instanceof Error ? e.message : String(e));
    }

    const resposta = await postSoap(url, metodo, body, certPem, keyPem);

    const protocoloMatch = resposta.match(/<NumeroProtocolo[^>]*>([^<]+)<\/NumeroProtocolo>/i);
    const protocolo = protocoloMatch ? protocoloMatch[1].trim() : undefined;

    // Primeiro, tentar extrair Mensagem/Codigo diretamente
    const erroMatch = resposta.match(/<Mensagem[^>]*>([^<]+)<\/Mensagem>/i);
    const codigoMatch = resposta.match(/<Codigo[^>]*>([^<]+)<\/Codigo>/i);
    const mensagem = erroMatch ? erroMatch[1].trim() : undefined;
    const codigo = codigoMatch ? codigoMatch[1].trim() : undefined;

    // Se não houver protocolo, verificar se o corpo contém um <return> com XML escapado (ListaMensagemRetorno)
    if (!protocolo) {
      const returnMatch = resposta.match(/<return>([\s\S]*?)<\/return>/i);
      if (returnMatch && returnMatch[1]) {
        // Unescape HTML entities (&lt; &gt; &amp;)
        const unescaped = returnMatch[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        // Log decoded retorno para diagnóstico
        console.log('[NFS-e] Conteúdo decodificado do <return>:', unescaped.substring(0, 2000));
        // Procurar ListaMensagemRetorno / MensagemRetorno
        const codigoInner = (unescaped.match(/<Codigo[^>]*>([^<]+)<\/Codigo>/i) || [])[1];
        const mensagemInner = (unescaped.match(/<Mensagem[^>]*>([^<]+)<\/Mensagem>/i) || [])[1];
        if (codigoInner || mensagemInner) {
          const erroTexto = `${codigoInner ? codigoInner.trim() : ''}${codigoInner && mensagemInner ? ': ' : ''}${mensagemInner ? mensagemInner.trim() : ''}`.trim();
          return { sucesso: false, erro: erroTexto || 'Erro retornado pelo servidor', xmlResposta: resposta };
        }
      }
    }

    if (protocolo) {
      return { sucesso: true, protocolo, xmlResposta: resposta };
    }
    // Log completo da resposta em erro para diagnóstico (prefeitura devolve XML com Mensagem/Codigo)
    console.error('[NFS-e] Resposta do servidor (sem protocolo):', resposta?.substring?.(0, 2000) || resposta);
    return {
      sucesso: false,
      erro: codigo && mensagem ? `${codigo}: ${mensagem}` : mensagem || 'Resposta sem protocolo',
      xmlResposta: resposta
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[NFS-e] Erro na requisição SOAP:', msg);
    return { sucesso: false, erro: msg };
  }
}

/**
 * Consulta resultado do processamento do lote (ConsultarLoteRps).
 */
export async function consultarLoteRps(
  numeroProtocolo: string,
  cnpjPrestador: string,
  inscricaoMunicipal: string,
  homolog: boolean,
  certPem: string,
  keyPem: string
): Promise<{
  sucesso: boolean;
  situacao?: string;
  listaNfse?: Array<{ numero: string; codigoVerificacao?: string; xml?: string }>;
  erro?: string;
  xmlResposta?: string;
}> {
  const url = getUrlConsultas(homolog);
  const metodo = 'ConsultarLoteRps';
  const cnpj = cnpjPrestador.replace(/\D/g, '');
  const xmlConsulta =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ConsultarLoteRpsEnvio xmlns="http://www.publica.inf.br">` +
    `<Prestador><Cnpj>${cnpj}</Cnpj><InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal></Prestador>` +
    `<Protocolo>${numeroProtocolo}</Protocolo>` +
    `</ConsultarLoteRpsEnvio>`;
  const body = envelopeSoap(metodo, xmlConsulta);

  try {
    const resposta = await postSoap(url, metodo, body, certPem, keyPem);

    const situacaoMatch = resposta.match(/<Situacao[^>]*>([^<]+)<\/Situacao>/i);
    const situacao = situacaoMatch ? situacaoMatch[1].trim() : undefined;

    const numeros = resposta.match(/<NumeroNfse>([^<]+)<\/NumeroNfse>/gi) || [];
    const codigos = resposta.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/gi) || [];
    const listaNfse = numeros.map((_, i) => ({
      numero: numeros[i]?.replace(/<\/?NumeroNfse>/gi, '')?.trim() || '',
      codigoVerificacao: codigos[i]?.replace(/<\/?CodigoVerificacao>/gi, '')?.trim()
    }));

    const erroMatch = resposta.match(/<Mensagem[^>]*>([^<]+)<\/Mensagem>/i);
    const mensagem = erroMatch ? erroMatch[1].trim() : undefined;

    if (mensagem && (resposta.includes('E86') || resposta.includes('Protocolo inexistente'))) {
      return { sucesso: false, erro: 'E86: Protocolo inexistente', xmlResposta: resposta };
    }

    return {
      sucesso: !!situacao || listaNfse.length > 0,
      situacao,
      listaNfse: listaNfse.length ? listaNfse : undefined,
      erro: mensagem && !situacao ? mensagem : undefined,
      xmlResposta: resposta
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sucesso: false, erro: msg };
  }
}

/**
 * Cancelamento síncrono (CancelarNfse). Requer XML do PedidoCancelamento assinado.
 */
export async function cancelarNfse(
  xmlPedidoCancelamentoAssinado: string,
  homolog: boolean,
  certPem: string,
  keyPem: string
): Promise<{ sucesso: boolean; erro?: string; xmlResposta?: string }> {
  const url = getUrlOperacoes(homolog);
  const metodo = 'CancelarNfse';
  const body = envelopeSoap(metodo, xmlPedidoCancelamentoAssinado);

  try {
    const resposta = await postSoap(url, metodo, body, certPem, keyPem);

    const cancelamentoOk =
      /<Cancelamento[^>]*>/i.test(resposta) ||
      /sucesso|ok|processado/i.test(resposta);

    const erroMatch = resposta.match(/<Mensagem[^>]*>([^<]+)<\/Mensagem>/i);
    const codigoMatch = resposta.match(/<Codigo[^>]*>([^<]+)<\/Codigo>/i);
    const mensagem = erroMatch ? erroMatch[1].trim() : undefined;
    const codigo = codigoMatch ? codigoMatch[1].trim() : undefined;

    if (cancelamentoOk && !mensagem) {
      return { sucesso: true, xmlResposta: resposta };
    }
    if (codigo || mensagem) {
      return {
        sucesso: false,
        erro: codigo && mensagem ? `${codigo}: ${mensagem}` : mensagem || 'Erro no cancelamento',
        xmlResposta: resposta
      };
    }
    return { sucesso: false, erro: 'Resposta inválida do servidor', xmlResposta: resposta };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sucesso: false, erro: msg };
  }
}

export { WSDL_OPERACOES_HOMOLOG, WSDL_CONSULTAS_HOMOLOG };
