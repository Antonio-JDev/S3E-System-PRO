/**
 * XML da Declaração de Prestação de Serviços (DPS) — Sistema Nacional NFS-e, leiaute v1.01.
 *
 * Canal ativo da NFS-e de Itajaí/SC desde 01/07/2026. A prefeitura informa emissão
 * exclusiva pelo Emissor Nacional (https://servicos.itajai.sc.gov.br/servico/54-nfse.html
 * e FAQ em nfse.itajai.sc.gov.br). O SOAP da Pública não recebe nota nova.
 *
 * Leiaute: namespace http://www.sped.fazenda.gov.br/nfse, XSD NFSe-ESQUEMAS_XSD-v1.01-20260209
 * (Anexo I — DPS/NFS-e), publicado em gov.br/nfse, documentação atualizada em 15/08/2026.
 * Ordem dos grupos de infDPS: tpAmb, dhEmi, verAplic, serie, nDPS, dCompet, tpEmit, cLocEmi,
 * prest, toma, serv, valores.
 *
 * Id da infDPS = "DPS" + código IBGE (7) + tipo de inscrição (1=CPF, 2=CNPJ) +
 * inscrição federal (14) + série (5) + número da DPS (15). O id usado na API (GET /dps/{id})
 * são esses 42 dígitos, sem o prefixo DPS.
 */

export const NFSE_NACIONAL_NAMESPACE = 'http://www.sped.fazenda.gov.br/nfse';
export const NFSE_NACIONAL_VERSAO = '1.01';
export const CODIGO_MUNICIPIO_ITAJAI = '4208203';
export const VER_APLIC_NFSE = 'S3E-ERP-1.0';

export interface PrestadorDpsInput {
  cnpj: string;
  inscricaoMunicipal?: string;
  razaoSocial: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  codigoMunicipio?: string;
  cep?: string;
  /**
   * Convenção da tela antiga da Pública: 1 = optante do Simples, 2 = não optante.
   * No leiaute nacional vira opSimpNac 3 (ME/EPP) ou 1 (não optante).
   */
  optanteSimplesNacional?: 1 | 2;
  /** SimplesNacional, RegimeNormal ou MEI — cadastro da EmpresaFiscal. */
  regimeTributario?: string;
  /** 1 não optante, 2 MEI, 3 ME/EPP. Quando informado, prevalece sobre o regime. */
  opSimpNac?: '1' | '2' | '3';
  /** Obrigatório no leiaute quando opSimpNac = 3. 1 = federais e ISS pelo Simples. */
  regApTribSN?: '1' | '2' | '3';
}

export interface TomadorDpsInput {
  cnpj?: string;
  cpf?: string;
  razaoSocial: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  codigoMunicipio?: string;
  cep?: string;
}

export interface ItemServicoDpsInput {
  /** Código nacional de 6 dígitos (LC 116), com ou sem pontos (14.01.01). */
  itemListaServico: string;
  discriminacao: string;
  valorServicos: number;
  /** Convenção da tela: 1 = retido pelo tomador, 2 = não retido. */
  issRetido?: 1 | 2;
  codigoMunicipioLocalPrestacao?: string;
  informacoesComplementares?: string;
}

export interface DpsNacionalInput {
  ambiente: '1' | '2';
  dataEmissao: Date;
  serie: string;
  nDps: number;
  /** Município emissor. Itajaí = 4208203. */
  cLocEmi?: string;
  /**
   * Natureza usada na tela (códigos da Pública). Mapeada para tribISSQN:
   * 602 imunidade, 601 não incidência, demais operação tributável.
   */
  naturezaOperacao?: number;
  prestador: PrestadorDpsInput;
  tomador: TomadorDpsInput;
  servicos: ItemServicoDpsInput[];
}

export interface DpsGerada {
  xml: string;
  idXml: string;
  idApi: string;
  valorTotal: number;
  cTribNac: string;
}

export function somenteDigitos(valor: string | undefined | null): string {
  return String(valor ?? '').replace(/\D/g, '');
}

export function escaparXml(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
}

/** Código de tributação nacional (cTribNac), 6 dígitos. */
export function codigoTributacaoNacional(codigo: string | number | undefined | null): string {
  const limpo = somenteDigitos(codigo == null ? '' : String(codigo));
  if (!limpo) return '140101';
  if (limpo.length >= 6) return limpo.slice(0, 6);
  return limpo.padStart(6, '0');
}

/**
 * Série da DPS no leiaute nacional: 1 a 5 dígitos, sem zero à esquerda.
 * A série alfanumérica da Pública (ex.: A1) não entra no Id.
 */
