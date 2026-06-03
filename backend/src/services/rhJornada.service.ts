import fs from 'fs';
import path from 'path';
import {
  ModoQuitacaoHorasNegativas,
  PeriodoCompensacaoHoras,
  StatusAprovacaoRh,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dataReferenciaDiaCivilUtc } from '../utils/datetime-sp.util';
import {
  aplicarClassificacaoNosMinutos,
  intervaloJustificativaMinutos,
  parseClassificacaoJustificativa,
  type ClassificacaoJustificativaPonto,
} from '../utils/justificativaPonto.util';
import { WORK_SHIFT_TEMPLATES_44H } from '../utils/workshift.util';

async function ajustarBancoHorasPorJustificativa(
  funcionarioId: string,
  minutosDebito: number,
  operacao: 'debitar' | 'estornar',
) {
  if (minutosDebito <= 0) return;
  const horas = minutosDebito / 60;
  const delta = operacao === 'debitar' ? -horas : horas;
  const f = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: {
      saldoBancoHoras: true,
      saldoBancoHorasNormaisExcedente: true,
      saldoBancoHorasExtras100: true,
    },
  });
  if (!f) return;
  const novoN = Number(f.saldoBancoHorasNormaisExcedente ?? 0) + delta;
  const novo100 = Number(f.saldoBancoHorasExtras100 ?? 0);
  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: {
      saldoBancoHorasNormaisExcedente: novoN,
      saldoBancoHoras: novoN + novo100,
    },
  });
}

function caminhoArquivoFalta(url: string | null | undefined): string | null {
  if (!url || !url.includes('/uploads/rh-faltas/')) return null;
  const nome = path.basename(url);
  return path.join(process.cwd(), 'uploads', 'rh-faltas', nome);
}

function removerArquivoFaltaSeExistir(url: string | null | undefined): void {
  const p = caminhoArquivoFalta(url);
  if (p && fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignora falha ao apagar arquivo antigo */
    }
  }
}

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
  documentoAnexoUrl?: string | null;
  documentoAnexoNome?: string | null;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(params.referenciaAno, params.referenciaMes, params.dia);

  const registro = await prisma.registroPonto.findUnique({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
      },
    },
    select: { id: true },
  });

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
      documentoAnexoUrl: params.documentoAnexoUrl ?? null,
      documentoAnexoNome: params.documentoAnexoNome ?? null,
      registroPontoId: registro?.id ?? null,
    },
    update: {
      status: 'APROVADO_RH',
      descricao: params.descricao,
      ...(params.documentoAnexoUrl !== undefined && {
        documentoAnexoUrl: params.documentoAnexoUrl,
      }),
      ...(params.documentoAnexoNome !== undefined && {
        documentoAnexoNome: params.documentoAnexoNome,
      }),
      ...(registro?.id ? { registroPontoId: registro.id } : {}),
    },
  });
}

/** Atualiza descrição e/ou anexo de falta justificada já registrada. */
export async function atualizarFaltaJustificada(
  ocorrenciaId: string,
  params: {
    descricao: string;
    documentoAnexoUrl?: string | null;
    documentoAnexoNome?: string | null;
    removerAnexo?: boolean;
  },
) {
  const atual = await prisma.ocorrenciaPontoRh.findUnique({ where: { id: ocorrenciaId } });
  if (!atual || atual.tipo !== 'FALTA_JUSTIFICADA') {
    throw new Error('Justificativa de falta não encontrada');
  }
  if (atual.status === 'REPROVADO') {
    throw new Error('Não é possível editar uma justificativa reprovada');
  }

  const substituirAnexo =
    params.removerAnexo === true ||
    (params.documentoAnexoUrl != null && params.documentoAnexoUrl !== atual.documentoAnexoUrl);

  if (substituirAnexo && atual.documentoAnexoUrl) {
    removerArquivoFaltaSeExistir(atual.documentoAnexoUrl);
  }

  const data: {
    descricao: string;
    status: 'APROVADO_RH';
    documentoAnexoUrl?: string | null;
    documentoAnexoNome?: string | null;
  } = {
    descricao: params.descricao,
    status: 'APROVADO_RH',
  };

  if (params.removerAnexo) {
    data.documentoAnexoUrl = null;
    data.documentoAnexoNome = null;
  } else if (params.documentoAnexoUrl !== undefined) {
    data.documentoAnexoUrl = params.documentoAnexoUrl;
    data.documentoAnexoNome = params.documentoAnexoNome ?? null;
  }

  const registro = await prisma.registroPonto.findFirst({
    where: {
      funcionarioId: atual.funcionarioId,
      dataReferencia: atual.dataReferencia,
    },
    select: { id: true },
  });

  return prisma.ocorrenciaPontoRh.update({
    where: { id: ocorrenciaId },
    data: {
      ...data,
      ...(registro?.id ? { registroPontoId: registro.id } : {}),
    },
  });
}

