import type { ResultadoOsCalculado } from './apropriacaoOs';
import {
  calcularDiasCorridos,
  calcularDiasEntreDatas,
  detectarEstouroPrazoExecucao,
} from './osCockpit.util';

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
 * Consumo do prazo estimado (amarelo → laranja → vermelho).
 * Prioriza diárias orçadas (mesma regra do cockpit); senão janela dataInicio→dataPrevisao.
 */
export function calcularPrazoProgresso(
  input: CalcularPrazoProgressoInput
): PrazoProgressoResultado {
  const diariasOrcadas = Number(input.diariasOrcadas) || 0;
  const diariasRealizadas = Number(input.diariasRealizadas) || 0;
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

  if (diariasOrcadas > 0) {
    const pctDias = (diasCorridos / diariasOrcadas) * 100;
    const pctDiarias = (diariasRealizadas / diariasOrcadas) * 100;
    const percentualRaw = Math.max(pctDias, pctDiarias);

    const estouroCockpit = detectarEstouroPrazoExecucao({
      status: input.status || 'EXECUCAO',
      diariasOrcadas,
      diariasRealizadas,
      diasCorridos,
    });

    // Fora de EXECUCAO ainda mostra estouro visual se consumo > 100%
    let motivoEstouro: PrazoProgressoResultado['motivoEstouro'] = null;
    let estourou = false;
    if (estouroCockpit.estourou) {
      estourou = true;
      motivoEstouro = estouroCockpit.motivo;
    } else if (percentualRaw > 100) {
      estourou = true;
      motivoEstouro =
        pctDiarias >= pctDias ? 'diarias' : 'dias_corridos';
    }

    const { nivel, cor, badge } = nivelPorPercentual(percentualRaw, estourou);
    const classes = classesPorCor(cor);
    const usaDiariasComoLabel = diariasRealizadas > 0 || pctDiarias >= pctDias;

    return {
      temEstimativa: true,
      eixo: 'diarias',
      percentual: Math.min(100, Math.max(0, percentualRaw)),
      percentualRaw,
      consumido: usaDiariasComoLabel ? diariasRealizadas : diasCorridos,
      estimado: diariasOrcadas,
      labelNumeros: usaDiariasComoLabel
        ? `${formatNum(diariasRealizadas)} / ${formatNum(diariasOrcadas)} diárias`
        : `${diasCorridos} / ${formatNum(diariasOrcadas)} dias`,
      nivel,
      badge,
      cor,
      ...classes,
      estourou,
      motivoEstouro,
    };
  }

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

function formatNum(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
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
