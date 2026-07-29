import { StatusAprovacaoRh } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dataReferenciaDiaCivilUtc } from '../utils/datetime-sp.util';
import {
  parseTratamentoCredito,
  parseTratamentoDebito,
  resolverTratamentosDoBotao,
  type TratamentoCreditoRh,
  type TratamentoDebitoRh,
} from '../utils/avaliacaoPontoRh.util';

const DECISOES = new Set<string>(['PENDENTE', 'APROVADO_RH', 'REPROVADO']);

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

/**
 * Persiste avaliação rápida A/B/P/D do dia sem alterar batidas brutas nem métricas calculadas.
 * Campos undefined = não alterar; null = limpar.
 */
export async function salvarAvaliacaoRhDia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  tratamentoDebito?: TratamentoDebitoRh | null;
  tratamentoCredito?: TratamentoCreditoRh | null;
  /** Clique único A|B|P|D — redefine ambos os lados. */
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

  if (!existente) {
    return prisma.comentarioConferenciaPontoRh.create({
      data: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        comentario: null,
        decisaoRh: StatusAprovacaoRh.PENDENTE,
        tratamentoDebito: debitoParsed ?? null,
        tratamentoCredito: creditoParsed ?? null,
      },
    });
  }

  return prisma.comentarioConferenciaPontoRh.update({
    where: { id: existente.id },
    data: {
      ...(debitoParsed !== undefined && { tratamentoDebito: debitoParsed }),
      ...(creditoParsed !== undefined && { tratamentoCredito: creditoParsed }),
    },
  });
}
