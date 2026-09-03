import { StatusAprovacaoRh } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  dataReferenciaDiaCivilUtc,
  diaSemanaCivil,
  diasNoMes,
  ehFeriadoEfetivo,
} from '../utils/datetime-sp.util';
import {
  aplicarAvaliacaoRhDia,
  parseTratamentoCredito,
  parseTratamentoDebito,
  resolverTratamentosDoBotao,
  type TratamentoCreditoRh,
  type TratamentoDebitoRh,
} from '../utils/avaliacaoPontoRh.util';
import { jornadaMinutosPorDia } from '../utils/workshift.util';
import { minutosFaltaParaBanco } from '../utils/rhBancoFalta.util';
import { aplicarDeltasAvaliacaoBancoHoras } from './bancoHorasRh.service';
import { listarOverridesFeriadoMes } from './feriadoOverride.service';
import {
  botaoHabilitadoConferencia,
  temCreditoAvaliacaoConferencia,
  temDebitoAvaliacaoConferencia,
  type ConferenciaDiaElegibilidadeInput,
} from '../utils/conferenciaPontoRh.util';

const DECISOES = new Set<string>(['PENDENTE', 'APROVADO_RH', 'REPROVADO']);

export type MetricasAvaliacaoDia = {
  minutosAtraso: number;
  minutosHorasDevidas: number;
  minutosExtra: number;
  minutosFaltaIntegral: number;
};

export function parseDecisaoRh(raw: string | null | undefined): StatusAprovacaoRh {
  const v = String(raw ?? 'PENDENTE').trim().toUpperCase();
  if (DECISOES.has(v)) return v as StatusAprovacaoRh;
  return StatusAprovacaoRh.PENDENTE;
}

function temTratamentoExplicitoRh(
  tratamentoDebito: TratamentoDebitoRh | null,
  tratamentoCredito: TratamentoCreditoRh | null,
): boolean {
  return tratamentoDebito !== null || tratamentoCredito !== null;
}

export async function salvarComentarioConferenciaDia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  comentario: string | null;
  decisaoRh?: StatusAprovacaoRh | string | null;
  justificativaOcorrenciaId?: string | null;
  faltaJustificadaOcorrenciaId?: string | null;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  const comentario = String(params.comentario ?? '').trim() || null;
  const decisaoRh = parseDecisaoRh(params.decisaoRh);

  const row = await prisma.comentarioConferenciaPontoRh.upsert({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
      },
    },
    create: {
      funcionarioId: params.funcionarioId,
      dataReferencia,
      comentario,
      decisaoRh,
    },
    update: {
      comentario,
      decisaoRh,
    },
  });

  if (params.justificativaOcorrenciaId) {
    await prisma.ocorrenciaPontoRh.updateMany({
      where: {
        id: params.justificativaOcorrenciaId,
        funcionarioId: params.funcionarioId,
        tipo: 'JUSTIFICATIVA_PARCIAL' as any,
      },
      data: { status: decisaoRh },
    });
  }

  if (params.faltaJustificadaOcorrenciaId) {
    await prisma.ocorrenciaPontoRh.updateMany({
      where: {
        id: params.faltaJustificadaOcorrenciaId,
        funcionarioId: params.funcionarioId,
        tipo: 'FALTA_JUSTIFICADA' as any,
      },
      data: { status: decisaoRh },
    });
  }

  return row;
}

function minutosExtraDoRegistro(reg: {
  minutosExtra20?: number | null;
  minutosExtra50?: number | null;
  minutosExtra100?: number | null;
  horasExtras50?: number | null;
  horasExtras100?: number | null;
} | null): number {
  if (!reg) return 0;
  let m =
    Math.max(0, Number(reg.minutosExtra20 ?? 0)) +
    Math.max(0, Number(reg.minutosExtra50 ?? 0)) +
    Math.max(0, Number(reg.minutosExtra100 ?? 0));
  if (m <= 0) {
    m = Math.round(
      (Math.max(0, Number(reg.horasExtras50 ?? 0)) + Math.max(0, Number(reg.horasExtras100 ?? 0))) *
        60,
    );
  }
  return Math.max(0, Math.round(m));
}

