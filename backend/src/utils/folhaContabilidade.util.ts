import type { FolhaMesResumo } from '../services/rh.service';

export type RubricasFolhaContabil = {
  heConfiguravel: number;
  he100: number;
  noturno: number;
  periculosidade: number;
  dsrFaltas: number;
  ajudaCusto: number;
  adiantamento: number;
  diasFaltas: number;
  faltasParciais: number;
};

export const RUBRICAS_FOLHA_CONTABIL_DEFAULT: RubricasFolhaContabil = {
  heConfiguravel: 170,
  he100: 200,
  noturno: 226,
  periculosidade: 149,
  dsrFaltas: 8794,
  ajudaCusto: 233,
  adiantamento: 981,
  diasFaltas: 8792,
  faltasParciais: 8069,
};

export const PERCENTUAIS_HE_FOLHA_CONTABIL = [50, 60, 70, 80, 100] as const;
export type PercentualHeFolhaContabil = (typeof PERCENTUAIS_HE_FOLHA_CONTABIL)[number];

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Horas em decimal com 2 casas (1,50 = 1h30). */
export function formatarHorasDecimal(horas: number): number {
  if (!Number.isFinite(horas) || horas <= 0) return 0;
  return round2(horas);
}

/** Serial Excel do 1º dia do mês (compatível Domínio/Alterdata). */
export function competenciaParaSerialExcel(ano: number, mes: number): number {
  const utc = Date.UTC(ano, mes - 1, 1);
  return Math.floor(utc / 86400000) + 25569;
}

export function labelHeConfiguravel(percentual: number): string {
  const p = PERCENTUAIS_HE_FOLHA_CONTABIL.includes(percentual as PercentualHeFolhaContabil)
    ? percentual
    : 70;
  return `Horas Extras ${p}%`;
}

export function normalizarRubricasFolhaContabil(raw: unknown): RubricasFolhaContabil {
  const base = { ...RUBRICAS_FOLHA_CONTABIL_DEFAULT };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const num = (k: keyof RubricasFolhaContabil) => {
    const v = Number(o[k]);
    return Number.isFinite(v) && v > 0 ? Math.round(v) : base[k];
  };
  return {
    heConfiguravel: num('heConfiguravel'),
    he100: num('he100'),
    noturno: num('noturno'),
    periculosidade: num('periculosidade'),
    dsrFaltas: num('dsrFaltas'),
    ajudaCusto: num('ajudaCusto'),
    adiantamento: num('adiantamento'),
    diasFaltas: num('diasFaltas'),
    faltasParciais: num('faltasParciais'),
  };
}

function toMinutos(hhmm: string): number {
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function overlap(a: number, b: number, r0: number, r1: number): number {
  const x = Math.max(a, r0);
  const y = Math.min(b, r1);
  return Math.max(0, y - x);
}

function debitoEfetivo(td: 'A' | 'B' | 'D' | null | undefined): 'A' | 'B' | 'D' {
  return td === 'A' || td === 'D' ? td : 'B';
}

function creditoEfetivo(tc: 'B' | 'P' | null | undefined): 'B' | 'P' {
  return tc === 'P' ? 'P' : 'B';
}

/** Minutos trabalhados após inicioNoturno a partir das batidas do dia. */
export function minutosNoturnosBatidas(batidas: string[], inicioNoturno: string): number {
  const noturnoIni = toMinutos(inicioNoturno || '18:00');
  let total = 0;
  for (let i = 0; i + 1 < batidas.length; i += 2) {
    const e = toMinutos(String(batidas[i]).trim());
    const s = toMinutos(String(batidas[i + 1]).trim());
    if (s > e) total += overlap(e, s, noturnoIni, 24 * 60);
  }
  return total;
}

/**
 * DSR: por semana (dom–sáb), se houver ≥1 falta injustificada integral (D) → +1 dia.
 */
export function calcularDsrFaltasSemana(
  conferencia: Array<{
    dia: number;
    diaSemana: number;
    ehFeriado: boolean;
    ehFimDeSemana?: boolean;
    temRegistro: boolean;
    faltaJustificada?: boolean;
    tratamentoDebito?: 'A' | 'B' | 'D' | null;
  }>,
  ano: number,
  mes: number,
): number {
  const semanasComFalta = new Set<string>();

  for (const row of conferencia) {
    const td = debitoEfetivo(row.tratamentoDebito);
    const ehFds = row.ehFimDeSemana ?? (row.diaSemana === 0 || row.diaSemana === 6);
    const ehDiaUtilSemRegistro =
      !row.temRegistro &&
      !row.ehFeriado &&
      !ehFds &&
      row.diaSemana >= 1 &&
      row.diaSemana <= 5 &&
      !row.faltaJustificada &&
      td === 'D';

    if (!ehDiaUtilSemRegistro) continue;

    const date = new Date(Date.UTC(ano, mes - 1, row.dia, 12, 0, 0));
    const dayOfWeek = date.getUTCDay();
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() - dayOfWeek);
    const weekKey = `${sunday.getUTCFullYear()}-${String(sunday.getUTCMonth() + 1).padStart(2, '0')}-${String(sunday.getUTCDate()).padStart(2, '0')}`;
    semanasComFalta.add(weekKey);
  }

  return semanasComFalta.size;
}