export function serieDpsNumerica(serie: string | undefined | null): string {
  const s = String(serie ?? '').trim();
  if (!/^[1-9][0-9]{0,4}$/.test(s)) {
    throw new Error(
      'A série da DPS no padrão nacional é numérica, de 1 a 5 dígitos, sem zero à esquerda. Ajuste a série da empresa (o valor antigo da Pública, como A1, não é aceito).'
    );
  }
  return s;
}

export function serieDpsDaEmpresa(serie: string | null | undefined): string {
  const s = String(serie ?? '').trim();
  return /^[1-9][0-9]{0,4}$/.test(s) ? s : '1';
}

/** Número da NFS-e (13 posições) dentro da chave de acesso de 50 dígitos. */
export function extrairNumeroNfseDaChave(chave: string | undefined | null): string | null {
  const c = somenteDigitos(chave);
  if (c.length !== 50) return null;
  const bruto = c.slice(23, 36);
  return bruto.replace(/^0+/, '') || '0';
}

export function montarIdDps(params: {
  cLocEmi: string;
  documentoPrestador: string;
  serie: string;
  nDps: number;
}): { idXml: string; idApi: string } {
  const doc = somenteDigitos(params.documentoPrestador);
  if (doc.length !== 14 && doc.length !== 11) {
    throw new Error('CNPJ do prestador deve ter 14 dígitos (ou CPF com 11) para montar o identificador da DPS.');
  }
  if (!Number.isInteger(params.nDps) || params.nDps < 1 || params.nDps > 999999999999999) {
    throw new Error('O número da DPS deve ser um inteiro entre 1 e 15 dígitos.');
  }
  const tpInsc = doc.length === 11 ? '1' : '2';
  const insc = doc.padStart(14, '0');
  const cLoc = somenteDigitos(params.cLocEmi).padStart(7, '0').slice(-7);
  if (cLoc.length !== 7 || cLoc === '0000000') {
    throw new Error('Código IBGE do município emissor inválido.');
  }
  const serie = params.serie.padStart(5, '0');
  const n = String(params.nDps).padStart(15, '0');
  const idApi = `${cLoc}${tpInsc}${insc}${serie}${n}`;
  return { idXml: `DPS${idApi}`, idApi };
}

export function opSimpNacDeCadastro(prestador: PrestadorDpsInput): { opSimpNac: '1' | '2' | '3'; regApTribSN?: '1' | '2' | '3' } {
  if (prestador.opSimpNac === '1' || prestador.opSimpNac === '2' || prestador.opSimpNac === '3') {
    if (prestador.opSimpNac === '3') {
      return { opSimpNac: '3', regApTribSN: prestador.regApTribSN || '1' };
    }
    return { opSimpNac: prestador.opSimpNac };
  }
  const regime = String(prestador.regimeTributario || '').replace(/\s/g, '').toLowerCase();
  if (prestador.optanteSimplesNacional === 2) return { opSimpNac: '1' };
  if (regime === 'mei') return { opSimpNac: '2' };
  if (prestador.optanteSimplesNacional === 1 || regime === 'simplesnacional') {
    return { opSimpNac: '3', regApTribSN: prestador.regApTribSN || '1' };
  }
  return { opSimpNac: '1' };
}

/** 1 tributável, 2 imunidade, 4 não incidência. */
export function tribIssqnDaNatureza(natureza: number | undefined): '1' | '2' | '4' {
  if (natureza === 602) return '2';
  if (natureza === 601) return '4';
  return '1';
}

/** Tela: 1 retido, 2 não retido. Leiaute: 1 não retido, 2 retido pelo tomador. */
export function tpRetIssqnDaTela(issRetido: 1 | 2 | undefined): '1' | '2' {
  return issRetido === 1 ? '2' : '1';
}

function dataHoraBrasil(data: Date): { data: string; dataHora: string } {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const texto = fmt.format(data).replace(' ', 'T');
  return { data: texto.slice(0, 10), dataHora: `${texto}-03:00` };
}

function tag(nome: string, conteudo: string): string {
  return `<${nome}>${conteudo}</${nome}>`;
}

function foneValido(valor: string | undefined): string | null {
  const d = somenteDigitos(valor);
  if (d.length < 6 || d.length > 20) return null;
  return d;
}

function emailValido(valor: string | undefined): string | null {
  const e = String(valor ?? '').trim();
  if (!e || e.length > 80 || /\s/.test(e) || !e.includes('@')) return null;
  return e;
}

