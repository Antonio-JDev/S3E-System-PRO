/**
 * Serviço de geração de XML NFS-e Pública Informática v7.4 (Nota Nacional)
 * Prefeitura de Itajaí/SC - Padrão Pública
 *
 * Regras: valores com ponto decimal; ItemListaServico no formato 000000 (ex: 14.01.01 -> 140101);
 * omitir tags nulas; sem espaços/zeros não significativos.
 */

const NS = 'http://www.publica.inf.br';
const CODIGO_MUNICIPIO_ITAJAI = '4208203';

export interface DadosPrestadorNfse {
  cnpj: string;
  inscricaoMunicipal: string;
}

export interface DadosTomadorNfse {
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
  /** Código IBGE do município do tomador (7 dígitos, ex: 4208203 para Itajaí) */
  codigoMunicipio?: string;
  estado?: string;
  cep?: string;
}

export interface ItemServicoNfse {
  /** Código no formato 6 dígitos ou com pontos (14.06.01 -> 140601). LC 116/03. Sem ISS: 990101 */
  itemListaServico: string;
  /** Descrição dos serviços (discriminação - obrigatória) */
  discriminacao: string;
  /** Valor dos serviços (decimal com ponto) */
  valorServicos: number;
  /** 1 = Sim, 2 = Não */
  issRetido?: 1 | 2;
  /** Alíquota ISS em decimal (ex: 0.02 para 2%, 0.00 para Simples Nacional) */
  aliquota?: number;
  /** Código município prestação (default Itajaí 4208203) */
  codigoMunicipio?: string;
  /** Construção civil: código da obra (quando aplicável) */
  codigoObra?: string;
  /** Construção civil: ART (quando aplicável) */
  art?: string;
  /** Valores detalhados (opcionais) */
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
  valorLiquidoNfse?: number;
  descontoCondicionado?: number;
  descontoIncondicionado?: number;
  unidadeServico?: string;
  tributosFederais?: string;
  tribMun?: string;
  /** Construção civil: indicador (opcional) */
  issConstrucaoCivil?: string;
  /** Informações complementares do serviço */
  informacoesComplementares?: string;
  /** Código do país (quando aplicável) */
  codigoPais?: string;
  /** Código do município local de prestação (quando aplicável) */
  codigoMunicipioLocalPrestacao?: string;
  /** Código NBS (opcional) */
  cNBS?: string;
}

export interface RpsNfse {
  numero: number;
  /** Série RPS (ex: A1 - Pública Itajaí) */
  serie: string;
  tipo: number; // 1 RPS, 2 etc
  dataEmissao: Date;
  /** Código natureza operação Pública (ex: 501 ISS devido Itajaí Simples, 511 ISS devido Itajaí Normal) */
  naturezaOperacao: number;
  optanteSimplesNacional: 1 | 2; // 1 Sim, 2 Não
  /** 1 = Sim, 2 = Não */
  incentivadorCultural?: 1 | 2;
  /** Status do RPS: 1 = Normal, 2 = Cancelado (default 1) */
  status?: number;
  servicos: ItemServicoNfse[];
  tomador: DadosTomadorNfse;
  /** RPS substituído (para substituição de nota) */
  rpsSubstituido?: { numero: string; serie: string; tipo: string };
}

export interface EnviarLoteRpsEnvioInput {
  numeroLote: number;
  prestador: DadosPrestadorNfse;
  listaRps: RpsNfse[];
  /** Incluir grupo IBSCBS (Reforma Tributária) - opcional, processamento integral a partir jan/2026 */
  incluirIBSCBS?: boolean;
}

/**
 * Formata valor monetário: ponto decimal, sem separador de milhar, 2 casas decimais.
 */
function fmtValor(v: number): string {
  if (v == null || isNaN(v)) return '0.00';
  return Number(v).toFixed(2).replace(',', '.');
}

/**
 * Converte código de serviço para 6 dígitos LC 116/03 (ex: 14.06.01, 14.01.01 ou "140601" -> 140601).
 */
export function formatoItemListaServico(codigo: string | number): string {
  if (codigo == null) return '990101';
  const s = String(codigo);
  // Se contiver pontos (ex: 14.06.01), retorna como está conforme solicitado para v7.4
  if (s.includes('.')) return s;
  
  const clean = s.replace(/\D/g, '');
  if (clean.length >= 6) return clean.slice(0, 6).padStart(6, '0');
  return clean.padStart(6, '0');
}

/**
 * Escapa texto para uso em XML (evitar quebras e caracteres inválidos).
 */
