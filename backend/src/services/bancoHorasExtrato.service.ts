import { LancamentoFolhaCategoria } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { inicioFimMesCivilUtc } from '../utils/datetime-sp.util';
import { usaJornadaEBanco } from '../utils/tipoContrato.util';
import { montarBancoHorasResumo } from './bancoHorasRh.service';
import {
  competenciaAnterior,
  derivarSaldoInicialSemExtratoAnterior,
  montarExtratoBancoHorasMes,
  type BancoHorasExtratoMovimento,
  type BancoHorasExtratoResumo,
} from '../utils/bancoHorasExtrato.util';

export type OrigemExtratoBanco =
  | 'FOLHA'
  | 'IMPORT_XLS'
  | 'RECALC'
  | 'FATURAR'
  | 'ZERAR';

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(v: number): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/**
 * Calcula e persiste o extrato mensal do banco de horas.
 * Idempotente: upsert por (funcionarioId, ano, mes).
 *
 * Fluxo típico S3E: import XLS no fim do mês → sync A/B/P/D → extrato.
 */
export async function sincronizarExtratoBancoHorasCompetencia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  origem?: OrigemExtratoBanco;
}): Promise<BancoHorasExtratoResumo | null> {
  const { funcionarioId, referenciaAno, referenciaMes } = params;
  const origem = params.origem ?? 'FOLHA';

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: {
      id: true,
      tipoContrato: true,
      saldoBancoHoras: true,
      saldoBancoHorasNormaisExcedente: true,
      saldoBancoHorasExtras100: true,
      saldoHorasNegativas: true,
    },
  });
  if (!funcionario) return null;
  if (
    !usaJornadaEBanco(funcionario.tipoContrato) &&
    String(funcionario.tipoContrato) !== 'AUTONOMO'
  ) {
    return null;
  }

  const { inicio, fim } = inicioFimMesCivilUtc(referenciaAno, referenciaMes);

  const [comentarios, lancamentos, extratoAnterior] = await Promise.all([
    prisma.comentarioConferenciaPontoRh.findMany({
      where: {
        funcionarioId,
        dataReferencia: { gte: inicio, lte: fim },
      },
      select: {
        dataReferencia: true,
        minutosBancoCreditoAplicados: true,
        minutosBancoDebitoAplicados: true,
        tratamentoDebito: true,
        tratamentoCredito: true,
      },
      orderBy: { dataReferencia: 'asc' },
    }),
    prisma.lancamentoFolha.findMany({
      where: {
        funcionarioId,
        referenciaAno,
        referenciaMes,
        categoria: LancamentoFolhaCategoria.PAGAMENTO_BANCO_HORAS,
      },
      select: {
        id: true,
        quantidadeHoras: true,
        descricao: true,
        createdAt: true,
      },
    }),
    (() => {
      const prev = competenciaAnterior(referenciaAno, referenciaMes);
      return prisma.bancoHorasExtratoCompetencia.findUnique({
        where: {
          funcionarioId_referenciaAno_referenciaMes: {
            funcionarioId,
            referenciaAno: prev.ano,
            referenciaMes: prev.mes,
          },
        },
      });
    })(),
  ]);

  const movimentos: BancoHorasExtratoMovimento[] = [];
  let creditosMes = 0;
  let debitosMes = 0;

  for (const c of comentarios) {
    const credMin = Math.max(0, Math.round(n(c.minutosBancoCreditoAplicados)));
    const debMin = Math.max(0, Math.round(n(c.minutosBancoDebitoAplicados)));
    const dia = c.dataReferencia.getUTCDate();
    const dataRef = c.dataReferencia.toISOString().slice(0, 10);
    if (credMin > 0) {
      const horas = round2(credMin / 60);
      creditosMes += horas;
      movimentos.push({
        tipo: 'CREDITO',
        horas,
        dia,
        dataReferencia: dataRef,
        descricao: `Crédito banco (HE / avaliação${c.tratamentoCredito ? ` ${c.tratamentoCredito}` : ''})`,
      });
    }
    if (debMin > 0) {
      const horas = round2(debMin / 60);
      debitosMes += horas;
      movimentos.push({
        tipo: 'DEBITO',
        horas,
        dia,
        dataReferencia: dataRef,
        descricao: `Débito banco (atraso/falta${c.tratamentoDebito ? ` ${c.tratamentoDebito}` : ''})`,
      });
    }
  }

  let pagamentosMes = 0;
  for (const l of lancamentos) {
    const horas = round2(Math.max(0, n(l.quantidadeHoras)));
    if (horas <= 0) continue;
    pagamentosMes += horas;
    movimentos.push({
      tipo: 'PAGAMENTO',
      horas,
      dia: null,
      dataReferencia: null,
      descricao: l.descricao?.trim() || 'Pagamento banco de horas na folha',
    });
  }

  creditosMes = round2(creditosMes);
  debitosMes = round2(debitosMes);
  pagamentosMes = round2(pagamentosMes);

  const live = montarBancoHorasResumo(funcionario);
  const saldoFinalPositivas = round2(live.horasPositivas);
  const saldoFinalNegativas = round2(live.horasNegativas);

  let saldoInicialPositivas: number;
  let saldoInicialNegativas: number;
  if (extratoAnterior) {
    saldoInicialPositivas = round2(n(extratoAnterior.saldoFinalPositivas));
    saldoInicialNegativas = round2(n(extratoAnterior.saldoFinalNegativas));
  } else {
    const derivado = derivarSaldoInicialSemExtratoAnterior({
      saldoFinalPositivas,
      saldoFinalNegativas,
      creditosMes,
      debitosMes,
      pagamentosMes,
    });
    saldoInicialPositivas = derivado.positivas;
    saldoInicialNegativas = derivado.negativas;
  }

  const extrato = montarExtratoBancoHorasMes({
    referenciaAno,
    referenciaMes,
    saldoInicialPositivas,
    saldoInicialNegativas,
    creditosMes,
    debitosMes,
    pagamentosMes,
    saldoFinalPositivas,
    saldoFinalNegativas,
    movimentos,
    origemAtualizacao: origem,
  });

  await prisma.bancoHorasExtratoCompetencia.upsert({
    where: {
      funcionarioId_referenciaAno_referenciaMes: {
        funcionarioId,
        referenciaAno,
        referenciaMes,
      },
    },
    create: {
      funcionarioId,
      referenciaAno,
      referenciaMes,
      saldoInicialPositivas: extrato.saldoInicialPositivas,
      saldoInicialNegativas: extrato.saldoInicialNegativas,
      saldoInicialLiquido: extrato.saldoInicialLiquido,
      creditosMes: extrato.creditosMes,
      debitosMes: extrato.debitosMes,
      pagamentosMes: extrato.pagamentosMes,
      saldoFinalPositivas: extrato.saldoFinalPositivas,
      saldoFinalNegativas: extrato.saldoFinalNegativas,
      saldoFinalLiquido: extrato.saldoFinalLiquido,
      origemAtualizacao: origem,
      movimentosJson: movimentos,
    },
    update: {
      saldoInicialPositivas: extrato.saldoInicialPositivas,
      saldoInicialNegativas: extrato.saldoInicialNegativas,
      saldoInicialLiquido: extrato.saldoInicialLiquido,
      creditosMes: extrato.creditosMes,
      debitosMes: extrato.debitosMes,
      pagamentosMes: extrato.pagamentosMes,
      saldoFinalPositivas: extrato.saldoFinalPositivas,
      saldoFinalNegativas: extrato.saldoFinalNegativas,
      saldoFinalLiquido: extrato.saldoFinalLiquido,
      origemAtualizacao: origem,
      movimentosJson: movimentos,
    },
  });

  return extrato;
}

