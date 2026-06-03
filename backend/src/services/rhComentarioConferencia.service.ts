import { StatusAprovacaoRh } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dataReferenciaDiaCivilUtc } from '../utils/datetime-sp.util';

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
