/**
 * Serviço de consulta CNPJ via API pública CNPJ.ws
 * https://publica.cnpj.ws/cnpj/{cnpj}
 * Retorna dados da Receita + inscrições estaduais (IE) por UF, permitindo
 * preencher automaticamente IE e indIEDest para NF-e (evita erro 232).
 */

const CNPJ_WS_BASE = 'https://publica.cnpj.ws/cnpj';

export interface InscricaoEstadualItem {
  inscricao_estadual: string;
  ativo: boolean;
  estado: { id: number; nome: string; sigla: string; ibge_id: number };
}

export interface EstabelecimentoCnpjWs {
  cnpj: string;
  tipo?: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  tipo_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string | null;
  bairro?: string;
  cep?: string;
  ddd1?: string;
  telefone1?: string;
  ddd2?: string;
  telefone2?: string;
  email?: string | null;
  pais?: { id: string; nome: string; sigla: string };
  estado?: { id: number; nome: string; sigla: string; ibge_id: number };
  cidade?: { id: number; nome: string; ibge_id: number; siafi_id?: string };
  atividade_principal?: { id: string; descricao: string };
  atividades_secundarias?: Array<{ id: string; descricao: string }>;
  inscricoes_estaduais?: InscricaoEstadualItem[];
}

export interface RespostaCnpjWs {
  cnpj_raiz: string;
  razao_social: string;
  capital_social?: string;
  porte?: { id: string; descricao: string };
  natureza_juridica?: { id: string; descricao: string };
  socios?: Array<{
    nome: string;
    tipo: string;
    data_entrada?: string;
    qualificacao_socio?: { id: number; descricao: string };
  }>;
  simples?: { simples_optante?: boolean; data_opcao?: string; data_exclusao?: string } | null;
  estabelecimento: EstabelecimentoCnpjWs;
}

export interface ConsultaCnpjNormalizada {
  /** Dados para formulário / NF-e */
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
  /** IE do estabelecimento na UF do endereço (SEFAZ); preenchido quando existe inscrição no mesmo estado */
  inscricaoEstadual: string;
  /** 1=Contribuinte (tem IE), 2=Isento, 9=Não contribuinte (sem IE) */
  indIEDest: 1 | 2 | 9;
  /** Resposta bruta da API para exibir no modal de detalhes */
  raw: RespostaCnpjWs;
}

/**
 * Busca CNPJ na API CNPJ.ws e normaliza para o sistema.
 * Se existir inscrição estadual na mesma UF do endereço, preenche IE e indIEDest=1.
 * Se array vazio ou sem match, indIEDest=9 e IE vazio.
 */
export async function consultarCnpj(cnpj: string): Promise<ConsultaCnpjNormalizada | null> {
  const raw = cnpj.replace(/\D/g, '');
  if (raw.length !== 14) return null;

  const url = `${CNPJ_WS_BASE}/${raw}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`CNPJ.ws: ${res.status} ${res.statusText}`);
  }

  const data: RespostaCnpjWs = await res.json();
  const est = data.estabelecimento;
  if (!est) return null;

  const ufEstabelecimento = (est.estado?.sigla || '').toUpperCase();
  const inscricoes = est.inscricoes_estaduais || [];
  const ieMesmoEstado = inscricoes.find(
    (i) => (i.estado?.sigla || '').toUpperCase() === ufEstabelecimento
  );
  const ieAtiva = ieMesmoEstado?.ativo !== false ? ieMesmoEstado : inscricoes.find((i) => (i.estado?.sigla || '').toUpperCase() === ufEstabelecimento);
  const inscricaoEstadual = (ieAtiva?.inscricao_estadual ?? ieMesmoEstado?.inscricao_estadual ?? '').trim();
  const indIEDest: 1 | 2 | 9 = inscricaoEstadual ? 1 : 9;

  const telefone = [est.ddd1, est.telefone1].filter(Boolean).join('') || [est.ddd2, est.telefone2].filter(Boolean).join('') || undefined;
  const logradouro = [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ').trim() || est.logradouro;

  return {
    razaoSocial: data.razao_social || '',
    nomeFantasia: est.nome_fantasia || undefined,
    cnpj: est.cnpj || data.cnpj_raiz || raw,
    email: est.email || undefined,
    telefone: telefone || undefined,
    logradouro: logradouro || undefined,
    numero: est.numero || undefined,
    complemento: est.complemento || undefined,
    bairro: est.bairro || undefined,
    cidade: est.cidade?.nome || undefined,
    estado: est.estado?.sigla || undefined,
    cep: est.cep || undefined,
    situacaoCadastral: est.situacao_cadastral || undefined,
    dataSituacaoCadastral: est.data_situacao_cadastral || undefined,
    dataInicioAtividade: est.data_inicio_atividade || undefined,
    porte: data.porte?.descricao || undefined,
    naturezaJuridica: data.natureza_juridica?.descricao || undefined,
    cnaeFiscal: est.atividade_principal?.id || undefined,
    cnaeFiscalDescricao: est.atividade_principal?.descricao || undefined,
    codigoMunicipioIbge: est.cidade?.ibge_id != null ? String(est.cidade.ibge_id) : undefined,
    inscricaoEstadual,
    indIEDest,
    raw: data
  };
}
