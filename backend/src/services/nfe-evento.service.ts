import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';
import { XMLSerializer } from '@xmldom/xmldom';

/**
 * Eventos de NF-e (cancelamento, CC-e, manifestação) e inutilização.
 * A assinatura XML-DSig referencia infEvento ou infInut (Id="ID..."),
 * com o mesmo certificado A1 e os mesmos algoritmos da NF-e (RSA-SHA1, C14N, SHA-1).
 * Não relê o PFX: quem chama passa key/cert já obtidos por NFeSignatureService.carregarCertificado.
 */

export type AmbienteNFe = '1' | '2';

export type TipoEventoManifestacao = '210200' | '210210' | '210220' | '210240';

export interface ResultadoEventoSefaz {
  sucesso: boolean;
  protocolo?: string;
  codigoStatus?: string;
  mensagem?: string;
  erro?: string;
}

const CSTAT_EVENTO_REGISTRADO = new Set(['135', '136']);
const CSTAT_INUTILIZACAO_HOMOLOGADA = '102';

/** Texto fixo exigido no leiaute da Carta de Correção (sem acentos). */
const XCOND_USO_CCE =
  'A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.';

const CODIGOS_UF: Record<string, string> = {
  AC: '12', AL: '27', AP: '16', AM: '13', BA: '29',
  CE: '23', DF: '53', ES: '32', GO: '52', MA: '21',
  MT: '51', MS: '50', MG: '31', PA: '15', PB: '25',
  PR: '41', PE: '26', PI: '22', RJ: '33', RN: '24',
  RS: '43', RO: '11', RR: '14', SC: '42', SP: '35',
  SE: '28', TO: '17',
};

const DESC_MANIFESTACAO: Record<TipoEventoManifestacao, string> = {
  '210200': 'Confirmacao da Operacao',
  '210210': 'Ciencia da Operacao',
  '210220': 'Desconhecimento da Operacao',
  '210240': 'Operacao nao Realizada',
};

export class NFeEventoService {
  /**
   * UF da chave de acesso (dois primeiros dígitos). Não usa 42 fixo.
   */
  static cOrgaoDaChave(chaveAcesso: string): string {
    const chave = somenteDigitos(chaveAcesso);
    if (chave.length !== 44) {
      throw new Error('Chave de acesso inválida para o evento (deve ter 44 dígitos)');
    }
    return chave.slice(0, 2);
  }

  /**
   * Código IBGE da UF do emitente (inutilização). Aceita sigla (SC) ou código (42).
   */
  static codigoUF(ufOuCodigo: string): string {
    const bruto = (ufOuCodigo || '').trim().toUpperCase();
    if (/^\d{2}$/.test(bruto)) return bruto;
    const codigo = CODIGOS_UF[bruto];
    if (!codigo) {
      throw new Error('UF do emitente inválida para inutilização de NF-e');
    }
    return codigo;
  }