export async function obterExtratoBancoHorasCompetencia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
}): Promise<BancoHorasExtratoResumo | null> {
  const row = await prisma.bancoHorasExtratoCompetencia.findUnique({
    where: {
      funcionarioId_referenciaAno_referenciaMes: {
        funcionarioId: params.funcionarioId,
        referenciaAno: params.referenciaAno,
        referenciaMes: params.referenciaMes,
      },
    },
  });
  if (!row) return null;

  const movimentos = Array.isArray(row.movimentosJson)
    ? (row.movimentosJson as BancoHorasExtratoMovimento[])
    : [];

  return montarExtratoBancoHorasMes({
    referenciaAno: row.referenciaAno,
    referenciaMes: row.referenciaMes,
    saldoInicialPositivas: n(row.saldoInicialPositivas),
    saldoInicialNegativas: n(row.saldoInicialNegativas),
    creditosMes: n(row.creditosMes),
    debitosMes: n(row.debitosMes),
    pagamentosMes: n(row.pagamentosMes),
    saldoFinalPositivas: n(row.saldoFinalPositivas),
    saldoFinalNegativas: n(row.saldoFinalNegativas),
    movimentos,
    origemAtualizacao: row.origemAtualizacao,
  });
}

/**
 * Após import XLS: gera extrato para todos os colaboradores afetados da competência.
 */
export async function sincronizarExtratosAposImportXls(
  ano: number,
  mes: number,
  funcionarioIds: Iterable<string>,
  origem: OrigemExtratoBanco = 'IMPORT_XLS',
): Promise<number> {
  let nOk = 0;
  for (const funcionarioId of [...new Set(funcionarioIds)]) {
    try {
      const r = await sincronizarExtratoBancoHorasCompetencia({
        funcionarioId,
        referenciaAno: ano,
        referenciaMes: mes,
        origem,
      });
      if (r) nOk += 1;
    } catch (e) {
      console.error(
        `[bancoHorasExtrato] Falha ao sincronizar extrato ${funcionarioId} ${ano}-${mes}:`,
        e,
      );
    }
  }
  return nOk;
}
