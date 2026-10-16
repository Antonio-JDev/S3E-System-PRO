/**
 * Regras mecânicas da NF-e modelo 55 que a SEFAZ rejeita quando o XML inventa dado.
 * Sem consulta à SEFAZ e sem banco: a numeração numérica entra aqui; a query fica no service.
 */

const CODIGOS_UF: Record<string, string> = {
  AC: '12', AL: '27', AP: '16', AM: '13', BA: '29',
  CE: '23', DF: '53', ES: '32', GO: '52', MA: '21',
  MT: '51', MS: '50', MG: '31', PA: '15', PB: '25',
  PR: '41', PE: '26', PI: '22', RJ: '33', RN: '24',
  RS: '43', RO: '11', RR: '14', SC: '42', SP: '35',
  SE: '28', TO: '17',
};

/**
 * Cidades cujo código IBGE já estava explícito no emissor.
 * Cidade fora desta lista sem código informado não pode virar Itajaí.
 */
const MUNICIPIOS_RECONHECIDOS: Record<string, string> = {
  'ITAJAI|SC': '4208203',
  'SAO PAULO|SP': '3550308',
  'RIO DE JANEIRO|RJ': '3304557',
  'BELO HORIZONTE|MG': '3106200',
  'PORTO ALEGRE|RS': '4314902',
  'CURITIBA|PR': '4106902',
};

const PAISES_BRASIL = new Set(['BRASIL', 'BRAZIL', 'BR']);

export function normalizarTextoFiscal(texto: string | null | undefined): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Código IBGE da UF (cUF). UF desconhecida não vira Santa Catarina. */
export function codigoIbgeDaUf(uf: string | null | undefined): string {
  const sigla = normalizarTextoFiscal(uf);
  const codigo = CODIGOS_UF[sigla];
  if (!codigo) {
    throw new Error(
      `UF "${sigla || ''}" inválida. Informe a sigla do estado para montar o cUF da NF-e.`
    );
  }
  return codigo;
}

export function resolverIdDest(input: {
  ufEmitente: string;
  ufDestinatario: string;
  paisDestinatario?: string | null;
  codigoPaisDestinatario?: string | null;
}): '1' | '2' | '3' {
  const pais = normalizarTextoFiscal(input.paisDestinatario);
  const codPais = String(input.codigoPaisDestinatario || '').replace(/\D/g, '');
  const ufDest = normalizarTextoFiscal(input.ufDestinatario);
  const exterior =
    ufDest === 'EX' ||
    (pais.length > 0 && !PAISES_BRASIL.has(pais)) ||
    (codPais.length > 0 && codPais !== '1058');

  if (exterior) return '3';

  const ufEmit = normalizarTextoFiscal(input.ufEmitente);
  if (!ufEmit || !ufDest) {
    throw new Error('Informe a UF do emitente e a UF do destinatário para definir o idDest da NF-e.');
  }
  return ufEmit === ufDest ? '1' : '2';
}

/**
 * CFOP interno começa com 5 e interestadual com 6.
 * A contradição só é sinalizada: o CFOP informado permanece, e o idDest segue as UFs.
 */
export function cfopContradizIdDest(cfop: string | null | undefined, idDest: '1' | '2' | '3'): boolean {
  const inicio = String(cfop || '').replace(/\D/g, '').charAt(0);
  if (!inicio) return false;
  if (idDest === '1') return inicio === '6';
  if (idDest === '2') return inicio === '5';
  return inicio === '5' || inicio === '6';
}

export function extrairCodigoMunicipioInformado(fonte: unknown): string | undefined {
  if (!fonte || typeof fonte !== 'object') return undefined;
  const registro = fonte as Record<string, any>;
  const aninhado = registro.dadosCnpjWs && typeof registro.dadosCnpjWs === 'object'
    ? registro.dadosCnpjWs
    : undefined;
  const candidatos = [
    registro.codigoMunicipioIbge,
    registro.codigoMunicipio,
    registro.codigo_municipio_ibge,
    registro.ibge_id,
    aninhado?.codigoMunicipioIbge,
    aninhado?.codigoMunicipio,
    aninhado?.estabelecimento?.cidade?.ibge_id,
    aninhado?.cidade?.ibge_id,
    registro.estabelecimento?.cidade?.ibge_id,
    registro.cidade?.ibge_id,
  ];

  for (const candidato of candidatos) {
    if (candidato == null || candidato === '') continue;
    const digitos = String(candidato).replace(/\D/g, '');
    if (/^\d{7}$/.test(digitos)) return digitos;
  }
  return undefined;
}

export function resolverCodigoMunicipioIbge(input: {
  cidade: string | null | undefined;
  estado: string | null | undefined;
  codigoInformado?: string | null;
}): string {
  const uf = normalizarTextoFiscal(input.estado);
  if (uf === 'EX') return '9999999';

  const informado = String(input.codigoInformado || '').replace(/\D/g, '');
  if (/^\d{7}$/.test(informado)) return informado;

  const cidade = normalizarTextoFiscal(input.cidade);
  const conhecido = MUNICIPIOS_RECONHECIDOS[`${cidade}|${uf}`];
  if (conhecido) return conhecido;

  const cidadeLabel = String(input.cidade || '').trim() || '(sem cidade)';
  const ufLabel = String(input.estado || '').trim() || '(sem UF)';
  throw new Error(
    `Município "${cidadeLabel}/${ufLabel}" não possui código IBGE conhecido. Informe o código IBGE de 7 dígitos antes de emitir a NF-e.`
  );
}

/** NCM de produto ou kit que entra na NF-e: exatamente 8 dígitos, sem completar com zero. */
export function exigirNcmOitoDigitos(nomeItem: string | null | undefined, ncm: unknown): string {
  const digitos = String(ncm ?? '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(digitos) || /^0+$/.test(digitos)) {
    const nome = String(nomeItem || '').trim() || 'item';
    throw new Error(
      `Não é possível emitir a NF-e: o item "${nome}" está sem NCM de 8 dígitos. Informe o NCM do produto ou kit antes de emitir.`
    );
  }
  return digitos;
}

/**
 * Próximo número: maior entre o MAX numérico já gravado e o último configurado, mais um.
 * Ordem de texto ("9" depois de "10") não entra nesta conta.
 */
export function calcularProximoNumeroNFe(maxExistente: number, ultimoConfigurado: number): number {
  const max = Number.isFinite(Number(maxExistente)) ? Number(maxExistente) : 0;
  const configurado = Number.isFinite(Number(ultimoConfigurado)) ? Number(ultimoConfigurado) : 0;
  return Math.max(max, configurado, 0) + 1;
}