function enderecoNacional(dados: {
  codigoMunicipio?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
}): string | null {
  const cMun = somenteDigitos(dados.codigoMunicipio);
  const cep = somenteDigitos(dados.cep);
  const xLgr = escaparXml(dados.logradouro || '').slice(0, 255);
  const nro = escaparXml(dados.numero || '').slice(0, 60);
  const xBairro = escaparXml(dados.bairro || '').slice(0, 60);
  if (cMun.length !== 7 || cep.length !== 8 || !xLgr || !nro || !xBairro) return null;
  const partes = [
    tag('endNac', tag('cMun', cMun) + tag('CEP', cep)),
    tag('xLgr', xLgr),
    tag('nro', nro)
  ];
  const cpl = escaparXml(dados.complemento || '').slice(0, 156);
  if (cpl) partes.push(tag('xCpl', cpl));
  partes.push(tag('xBairro', xBairro));
  return tag('end', partes.join(''));
}

function agruparServicos(servicos: ItemServicoDpsInput[]): {
  cTribNac: string;
  xDescServ: string;
  vServ: number;
  tpRetISSQN: '1' | '2';
  cLocPrestacao: string | null;
} {
  const validos = (servicos || []).filter(
    (s) => Number(s.valorServicos) > 0 && String(s.discriminacao || '').trim().length > 0
  );
  if (validos.length === 0) {
    throw new Error('Informe ao menos um item de serviço com valor e discriminação.');
  }
  const principal = [...validos].sort((a, b) => Number(b.valorServicos) - Number(a.valorServicos))[0];
  const linhas = validos.map((s) => {
    const disc = String(s.discriminacao).trim();
    if (validos.length === 1) return disc;
    return `${codigoTributacaoNacional(s.itemListaServico)}: ${disc}`;
  });
  const complementos = validos
    .map((s) => String(s.informacoesComplementares || '').trim())
    .filter(Boolean);
  let texto = linhas.join(' | ');
  if (complementos.length) texto = `${texto}. ${complementos.join(' ')}`;
  const local = validos.map((s) => somenteDigitos(s.codigoMunicipioLocalPrestacao)).find((c) => c.length === 7);
  return {
    cTribNac: codigoTributacaoNacional(principal.itemListaServico),
    xDescServ: texto.slice(0, 2000),
    vServ: validos.reduce((acc, s) => acc + Number(s.valorServicos), 0),
    tpRetISSQN: validos.some((s) => s.issRetido === 1) ? '2' : '1',
    cLocPrestacao: local || null
  };
}