export async function removerAnexoFaltaJustificada(ocorrenciaId: string) {
  const atual = await prisma.ocorrenciaPontoRh.findUnique({ where: { id: ocorrenciaId } });
  if (!atual || atual.tipo !== 'FALTA_JUSTIFICADA') {
    throw new Error('Justificativa de falta não encontrada');
  }
  if (atual.status === 'REPROVADO') {
    throw new Error('Não é possível editar uma justificativa reprovada');
  }
  if (atual.documentoAnexoUrl) {
    removerArquivoFaltaSeExistir(atual.documentoAnexoUrl);
  }
  return prisma.ocorrenciaPontoRh.update({
    where: { id: ocorrenciaId },
    data: {
      documentoAnexoUrl: null,
      documentoAnexoNome: null,
      status: 'APROVADO_RH',
    },
  });
}

export async function criarJustificativaParcial(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  descricao: string;
  justificativaTipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
  horaInicio: string;
  horaFim: string;
  classificacaoJustificativa?: ClassificacaoJustificativaPonto | string | null;
  documentoAnexoUrl?: string | null;
  documentoAnexoNome?: string | null;
}) {
  const dataReferencia = dataReferenciaDiaCivilUtc(params.referenciaAno, params.referenciaMes, params.dia);
  const classificacao = parseClassificacaoJustificativa(params.classificacaoJustificativa);
  const minutosJp = intervaloJustificativaMinutos(params.horaInicio, params.horaFim);

  const registro = await prisma.registroPonto.findUnique({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
      },
    },
    select: { id: true },
  });

  const existente = await prisma.ocorrenciaPontoRh.findUnique({
    where: {
      funcionarioId_dataReferencia_tipo: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        tipo: 'JUSTIFICATIVA_PARCIAL' as any,
      },
    },
  });
  const classAntiga = existente
    ? parseClassificacaoJustificativa((existente as any).classificacaoJustificativa)
    : null;
  const minutosAntigosBanco =
    classAntiga === 'DESCONTAR_BANCO' ? Number(existente?.minutos ?? 0) : 0;

  const ocorrencia = await prisma.ocorrenciaPontoRh.upsert({
    where: {
      funcionarioId_dataReferencia_tipo: {
        funcionarioId: params.funcionarioId,
        dataReferencia,
        tipo: 'JUSTIFICATIVA_PARCIAL' as any,
      },
    },
    create: {
      funcionarioId: params.funcionarioId,
      dataReferencia,
      tipo: 'JUSTIFICATIVA_PARCIAL' as any,
      status: 'APROVADO_RH',
      descricao: params.descricao,
      justificativaTipo: params.justificativaTipo,
      horaInicio: params.horaInicio,
      horaFim: params.horaFim,
      classificacaoJustificativa: classificacao,
      minutos: classificacao === 'DESCONTAR_BANCO' ? minutosJp : 0,
      documentoAnexoUrl: params.documentoAnexoUrl ?? null,
      documentoAnexoNome: params.documentoAnexoNome ?? null,
      registroPontoId: registro?.id ?? null,
    } as any,
    update: {
      status: 'APROVADO_RH',
      descricao: params.descricao,
      justificativaTipo: params.justificativaTipo,
      horaInicio: params.horaInicio,
      horaFim: params.horaFim,
      classificacaoJustificativa: classificacao,
      minutos: classificacao === 'DESCONTAR_BANCO' ? minutosJp : 0,
      ...(params.documentoAnexoUrl !== undefined && { documentoAnexoUrl: params.documentoAnexoUrl }),
      ...(params.documentoAnexoNome !== undefined && { documentoAnexoNome: params.documentoAnexoNome }),
      ...(registro?.id ? { registroPontoId: registro.id } : {}),
    } as any,
  });

  if (minutosAntigosBanco > 0) {
    await ajustarBancoHorasPorJustificativa(params.funcionarioId, minutosAntigosBanco, 'estornar');
  }
  if (classificacao === 'DESCONTAR_BANCO' && minutosJp > 0) {
    await ajustarBancoHorasPorJustificativa(params.funcionarioId, minutosJp, 'debitar');
  }

  return ocorrencia;
}

