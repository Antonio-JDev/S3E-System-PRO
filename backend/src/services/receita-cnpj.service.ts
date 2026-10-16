/**
 * Consulta CNPJ na ReceitaWS (https://receitaws.com.br/v1/cnpj/{cnpj})
 * e resolve o código IBGE do município a partir do CEP.
 *
 * A ReceitaWS gratuita devolve cadastro da Receita (razão, endereço, CEP, CNAE).
 * O código do município (7 dígitos) e o da UF (2 dígitos) vêm do CEP:
 * ViaCEP informa cidade/UF e o código IBGE; a API de localidades do IBGE confirma.
 * A IE só entra quando o JSON da ReceitaWS a traz (campo próprio ou extra).
 */

const RECEITA_WS_BASE = 'https://receitaws.com.br/v1/cnpj';
const VIACEP_BASE = 'https://viacep.com.br/ws';
const IBGE_LOCALIDADES = 'https://servicodados.ibge.gov.br/api/v1/localidades';

const LIMITE_POR_MINUTO = 3;
const JANELA_MS = 60_000;
const CACHE_TTL_MS = 5 * 60_000;
const TIMEOUT_RECEITA_MS = 15_000;
const TIMEOUT_AUXILIAR_MS = 8_000;

export class ConsultaCnpjError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = 'ConsultaCnpjError';
  }
}

export interface RespostaReceitaWs {
  status?: string;
  message?: string;
  nome?: string;
  fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  situacao?: string;
  data_situacao?: string;
  abertura?: string;
  tipo?: string;
  porte?: string;
  natureza_juridica?: string;
  capital_social?: string;
  atividade_principal?: Array<{ code?: string; text?: string }>;
  atividades_secundarias?: Array<{ code?: string; text?: string }>;
  qsa?: Array<{ nome?: string; qual?: string }>;
  simples?: { optante?: boolean; data_opcao?: string | null; data_exclusao?: string | null } | null;
  simei?: { optante?: boolean; data_opcao?: string | null; data_exclusao?: string | null } | null;
  inscricao_estadual?: string;
  ie?: string;
  inscricoes_estaduais?: Array<{ inscricao_estadual?: string; ativo?: boolean; uf?: string }>;
  extra?: Record<string, unknown> | null;
}

export interface ConsultaCnpjNormalizada {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  situacaoCadastral?: string;
  dataSituacaoCadastral?: string;
  dataInicioAtividade?: string;
  porte?: string;
  naturezaJuridica?: string;
  cnaeFiscal?: string;
  cnaeFiscalDescricao?: string;
  codigoMunicipioIbge?: string;
  codigoUfIbge?: string;
  inscricaoEstadual: string;
  indIEDest: 1 | 2 | 9;
  raw: Record<string, unknown>;
}

export interface MunicipioIbgeListaItem {
  id: number;
  nome: string;
}

type FetchJson = (url: string, timeoutMs: number) => Promise<{ status: number; body: unknown }>;

const cache = new Map<string, { expiresAt: number; data: ConsultaCnpjNormalizada }>();
const consultasEm: number[] = [];

export function resetConsultaCnpjEstadoParaTeste(): void {
  cache.clear();
  consultasEm.length = 0;
}

export function normalizarNomeMunicipio(nome: string | null | undefined): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escolherMunicipioPorNome(
  lista: MunicipioIbgeListaItem[],
  cidade: string
): MunicipioIbgeListaItem | null {
  const alvo = normalizarNomeMunicipio(cidade);
  if (!alvo || lista.length === 0) return null;
  const exato = lista.find((m) => normalizarNomeMunicipio(m.nome) === alvo);
  if (exato) return exato;
  const contido = lista.find((m) => {
    const nome = normalizarNomeMunicipio(m.nome);
    return nome.startsWith(alvo) || alvo.startsWith(nome);
  });
  return contido ?? null;
}

export function extrairCodigoUfIbge(municipio: unknown, codigoMunicipio?: string): string | undefined {
  if (!municipio || typeof municipio !== 'object') {
    return codigoMunicipio && codigoMunicipio.length === 7 ? codigoMunicipio.slice(0, 2) : undefined;
  }
  const registro = municipio as Record<string, any>;
  const id =
    registro.microrregiao?.mesorregiao?.UF?.id ??
    registro['regiao-imediata']?.['regiao-intermediaria']?.UF?.id;
  if (id != null && String(id).replace(/\D/g, '')) {
    return String(id).replace(/\D/g, '').padStart(2, '0').slice(-2);
  }
  const codigo = String(registro.id ?? codigoMunicipio ?? '').replace(/\D/g, '');
  return codigo.length >= 2 ? codigo.slice(0, 2) : undefined;
}

