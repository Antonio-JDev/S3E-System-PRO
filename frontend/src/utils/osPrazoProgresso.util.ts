import type { ResultadoOsCalculado } from './apropriacaoOs';
import { calcularDiasCorridos, calcularDiasEntreDatas } from './osCockpit.util';

/** Limite superior do “no prazo” (amarelo). Acima disso → laranja. */
export const PRAZO_LIMITE_AMARELO = 80;

export type PrazoProgressoNivel = 'sem_estimativa' | 'no_prazo' | 'em_risco' | 'estouro';
export type PrazoProgressoCor = 'neutral' | 'yellow' | 'orange' | 'red';
export type PrazoProgressoEixo = 'diarias' | 'dias_calendario' | 'nenhum';

export interface CalcularPrazoProgressoInput {
  dataInicio?: string | Date | null;
  dataPrevisao?: string | Date | null;
  dataConclusao?: string | Date | null;
  dataFim?: string | Date | null;
  status?: string;
  diariasOrcadas?: number;
  diariasRealizadas?: number;
  agora?: Date;
}

export interface PrazoProgressoResultado {
  temEstimativa: boolean;
  eixo: PrazoProgressoEixo;
  /** 0–100 para largura da barra (estouro visual = 100%). */
  percentual: number;
  /** Percentual sem teto (pode > 100). */
  percentualRaw: number;
  consumido: number;
  estimado: number;
  labelNumeros: string;
  nivel: PrazoProgressoNivel;
  badge: string;
  cor: PrazoProgressoCor;
  barClassName: string;
  badgeClassName: string;
  estourou: boolean;
  motivoEstouro: 'diarias' | 'dias_corridos' | 'calendario' | null;
}

export interface ResumoProdutividadeOs {
  duracaoDias: number;
  colaboradoresDistintos: number | null;
  horasRealizadas: number;
  horasOrcadas: number;
  diariasRealizadas: number;
  diariasOrcadas: number;
  custoRealizado: number;
  custoOrcado: number;
  /** Custo homem-hora realizado (R$/h), se houver horas. */
  rendimentoValor: number | null;
  rendimentoLabel: string | null;
}