/** Atualiza justificativa parcial existente (inclui classificação e ajuste de banco). */
export async function atualizarJustificativaParcial(
  ocorrenciaId: string,
  params: {
    descricao: string;
    justificativaTipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
    horaInicio: string;
    horaFim: string;
    classificacaoJustificativa?: ClassificacaoJustificativaPonto | string | null;
    documentoAnexoUrl?: string | null;
    documentoAnexoNome?: string | null;
    removerAnexo?: boolean;
  },
) {
  const atual = await prisma.ocorrenciaPontoRh.findUnique({ where: { id: ocorrenciaId } });
  if (!atual || (atual as any).tipo !== 'JUSTIFICATIVA_PARCIAL') {
    throw new Error('Justificativa parcial não encontrada');
  }
  if (atual.status === 'REPROVADO') {
    throw new Error('Não é possível editar uma justificativa reprovada');
  }

  const classificacaoNova = parseClassificacaoJustificativa(params.classificacaoJustificativa);
  const classificacaoAntiga = parseClassificacaoJustificativa(
    (atual as any).classificacaoJustificativa,
  );
  const minutosAntigos =
    classificacaoAntiga === 'DESCONTAR_BANCO' ? Number(atual.minutos ?? 0) : 0;
  const minutosNovos =
    classificacaoNova === 'DESCONTAR_BANCO'
      ? intervaloJustificativaMinutos(params.horaInicio, params.horaFim)
      : 0;

  if (minutosAntigos > 0) {
    await ajustarBancoHorasPorJustificativa(atual.funcionarioId, minutosAntigos, 'estornar');
  }

  if (params.removerAnexo && atual.documentoAnexoUrl) {
    removerArquivoFaltaSeExistir(atual.documentoAnexoUrl);
  }

  const registro = await prisma.registroPonto.findFirst({
    where: {
      funcionarioId: atual.funcionarioId,
      dataReferencia: atual.dataReferencia,
    },
    select: { id: true },
  });

  const ocorrencia = await prisma.ocorrenciaPontoRh.update({
    where: { id: ocorrenciaId },
    data: {
      status: 'APROVADO_RH',
      descricao: params.descricao,
      justificativaTipo: params.justificativaTipo,
      horaInicio: params.horaInicio,
      horaFim: params.horaFim,
      classificacaoJustificativa: classificacaoNova,
      minutos: minutosNovos,
      ...(params.removerAnexo
        ? { documentoAnexoUrl: null, documentoAnexoNome: null }
        : params.documentoAnexoUrl !== undefined
          ? {
              documentoAnexoUrl: params.documentoAnexoUrl,
              documentoAnexoNome: params.documentoAnexoNome ?? null,
            }
          : {}),
      ...(registro?.id ? { registroPontoId: registro.id } : {}),
    } as any,
  });

  if (minutosNovos > 0) {
    await ajustarBancoHorasPorJustificativa(atual.funcionarioId, minutosNovos, 'debitar');
  }

  return ocorrencia;
}

/** Remove justificativa parcial (falta do dia ou meio período) e estorna banco se aplicável. */
export async function excluirJustificativaParcial(ocorrenciaId: string) {
  const atual = await prisma.ocorrenciaPontoRh.findUnique({ where: { id: ocorrenciaId } });
  if (!atual || (atual as { tipo?: string }).tipo !== 'JUSTIFICATIVA_PARCIAL') {
    throw new Error('Justificativa parcial não encontrada');
  }
  const classificacao = parseClassificacaoJustificativa(
    (atual as { classificacaoJustificativa?: string | null }).classificacaoJustificativa,
  );
  const minutosBanco =
    classificacao === 'DESCONTAR_BANCO' ? Number(atual.minutos ?? 0) : 0;
  if (minutosBanco > 0) {
    await ajustarBancoHorasPorJustificativa(atual.funcionarioId, minutosBanco, 'estornar');
  }
  if (atual.documentoAnexoUrl) {
    removerArquivoFaltaSeExistir(atual.documentoAnexoUrl);
  }
  await prisma.ocorrenciaPontoRh.delete({ where: { id: ocorrenciaId } });
  return { id: ocorrenciaId };
}

/** Remove falta justificada (modelo legado). */
export async function excluirFaltaJustificada(ocorrenciaId: string) {
  const atual = await prisma.ocorrenciaPontoRh.findUnique({ where: { id: ocorrenciaId } });
  if (!atual || atual.tipo !== 'FALTA_JUSTIFICADA') {
    throw new Error('Justificativa de falta não encontrada');
  }
  if (atual.documentoAnexoUrl) {
    removerArquivoFaltaSeExistir(atual.documentoAnexoUrl);
  }
  await prisma.ocorrenciaPontoRh.delete({ where: { id: ocorrenciaId } });
  return { id: ocorrenciaId };
}

export async function vincularJustificativaParcialAoRegistro(
  funcionarioId: string,
  dataReferencia: Date,
  registroPontoId: string,
) {
  await prisma.ocorrenciaPontoRh.updateMany({
    where: {
      funcionarioId,
      dataReferencia,
      tipo: 'JUSTIFICATIVA_PARCIAL' as any,
      status: { not: 'REPROVADO' },
    },
    data: { registroPontoId },
  });
}

/** Vincula falta justificada pré-cadastrada ao registro após importação XLS ou edição manual. */
export async function vincularFaltaJustificadaAoRegistro(
  funcionarioId: string,
  dataReferencia: Date,
  registroPontoId: string,
) {
  await prisma.ocorrenciaPontoRh.updateMany({
    where: {
      funcionarioId,
      dataReferencia,
      tipo: 'FALTA_JUSTIFICADA',
      status: { not: 'REPROVADO' },
    },
    data: { registroPontoId },
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