export function gerarXmlDps(input: DpsNacionalInput): DpsGerada {
  const serie = serieDpsNumerica(input.serie);
  const cLocEmi = somenteDigitos(input.cLocEmi || CODIGO_MUNICIPIO_ITAJAI);
  const cnpj = somenteDigitos(input.prestador.cnpj);
  const ids = montarIdDps({
    cLocEmi,
    documentoPrestador: cnpj,
    serie,
    nDps: input.nDps
  });
  const quando = dataHoraBrasil(input.dataEmissao);
  const regime = opSimpNacDeCadastro(input.prestador);
  const servico = agruparServicos(input.servicos);
  const cLocPrestacao = servico.cLocPrestacao || cLocEmi;

  const prestPartes = [tag('CNPJ', cnpj)];
  const im = String(input.prestador.inscricaoMunicipal || '').replace(/\s/g, '').slice(0, 15);
  if (im) prestPartes.push(tag('IM', escaparXml(im)));
  const nomePrest = escaparXml(input.prestador.razaoSocial).slice(0, 150);
  if (!nomePrest) throw new Error('Informe a razão social do prestador.');
  prestPartes.push(tag('xNome', nomePrest));
  const endPrest = enderecoNacional({
    codigoMunicipio: input.prestador.codigoMunicipio || cLocEmi,
    cep: input.prestador.cep,
    logradouro: input.prestador.logradouro,
    numero: input.prestador.numero,
    complemento: input.prestador.complemento,
    bairro: input.prestador.bairro
  });
  if (endPrest) prestPartes.push(endPrest);
  const fonePrest = foneValido(input.prestador.telefone);
  if (fonePrest) prestPartes.push(tag('fone', fonePrest));
  const emailPrest = emailValido(input.prestador.email);
  if (emailPrest) prestPartes.push(tag('email', escaparXml(emailPrest)));
  const regTrib = [tag('opSimpNac', regime.opSimpNac)];
  if (regime.opSimpNac === '3' && regime.regApTribSN) {
    regTrib.push(tag('regApTribSN', regime.regApTribSN));
  }
  regTrib.push(tag('regEspTrib', '0'));
  prestPartes.push(tag('regTrib', regTrib.join('')));

  const docTomaCnpj = somenteDigitos(input.tomador.cnpj);
  const docTomaCpf = somenteDigitos(input.tomador.cpf);
  const docToma = docTomaCnpj.length === 14 ? tag('CNPJ', docTomaCnpj) : docTomaCpf.length === 11 ? tag('CPF', docTomaCpf) : '';
  if (!docToma) throw new Error('Informe o CNPJ (14 dígitos) ou o CPF (11 dígitos) do tomador.');
  const nomeToma = escaparXml(input.tomador.razaoSocial).slice(0, 150);
  if (!nomeToma) throw new Error('Informe a razão social do tomador.');
  const tomaPartes = [docToma, tag('xNome', nomeToma)];
  const endToma = enderecoNacional({
    codigoMunicipio: input.tomador.codigoMunicipio,
    cep: input.tomador.cep,
    logradouro: input.tomador.endereco,
    numero: input.tomador.numero || 'S/N',
    complemento: input.tomador.complemento,
    bairro: input.tomador.bairro
  });
  if (endToma) tomaPartes.push(endToma);
  const foneToma = foneValido(input.tomador.telefone);
  if (foneToma) tomaPartes.push(tag('fone', foneToma));
  const emailToma = emailValido(input.tomador.email);
  if (emailToma) tomaPartes.push(tag('email', escaparXml(emailToma)));

  const cServ = tag('cTribNac', servico.cTribNac) + tag('xDescServ', escaparXml(servico.xDescServ));
  const serv = tag('locPrest', tag('cLocPrestacao', cLocPrestacao)) + tag('cServ', cServ);
  const vServ = servico.vServ.toFixed(2);
  const tribMun =
    tag('tribISSQN', tribIssqnDaNatureza(input.naturezaOperacao)) +
    tag('tpRetISSQN', servico.tpRetISSQN);
  const valores =
    tag('vServPrest', tag('vServ', vServ)) +
    tag('trib', tag('tribMun', tribMun) + tag('totTrib', tag('indTotTrib', '0')));

  const inf =
    tag('tpAmb', input.ambiente === '1' ? '1' : '2') +
    tag('dhEmi', quando.dataHora) +
    tag('verAplic', VER_APLIC_NFSE) +
    tag('serie', serie) +
    tag('nDPS', String(input.nDps)) +
    tag('dCompet', quando.data) +
    tag('tpEmit', '1') +
    tag('cLocEmi', cLocEmi) +
    tag('prest', prestPartes.join('')) +
    tag('toma', tomaPartes.join('')) +
    tag('serv', serv) +
    tag('valores', valores);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<DPS xmlns="${NFSE_NACIONAL_NAMESPACE}" versao="${NFSE_NACIONAL_VERSAO}">` +
    `<infDPS Id="${ids.idXml}">${inf}</infDPS>` +
    '</DPS>';

  return {
    xml,
    idXml: ids.idXml,
    idApi: ids.idApi,
    valorTotal: Number(vServ),
    cTribNac: servico.cTribNac
  };
}

/**
 * Pedido de cancelamento (evento 101101) do Anexo II. cMotivo 9 = outros.
 * O XML ainda precisa da assinatura de infPedReg antes do POST /nfse/{chave}/eventos.
 */
export function gerarXmlPedidoCancelamento(params: {
  chaveAcesso: string;
  cnpjAutor: string;
  justificativa: string;
  ambiente: '1' | '2';
  dataEvento?: Date;
}): string {
  const chave = somenteDigitos(params.chaveAcesso);
  if (chave.length !== 50) throw new Error('A chave de acesso da NFS-e nacional tem 50 dígitos.');
  const cnpj = somenteDigitos(params.cnpjAutor);
  if (cnpj.length !== 14) throw new Error('CNPJ do autor do cancelamento inválido.');
  const motivo = escaparXml(params.justificativa).slice(0, 255);
  if (motivo.length < 15) throw new Error('A justificativa do cancelamento precisa de pelo menos 15 caracteres.');
  const quando = dataHoraBrasil(params.dataEvento || new Date());
  const id = `PRE${chave}101101`;
  const inf =
    tag('tpAmb', params.ambiente === '1' ? '1' : '2') +
    tag('verAplic', VER_APLIC_NFSE) +
    tag('dhEvento', quando.dataHora) +
    tag('CNPJAutor', cnpj) +
    tag('chNFSe', chave) +
    tag(
      'e101101',
      tag('xDesc', 'Cancelamento de NFS-e') + tag('cMotivo', '9') + tag('xMotivo', motivo)
    );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<pedRegEvento xmlns="${NFSE_NACIONAL_NAMESPACE}" versao="${NFSE_NACIONAL_VERSAO}">` +
    `<infPedReg Id="${id}">${inf}</infPedReg>` +
    '</pedRegEvento>'
  );
}