function refFimPrazo(input: CalcularPrazoProgressoInput): Date {
  const fim =
    input.dataConclusao ||
    (input.status === 'CONCLUIDO' ? input.dataFim : null) ||
    null;
  if (fim) {
    const d = new Date(fim);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return input.agora ?? new Date();
}

function classesPorCor(cor: PrazoProgressoCor): {
  barClassName: string;
  badgeClassName: string;
} {
  switch (cor) {
    case 'yellow':
      return {
        barClassName: 'bg-gradient-to-r from-yellow-400 to-amber-400',
        badgeClassName:
          'text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700',
      };
    case 'orange':
      return {
        barClassName: 'bg-gradient-to-r from-orange-400 to-orange-500',
        badgeClassName:
          'text-orange-900 dark:text-orange-200 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700',
      };
    case 'red':
      return {
        barClassName: 'bg-gradient-to-r from-red-500 to-red-600',
        badgeClassName:
          'text-white dark:text-red-100 bg-red-600 dark:bg-red-800 border border-red-700 dark:border-red-600',
      };
    default:
      return {
        barClassName: 'bg-gray-300 dark:bg-gray-600',
        badgeClassName:
          'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border',
      };
  }
}

function nivelPorPercentual(raw: number, estourou: boolean): {
  nivel: PrazoProgressoNivel;
  cor: PrazoProgressoCor;
  badge: string;
} {
  if (estourou || raw > 100) {
    return { nivel: 'estouro', cor: 'red', badge: 'Estouro' };
  }
  if (raw >= PRAZO_LIMITE_AMARELO) {
    return { nivel: 'em_risco', cor: 'orange', badge: 'Em risco' };
  }
  return { nivel: 'no_prazo', cor: 'yellow', badge: 'No prazo' };
}

/**
 * Consumo do prazo do cronograma (amarelo → laranja → vermelho).
 * A janela é dataInicio → dataPrevisao. Diárias e horas orçadas são esforço, não o prazo.
 * Estouro só quando os dias corridos passam da data final.
 */
export function calcularPrazoProgresso(
  input: CalcularPrazoProgressoInput
): PrazoProgressoResultado {
  const ref = refFimPrazo(input);
  const diasCorridos = calcularDiasCorridos(input.dataInicio, ref);

  const semEstimativa = (): PrazoProgressoResultado => {
    const classes = classesPorCor('neutral');
    return {
      temEstimativa: false,
      eixo: 'nenhum',
      percentual: 0,
      percentualRaw: 0,
      consumido: 0,
      estimado: 0,
      labelNumeros: 'Sem estimativa',
      nivel: 'sem_estimativa',
      badge: 'Sem estimativa',
      cor: 'neutral',
      ...classes,
      estourou: false,
      motivoEstouro: null,
    };
  };

  const diasEstimados = calcularDiasEntreDatas(input.dataInicio, input.dataPrevisao);
  if (diasEstimados != null && diasEstimados > 0) {
    const percentualRaw = (diasCorridos / diasEstimados) * 100;
    const estourou = percentualRaw > 100;
    const { nivel, cor, badge } = nivelPorPercentual(percentualRaw, estourou);
    const classes = classesPorCor(cor);

    return {
      temEstimativa: true,
      eixo: 'dias_calendario',
      percentual: Math.min(100, Math.max(0, percentualRaw)),
      percentualRaw,
      consumido: diasCorridos,
      estimado: diasEstimados,
      labelNumeros: `${diasCorridos} / ${diasEstimados} dias`,
      nivel,
      badge,
      cor,
      ...classes,
      estourou,
      motivoEstouro: estourou ? 'calendario' : null,
    };
  }

  return semEstimativa();
}

export interface FaixaOrcadoRealizado {
  realizado: number;
  orcado: number;
  /** 0–100 para a largura da barra. */
  percentual: number;
  /** Sem teto. Infinito quando há apontamento e o orçado é zero. */
  percentualRaw: number;
  estourou: boolean;
  cor: PrazoProgressoCor;
  barClassName: string;
}

export interface LeituraOrcadoRealizado {
  horas: FaixaOrcadoRealizado;
  diarias: FaixaOrcadoRealizado;
  temEstimativa: boolean;
  estourou: boolean;
  nivel: PrazoProgressoNivel;
  badge: string;
  cor: PrazoProgressoCor;
  badgeClassName: string;
}

function faixaOrcadoRealizado(realizado: number, orcado: number): FaixaOrcadoRealizado {
  const r = Math.max(0, Number(realizado) || 0);
  const o = Math.max(0, Number(orcado) || 0);
  const semBase = o <= 0;
  const percentualRaw = semBase ? (r > 0 ? Number.POSITIVE_INFINITY : 0) : (r / o) * 100;
  const estourou = semBase ? r > 0 : r > o;
  const { cor } = semBase && r <= 0
    ? { cor: 'neutral' as PrazoProgressoCor }
    : nivelPorPercentual(Number.isFinite(percentualRaw) ? percentualRaw : 101, estourou);
  return {
    realizado: r,
    orcado: o,
    percentual: Number.isFinite(percentualRaw) ? Math.min(100, Math.max(0, percentualRaw)) : r > 0 ? 100 : 0,
    percentualRaw,
    estourou,
    cor,
    barClassName: classesPorCor(cor).barClassName,
  };
}

/**
 * Leitura do bloco Prazo e estimativa: orçado salvo versus apontado.
 * A data limite e os dias corridos não entram neste progresso.
 */
export function calcularLeituraOrcadoRealizado(input: {
  horasOrcadas: number;
  horasRealizadas: number;
  diariasOrcadas: number;
  diariasRealizadas: number;
}): LeituraOrcadoRealizado {
  const horas = faixaOrcadoRealizado(input.horasRealizadas, input.horasOrcadas);
  const diarias = faixaOrcadoRealizado(input.diariasRealizadas, input.diariasOrcadas);
  const faixas = [horas, diarias];
  const temEstimativa = faixas.some((f) => f.orcado > 0 || f.realizado > 0);
  const estourou = faixas.some((f) => f.estourou);

  if (!temEstimativa) {
    return {
      horas,
      diarias,
      temEstimativa: false,
      estourou: false,
      nivel: 'sem_estimativa',
      badge: 'Sem estimativa',
      cor: 'neutral',
      badgeClassName: classesPorCor('neutral').badgeClassName,
    };
  }

  const raws = faixas
    .filter((f) => f.orcado > 0 || f.realizado > 0)
    .map((f) => (Number.isFinite(f.percentualRaw) ? f.percentualRaw : 101));
  const rawMax = raws.length > 0 ? Math.max(...raws) : 0;
  const nivel = nivelPorPercentual(rawMax, estourou);
  return {
    horas,
    diarias,
    temEstimativa: true,
    estourou,
    nivel: nivel.nivel,
    badge: nivel.badge,
    cor: nivel.cor,
    badgeClassName: classesPorCor(nivel.cor).badgeClassName,
  };
}

/** Conta colaboradores distintos nas linhas de calendário do resumo F1/apropriação. */
export function contarColaboradoresDistintos(
  resumo: Pick<ResultadoOsCalculado, 'calendarioLinhas'> | null | undefined
): number | null {
  const linhas = resumo?.calendarioLinhas;
  if (!linhas || linhas.length === 0) return null;
  const ids = new Set(
    linhas.map((l) => l.funcionarioId).filter((id): id is string => Boolean(id))
  );
  return ids.size;
}

/**
 * Mini-resumo de produtividade correlacionando prazo e apontamentos (dados já existentes).
 */
export function montarResumoProdutividadeOs(input: {
  dataInicio?: string | Date | null;
  dataConclusao?: string | Date | null;
  dataFim?: string | Date | null;
  status?: string;
  resumo: ResultadoOsCalculado | null;
  agora?: Date;
}): ResumoProdutividadeOs {
  const ref = refFimPrazo(input);
  const duracaoDias = calcularDiasCorridos(input.dataInicio, ref);
  const r = input.resumo;
  const horasRealizadas = Number(r?.horasEngenhariaRealizadas) || 0;
  const horasOrcadas = Number(r?.horasEngenhariaOrcadas) || 0;
  const diariasRealizadas = Number(r?.diariasEquipeRealizadas) || 0;
  const diariasOrcadas = Number(r?.diariasEquipeOrcadas) || 0;
  const custoRealizado = Number(r?.custoRealizado) || 0;
  const custoOrcado = Number(r?.custoOrcado) || 0;
  const homemHora = Number(r?.homemHoraRealizado) || 0;

  let rendimentoValor: number | null = null;
  let rendimentoLabel: string | null = null;
  if (homemHora > 0 && custoRealizado > 0) {
    rendimentoValor = Math.round((custoRealizado / homemHora) * 100) / 100;
    rendimentoLabel = 'Custo / homem-hora';
  }

  return {
    duracaoDias,
    colaboradoresDistintos: contarColaboradoresDistintos(r),
    horasRealizadas,
    horasOrcadas,
    diariasRealizadas,
    diariasOrcadas,
    custoRealizado,
    custoOrcado,
    rendimentoValor,
    rendimentoLabel,
  };
}
