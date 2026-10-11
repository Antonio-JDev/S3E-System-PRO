import { TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sincronizarExtratoBancoHorasCompetencia } from './bancoHorasExtrato.service';

function aceitaBanco(tipo: TipoContratoFuncionario): boolean {
  return (
    tipo === TipoContratoFuncionario.REGISTRADO ||
    tipo === TipoContratoFuncionario.AUTONOMO ||
    tipo === TipoContratoFuncionario.AUTONOMO_BANCO_HORAS
  );
}

export type AjusteBancoHoras = {
  id: string;
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  horas: number;
  justificativa: string;
  createdAt: Date;
};

function mapAjuste(row: {
  id: string;
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  horas: unknown;
  justificativa: string;
  createdAt: Date;
}): AjusteBancoHoras {
  return {
    id: row.id,
    funcionarioId: row.funcionarioId,
    referenciaAno: row.referenciaAno,
    referenciaMes: row.referenciaMes,
    horas: Number(row.horas),
    justificativa: row.justificativa,
    createdAt: row.createdAt,
  };
}

export async function listarAjustesBancoHoras(funcionarioId: string): Promise<AjusteBancoHoras[]> {
  const rows = await prisma.bancoHorasAjusteManual.findMany({
    where: { funcionarioId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapAjuste);
}

/**
 * Credita horas no banco (excedente de jornada) numa competência ainda a pagar.
 * A justificativa fica gravada e entra no extrato desse mês.
 */
export async function lancarHorasNoBanco(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  horas: number;
  justificativa: string;
}): Promise<{
  ajuste: AjusteBancoHoras;
  saldoNovo: number;
  saldoNormaisNovo: number;
  saldoExtras100Novo: number;
}> {
  const horas = Number(params.horas);
  if (!Number.isFinite(horas) || horas <= 0) {
    throw new Error('Informe uma quantidade de horas positiva');
  }
  const justificativa = String(params.justificativa ?? '').trim();
  if (justificativa.length < 3) {
    throw new Error('Informe a justificativa do lançamento');
  }
  if (
    !Number.isInteger(params.referenciaAno) ||
    params.referenciaAno < 2000 ||
    !Number.isInteger(params.referenciaMes) ||
    params.referenciaMes < 1 ||
    params.referenciaMes > 12
  ) {
    throw new Error('Informe o mês em que essas horas serão pagas');
  }

  const f = await prisma.funcionario.findUnique({ where: { id: params.funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');
  if (!aceitaBanco(f.tipoContrato)) {
    throw new Error('Este vínculo não usa banco de horas');
  }

  let saldoN = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
  let saldo100 = Number(f.saldoBancoHorasExtras100 ?? 0);
  const legado = Number(f.saldoBancoHoras ?? saldoN + saldo100);
  if (saldoN + saldo100 <= 0 && legado > 0) {
    saldoN = legado;
    saldo100 = 0;
  }
  const novoN = Math.round((saldoN + horas) * 100) / 100;
  const novo100 = Math.round(saldo100 * 100) / 100;
  const novoTotal = Math.round((novoN + novo100) * 100) / 100;

  const criado = await prisma.$transaction(async (tx) => {
    await tx.funcionario.update({
      where: { id: f.id },
      data: {
        saldoBancoHorasNormaisExcedente: novoN,
        saldoBancoHorasExtras100: novo100,
        saldoBancoHoras: novoTotal,
      },
    });
    return tx.bancoHorasAjusteManual.create({
      data: {
        funcionarioId: f.id,
        referenciaAno: params.referenciaAno,
        referenciaMes: params.referenciaMes,
        horas,
        justificativa,
      },
    });
  });

  await sincronizarExtratoBancoHorasCompetencia({
    funcionarioId: f.id,
    referenciaAno: params.referenciaAno,
    referenciaMes: params.referenciaMes,
    origem: 'AJUSTE_MANUAL',
  });

  return {
    ajuste: mapAjuste(criado),
    saldoNovo: novoTotal,
    saldoNormaisNovo: novoN,
    saldoExtras100Novo: novo100,
  };
}
