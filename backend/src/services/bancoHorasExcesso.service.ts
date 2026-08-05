import { TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { inicioFimMesCivilUtc } from '../utils/datetime-sp.util';
import { decomporExcessoBancoHoras } from '../utils/banco-horas-excesso.util';
import { usaJornadaEBanco } from '../utils/tipoContrato.util';

/**
 * Atualiza apenas o espelho informativo do excedente do mês (total − carga).
 * NÃO mexe nos saldos do banco: o banco é definido dia a dia pelos botões A/B/P/D (padrão B).
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
    },
  });
  if (!f || !usaJornadaEBanco(f.tipoContrato)) return;

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

  await prisma.bancoHorasExcessoCompetencia.upsert({
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
}