  /** AAAA-MM-DDThh:mm:ss-03:00, sem milissegundos e sem sufixo Z. */
  static dhEventoBrasilia(agora: Date = new Date()): string {
    const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${brasilia.getUTCFullYear()}-${pad(brasilia.getUTCMonth() + 1)}-${pad(brasilia.getUTCDate())}T${pad(brasilia.getUTCHours())}:${pad(brasilia.getUTCMinutes())}:${pad(brasilia.getUTCSeconds())}-03:00`;
  }

  static gerarXmlCancelamento(params: {
    chaveAcesso: string;
    justificativa: string;
    ambiente: AmbienteNFe;
    cnpj: string;
    nProt: string;
    dhEvento?: string;
  }): string {
    const chave = exigirChave(params.chaveAcesso);
    const cOrgao = chave.slice(0, 2);
    const cnpj = exigirCnpj(params.cnpj);
    const nProt = exigirProtocoloNumerico(params.nProt, 'autorização da NF-e');
    const xJust = exigirTexto(params.justificativa, 'Justificativa', 15, 255);
    const dhEvento = params.dhEvento || this.dhEventoBrasilia();
    const id = `ID110111${chave}01`;

    return (
      `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
      `<infEvento Id="${id}">` +
      `<cOrgao>${cOrgao}</cOrgao>` +
      `<tpAmb>${params.ambiente}</tpAmb>` +
      `<CNPJ>${cnpj}</CNPJ>` +
      `<chNFe>${chave}</chNFe>` +
      `<dhEvento>${dhEvento}</dhEvento>` +
      `<tpEvento>110111</tpEvento>` +
      `<nSeqEvento>1</nSeqEvento>` +
      `<verEvento>1.00</verEvento>` +
      `<detEvento versao="1.00">` +
      `<descEvento>Cancelamento</descEvento>` +
      `<nProt>${nProt}</nProt>` +
      `<xJust>${escaparXml(xJust)}</xJust>` +
      `</detEvento>` +
      `</infEvento>` +
      `</evento>`
    );
  }

  static gerarXmlCartaCorrecao(params: {
    chaveAcesso: string;
    textoCorrecao: string;
    sequencia: number;
    ambiente: AmbienteNFe;
    cnpj: string;
    dhEvento?: string;
  }): string {
    const chave = exigirChave(params.chaveAcesso);
    const cOrgao = chave.slice(0, 2);
    const cnpj = exigirCnpj(params.cnpj);
    const xCorrecao = exigirTexto(params.textoCorrecao, 'Texto da correção', 15, 1000);
    const nSeq = exigirSequencia(params.sequencia);
    const dhEvento = params.dhEvento || this.dhEventoBrasilia();
    const id = `ID110110${chave}${nSeq}`;

    return (
      `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
      `<infEvento Id="${id}">` +
      `<cOrgao>${cOrgao}</cOrgao>` +
      `<tpAmb>${params.ambiente}</tpAmb>` +
      `<CNPJ>${cnpj}</CNPJ>` +
      `<chNFe>${chave}</chNFe>` +
      `<dhEvento>${dhEvento}</dhEvento>` +
      `<tpEvento>110110</tpEvento>` +
      `<nSeqEvento>${Number(nSeq)}</nSeqEvento>` +
      `<verEvento>1.00</verEvento>` +
      `<detEvento versao="1.00">` +
      `<descEvento>Carta de Correcao</descEvento>` +
      `<xCorrecao>${escaparXml(xCorrecao)}</xCorrecao>` +
      `<xCondUso>${escaparXml(XCOND_USO_CCE)}</xCondUso>` +
      `</detEvento>` +
      `</infEvento>` +
      `</evento>`
    );
  }

  /**
   * Manifestação do destinatário. cOrgao 91 (Ambiente Nacional), conforme o leiaute:
   * esse evento não usa a UF da chave.
   */
  static gerarXmlManifestacao(params: {
    chaveAcesso: string;
    cnpj: string;
    tipoEvento: TipoEventoManifestacao;
    justificativa?: string;
    ambiente: AmbienteNFe;
    dhEvento?: string;
  }): string {
    const chave = exigirChave(params.chaveAcesso);
    const cnpj = exigirCnpj(params.cnpj);
    const descEvento = DESC_MANIFESTACAO[params.tipoEvento];
    if (!descEvento) {
      throw new Error('Tipo de manifestação inválido');
    }
    const xJust =
      params.tipoEvento === '210240'
        ? `<xJust>${escaparXml(exigirTexto(params.justificativa || '', 'Justificativa', 15, 255))}</xJust>`
        : '';
    const dhEvento = params.dhEvento || this.dhEventoBrasilia();
    const id = `ID${params.tipoEvento}${chave}01`;

    return (
      `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
      `<infEvento Id="${id}">` +
      `<cOrgao>91</cOrgao>` +
      `<tpAmb>${params.ambiente}</tpAmb>` +
      `<CNPJ>${cnpj}</CNPJ>` +
      `<chNFe>${chave}</chNFe>` +
      `<dhEvento>${dhEvento}</dhEvento>` +
      `<tpEvento>${params.tipoEvento}</tpEvento>` +
      `<nSeqEvento>1</nSeqEvento>` +
      `<verEvento>1.00</verEvento>` +
      `<detEvento versao="1.00">` +
      `<descEvento>${descEvento}</descEvento>` +
      xJust +
      `</detEvento>` +
      `</infEvento>` +
      `</evento>`
    );
  }

  static gerarXmlInutilizacao(params: {
    cnpj: string;
    cUF: string;
    ano: string;
    modelo?: string;
    serie: string;
    numeroInicial: string;
    numeroFinal: string;
    justificativa: string;
    ambiente: AmbienteNFe;
  }): string {
    const cUF = this.codigoUF(params.cUF);
    const ano = exigirAno(params.ano);
    const cnpj = exigirCnpj(params.cnpj);
    const modelo = (params.modelo || '55').replace(/\D/g, '').padStart(2, '0').slice(-2);
    const serieNum = exigirInteiro(params.serie, 'Série');
    const nIni = exigirInteiro(params.numeroInicial, 'Número inicial');
    const nFin = exigirInteiro(params.numeroFinal, 'Número final');
    if (nFin < nIni) {
      throw new Error('Número final da inutilização não pode ser menor que o inicial');
    }
    const xJust = exigirTexto(params.justificativa, 'Justificativa', 15, 255);
    const serieId = String(serieNum).padStart(3, '0');
    const nIniId = String(nIni).padStart(9, '0');
    const nFinId = String(nFin).padStart(9, '0');
    const id = `ID${cUF}${ano}${cnpj}${modelo}${serieId}${nIniId}${nFinId}`;

    return (
      `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
      `<infInut Id="${id}">` +
      `<tpAmb>${params.ambiente}</tpAmb>` +
      `<xServ>INUTILIZAR</xServ>` +
      `<cUF>${cUF}</cUF>` +
      `<ano>${ano}</ano>` +
      `<CNPJ>${cnpj}</CNPJ>` +
      `<mod>${modelo}</mod>` +
      `<serie>${serieNum}</serie>` +
      `<nNFIni>${nIni}</nNFIni>` +
      `<nNFFin>${nFin}</nNFFin>` +
      `<xJust>${escaparXml(xJust)}</xJust>` +
      `</infInut>` +
      `</inutNFe>`
    );
  }

  static assinarEvento(xml: string, keyPem: string, certPem: string): string {
    return this.assinarElemento(xml, keyPem, certPem, 'infEvento');
  }

  static assinarInutilizacao(xml: string, keyPem: string, certPem: string): string {
    return this.assinarElemento(xml, keyPem, certPem, 'infInut');
  }

  static montarEnvEvento(xmlEventoAssinado: string, idLote?: string): string {
    const evento = xmlEventoAssinado.replace(/^\s*<\?xml[^?]*\?>\s*/i, '').trim();
    if (!/<evento[\s>]/.test(evento)) {
      throw new Error('XML assinado não contém o elemento evento');
    }
    const lote = (idLote || Date.now().toString()).replace(/\D/g, '').slice(-15) || '1';
    return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${lote}</idLote>${evento}</envEvento>`;
  }

  /**
   * cStat 135 (vinculado) ou 136 (registrado sem vínculo). O protocolo é o nProt da SEFAZ.
   * cStat 128 do lote, sozinho, não é sucesso.
   */
  static interpretarRetornoEvento(xml: string): ResultadoEventoSefaz {
    const bloco =
      xml.match(/<retEvento\b[\s\S]*?<\/retEvento>/i)?.[0] ||
      xml.match(/<infEvento\b[\s\S]*?<\/infEvento>/i)?.[0] ||
      '';
    return this.montarResultado(bloco || xml, CSTAT_EVENTO_REGISTRADO, 'evento');
  }

  /** cStat 102 = inutilização de número homologado. */
  static interpretarRetornoInutilizacao(xml: string): ResultadoEventoSefaz {
    const bloco = xml.match(/<infInut\b[\s\S]*?<\/infInut>/i)?.[0] || xml;
    return this.montarResultado(bloco, new Set([CSTAT_INUTILIZACAO_HOMOLOGADA]), 'inutilização');
  }

  static interpretarRespostaSoap(result: unknown, tipo: 'evento' | 'inutilizacao'): ResultadoEventoSefaz {
    const xml = extrairXmlSoap(result);
    if (xml && (xml.includes('<cStat>') || xml.includes('<retEnvEvento') || xml.includes('<retInutNFe'))) {
      return tipo === 'inutilizacao'
        ? this.interpretarRetornoInutilizacao(xml)
        : this.interpretarRetornoEvento(xml);
    }
    const porObjeto = interpretarObjetoSoap(result, tipo);
    if (porObjeto) return porObjeto;
    return {
      sucesso: false,
      erro: 'Resposta da SEFAZ inválida',
    };
  }

  /** nProt da autorização (infProt) ou número já gravado. Não inventa valor. */
  static extrairProtocoloAutorizacao(origem?: string | null): string | null {
    if (!origem) return null;
    const texto = String(origem).trim();
    if (/^\d{15,}$/.test(texto)) return texto;
    const infProt = texto.match(/<infProt\b[\s\S]*?<\/infProt>/i)?.[0];
    const fonte = infProt || texto;
    const nProt = fonte.match(/<nProt>(\d{15,})<\/nProt>/)?.[1];
    return nProt || null;
  }

  private static montarResultado(
    fonte: string,
    aceitos: Set<string>,
    contexto: string
  ): ResultadoEventoSefaz {
    const codigoStatus = fonte.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    const mensagem = fonte.match(/<xMotivo>([^<]*)<\/xMotivo>/)?.[1];
    const protocolo = fonte.match(/<nProt>(\d{15,})<\/nProt>/)?.[1];

    if (codigoStatus && aceitos.has(codigoStatus)) {
      if (!protocolo) {
        return {
          sucesso: false,
          codigoStatus,
          mensagem,
          erro: `SEFAZ retornou ${contexto} sem número de protocolo`,
        };
      }
      return { sucesso: true, codigoStatus, mensagem, protocolo };
    }

    if (!codigoStatus) {
      return { sucesso: false, erro: 'Resposta da SEFAZ inválida' };
    }

    return {
      sucesso: false,
      codigoStatus,
      mensagem,
      erro: `Status ${codigoStatus}: ${mensagem || `Erro na ${contexto}`}`,
    };
  }

  /**
   * Assina o elemento pelo atributo Id. A Signature fica logo após infEvento/infInut.
   * URI da referência: #ID...
   */
  private static assinarElemento(
    xml: string,
    keyPem: string,
    certPem: string,
    nomeElemento: 'infEvento' | 'infInut'
  ): string {
    const xmlNorm = xml
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/>\s+</g, '><');

    if (!xmlNorm.includes(`<${nomeElemento}`)) {
      throw new Error(`XML não contém ${nomeElemento} para assinatura do evento`);
    }

    const id = xmlNorm.match(/\sId="([^"]+)"/)?.[1];
    if (!id || !id.startsWith('ID')) {
      throw new Error(`Elemento ${nomeElemento} sem atributo Id no padrão da SEFAZ`);
    }

    if (!keyPem || keyPem.length < 100) {
      throw new Error('Chave privada PEM inválida ou vazia para assinar o evento');
    }
    if (!certPem || certPem.length < 100) {
      throw new Error('Certificado PEM inválido ou vazio para assinar o evento');
    }

    const keyPemNormalizado = keyPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const certPemNormalizado = certPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const privateKeyObj = crypto.createPrivateKey({
      key: keyPemNormalizado,
      format: 'pem',
    });

    const signedXml = new SignedXml({
      privateKey: privateKeyObj,
      publicCert: certPemNormalizado,
      signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    });

    const xpathRef = `//*[local-name()='${nomeElemento}']`;
    signedXml.addReference({
      xpath: xpathRef,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      ],
      digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    });

    signedXml.computeSignature(xmlNorm, {
      location: {
        reference: xpathRef,
        action: 'after',
      },
    });

    const out = signedXml.getSignedXml();
    let xmlAssinado = typeof out === 'string' ? out : new XMLSerializer().serializeToString(out as Document);

    const declaracao = '<?xml version="1.0" encoding="UTF-8"?>';
    if (!xmlAssinado.trimStart().startsWith('<?xml')) {
      xmlAssinado = declaracao + xmlAssinado.trimStart();
    }

    xmlAssinado = posicionarAssinatura(xmlAssinado, nomeElemento);

    if (!/<(?:[A-Za-z0-9]+:)?Signature[\s>]/.test(xmlAssinado)) {
      throw new Error('Falha ao assinar o evento: assinatura XML-DSig ausente');
    }
    if (!xmlAssinado.includes(`URI="#${id}"`)) {
      throw new Error('Assinatura do evento sem referência ao Id do infEvento/infInut');
    }

    return xmlAssinado;
  }
}