export function extrairInscricaoEstadualReceita(receita: RespostaReceitaWs): {
  inscricaoEstadual: string;
  indIEDest: 1 | 2 | 9;
} {
  const extra = receita.extra && typeof receita.extra === 'object' ? receita.extra : {};
  const candidatos = [
    receita.inscricao_estadual,
    receita.ie,
    extra.inscricao_estadual,
    extra.ie,
    extra.inscricaoEstadual,
    ...(Array.isArray(receita.inscricoes_estaduais)
      ? receita.inscricoes_estaduais.map((item) => item?.inscricao_estadual)
      : []),
  ];
  const texto = candidatos
    .map((valor) => (valor == null ? '' : String(valor).trim()))
    .find((valor) => valor.length > 0) || '';
  if (!texto) return { inscricaoEstadual: '', indIEDest: 9 };
  if (texto.toUpperCase() === 'ISENTO') return { inscricaoEstadual: 'ISENTO', indIEDest: 2 };
  return { inscricaoEstadual: texto, indIEDest: 1 };
}

function somenteDigitos(valor: string | null | undefined): string {
  return String(valor || '').replace(/\D/g, '');
}

function situacaoParaExibicao(situacao: string | undefined): string | undefined {
  if (!situacao?.trim()) return undefined;
  if (situacao.trim().toUpperCase() === 'ATIVA') return 'Ativa';
  return situacao.trim();
}

function separarTelefones(telefone: string | undefined): {
  ddd1?: string;
  telefone1?: string;
  ddd2?: string;
  telefone2?: string;
} {
  if (!telefone?.trim()) return {};
  const partes = telefone.split('/').map((p) => p.trim()).filter(Boolean).slice(0, 2);
  const saida: { ddd1?: string; telefone1?: string; ddd2?: string; telefone2?: string } = {};
  partes.forEach((parte, indice) => {
    const digitos = somenteDigitos(parte);
    const sufixo = indice === 0 ? '1' : '2';
    if (digitos.length >= 10) {
      saida[`ddd${sufixo}` as 'ddd1' | 'ddd2'] = digitos.slice(0, 2);
      saida[`telefone${sufixo}` as 'telefone1' | 'telefone2'] = digitos.slice(2);
    } else if (digitos) {
      saida[`telefone${sufixo}` as 'telefone1' | 'telefone2'] = digitos;
    }
  });
  return saida;
}

