import { Prisma, StatusVistoriaCelesc as StatusVistoriaCelescEnum } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const PRAZO_RESPOSTA_CELESC_DIAS = 30;

export const StatusVistoriaCelesc = {
  PENDENTE_PROTOCOLO: StatusVistoriaCelescEnum.PENDENTE_PROTOCOLO,
  AGUARDANDO_CELESC: StatusVistoriaCelescEnum.AGUARDANDO_CELESC,
  REPROVADO: StatusVistoriaCelescEnum.REPROVADO,
  VISTORIA_APROVADA: StatusVistoriaCelescEnum.VISTORIA_APROVADA,
} as const;

export type StatusVistoriaCelesc = StatusVistoriaCelescEnum;

const STATUS_OS_APROVADO_OU_ALEM = ['APROVADO', 'EXECUCAO', 'CONCLUIDO', 'VALIDADO'] as const;

const STATUS_FILA: StatusVistoriaCelesc[] = [
  StatusVistoriaCelesc.PENDENTE_PROTOCOLO,
  StatusVistoriaCelesc.AGUARDANDO_CELESC,
  StatusVistoriaCelesc.REPROVADO,
];

export type ReprovarVistoriaInput = {
  dataReprovacao: Date | string;
  motivos: string;
  itensReprovados: string[] | string;
  criadoPorId?: string | null;
};

function parseItensReprovados(raw: string[] | string): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(raw || '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function calcularPrazo(dataProtocolo: Date | null | undefined) {
  if (!dataProtocolo) {
    return {
      diasDecorridos: null as number | null,
      diasRestantes: null as number | null,
      atrasado: false,
    };
  }
  const inicio = new Date(dataProtocolo);
  const agora = new Date();
  const ms = agora.getTime() - inicio.getTime();
  const diasDecorridos = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  const diasRestantes = PRAZO_RESPOSTA_CELESC_DIAS - diasDecorridos;
  return {
    diasDecorridos,
    diasRestantes,
    atrasado: diasRestantes < 0,
  };
}

function statusOsElegivel(status: string): boolean {
  return (STATUS_OS_APROVADO_OU_ALEM as readonly string[]).includes(status);
}

async function syncStatusCelescEngenharia(
  projetoId: string,
  label: 'AGUARDANDO CELESC' | 'REPROVADO' | 'APROVADO',
) {
  const eng = await prisma.projetoEngenharia.findUnique({ where: { projetoId } });
  if (!eng) return;

  const atual = Array.isArray(eng.statusCelesc)
    ? (eng.statusCelesc as unknown[]).map(String)
    : [];
  const limpos = atual.filter(
    (s) => !['AGUARDANDO CELESC', 'REPROVADO', 'APROVADO', 'ENVIADO'].includes(s),
  );
  await prisma.projetoEngenharia.update({
    where: { projetoId },
    data: { statusCelesc: [...limpos, label] },
  });
}

export async function entrarNaFilaSeAplicavel(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      exigeVistoriaCelesc: true,
      statusVistoria: true,
      status: true,
    },
  });
  if (!projeto) return null;
  if (!projeto.exigeVistoriaCelesc) return projeto;
  if (projeto.status === 'CANCELADO' || projeto.status === 'PROPOSTA') {
    return projeto;
  }
  if (!statusOsElegivel(String(projeto.status))) return projeto;
  if (projeto.statusVistoria != null) return projeto;

  return prisma.projeto.update({
    where: { id: projetoId },
    data: { statusVistoria: StatusVistoriaCelesc.PENDENTE_PROTOCOLO },
  });
}

export async function listarFila() {
  const projetos = await prisma.projeto.findMany({
    where: {
      exigeVistoriaCelesc: true,
      statusVistoria: { in: STATUS_FILA },
      status: { not: 'CANCELADO' },
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      responsavel: { select: { id: true, name: true } },
      orcamento: { select: { id: true, numeroSequencial: true, titulo: true } },
      engenharia: {
        select: {
          id: true,
          statusCelesc: true,
          statusEngenharia: true,
          nomeProjeto: true,
        },
      },
      historicoReprovacoesVistoria: {
        orderBy: { dataReprovacao: 'desc' },
        include: {
          criadoPor: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dataProtocoloVistoria: 'asc' }, { updatedAt: 'desc' }],
  });

  return projetos.map((p) => {
    const prazo = calcularPrazo(p.dataProtocoloVistoria);
    return {
      ...p,
      responsavel: p.responsavel
        ? { id: p.responsavel.id, nome: p.responsavel.name }
        : null,
      ...prazo,
      qtdReprovacoes: p.historicoReprovacoesVistoria.length,
    };
  });
}

export async function protocolar(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) throw new Error('Projeto não encontrado');
  if (!(projeto as { exigeVistoriaCelesc?: boolean }).exigeVistoriaCelesc) {
    throw new Error('Esta OS não exige vistoria CELESC');
  }
  const statusAtual = (projeto as { statusVistoria?: string | null }).statusVistoria;
  if (
    statusAtual !== StatusVistoriaCelesc.PENDENTE_PROTOCOLO &&
    statusAtual !== StatusVistoriaCelesc.REPROVADO
  ) {
    throw new Error(
      'Só é possível protocolar vistoria em status PENDENTE_PROTOCOLO ou REPROVADO',
    );
  }

  const atualizado = await prisma.projeto.update({
    where: { id: projetoId },
    data: {
      statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      dataProtocoloVistoria: new Date(),
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      historicoReprovacoesVistoria: { orderBy: { dataReprovacao: 'desc' } },
    },
  });

  await syncStatusCelescEngenharia(projetoId, 'AGUARDANDO CELESC');
  return {
    ...atualizado,
    ...calcularPrazo(atualizado.dataProtocoloVistoria),
    qtdReprovacoes: atualizado.historicoReprovacoesVistoria.length,
  };
}

