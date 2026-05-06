import { TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { inicioFimMesCivilUtc } from '../utils/datetime-sp.util';
import { decomporExcessoBancoHoras } from '../utils/banco-horas-excesso.util';

/**
 * Sincroniza excedente do mês (total e por componente) e aplica deltas nos saldos do banco.
 */
export async function sincronizarExcessoCompetencia(
  funcionarioId: string,
  referenciaAno: number,
  referenciaMes: number,
): Promise<void> {
  const f = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: {
      id: true,
      tipoContrato: true,
      cargaHorariaMensal: true,
      saldoBancoHorasNormaisExcedente: true,
      saldoBancoHorasExtras100: true,
    },
  });
  if (!f || f.tipoContrato !== TipoContratoFuncionario.REGISTRADO) return;

  const carga = f.cargaHorariaMensal ?? 220;
  const { inicio, fim } = inicioFimMesCivilUtc(referenciaAno, referenciaMes);

  const registros = await prisma.registroPonto.findMany({
    where: {
      funcionarioId,
      dataReferencia: { gte: inicio, lte: fim },
    },
    select: {
      horasNormais: true,
      horasExtras50: true,
      horasExtras100: true,
    },
  });

  let sumN = 0;
  let sum50 = 0;
  let sum100 = 0;
  for (const r of registros) {
    sumN += Number(r.horasNormais);
    sum50 += Number(r.horasExtras50);
    sum100 += Number(r.horasExtras100);
  }

  const { excessoTotal, excessoNormais, excessoExtras100 } = decomporExcessoBancoHoras({
    sumNormais: sumN,
    sumExtras50: sum50,
    sumExtras100: sum100,
    cargaMensal: carga,
  });

  const anteriorRow = await prisma.bancoHorasExcessoCompetencia.findUnique({
    where: {
      funcionarioId_referenciaAno_referenciaMes: {
        funcionarioId,
        referenciaAno,
        referenciaMes,
      },
    },
  });

  const prevN = anteriorRow
    ? Number(anteriorRow.excessoNormais ?? anteriorRow.excessoHoras)
    : 0;
  const prev100 = anteriorRow ? Number(anteriorRow.excessoExtras100 ?? 0) : 0;

  const deltaN = excessoNormais - prevN;
  const delta100 = excessoExtras100 - prev100;

  await prisma.$transaction(async (tx) => {
    await tx.bancoHorasExcessoCompetencia.upsert({
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
        excessoHoras: excessoTotal,
        excessoNormais: excessoNormais,
        excessoExtras100: excessoExtras100,
      },
      update: {
        excessoHoras: excessoTotal,
        excessoNormais: excessoNormais,
        excessoExtras100: excessoExtras100,
      },
    });

    if (Math.abs(deltaN) < 1e-6 && Math.abs(delta100) < 1e-6) return;

    const saldoN0 = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
    const saldo1000 = Number(f.saldoBancoHorasExtras100 ?? 0);
    const novoN = saldoN0 + deltaN;
    const novo100 = saldo1000 + delta100;
    const novoTotal = novoN + novo100;

    await tx.funcionario.update({
      where: { id: funcionarioId },
      data: {
        saldoBancoHorasNormaisExcedente: novoN,
        saldoBancoHorasExtras100: novo100,
        saldoBancoHoras: novoTotal,
      },
    });
  });
}