export type LinhaContabilExport = {
  tipoCalculo: number;
  matricula: number | string;
  nome: string;
  heConfiguravel: number | '';
  he100: number | '';
  noturno: number | '';
  periculosidade: number | '';
  dsrFaltasH: number | '';
  ajudaCusto: number | '';
  adiantamento: number | '';
  diasFaltas: number | '';
  dsrFaltasL: number | '';
  faltasParciais: number | '';
};

export function somarAjudaCustoBeneficios(beneficios: Array<{ nome: string; valorPadrao: unknown }>): number {
  let total = 0;
  for (const b of beneficios) {
    const nome = String(b.nome ?? '').toLowerCase();
    if (nome.includes('ajuda')) {
      total += Number(b.valorPadrao ?? 0);
    }
  }
  return round2(total);
}

export function montarLinhaContabil(
  folha: FolhaMesResumo,
  opts: {
    codigoRelogio?: number | null;
    inicioNoturno?: string;
    ajudaCustoBeneficios?: number;
  },
): LinhaContabilExport {
  const heSegSex = Number(folha.horasExtrasSegSex50?.horas ?? 0);
  const heSabado = Number(folha.horasExtrasSabado50?.horas ?? 0);
  let heBancoNormais = 0;
  let heBanco100 = 0;
  let adiantamento = 0;
  let ajudaCustoLanc = 0;

  for (const l of folha.lancamentos ?? []) {
    if (l.categoria === 'PAGAMENTO_BANCO_HORAS') {
      heBancoNormais += Number(l.horasComponenteNormais ?? 0);
      heBanco100 += Number(l.horasComponenteExtras100 ?? 0);
    }
    if (l.categoria === 'ADIANTAMENTO') {
      adiantamento += Number(l.valor ?? 0);
    }
    if (l.categoria === 'ACRESCIMO') {
      const desc = String(l.descricao ?? '').toLowerCase();
      if (desc.includes('ajuda')) {
        ajudaCustoLanc += Number(l.valor ?? 0);
      }
    }
  }

  const heConfiguravelVal = formatarHorasDecimal(heSegSex + heSabado + heBancoNormais);
  const he100Val = formatarHorasDecimal(Number(folha.horasExtras100?.horas ?? 0) + heBanco100);

  const inicioNoturno = opts.inicioNoturno ?? '18:00';
  let minNoturno = 0;
  for (const row of folha.conferenciaPonto ?? []) {
    if (creditoEfetivo(row.tratamentoCredito) !== 'P') continue;
    if (!row.temRegistro || !row.batidas?.length) continue;
    minNoturno += minutosNoturnosBatidas(row.batidas, inicioNoturno);
  }
  const noturnoVal = formatarHorasDecimal(minNoturno / 60);

  const diasFaltasVal = round2(Number(folha.descontoFalta?.dias ?? 0));
  const faltasParciaisVal = formatarHorasDecimal(
    Number(folha.descontoAtraso?.horas ?? 0) + Number(folha.descontoSaidaAntecipada?.horas ?? 0),
  );

  const dsr = calcularDsrFaltasSemana(
    folha.conferenciaPonto ?? [],
    folha.referencia.ano,
    folha.referencia.mes,
  );

  const ajudaCustoTotal = round2((opts.ajudaCustoBeneficios ?? 0) + ajudaCustoLanc);

  const matricula =
    opts.codigoRelogio != null && Number.isFinite(Number(opts.codigoRelogio))
      ? Number(opts.codigoRelogio)
      : '';

  return {
    tipoCalculo: 11,
    matricula,
    nome: folha.nome,
    heConfiguravel: heConfiguravelVal > 0 ? heConfiguravelVal : '',
    he100: he100Val > 0 ? he100Val : '',
    noturno: noturnoVal > 0 ? noturnoVal : '',
    periculosidade: '',
    dsrFaltasH: dsr > 0 ? round2(dsr) : '',
    ajudaCusto: ajudaCustoTotal > 0 ? ajudaCustoTotal : '',
    adiantamento: adiantamento > 0 ? round2(adiantamento) : '',
    diasFaltas: diasFaltasVal > 0 ? diasFaltasVal : '',
    dsrFaltasL: dsr > 0 ? round2(dsr) : '',
    faltasParciais: faltasParciaisVal > 0 ? faltasParciaisVal : '',
  };
}