function posicionarAssinatura(xml: string, nomeElemento: 'infEvento' | 'infInut'): string {
  const sigMatch = xml.match(/<(?:[A-Za-z0-9]+:)?Signature\b[^>]*>[\s\S]*?<\/(?:[A-Za-z0-9]+:)?Signature>/);
  if (!sigMatch) return xml;
  const sigBlock = sigMatch[0];
  const fechamento = `</${nomeElemento}>`;
  const semAssinatura = xml.replace(sigMatch[0], '');
  if (semAssinatura.includes(fechamento + sigBlock)) return xml;
  const idx = semAssinatura.indexOf(fechamento);
  if (idx === -1) return xml;
  return semAssinatura.slice(0, idx + fechamento.length) + sigBlock + semAssinatura.slice(idx + fechamento.length);
}

function extrairXmlSoap(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const bruto = result as { nfeResultMsg?: unknown; _xml?: string };
  const msg = bruto.nfeResultMsg ?? result;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object' && typeof (msg as { _xml?: string })._xml === 'string') {
    return (msg as { _xml: string })._xml;
  }
  return '';
}

function lerTexto(no: unknown, campo: string): string | undefined {
  if (!no || typeof no !== 'object') return undefined;
  const valor = (no as Record<string, unknown>)[campo];
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  return undefined;
}