/** Monta métricas de avaliação a partir de um registro já carregado (+ meta do dia). */
export function metricasAvaliacaoDeRegistro(params: {
  reg: {
    minutosAtraso?: number | null;
    minutosHorasDevidas?: number | null;
    minutosExtra20?: number | null;
    minutosExtra50?: number | null;
    minutosExtra100?: number | null;
    horasExtras50?: number | null;
    horasExtras100?: number | null;
  } | null;
  ehFds: boolean;
  ehFer: boolean;
  faltaJustificada: boolean;
  minutosPrevistosDia: number;
}): MetricasAvaliacaoDia {
  const { reg, ehFds, ehFer, faltaJustificada, minutosPrevistosDia } = params;
  const minutosAtraso =
    reg && !ehFer && !ehFds ? Math.max(0, Math.round(Number(reg.minutosAtraso ?? 0))) : 0;
  const minutosHorasDevidas =
    reg && !ehFer && !ehFds ? Math.max(0, Math.round(Number(reg.minutosHorasDevidas ?? 0))) : 0;
  const minutosExtra = minutosExtraDoRegistro(reg);
  const minutosFaltaIntegral =
    !reg && !ehFds && !ehFer && !faltaJustificada ? Math.max(0, minutosPrevistosDia) : 0;
  return { minutosAtraso, minutosHorasDevidas, minutosExtra, minutosFaltaIntegral };
}

export async function metricasDiaParaAvaliacao(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
}): Promise<MetricasAvaliacaoDia> {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  const dow = diaSemanaCivil(params.referenciaAno, params.referenciaMes, params.dia);
  const ehFds = dow === 0 || dow === 6;
  const overrides = await listarOverridesFeriadoMes(params.referenciaAno, params.referenciaMes);
  const ehFer = ehFeriadoEfetivo(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
    overrides,
  );

  const [reg, funcionario, faltaJustificada] = await Promise.all([
    prisma.registroPonto.findFirst({
      where: { funcionarioId: params.funcionarioId, dataReferencia },
    }),
    prisma.funcionario.findUnique({
      where: { id: params.funcionarioId },
      include: { configuracaoPonto: { include: { workShift: true } } },
    }),
    prisma.ocorrenciaPontoRh.findFirst({
      where: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        tipo: 'FALTA_JUSTIFICADA' as any,
      },
    }),
  ]);

  const ws = funcionario?.configuracaoPonto?.workShift ?? null;
  const minutosPrevistosDia = ws
    ? jornadaMinutosPorDia(ws)
    : Math.round(((Number(funcionario?.cargaHorariaMensal ?? 220) || 220) * 60) / 22);

  return metricasAvaliacaoDeRegistro({
    reg,
    ehFds,
    ehFer,
    faltaJustificada: !!faltaJustificada,
    minutosPrevistosDia,
  });
}

async function comentarioAvaliacaoDoDia(funcionarioId: string, dataReferencia: Date) {
  return prisma.comentarioConferenciaPontoRh.findUnique({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId,
        dataReferencia,
      },
    },
    select: {
      id: true,
      tratamentoDebito: true,
      tratamentoCredito: true,
      minutosBancoCreditoAplicados: true,
      minutosBancoDebitoAplicados: true,
    },
  });
}

/**
 * Reaplica o impacto no banco quando as métricas do dia mudam (edit/import/recalc),
 * usando minutos já aplicados no comentário como fonte da verdade (evita duplicar).
 * Sem clique A/B/P/D do RH → pendente (estorna lançamentos legados do sync silencioso).
 * Falta sem registro só entra no banco com A/B/D explícito, dia já ocorrido e após admissão.
 */