export type CabecalhoPlanilhaContabil = {
  codigoEmpresa: string | number;
  razaoSocial: string;
  cnpj: string;
  competenciaSerial: number;
  percentualHe: number;
  rubricas: RubricasFolhaContabil;
};

function linhaVaziaPlanilha(): unknown[] {
  return [11, '', '', '', '', '', '', '', '', '', '', '', ''];
}

function linhaParaAoa(l: LinhaContabilExport): unknown[] {
  return [
    l.tipoCalculo,
    l.matricula,
    l.nome,
    l.heConfiguravel,
    l.he100,
    l.noturno,
    l.periculosidade,
    l.dsrFaltasH,
    l.ajudaCusto,
    l.adiantamento,
    l.diasFaltas,
    l.dsrFaltasL,
    l.faltasParciais,
  ];
}

/** Monta matriz AOA no layout LANÇAMENTOS FOLHA.xls (mín. 77 linhas). */
export function montarMatrizPlanilhaContabil(
  cabecalho: CabecalhoPlanilhaContabil,
  linhas: LinhaContabilExport[],
): unknown[][] {
  const r = cabecalho.rubricas;
  const labelHe = labelHeConfiguravel(cabecalho.percentualHe);
  const codigoEmpresaNum = Number(String(cabecalho.codigoEmpresa).replace(/\D/g, '')) || cabecalho.codigoEmpresa;

  const rows: unknown[][] = [];
  rows.push(['RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['Codigo Empresa:', '', codigoEmpresaNum, '', '', '', '', '', '', '', '', '', '']);
  rows.push(['Razão Social:', '', cabecalho.razaoSocial, '', '', '', '', '', '', '', '', '', '']);
  rows.push(['Inscrição Cnpj:', '', cabecalho.cnpj, '', '', '', '', '', '', '', '', '', '']);
  rows.push(['Competencia:', '', cabecalho.competenciaSerial, '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);

  rows.push([
    'Tipo de',
    'Código',
    'Nome dos',
    labelHe,
    'Horas Extras 100%',
    'ADICIONAL NOTURNO',
    'PERICULOSIDADE',
    'DSR Faltas',
    'AJUDA DE CUSTO',
    'ADIANTAMENTO',
    'DIAS FALTAS',
    'DSR FALTAS',
    'FALTAS PARCIAIS',
  ]);
  rows.push([
    'Calculo',
    'Folha',
    'Colaboradores',
    r.heConfiguravel,
    r.he100,
    r.noturno,
    r.periculosidade,
    r.dsrFaltas,
    r.ajudaCusto,
    r.adiantamento,
    r.diasFaltas,
    r.dsrFaltas,
    r.faltasParciais,
  ]);

  for (const linha of linhas) {
    rows.push(linhaParaAoa(linha));
  }

  const minRows = 77;
  while (rows.length < minRows) {
    rows.push(linhaVaziaPlanilha());
  }

  return rows;
}

export function linhaTemDados(l: LinhaContabilExport): boolean {
  return (
    l.heConfiguravel !== '' ||
    l.he100 !== '' ||
    l.noturno !== '' ||
    l.dsrFaltasH !== '' ||
    l.ajudaCusto !== '' ||
    l.adiantamento !== '' ||
    l.diasFaltas !== '' ||
    l.faltasParciais !== ''
  );
}