export async function reprovar(projetoId: string, input: ReprovarVistoriaInput) {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) throw new Error('Projeto não encontrado');
  if (!(projeto as { exigeVistoriaCelesc?: boolean }).exigeVistoriaCelesc) {
    throw new Error('Esta OS não exige vistoria CELESC');
  }
  const statusAtual = (projeto as { statusVistoria?: string | null }).statusVistoria;
  if (
    statusAtual !== StatusVistoriaCelesc.AGUARDANDO_CELESC &&
    statusAtual !== StatusVistoriaCelesc.REPROVADO
  ) {
    throw new Error('Só é possível reprovar vistoria em AGUARDANDO_CELESC ou REPROVADO');
  }

  const motivos = String(input.motivos || '').trim();
  if (!motivos) throw new Error('Motivos / observações são obrigatórios');

  const itensReprovados = parseItensReprovados(input.itensReprovados);
  if (itensReprovados.length === 0) {
    throw new Error('Informe ao menos um item reprovado');
  }

  const dataReprovacao = new Date(input.dataReprovacao);
  if (Number.isNaN(dataReprovacao.getTime())) {
    throw new Error('Data da reprovação inválida');
  }

  const [, atualizado] = await prisma.$transaction([
    prisma.historicoReprovacaoVistoria.create({
      data: {
        projetoId,
        dataReprovacao,
        motivos,
        itensReprovados: itensReprovados as Prisma.InputJsonValue,
        criadoPorId: input.criadoPorId ?? null,
      },
    }),
    prisma.projeto.update({
      where: { id: projetoId },
      data: { statusVistoria: StatusVistoriaCelesc.REPROVADO },
      include: {
        cliente: { select: { id: true, nome: true } },
        historicoReprovacoesVistoria: {
          orderBy: { dataReprovacao: 'desc' },
          include: { criadoPor: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  await syncStatusCelescEngenharia(projetoId, 'REPROVADO');
  return {
    ...atualizado,
    ...calcularPrazo(atualizado.dataProtocoloVistoria),
    qtdReprovacoes: atualizado.historicoReprovacoesVistoria.length,
  };
}

export async function aprovar(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) throw new Error('Projeto não encontrado');
  if (!(projeto as { exigeVistoriaCelesc?: boolean }).exigeVistoriaCelesc) {
    throw new Error('Esta OS não exige vistoria CELESC');
  }
  const statusAtual = (projeto as { statusVistoria?: string | null }).statusVistoria;
  if (
    statusAtual !== StatusVistoriaCelesc.AGUARDANDO_CELESC &&
    statusAtual !== StatusVistoriaCelesc.REPROVADO
  ) {
    throw new Error('Só é possível aprovar vistoria em AGUARDANDO_CELESC ou REPROVADO');
  }

  const atualizado = await prisma.projeto.update({
    where: { id: projetoId },
    data: { statusVistoria: StatusVistoriaCelesc.VISTORIA_APROVADA },
    include: {
      cliente: { select: { id: true, nome: true } },
      historicoReprovacoesVistoria: { orderBy: { dataReprovacao: 'desc' } },
    },
  });

  await syncStatusCelescEngenharia(projetoId, 'APROVADO');
  return {
    ...atualizado,
    ...calcularPrazo(atualizado.dataProtocoloVistoria),
    qtdReprovacoes: atualizado.historicoReprovacoesVistoria.length,
  };
}

export function validarConclusaoVistoriaCelesc(projeto: {
  exigeVistoriaCelesc: boolean;
  statusVistoria: StatusVistoriaCelesc | string | null;
}): string | null {
  if (!projeto.exigeVistoriaCelesc) return null;
  if (projeto.statusVistoria !== StatusVistoriaCelesc.VISTORIA_APROVADA) {
    return 'Não é possível concluir a OS: a vistoria CELESC ainda não foi aprovada.';
  }
  return null;
}