export async function reaplicarBancoAvaliacaoAposMudancaMetricas(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  metricasAntes: MetricasAvaliacaoDia;
  metricasDepois: MetricasAvaliacaoDia;
  dataAdmissao?: Date | null;
}): Promise<void> {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  const existente = await comentarioAvaliacaoDoDia(params.funcionarioId, dataReferencia);
  const tratamentoDebito = parseTratamentoDebito(existente?.tratamentoDebito ?? null);
  const tratamentoCredito = parseTratamentoCredito(existente?.tratamentoCredito ?? null);
  const explicito = temTratamentoExplicitoRh(tratamentoDebito, tratamentoCredito);

  const appliedCredito = Math.max(0, Number(existente?.minutosBancoCreditoAplicados ?? 0));
  const appliedDebito = Math.max(0, Number(existente?.minutosBancoDebitoAplicados ?? 0));

  if (!explicito) {
    if (appliedCredito <= 0 && appliedDebito <= 0) return;

    const creditoDiffHoras = -appliedCredito / 60;
    const debitoDiffHoras = -appliedDebito / 60;
    await aplicarDeltasAvaliacaoBancoHoras(params.funcionarioId, {
      creditoDeltaHoras: creditoDiffHoras,
      debitoDeltaHoras: debitoDiffHoras,
    });

    if (existente) {
      await prisma.comentarioConferenciaPontoRh.update({
        where: { id: existente.id },
        data: {
          minutosBancoCreditoAplicados: 0,
          minutosBancoDebitoAplicados: 0,
        },
      });
    }
    return;
  }

  const minutosFaltaIntegral = minutosFaltaParaBanco({
    minutosFaltaIntegral: params.metricasDepois.minutosFaltaIntegral,
    tratamentoDebito,
    ano: params.referenciaAno,
    mes: params.referenciaMes,
    dia: params.dia,
    dataAdmissao: params.dataAdmissao,
  });

  const avalFinal = aplicarAvaliacaoRhDia({
    ...params.metricasDepois,
    minutosFaltaIntegral,
    tratamentoDebito,
    tratamentoCredito,
  });

  const creditoDiffHoras = (avalFinal.minutosBancoCredito - appliedCredito) / 60;
  const debitoDiffHoras = (avalFinal.minutosBancoDebito - appliedDebito) / 60;

  if (Math.abs(creditoDiffHoras) >= 1e-9 || Math.abs(debitoDiffHoras) >= 1e-9) {
    await aplicarDeltasAvaliacaoBancoHoras(params.funcionarioId, {
      creditoDeltaHoras: creditoDiffHoras,
      debitoDeltaHoras: debitoDiffHoras,
    });
  }

  await prisma.comentarioConferenciaPontoRh.upsert({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
      },
    },
    create: {
      funcionarioId: params.funcionarioId,
      dataReferencia,
      comentario: null,
      decisaoRh: StatusAprovacaoRh.PENDENTE,
      tratamentoDebito,
      tratamentoCredito,
      minutosBancoCreditoAplicados: avalFinal.minutosBancoCredito,
      minutosBancoDebitoAplicados: avalFinal.minutosBancoDebito,
    },
    update: {
      minutosBancoCreditoAplicados: avalFinal.minutosBancoCredito,
      minutosBancoDebitoAplicados: avalFinal.minutosBancoDebito,
    },
  });
}

/**
 * Reaplica banco nos dias com decisão RH explícita após import/recalc de ponto.
 * Dias pendentes têm estornados lançamentos legados (sync silencioso antigo).
 */
export async function sincronizarBancoAvaliacoesCompetencia(
  funcionarioId: string,
  ano: number,
  mes: number,
): Promise<void> {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: { dataAdmissao: true },
  });
  const dataAdmissao = funcionario?.dataAdmissao ?? null;
  const totalDias = diasNoMes(ano, mes);
  for (let dia = 1; dia <= totalDias; dia++) {
    const metricas = await metricasDiaParaAvaliacao({
      funcionarioId,
      referenciaAno: ano,
      referenciaMes: mes,
      dia,
    });
    await reaplicarBancoAvaliacaoAposMudancaMetricas({
      funcionarioId,
      referenciaAno: ano,
      referenciaMes: mes,
      dia,
      metricasAntes: metricas,
      metricasDepois: metricas,
      dataAdmissao,
    });
  }
}

/**
 * Persiste avaliação rápida A/B/P/D do dia.
 * Crédito e débito de banco são aplicados em pistas separadas (estorno B→P não vira dívida).
 */