function interpretarObjetoSoap(result: unknown, tipo: 'evento' | 'inutilizacao'): ResultadoEventoSefaz | null {
  if (!result || typeof result !== 'object') return null;
  const raiz = ((result as { nfeResultMsg?: unknown }).nfeResultMsg ?? result) as Record<string, unknown>;
  const inf = tipo === 'inutilizacao'
    ? (raiz.retInutNFe as { infInut?: unknown } | undefined)?.infInut || raiz.infInut
    : (raiz.retEnvEvento as { retEvento?: { infEvento?: unknown } } | undefined)?.retEvento?.infEvento
      || (raiz.retEvento as { infEvento?: unknown } | undefined)?.infEvento
      || raiz.infEvento;
  if (!inf) return null;
  const codigoStatus = lerTexto(inf, 'cStat');
  const mensagem = lerTexto(inf, 'xMotivo');
  const protocoloBruto = lerTexto(inf, 'nProt');
  const protocolo = protocoloBruto && /^\d{15,}$/.test(protocoloBruto) ? protocoloBruto : undefined;
  const aceitos = tipo === 'inutilizacao' ? new Set([CSTAT_INUTILIZACAO_HOMOLOGADA]) : CSTAT_EVENTO_REGISTRADO;
  if (codigoStatus && aceitos.has(codigoStatus)) {
    if (!protocolo) {
      return {
        sucesso: false,
        codigoStatus,
        mensagem,
        erro: 'SEFAZ retornou sucesso sem número de protocolo',
      };
    }
    return { sucesso: true, codigoStatus, mensagem, protocolo };
  }
  if (!codigoStatus) return null;
  return {
    sucesso: false,
    codigoStatus,
    mensagem,
    erro: `Status ${codigoStatus}: ${mensagem || 'Erro na SEFAZ'}`,
  };
}

