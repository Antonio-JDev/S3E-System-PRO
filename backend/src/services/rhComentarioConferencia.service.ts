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
import { aplicarDeltasAvaliacaoBancoHoras } from './bancoHorasRh.service';
import { listarOverridesFeriadoMes } from './feriadoOverride.service';

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

/** True se ainda não há tracking de minutos aplicados neste funcionário (legado pré-migração). */
async function funcionarioSemTrackingBancoAplicado(funcionarioId: string): Promise<boolean> {
  const any = await prisma.comentarioConferenciaPontoRh.findFirst({
    where: {
      funcionarioId,
      OR: [
        { minutosBancoCreditoAplicados: { gt: 0 } },
        { minutosBancoDebitoAplicados: { gt: 0 } },
      ],
    },
    select: { id: true },
  });
  return !any;
}

async function funcionarioTemSaldoBanco(funcionarioId: string): Promise<boolean> {
  const f = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: {
      saldoBancoHoras: true,
      saldoBancoHorasNormaisExcedente: true,
      saldoBancoHorasExtras100: true,
      saldoHorasNegativas: true,
    },
  });
  if (!f) return false;
  const pos =
    Math.max(0, Number(f.saldoBancoHorasNormaisExcedente ?? 0)) +
    Math.max(0, Number(f.saldoBancoHorasExtras100 ?? 0));
  const leg = Math.max(0, Number(f.saldoBancoHoras ?? 0));
  const neg = Math.max(0, Number(f.saldoHorasNegativas ?? 0));
  return pos > 1e-6 || leg > 1e-6 || neg > 1e-6;
}

/**
 * Reaplica o impacto no banco quando as métricas do dia mudam (edit/import/recalc),
 * usando minutos já aplicados no comentário como fonte da verdade (evita duplicar).
 * Padrão B: grava tratamento B quando ainda null e há movimento.
 * Legado (saldo no cadastro + tracking zerado): assume crédito já no banco; aplica só débito faltante.
 * Em sync de competência, passe `legacyBootstrap` calculado uma vez antes do loop.
 */
export async function reaplicarBancoAvaliacaoAposMudancaMetricas(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  metricasAntes: MetricasAvaliacaoDia;
  metricasDepois: MetricasAvaliacaoDia;
  /** Se definido, não recalcula a cada dia (evita virar “normal” no meio do mês). */
  legacyBootstrap?: boolean;
}): Promise<void> {
  const dataReferencia = dataReferenciaDiaCivilUtc(
    params.referenciaAno,
    params.referenciaMes,
    params.dia,
  );
  const existente = await comentarioAvaliacaoDoDia(params.funcionarioId, dataReferencia);
  let tratamentoDebito = parseTratamentoDebito(existente?.tratamentoDebito ?? null);
  let tratamentoCredito = parseTratamentoCredito(existente?.tratamentoCredito ?? null);

  const newAval = aplicarAvaliacaoRhDia({
    ...params.metricasDepois,
    tratamentoDebito,
    tratamentoCredito,
  });

  const temMovimento =
    newAval.temDebito ||
    newAval.temCredito ||
    (existente?.minutosBancoCreditoAplicados ?? 0) > 0 ||
    (existente?.minutosBancoDebitoAplicados ?? 0) > 0;

  // Engine usa padrão B quando tratamento é null; NÃO grava B no banco de dados —
  // a UI só destaca A/B/P/D após clique explícito do RH.
  const avalFinal = newAval;

  const appliedCredito = Math.max(0, Number(existente?.minutosBancoCreditoAplicados ?? 0));
  const appliedDebito = Math.max(0, Number(existente?.minutosBancoDebitoAplicados ?? 0));

  const legacyBootstrap =
    params.legacyBootstrap !== undefined
      ? params.legacyBootstrap && appliedCredito === 0 && appliedDebito === 0
      : appliedCredito === 0 &&
        appliedDebito === 0 &&
        (await funcionarioSemTrackingBancoAplicado(params.funcionarioId)) &&
        (await funcionarioTemSaldoBanco(params.funcionarioId));

  let creditoDiffHoras: number;
  let debitoDiffHoras: number;
  if (legacyBootstrap) {
    // Crédito provavelmente já está no cadastro (HE antiga → banco); só completa o débito.
    creditoDiffHoras = 0;
    debitoDiffHoras = avalFinal.minutosBancoDebito / 60;
  } else {
    creditoDiffHoras = (avalFinal.minutosBancoCredito - appliedCredito) / 60;
    debitoDiffHoras = (avalFinal.minutosBancoDebito - appliedDebito) / 60;
  }

  if (Math.abs(creditoDiffHoras) >= 1e-9 || Math.abs(debitoDiffHoras) >= 1e-9) {
    await aplicarDeltasAvaliacaoBancoHoras(params.funcionarioId, {
      creditoDeltaHoras: creditoDiffHoras,
      debitoDeltaHoras: debitoDiffHoras,
    });
  }

  // Só cria/atualiza tracking de minutos aplicados; não força tratamento B na Situação.
  if (temMovimento || existente) {
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
        tratamentoDebito: null,
        tratamentoCredito: null,
        minutosBancoCreditoAplicados: avalFinal.minutosBancoCredito,
        minutosBancoDebitoAplicados: avalFinal.minutosBancoDebito,
      },
      update: {
        minutosBancoCreditoAplicados: avalFinal.minutosBancoCredito,
        minutosBancoDebitoAplicados: avalFinal.minutosBancoDebito,
      },
    });
  }
}

/**
 * Sincroniza banco A/B/P/D de todos os dias da competência (inclui faltas sem registro).
 * Idempotente via minutosBanco*Aplicados.
 */
export async function sincronizarBancoAvaliacoesCompetencia(
  funcionarioId: string,
  ano: number,
  mes: number,
): Promise<void> {
  const legacyBootstrap =
    (await funcionarioSemTrackingBancoAplicado(funcionarioId)) &&
    (await funcionarioTemSaldoBanco(funcionarioId));
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
      legacyBootstrap,
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

  const metricas = await metricasDiaParaAvaliacao({
    funcionarioId: params.funcionarioId,
    referenciaAno: params.referenciaAno,
    referenciaMes: params.referenciaMes,
    dia: params.dia,
  });

  const newAval = aplicarAvaliacaoRhDia({
    ...metricas,
    tratamentoDebito: newDebito,
    tratamentoCredito: newCredito,
  });

  // Fonte da verdade do que já está no banco = minutos aplicados (não o default B de null).
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