export async function salvarAvaliacaoRhDia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  tratamentoDebito?: TratamentoDebitoRh | null;
  tratamentoCredito?: TratamentoCreditoRh | null;
  /** Clique único A|B|P|D — redefine lados conforme o botão. */
  botao?: 'A' | 'B' | 'P' | 'D' | null;
  temDebito?: boolean;
  temCredito?: boolean;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );

  let tratamentoDebito: TratamentoDebitoRh | null | undefined = params.tratamentoDebito;
  let tratamentoCredito: TratamentoCreditoRh | null | undefined = params.tratamentoCredito;

  if (params.botao) {
    const resolved = resolverTratamentosDoBotao(params.botao, {
      temDebito: params.temDebito !== false,
      temCredito: params.temCredito !== false,
    });
    tratamentoDebito = resolved.tratamentoDebito;
    tratamentoCredito = resolved.tratamentoCredito;
  }

  const debitoParsed =
    tratamentoDebito === undefined
      ? undefined
      : tratamentoDebito === null
        ? null
        : parseTratamentoDebito(tratamentoDebito);
  const creditoParsed =
    tratamentoCredito === undefined
      ? undefined
      : tratamentoCredito === null
        ? null
        : parseTratamentoCredito(tratamentoCredito);

  const existente = await prisma.comentarioConferenciaPontoRh.findUnique({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
      },
    },
  });

  const oldDebito = parseTratamentoDebito(existente?.tratamentoDebito ?? null);
  const oldCredito = parseTratamentoCredito(existente?.tratamentoCredito ?? null);
  const newDebito = debitoParsed !== undefined ? debitoParsed : oldDebito;
  const newCredito = creditoParsed !== undefined ? creditoParsed : oldCredito;

  const [metricas, funcionario] = await Promise.all([
    metricasDiaParaAvaliacao({
      funcionarioId: params.funcionarioId,
      referenciaAno: params.referenciaAno,
      referenciaMes: params.referenciaMes,
      dia: params.dia,
    }),
    prisma.funcionario.findUnique({
      where: { id: params.funcionarioId },
      select: { dataAdmissao: true },
    }),
  ]);

  const minutosFaltaIntegral = minutosFaltaParaBanco({
    minutosFaltaIntegral: metricas.minutosFaltaIntegral,
    tratamentoDebito: newDebito,
    ano: params.referenciaAno,
    mes: params.referenciaMes,
    dia: params.dia,
    dataAdmissao: funcionario?.dataAdmissao ?? null,
  });

  const newAval = aplicarAvaliacaoRhDia({
    ...metricas,
    minutosFaltaIntegral,
    tratamentoDebito: newDebito,
    tratamentoCredito: newCredito,
  });

  const appliedCredito = Math.max(0, Number(existente?.minutosBancoCreditoAplicados ?? 0));
  const appliedDebito = Math.max(0, Number(existente?.minutosBancoDebitoAplicados ?? 0));
  const creditoDiffHoras = (newAval.minutosBancoCredito - appliedCredito) / 60;
  const debitoDiffHoras = (newAval.minutosBancoDebito - appliedDebito) / 60;
  if (Math.abs(creditoDiffHoras) >= 1e-9 || Math.abs(debitoDiffHoras) >= 1e-9) {
    await aplicarDeltasAvaliacaoBancoHoras(params.funcionarioId, {
      creditoDeltaHoras: creditoDiffHoras,
      debitoDeltaHoras: debitoDiffHoras,
    });
  }

  if (!existente) {
    return prisma.comentarioConferenciaPontoRh.create({
      data: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        comentario: null,
        decisaoRh: StatusAprovacaoRh.PENDENTE,
        tratamentoDebito: debitoParsed !== undefined ? debitoParsed : null,
        tratamentoCredito: creditoParsed !== undefined ? creditoParsed : null,
        minutosBancoCreditoAplicados: newAval.minutosBancoCredito,
        minutosBancoDebitoAplicados: newAval.minutosBancoDebito,
      },
    });
  }

  return prisma.comentarioConferenciaPontoRh.update({
    where: { id: existente.id },
    data: {
      ...(debitoParsed !== undefined && { tratamentoDebito: debitoParsed }),
      ...(creditoParsed !== undefined && { tratamentoCredito: creditoParsed }),
      minutosBancoCreditoAplicados: newAval.minutosBancoCredito,
      minutosBancoDebitoAplicados: newAval.minutosBancoDebito,
    },
  });
}