function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

function exigirChave(chaveAcesso: string): string {
  const chave = somenteDigitos(chaveAcesso);
  if (chave.length !== 44) {
    throw new Error('Chave de acesso inválida para o evento (deve ter 44 dígitos)');
  }
  return chave;
}

function exigirCnpj(cnpj: string): string {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) {
    throw new Error('CNPJ do autor do evento deve ter 14 dígitos');
  }
  return digitos;
}

function exigirProtocoloNumerico(valor: string, contexto: string): string {
  const digitos = somenteDigitos(valor);
  if (!/^\d{15,}$/.test(digitos)) {
    throw new Error(`Protocolo de ${contexto} ausente ou inválido`);
  }
  return digitos;
}

function exigirTexto(valor: string, rotulo: string, min: number, max: number): string {
  const texto = (valor || '').trim();
  if (texto.length < min) {
    throw new Error(`${rotulo} deve ter no mínimo ${min} caracteres`);
  }
  if (texto.length > max) {
    throw new Error(`${rotulo} deve ter no máximo ${max} caracteres`);
  }
  return texto;
}

function exigirSequencia(sequencia: number): string {
  const n = Number(sequencia);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new Error('Sequência da Carta de Correção deve ser um inteiro de 1 a 20');
  }
  return String(n).padStart(2, '0');
}

function exigirAno(ano: string): string {
  const digitos = somenteDigitos(ano);
  if (digitos.length !== 2 && digitos.length !== 4) {
    throw new Error('Ano da inutilização deve ter 2 ou 4 dígitos');
  }
  return digitos.slice(-2);
}

function exigirInteiro(valor: string, rotulo: string): number {
  const digitos = somenteDigitos(valor);
  if (!digitos) {
    throw new Error(`${rotulo} inválido`);
  }
  return Number(digitos);
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
