export type PeriodoDashboard = 'monthly' | 'bimonthly' | 'quarterly' | 'semester' | 'annual';

export interface IntervaloPeriodo {
  start: Date;
  end: Date;
  label: string;
}

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MESES_POR_FATIA: Record<Exclude<PeriodoDashboard, 'annual'>, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semester: 6,
};

export const ROTULO_PERIODO_ATUAL: Record<PeriodoDashboard, string> = {
  monthly: 'no mês atual',
  bimonthly: 'no bimestre atual',
  quarterly: 'no trimestre atual',
  semester: 'no semestre atual',
  annual: 'no ano atual',
};

export function parsePeriodoDashboard(valor: unknown): PeriodoDashboard {
  return valor === 'bimonthly' || valor === 'quarterly' || valor === 'semester' || valor === 'annual'
    ? valor
    : 'monthly';
}

function intervaloDaFatia(periodo: PeriodoDashboard, ano: number, indice: number): IntervaloPeriodo {
  if (periodo === 'annual') {
    return {
      start: new Date(ano, 0, 1),
      end: new Date(ano, 11, 31, 23, 59, 59, 999),
      label: String(ano),
    };
  }
  const meses = MESES_POR_FATIA[periodo];
  const mesInicio = indice * meses;
  const start = new Date(ano, mesInicio, 1);
  const end = new Date(ano, mesInicio + meses, 0, 23, 59, 59, 999);
  let label: string;
  if (periodo === 'monthly') label = MESES_NOMES[indice];
  else if (periodo === 'bimonthly') label = `${indice + 1}º Bim`;
  else if (periodo === 'quarterly') label = `${indice + 1}º Tri`;
  else label = `${indice + 1}º Sem ${ano}`;
  return { start, end, label };
}

/**
 * Fatias do eixo X dos gráficos: mensal/bimestral/trimestral cobrem o ano atual,
 * semestral os últimos 4 semestres (ano anterior + atual) e anual os últimos 6 anos.
 */
export function bucketsGraficoDashboard(
  periodo: PeriodoDashboard,
  hoje: Date = new Date(),
): IntervaloPeriodo[] {
  const anoAtual = hoje.getFullYear();
  if (periodo === 'annual') {
    return Array.from({ length: 6 }, (_, i) => intervaloDaFatia('annual', anoAtual - 5 + i, 0));
  }
  if (periodo === 'semester') {
    return [anoAtual - 1, anoAtual].flatMap((ano) => [0, 1].map((i) => intervaloDaFatia('semester', ano, i)));
  }
  const fatiasNoAno = 12 / MESES_POR_FATIA[periodo];
  return Array.from({ length: fatiasNoAno }, (_, i) => intervaloDaFatia(periodo, anoAtual, i));
}

/** Período corrente (que contém `hoje`) e o imediatamente anterior, para os cards e suas tendências. */
export function periodoAtualEAnterior(
  periodo: PeriodoDashboard,
  hoje: Date = new Date(),
): { atual: IntervaloPeriodo; anterior: IntervaloPeriodo } {
  const ano = hoje.getFullYear();
  if (periodo === 'annual') {
    return {
      atual: intervaloDaFatia('annual', ano, 0),
      anterior: intervaloDaFatia('annual', ano - 1, 0),
    };
  }
  const meses = MESES_POR_FATIA[periodo];
  const indice = Math.floor(hoje.getMonth() / meses);
  const anterior =
    indice > 0
      ? intervaloDaFatia(periodo, ano, indice - 1)
      : intervaloDaFatia(periodo, ano - 1, 12 / meses - 1);
  return { atual: intervaloDaFatia(periodo, ano, indice), anterior };
}