async function carregarDiaConferenciaElegibilidade(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
}): Promise<ConferenciaDiaElegibilidadeInput> {
  const { funcionarioId, referenciaAno, referenciaMes, dia } = params;
  const dataReferencia = dataReferenciaDiaCivilUtc(referenciaAno, referenciaMes, dia);
  const dow = diaSemanaCivil(referenciaAno, referenciaMes, dia);
  const ehFimDeSemana = dow === 0 || dow === 6;
  const overrides = await listarOverridesFeriadoMes(referenciaAno, referenciaMes);
  const ehFeriado = ehFeriadoEfetivo(referenciaAno, referenciaMes, dia, overrides);

  const [reg, funcionario, faltaJustificada, comentario] = await Promise.all([
    prisma.registroPonto.findFirst({
      where: { funcionarioId, dataReferencia },
    }),
    prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: { configuracaoPonto: { include: { workShift: true } } },
    }),
    prisma.ocorrenciaPontoRh.findFirst({
      where: {
        funcionarioId,
        dataReferencia,
        tipo: 'FALTA_JUSTIFICADA' as any,
      },
    }),
    prisma.comentarioConferenciaPontoRh.findUnique({
      where: {
        funcionarioId_dataReferencia: {
          funcionarioId,
          dataReferencia,
        },
      },
      select: { tratamentoDebito: true, tratamentoCredito: true },
    }),
  ]);

  const ws = funcionario?.configuracaoPonto?.workShift ?? null;
  const minutosPrevistosDia = ws
    ? jornadaMinutosPorDia(ws)
    : Math.round(((Number(funcionario?.cargaHorariaMensal ?? 220) || 220) * 60) / 22);

  const metricas = metricasAvaliacaoDeRegistro({
    reg,
    ehFds: ehFimDeSemana,
    ehFer: ehFeriado,
    faltaJustificada: !!faltaJustificada,
    minutosPrevistosDia,
  });

  const minutosExtra20 = reg ? Math.max(0, Math.round(Number(reg.minutosExtra20 ?? 0))) : 0;

  return {
    temRegistro: !!reg,
    ehFimDeSemana,
    ehFeriado,
    faltaJustificada: !!faltaJustificada,
    minutosAtraso: metricas.minutosAtraso,
    minutosHorasDevidas: metricas.minutosHorasDevidas,
    minutosExtraTotal: metricas.minutosExtra,
    minutosExtra20,
    horasLiquidas: reg
      ? Number(reg.horasNormais ?? 0) +
        Number(reg.horasExtras50 ?? 0) +
        Number(reg.horasExtras100 ?? 0)
      : 0,
    tratamentoDebito: parseTratamentoDebito(comentario?.tratamentoDebito ?? null),
    tratamentoCredito: parseTratamentoCredito(comentario?.tratamentoCredito ?? null),
  };
}

export type AvaliacaoRhLoteResumo = {
  aplicados: number[];
  ignorados: Array<{ dia: number; motivo: string }>;
  falhas: Array<{ dia: number; message: string }>;
  total: number;
};

/** Aplica A/B/P/D em vários dias da conferência (ignora dias sem débito/crédito elegível). */
export async function salvarAvaliacaoRhDiaLote(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dias: number[];
  botao: 'A' | 'B' | 'P' | 'D';
}): Promise<AvaliacaoRhLoteResumo> {
  const maxDia = diasNoMes(params.referenciaAno, params.referenciaMes);
  const diasUnicos = [...new Set(params.dias.map((d) => Math.floor(Number(d))))]
    .filter((d) => Number.isFinite(d) && d >= 1 && d <= maxDia)
    .sort((a, b) => a - b);

  const aplicados: number[] = [];
  const ignorados: Array<{ dia: number; motivo: string }> = [];
  const falhas: Array<{ dia: number; message: string }> = [];

  for (const dia of diasUnicos) {
    try {
      const ctx = await carregarDiaConferenciaElegibilidade({
        funcionarioId: params.funcionarioId,
        referenciaAno: params.referenciaAno,
        referenciaMes: params.referenciaMes,
        dia,
      });

      if (!botaoHabilitadoConferencia(params.botao, ctx)) {
        ignorados.push({
          dia,
          motivo: 'Sem débito/crédito elegível para este botão',
        });
        continue;
      }

      await salvarAvaliacaoRhDia({
        funcionarioId: params.funcionarioId,
        referenciaAno: params.referenciaAno,
        referenciaMes: params.referenciaMes,
        dia,
        botao: params.botao,
        temDebito: temDebitoAvaliacaoConferencia(ctx),
        temCredito: temCreditoAvaliacaoConferencia(ctx),
      });
      aplicados.push(dia);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao salvar';
      falhas.push({ dia, message });
    }
  }

  return { aplicados, ignorados, falhas, total: diasUnicos.length };
}