export function mapearConsultaReceita(input: {
  cnpj: string;
  receita: RespostaReceitaWs;
  codigoMunicipioIbge?: string;
  codigoUfIbge?: string;
  cidadeIbge?: string;
  ufIbge?: string;
  nomeUf?: string;
}): ConsultaCnpjNormalizada {
  const receita = input.receita;
  const ie = extrairInscricaoEstadualReceita(receita);
  const telefones = separarTelefones(receita.telefone);
  const atividade = receita.atividade_principal?.[0];
  const uf = (input.ufIbge || receita.uf || '').trim().toUpperCase();
  const cidade = (input.cidadeIbge || receita.municipio || '').trim();
  const codigoMunicipio = somenteDigitos(input.codigoMunicipioIbge);
  const codigoUf = somenteDigitos(input.codigoUfIbge) || (codigoMunicipio.length === 7 ? codigoMunicipio.slice(0, 2) : '');
  const codigoMunicipioValido = codigoMunicipio.length === 7 ? codigoMunicipio : undefined;
  const codigoUfValido = codigoUf.length === 2 ? codigoUf : undefined;
  const cnaeCodigo = somenteDigitos(atividade?.code);
  const inscricoes = ie.inscricaoEstadual
    ? [
        {
          inscricao_estadual: ie.inscricaoEstadual,
          ativo: true,
          estado: {
            sigla: uf || undefined,
            nome: input.nomeUf || uf || undefined,
            ibge_id: codigoUfValido ? Number(codigoUfValido) : undefined,
          },
        },
      ]
    : [];

  const raw: Record<string, unknown> = {
    razao_social: receita.nome || '',
    nome_fantasia: receita.fantasia || undefined,
    capital_social: receita.capital_social,
    porte: receita.porte,
    natureza_juridica: receita.natureza_juridica,
    codigoMunicipioIbge: codigoMunicipioValido,
    codigoUfIbge: codigoUfValido,
    inscricaoEstadual: ie.inscricaoEstadual,
    indIEDest: ie.indIEDest,
    socios: (receita.qsa || []).map((socio) => ({
      nome: socio.nome || '',
      qualificacao_socio: { descricao: socio.qual || '' },
    })),
    simples: receita.simples ?? null,
    simei: receita.simei ?? null,
    estabelecimento: {
      cnpj: somenteDigitos(receita.cnpj) || input.cnpj,
      tipo: receita.tipo,
      nome_fantasia: receita.fantasia || null,
      situacao_cadastral: situacaoParaExibicao(receita.situacao),
      data_situacao_cadastral: receita.data_situacao,
      data_inicio_atividade: receita.abertura,
      logradouro: receita.logradouro,
      numero: receita.numero,
      complemento: receita.complemento || null,
      bairro: receita.bairro,
      cep: somenteDigitos(receita.cep) || receita.cep,
      email: receita.email || null,
      pais: 'Brasil',
      estado: uf
        ? { sigla: uf, nome: input.nomeUf || uf, ibge_id: codigoUfValido ? Number(codigoUfValido) : undefined }
        : undefined,
      cidade: cidade
        ? { nome: cidade, ibge_id: codigoMunicipioValido ? Number(codigoMunicipioValido) : undefined }
        : undefined,
      ...telefones,
      atividade_principal: atividade
        ? { id: atividade.code || cnaeCodigo, descricao: atividade.text || '' }
        : undefined,
      atividades_secundarias: (receita.atividades_secundarias || [])
        .filter((item) => item?.code && item.code !== '00.00-0-00')
        .map((item) => ({ id: item.code, descricao: item.text || '' })),
      inscricoes_estaduais: inscricoes,
    },
  };

  return {
    razaoSocial: (receita.nome || '').trim(),
    nomeFantasia: receita.fantasia?.trim() || undefined,
    cnpj: somenteDigitos(receita.cnpj) || input.cnpj,
    email: receita.email?.trim() || undefined,
    telefone: receita.telefone?.trim() || undefined,
    logradouro: receita.logradouro?.trim() || undefined,
    numero: receita.numero?.trim() || undefined,
    complemento: receita.complemento?.trim() || undefined,
    bairro: receita.bairro?.trim() || undefined,
    cidade: cidade || undefined,
    estado: uf || undefined,
    cep: somenteDigitos(receita.cep) || undefined,
    situacaoCadastral: situacaoParaExibicao(receita.situacao),
    dataSituacaoCadastral: receita.data_situacao,
    dataInicioAtividade: receita.abertura,
    porte: receita.porte,
    naturezaJuridica: receita.natureza_juridica,
    cnaeFiscal: cnaeCodigo || undefined,
    cnaeFiscalDescricao: atividade?.text,
    codigoMunicipioIbge: codigoMunicipioValido,
    codigoUfIbge: codigoUfValido,
    inscricaoEstadual: ie.inscricaoEstadual,
    indIEDest: ie.indIEDest,
    raw,
  };
}

function reservarConsultaReceita(): void {
  const agora = Date.now();
  while (consultasEm.length > 0 && agora - consultasEm[0] >= JANELA_MS) {
    consultasEm.shift();
  }
  if (consultasEm.length >= LIMITE_POR_MINUTO) {
    throw new ConsultaCnpjError(
      'Limite de 3 consultas por minuto na ReceitaWS. Aguarde 1 minuto.',
      429
    );
  }
  consultasEm.push(agora);
}