function escapeXml(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function tag(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const v = typeof value === 'number' ? String(value) : escapeXml(String(value));
  return `<${name}>${v}</${name}>`;
}

/**
 * Monta o XML de um único RPS (InfRps) sem assinatura.
 */
function buildInfRps(rps: RpsNfse, prestador: DadosPrestadorNfse, index: number): string {
  const idRps = `RPS${index}_${rps.numero}_${rps.serie}`;
  const cnpjPrestador = prestador.cnpj.replace(/\D/g, '');
  const dataEmissao = rps.dataEmissao.toISOString().replace(/\.\d{3}Z$/, '');

  let servicosXml = '';
  for (const srv of rps.servicos) {
    const codMun = srv.codigoMunicipio || CODIGO_MUNICIPIO_ITAJAI;
    const itemLista = formatoItemListaServico(srv.itemListaServico);
    const aliquota = srv.aliquota != null ? fmtValor(srv.aliquota) : undefined;
    const valores =
      '<Valores>' +
      `<ValorServicos>${fmtValor(srv.valorServicos)}</ValorServicos>` +
      (srv.valorDeducoes != null ? `<ValorDeducoes>${fmtValor(srv.valorDeducoes)}</ValorDeducoes>` : '') +
      (srv.valorPis != null ? `<ValorPis>${fmtValor(srv.valorPis)}</ValorPis>` : '') +
      (srv.valorCofins != null ? `<ValorCofins>${fmtValor(srv.valorCofins)}</ValorCofins>` : '') +
      (srv.valorInss != null ? `<ValorInss>${fmtValor(srv.valorInss)}</ValorInss>` : '') +
      (srv.valorIr != null ? `<ValorIr>${fmtValor(srv.valorIr)}</ValorIr>` : '') +
      (srv.valorCsll != null ? `<ValorCsll>${fmtValor(srv.valorCsll)}</ValorCsll>` : '') +
      (srv.issRetido != null ? `<IssRetido>${srv.issRetido}</IssRetido>` : '') +
      (srv.valorIss != null ? `<ValorIss>${fmtValor(srv.valorIss)}</ValorIss>` : '') +
      (srv.valorIssRetido != null ? `<ValorIssRetido>${fmtValor(srv.valorIssRetido)}</ValorIssRetido>` : '') +
      (srv.outrasRetencoes != null ? `<OutrasRetencoes>${fmtValor(srv.outrasRetencoes)}</OutrasRetencoes>` : '') +
      (srv.baseCalculo != null ? `<BaseCalculo>${fmtValor(srv.baseCalculo)}</BaseCalculo>` : '') +
      (aliquota != null ? `<Aliquota>${aliquota}</Aliquota>` : '') +
      (srv.descontoIncondicionado != null ? `<DescontoIncondicionado>${fmtValor(srv.descontoIncondicionado)}</DescontoIncondicionado>` : '') +
      (srv.descontoCondicionado != null ? `<DescontoCondicionado>${fmtValor(srv.descontoCondicionado)}</DescontoCondicionado>` : '') +
      (srv.valorLiquidoNfse != null ? `<ValorLiquidoNfse>${fmtValor(srv.valorLiquidoNfse)}</ValorLiquidoNfse>` : '') +
      (srv.tributosFederais != null ? `<TributosFederais>${escapeXml(String(srv.tributosFederais))}</TributosFederais>` : '') +
      (srv.tribMun != null ? `<tribMun>${escapeXml(String(srv.tribMun))}</tribMun>` : '') +
      '</Valores>';
    servicosXml +=
      '<Servico>' +
      valores +
      (srv.issConstrucaoCivil ? tag('IssConstrucaoCivil', srv.issConstrucaoCivil) : '') +
      tag('ItemListaServico', itemLista) +
      tag('Discriminacao', srv.discriminacao) +
      (srv.informacoesComplementares ? tag('InformacoesComplementares', srv.informacoesComplementares) : '') +
      tag('CodigoMunicipio', codMun) +
      (srv.codigoPais ? tag('CodigoPais', srv.codigoPais) : '') +
      (srv.codigoMunicipioLocalPrestacao ? tag('CodigoMunicipioLocalPrestacao', srv.codigoMunicipioLocalPrestacao) : '') +
      (srv.cNBS ? tag('cNBS', srv.cNBS) : '') +
      (srv.codigoObra ? tag('CodigoObra', srv.codigoObra) : '') +
      (srv.art ? tag('Art', srv.art) : '') +
      '</Servico>';
  }
  // Ajustes: incluir ValorIss, BaseCalculo e ValorLiquidoNfse se fornecidos nos serviços
  // (já tratados no loop acima se presentes no srv.valores adicionais)

  const prestadorXml =
    '<Prestador>' +
    tag('Cnpj', cnpjPrestador) +
    tag('InscricaoMunicipal', prestador.inscricaoMunicipal) +
    '</Prestador>';

  let tomadorXml = '<Tomador>';
  const tom = rps.tomador;
  // Estrutura conforme tcDadosTomador: IdentificacaoTomador -> CpfCnpj -> {Cpf|Cnpj}
  tomadorXml += '<IdentificacaoTomador>';
  tomadorXml += '<CpfCnpj>';
  if (tom.cnpj) tomadorXml += tag('Cnpj', tom.cnpj.replace(/\D/g, ''));
  else if (tom.cpf) tomadorXml += tag('Cpf', tom.cpf.replace(/\D/g, ''));
  tomadorXml += '</CpfCnpj>';
  tomadorXml += '</IdentificacaoTomador>';
  tomadorXml += tag('RazaoSocial', tom.razaoSocial);
  // Endereço (tcEndereco)
  const codigoMunicipioTomador = tom.codigoMunicipio?.replace(/\D/g, '')?.slice(0, 7) || '';
  tomadorXml += '<Endereco>';
  tomadorXml += tag('Endereco', tom.endereco);
  tomadorXml += tag('Numero', tom.numero);
  tomadorXml += tag('Complemento', tom.complemento);
  tomadorXml += tag('Bairro', tom.bairro);
  tomadorXml += tag('CodigoMunicipio', codigoMunicipioTomador || undefined);
  tomadorXml += tag('Uf', tom.estado);
  tomadorXml += tag('Cep', tom.cep?.replace(/\D/g, ''));
  tomadorXml += tag('Municipio', tom.cidade);
  tomadorXml += '</Endereco>';
  // Contato
  if (tom.email || tom.telefone) {
    tomadorXml += '<Contato>';
    if (tom.telefone) tomadorXml += tag('Telefone', tom.telefone?.replace(/\D/g, ''));
    if (tom.email) tomadorXml += tag('Email', tom.email);
    tomadorXml += '</Contato>';
  }
  tomadorXml += '</Tomador>';

  let substituidoXml = '';
  if (rps.rpsSubstituido) {
    substituidoXml =
      '<RpsSubstituido>' +
      tag('Numero', rps.rpsSubstituido.numero) +
      tag('Serie', rps.rpsSubstituido.serie) +
      tag('Tipo', rps.rpsSubstituido.tipo) +
      '</RpsSubstituido>';
  }

  const serieRps = (rps.serie || 'A1').trim() || 'A1';
  const statusRps = rps.status != null ? rps.status : 1;
  return (
    '<Rps>' +
    `<InfRps Id="${idRps}">` +
    '<IdentificacaoRps>' +
    tag('Numero', rps.numero) +
    `<Serie>${escapeXml(serieRps)}</Serie>` +
    tag('Tipo', rps.tipo) +
    '</IdentificacaoRps>' +
    tag('DataEmissao', dataEmissao) +
    tag('NaturezaOperacao', rps.naturezaOperacao) +
    tag('OptanteSimplesNacional', rps.optanteSimplesNacional) +
    (rps.incentivadorCultural != null ? tag('IncentivadorCultural', rps.incentivadorCultural) : '') +
    // Status (1 normal)
    tag('Status', statusRps) +
    servicosXml +
    prestadorXml +
    tomadorXml +
    substituidoXml +
    '</InfRps>' +
    '</Rps>'
  );
}

/**
 * Gera o XML EnviarLoteRpsEnvio (LoteRps com ListaRps) para envio.
 * O elemento LoteRps deve ter atributo Id para assinatura.
 */
export function gerarEnviarLoteRpsEnvio(input: EnviarLoteRpsEnvioInput): string {
  const { numeroLote, prestador, listaRps, incluirIBSCBS } = input;
  const idLote = `LOTE${numeroLote}`;
  const cnpj = prestador.cnpj.replace(/\D/g, '');
  const quantidadeRps = listaRps.length;

  let listaRpsXml = '<ListaRps>';
  listaRps.forEach((rps, i) => {
    listaRpsXml += buildInfRps(rps, prestador, i + 1);
  });
  listaRpsXml += '</ListaRps>';

  // Incluir atributo versao conforme manual (1.00)
  const loteRps =
    `<LoteRps Id="${idLote}" versao="1.00">` +
    tag('NumeroLote', numeroLote) +
    tag('Cnpj', cnpj) +
    tag('InscricaoMunicipal', prestador.inscricaoMunicipal) +
    tag('QuantidadeRps', quantidadeRps) +
    listaRpsXml +
    (incluirIBSCBS ? '<IBSCBS></IBSCBS>' : '') +
    '</LoteRps>';

  return `<EnviarLoteRpsEnvio xmlns="${NS}">${loteRps}</EnviarLoteRpsEnvio>`;
}

/**
 * Gera o XML de Pedido de Cancelamento (tcPedidoCancelamento) para assinatura.
 * InfPedidoCancelamento deve ter Id para assinatura.
 */
export function gerarPedidoCancelamentoNfse(params: {
  numeroNfse: string;
  codigoCancelamento: string;
  cnpjPrestador: string;
  idPedido?: string;
}): string {
  const id = params.idPedido || `CANC${params.numeroNfse}`;
  const cnpj = params.cnpjPrestador.replace(/\D/g, '');
  return (
    `<PedidoCancelamento xmlns="${NS}">` +
    `<InfPedidoCancelamento Id="${id}">` +
    tag('NumeroNfse', params.numeroNfse) +
    tag('CodigoCancelamento', params.codigoCancelamento) +
    '<Prestador>' +
    tag('Cnpj', cnpj) +
    '</Prestador>' +
    '</InfPedidoCancelamento>' +
    '</PedidoCancelamento>'
  );
}
