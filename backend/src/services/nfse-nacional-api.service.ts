/**
 * Cliente HTTP da Sefin Nacional (Sistema Nacional NFS-e).
 *
 * URLs publicadas em https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
 * (atualizado em 20/08/2026). O swagger de cada ambiente fica em {base}/docs/index:
 * - Produção:        https://sefin.nfse.gov.br/SefinNacional
 * - Produção restrita (homologação): https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional
 *
 * A produção restrita leva o segmento /API e a produção não. Isso segue a página oficial;
 * não unifique os caminhos.
 *
 * Métodos (manual do contribuinte, API do Emissor Público Nacional, e swagger Sefin Nacional):
 * - POST /nfse                         corpo JSON { dpsXmlGZipB64 }
 * - GET  /nfse/{chaveAcesso}           chave com 50 dígitos
 * - GET  /dps/{id}                     id com 42 dígitos (sem o prefixo DPS)
 * - POST /nfse/{chaveAcesso}/eventos   corpo JSON { pedidoRegistroEventoXmlGZipB64 }
 *
 * Transporte: JSON, XML interno em GZip+Base64, TLS mútuo com o certificado A1 do prestador.
 */

import * as https from 'https';
import * as zlib from 'zlib';
import { extrairNumeroNfseDaChave } from './nfse-nacional-xml.service';

export const URL_PRODUCAO_PADRAO = 'https://sefin.nfse.gov.br/SefinNacional';
export const URL_HOMOLOGACAO_PADRAO = 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional';

export function urlBaseSefinNacional(ambiente: '1' | '2'): string {
  const bruta =
    ambiente === '1'
      ? process.env.NFSE_NACIONAL_URL_PRODUCAO || URL_PRODUCAO_PADRAO
      : process.env.NFSE_NACIONAL_URL_HOMOLOGACAO || URL_HOMOLOGACAO_PADRAO;
  return bruta.replace(/\/+$/, '');
}

export function compactarXmlGzipBase64(xml: string): string {
  return zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
}

export function descompactarGzipBase64(conteudo: string | undefined | null): string | null {
  if (!conteudo) return null;
  try {
    return zlib.gunzipSync(Buffer.from(conteudo, 'base64')).toString('utf8');
  } catch {
    return null;
  }
}

export interface ResultadoSefin {
  sucesso: boolean;
  httpStatus?: number;
  chaveAcesso?: string;
  idDps?: string;
  numeroNfse?: string;
  xmlRetorno?: string;
  erro?: string;
  /** Falha de rede ou 5xx: a fila pode tentar de novo. Rejeição de negócio não. */
  reenviar?: boolean;
}

interface RespostaHttp {
  status: number;
  body: string;
}

function mensagemErros(body: any): string {
  const lista = Array.isArray(body?.erros) ? body.erros : body?.erro ? [body.erro] : [];
  if (!lista.length) {
    return typeof body?.message === 'string' ? body.message : 'A Sefin Nacional recusou a DPS.';
  }
  return lista
    .map((e: any) =>
      [e?.codigo || e?.Codigo, e?.descricao || e?.Descricao || e?.mensagem, e?.complemento || e?.Complemento]
        .filter(Boolean)
        .join(' — ')
    )
    .join('; ');
}

function numeroDoXml(xml: string | null): string | null {
  if (!xml) return null;
  const m = xml.match(/<nNFSe>(\d+)<\/nNFSe>/);
  if (!m) return null;
  return m[1].replace(/^0+/, '') || '0';
}

function interpretarCorpo(status: number, texto: string): ResultadoSefin {
  let json: any = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  const reenviar = status === 0 || status >= 500;
  if (status === 201 || status === 200) {
    const xml = descompactarGzipBase64(json?.nfseXmlGZipB64 || json?.eventoXmlGZipB64);
    const chave = typeof json?.chaveAcesso === 'string' ? json.chaveAcesso.replace(/\D/g, '') : undefined;
    const idDps = typeof (json?.idDps || json?.idDPS) === 'string' ? String(json.idDps || json.idDPS) : undefined;
    return {
      sucesso: true,
      httpStatus: status,
      chaveAcesso: chave,
      idDps,
      numeroNfse: numeroDoXml(xml) || extrairNumeroNfseDaChave(chave) || undefined,
      xmlRetorno: xml || texto,
      reenviar: false
    };
  }
  return {
    sucesso: false,
    httpStatus: status,
    erro: json ? mensagemErros(json) : texto.slice(0, 500) || `HTTP ${status}`,
    idDps: json?.idDPS || json?.idDps,
    reenviar
  };
}

function requisitar(
  method: 'GET' | 'POST' | 'HEAD',
  url: string,
  certPem: string,
  keyPem: string,
  body?: string
): Promise<RespostaHttp> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const agent = new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: process.env.NFSE_NACIONAL_TLS_INSECURE !== '1'
    });
    const req = https.request(
      {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method,
        agent,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'S3E-ERP-NFSeNacional/1.0',
          ...(body
            ? {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(body, 'utf8')
              }
            : {})
        },
        timeout: 60000
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('Tempo esgotado ao falar com a Sefin Nacional.'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function chamar(
  method: 'GET' | 'POST',
  url: string,
  certPem: string,
  keyPem: string,
  body?: string
): Promise<ResultadoSefin> {
  try {
    const resposta = await requisitar(method, url, certPem, keyPem, body);
    return interpretarCorpo(resposta.status, resposta.body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sucesso: false, httpStatus: 0, erro: msg, reenviar: true };
  }
}

/** POST /nfse com a DPS já assinada. */
export async function enviarDpsAssinada(
  xmlAssinado: string,
  ambiente: '1' | '2',
  certPem: string,
  keyPem: string
): Promise<ResultadoSefin> {
  const base = urlBaseSefinNacional(ambiente);
  const payload = JSON.stringify({ dpsXmlGZipB64: compactarXmlGzipBase64(xmlAssinado) });
  return chamar('POST', `${base}/nfse`, certPem, keyPem, payload);
}

/** GET /dps/{id} (42 dígitos) ou GET /nfse/{chave} (50 dígitos). */
export async function consultarDpsOuChave(
  identificador: string,
  ambiente: '1' | '2',
  certPem: string,
  keyPem: string
): Promise<ResultadoSefin> {
  const id = identificador.replace(/\D/g, '');
  const base = urlBaseSefinNacional(ambiente);
  if (id.length === 50) {
    return chamar('GET', `${base}/nfse/${id}`, certPem, keyPem);
  }
  if (id.length === 42) {
    return chamar('GET', `${base}/dps/${id}`, certPem, keyPem);
  }
  return {
    sucesso: false,
    erro: 'Informe o identificador da DPS (42 dígitos) ou a chave de acesso da NFS-e nacional (50 dígitos). O protocolo do lote SOAP da Pública não é mais consultado: desde 01/07/2026 Itajaí emite só pelo Sistema Nacional.',
    reenviar: false
  };
}

/** POST /nfse/{chave}/eventos com o pedido de registro já assinado. */
export async function registrarEventoNfse(
  chaveAcesso: string,
  xmlEventoAssinado: string,
  ambiente: '1' | '2',
  certPem: string,
  keyPem: string
): Promise<ResultadoSefin> {
  const chave = chaveAcesso.replace(/\D/g, '');
  const base = urlBaseSefinNacional(ambiente);
  const payload = JSON.stringify({
    pedidoRegistroEventoXmlGZipB64: compactarXmlGzipBase64(xmlEventoAssinado)
  });
  return chamar('POST', `${base}/nfse/${chave}/eventos`, certPem, keyPem, payload);
}