async function fetchJsonPadrao(url: string, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ConsultaCnpjError('Timeout ao consultar serviço externo', 504);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpcional(
  fetchJson: FetchJson,
  url: string
): Promise<{ status: number; body: unknown } | null> {
  try {
    return await fetchJson(url, TIMEOUT_AUXILIAR_MS);
  } catch {
    return null;
  }
}

async function resolverMunicipioPeloCep(
  fetchJson: FetchJson,
  cep: string,
  cidadeReceita: string | undefined,
  ufReceita: string | undefined
): Promise<{ codigoMunicipio?: string; codigoUf?: string; cidade?: string; uf?: string; nomeUf?: string }> {
  const cepDigitos = somenteDigitos(cep);
  let cidade = cidadeReceita?.trim();
  let uf = ufReceita?.trim().toUpperCase();
  let codigoSugerido = '';

  if (cepDigitos.length === 8) {
    const via = await fetchOpcional(fetchJson, `${VIACEP_BASE}/${cepDigitos}/json/`);
    const body = via && via.status === 200 && via.body && typeof via.body === 'object'
      ? (via.body as Record<string, unknown>)
      : null;
    if (body && body.erro !== true) {
      cidade = String(body.localidade || cidade || '').trim() || cidade;
      uf = String(body.uf || uf || '').trim().toUpperCase() || uf;
      codigoSugerido = somenteDigitos(String(body.ibge || ''));
    }
  }

  if (codigoSugerido.length === 7) {
    const confirmacao = await fetchOpcional(fetchJson, `${IBGE_LOCALIDADES}/municipios/${codigoSugerido}`);
    if (confirmacao && confirmacao.status === 200 && confirmacao.body && typeof confirmacao.body === 'object') {
      const municipio = confirmacao.body as Record<string, any>;
      return {
        codigoMunicipio: codigoSugerido,
        codigoUf: extrairCodigoUfIbge(municipio, codigoSugerido),
        cidade: String(municipio.nome || cidade || ''),
        uf,
        nomeUf:
          municipio.microrregiao?.mesorregiao?.UF?.nome ||
          municipio['regiao-imediata']?.['regiao-intermediaria']?.UF?.nome,
      };
    }
    return { codigoMunicipio: codigoSugerido, codigoUf: codigoSugerido.slice(0, 2), cidade, uf };
  }

  if (!uf || !cidade) return { cidade, uf };

  const listaResp = await fetchOpcional(fetchJson, `${IBGE_LOCALIDADES}/estados/${encodeURIComponent(uf)}/municipios`);
  const lista = Array.isArray(listaResp?.body) ? (listaResp?.body as MunicipioIbgeListaItem[]) : [];
  const escolhido = escolherMunicipioPorNome(lista, cidade);
  if (!escolhido) return { cidade, uf };
  const codigo = String(escolhido.id).replace(/\D/g, '');
  return {
    codigoMunicipio: codigo.length === 7 ? codigo : undefined,
    codigoUf: codigo.length === 7 ? codigo.slice(0, 2) : undefined,
    cidade: escolhido.nome || cidade,
    uf,
  };
}

/**
 * Busca o CNPJ na ReceitaWS e completa cidade, UF e código IBGE pelo CEP.
 * Repete no máximo 3 vezes por minuto. O mesmo CNPJ fica em cache por 5 minutos.
 */
export async function consultarCnpj(
  cnpj: string,
  fetchJson: FetchJson = fetchJsonPadrao
): Promise<ConsultaCnpjNormalizada | null> {
  const raw = somenteDigitos(cnpj);
  if (raw.length !== 14) return null;

  const emCache = cache.get(raw);
  if (emCache && emCache.expiresAt > Date.now()) {
    return emCache.data;
  }

  reservarConsultaReceita();
  const resposta = await fetchJson(`${RECEITA_WS_BASE}/${raw}`, TIMEOUT_RECEITA_MS);
  if (resposta.status === 429) {
    throw new ConsultaCnpjError('Limite de consultas da ReceitaWS atingido. Aguarde 1 minuto.', 429);
  }
  if (resposta.status === 504) {
    throw new ConsultaCnpjError('Timeout na ReceitaWS.', 504);
  }

  const corpo = resposta.body && typeof resposta.body === 'object' ? (resposta.body as RespostaReceitaWs) : null;
  if (!corpo || corpo.status === 'ERROR' || !resposta.status || resposta.status >= 400) {
    const mensagem = corpo?.message || '';
    if (!corpo || /n[aã]o encontrado|inv[aá]lido|rejeitado/i.test(mensagem) || resposta.status === 404) {
      return null;
    }
    throw new ConsultaCnpjError(mensagem || `ReceitaWS: ${resposta.status}`, 502);
  }

  const municipio = await resolverMunicipioPeloCep(fetchJson, corpo.cep || '', corpo.municipio, corpo.uf);
  const normalizada = mapearConsultaReceita({
    cnpj: raw,
    receita: corpo,
    codigoMunicipioIbge: municipio.codigoMunicipio,
    codigoUfIbge: municipio.codigoUf,
    cidadeIbge: municipio.cidade,
    ufIbge: municipio.uf,
    nomeUf: municipio.nomeUf,
  });
  cache.set(raw, { data: normalizada, expiresAt: Date.now() + CACHE_TTL_MS });
  return normalizada;
}
