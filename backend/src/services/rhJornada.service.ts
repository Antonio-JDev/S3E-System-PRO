import {
  ModoQuitacaoHorasNegativas,
  PeriodoCompensacaoHoras,
  StatusAprovacaoRh,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dataReferenciaDiaCivilUtc } from '../utils/datetime-sp.util';
import { WORK_SHIFT_TEMPLATES_44H } from '../utils/workshift.util';

export async function ensureWorkShiftTemplates() {
  for (const template of WORK_SHIFT_TEMPLATES_44H) {
    await prisma.workShift.upsert({
      where: { nome: template.nome },
      create: template,
      update: {
        entrada1: template.entrada1,
        saida1: template.saida1,
        entrada2: template.entrada2,
        saida2: template.saida2,
        ativo: true,
      },
    });
  }
}

export async function listarWorkShifts() {
  await ensureWorkShiftTemplates();
  return prisma.workShift.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
  });
}

export async function criarFaltaJustificada(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  descricao: string;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(params.referenciaAno, params.referenciaMes, params.dia);

  return prisma.ocorrenciaPontoRh.upsert({
    where: {
      funcionarioId_dataReferencia_tipo: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        tipo: 'FALTA_JUSTIFICADA',
      },
    },
    create: {
      funcionarioId: params.funcionarioId,
      dataReferencia,
      tipo: 'FALTA_JUSTIFICADA',
      status: 'APROVADO_RH',
      descricao: params.descricao,
    },
    update: {
      status: 'APROVADO_RH',
      descricao: params.descricao,
    },
  });
}

function sugerirDatasCompensacao(
  referenciaAno: number,
  referenciaMes: number,
  minutosDivida: number,
  periodo: PeriodoCompensacaoHoras,
): Date[] {
  const inicio = new Date(Date.UTC(referenciaAno, referenciaMes - 1, 1, 12, 0, 0));
  const fim = new Date(Date.UTC(referenciaAno, referenciaMes, 0, 12, 0, 0));
  const diasNecessarios = Math.max(1, Math.ceil(minutosDivida / 60));
  const datas: Date[] = [];
  for (let d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    const isWeekday = dow >= 1 && dow <= 5;
    const isWeekend = dow === 0 || dow === 6;
    if (periodo === 'DIAS_SEMANA' && isWeekday) {
      datas.push(new Date(d));
    }
    if (periodo === 'FINAL_DE_SEMANA' && isWeekend) {
      datas.push(new Date(d));
    }
    if (datas.length >= diasNecessarios) break;
  }
  return datas;
}

export async function criarCompensacaoHoras(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  horasDivida: number;
  modoQuitacao: ModoQuitacaoHorasNegativas;
  periodoCompensacao: PeriodoCompensacaoHoras;
}) {
  const minutosDivida = Math.max(0, Math.round(params.horasDivida * 60));
  if (minutosDivida <= 0) {
    throw new Error('Informe uma quantidade de horas válida para dívida');
  }

  const sugestoes = sugerirDatasCompensacao(
    params.referenciaAno,
    params.referenciaMes,
    minutosDivida,
    params.periodoCompensacao,
  );

  const created = await prisma.compensacaoHorasRh.create({
    data: {
      funcionarioId: params.funcionarioId,
      referenciaAno: params.referenciaAno,
      referenciaMes: params.referenciaMes,
      minutosDivida,
      modoQuitacao: params.modoQuitacao,
      periodoCompensacao: params.periodoCompensacao,
      status: StatusAprovacaoRh.PENDENTE,
      dias: {
        create: sugestoes.map((d) => ({
          dataCompensacao: d,
          minutosPrevistos: Math.min(60, minutosDivida),
          status: StatusAprovacaoRh.PENDENTE,
        })),
      },
    },
    include: { dias: true },
  });

  return created;
}

export async function listarCompensacoesCompetencia(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
}) {
  return prisma.compensacaoHorasRh.findMany({
    where: {
      funcionarioId: params.funcionarioId,
      referenciaAno: params.referenciaAno,
      referenciaMes: params.referenciaMes,
    },
    include: {
      dias: {
        orderBy: { dataCompensacao: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function aprovarDiaCompensacao(compensacaoDiaId: string) {
  return prisma.$transaction(async (tx) => {
    const dia = await tx.compensacaoHorasDiaRh.findUnique({
      where: { id: compensacaoDiaId },
      include: { compensacao: { include: { funcionario: true } } },
    });
    if (!dia) throw new Error('Dia de compensação não encontrado');
    if (dia.status === StatusAprovacaoRh.APROVADO_RH) return dia;

    const minutosFaltantes = Math.max(0, dia.minutosPrevistos - dia.minutosAprovados);
    const atualizado = await tx.compensacaoHorasDiaRh.update({
      where: { id: dia.id },
      data: {
        status: StatusAprovacaoRh.APROVADO_RH,
        minutosAprovados: dia.minutosPrevistos,
      },
    });

    const comp = dia.compensacao;
    const quitadosNovo = Math.min(comp.minutosDivida, comp.minutosQuitados + minutosFaltantes);
    const statusComp = quitadosNovo >= comp.minutosDivida ? StatusAprovacaoRh.APROVADO_RH : comp.status;

    await tx.compensacaoHorasRh.update({
      where: { id: comp.id },
      data: {
        minutosQuitados: quitadosNovo,
        status: statusComp,
      },
    });

    if (comp.funcionarioId && minutosFaltantes > 0) {
      const saldoAtual = Number(comp.funcionario.saldoHorasNegativas ?? 0);
      await tx.funcionario.update({
        where: { id: comp.funcionarioId },
        data: {
          saldoHorasNegativas: Math.max(0, saldoAtual - minutosFaltantes / 60),
        },
      });
    }

    return atualizado;
  });
}
