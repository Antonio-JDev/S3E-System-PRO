import { Prisma, StatusVistoriaCelesc as StatusVistoriaCelescEnum } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  ITENS_PADRAO_VISTORIA_CELESC,
  ItemAvaliacaoReprova,
  itensReprovadosLegadoParaAvaliacao,
  montarChecklistComEstado,
  normalizarItensAvaliacao,
  validarItensAvaliacaoReprova,
} from '../utils/vistoriaReprovaItens.util';

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
  /** Observações gerais (opcional se itensAvaliacao for enviado) */
  motivos?: string;
  /** Legado: lista de labels dos itens reprovados */
  itensReprovados?: string[] | string;
  /** Novo: avaliação por item com passou/justificativa */
  itensAvaliacao?: ItemAvaliacaoReprova[] | unknown;
  criadoPorId?: string | null;
};

export type AtualizarReprovaVistoriaInput = {
  dataReprovacao?: Date | string;
  motivos?: string;
  itensAvaliacao: ItemAvaliacaoReprova[] | unknown;
};

function parseItensReprovados(raw: string[] | string | undefined): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(raw || '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolverAvaliacaoDeInput(input: {
  motivos?: string;
  itensReprovados?: string[] | string;
  itensAvaliacao?: unknown;
}): {
  itensAvaliacao: ItemAvaliacaoReprova[];
  itensReprovados: string[];
  motivos: string;
} {
  if (input.itensAvaliacao != null) {
    const validacao = validarItensAvaliacaoReprova(input.itensAvaliacao);
    if (!validacao.ok) {
      throw new Error((validacao as { ok: false; message: string }).message);
    }
    const motivosExtra = String(input.motivos || '').trim();
    return {
      itensAvaliacao: validacao.itens,
      itensReprovados: validacao.itensReprovados,
      motivos: motivosExtra || validacao.motivosResumo,
    };
  }

  // Legado: motivos + lista de strings
  const motivos = String(input.motivos || '').trim();
  if (!motivos) throw new Error('Motivos / observações são obrigatórios');

  const itensReprovados = parseItensReprovados(input.itensReprovados);
  if (itensReprovados.length === 0) {
    throw new Error('Informe ao menos um item reprovado');
  }

  const itensAvaliacao = itensReprovados.map((label) => ({
    codigo: label.toLowerCase().replace(/\s+/g, '_').slice(0, 64),
    label,
    passou: false,
    justificativa: motivos,
  }));

  return { itensAvaliacao, itensReprovados, motivos };
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

function hydrateReprovacao(h: {
  id: string;
  projetoId: string;
  dataReprovacao: Date;
  motivos: string;
  itensReprovados: unknown;
  itensAvaliacao?: unknown;
  criadoEm: Date;
  criadoPorId?: string | null;
  criadoPor?: { id: string; name: string } | null;
}) {
  const salvos =
    h.itensAvaliacao != null
      ? normalizarItensAvaliacao(h.itensAvaliacao)
      : itensReprovadosLegadoParaAvaliacao(h.itensReprovados);

  return {
    ...h,
    itensAvaliacao: salvos,
    checklist: montarChecklistComEstado(salvos),
  };
}

export function listarItensChecklistVistoria() {
  return ITENS_PADRAO_VISTORIA_CELESC;
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
      historicoReprovacoesVistoria: p.historicoReprovacoesVistoria.map((h) =>
        hydrateReprovacao(h),
      ),
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
    historicoReprovacoesVistoria: atualizado.historicoReprovacoesVistoria.map((h) =>
      hydrateReprovacao(h),
    ),
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

  const dataReprovacao = new Date(input.dataReprovacao);
  if (Number.isNaN(dataReprovacao.getTime())) {
    throw new Error('Data da reprovação inválida');
  }

  const { itensAvaliacao, itensReprovados, motivos } = resolverAvaliacaoDeInput(input);

  const [, atualizado] = await prisma.$transaction([
    prisma.historicoReprovacaoVistoria.create({
      data: {
        projetoId,
        dataReprovacao,
        motivos,
        itensReprovados: itensReprovados as Prisma.InputJsonValue,
        itensAvaliacao: itensAvaliacao as Prisma.InputJsonValue,
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
    historicoReprovacoesVistoria: atualizado.historicoReprovacoesVistoria.map((h) =>
      hydrateReprovacao(h),
    ),
    ...calcularPrazo(atualizado.dataProtocoloVistoria),
    qtdReprovacoes: atualizado.historicoReprovacoesVistoria.length,
  };
}

export async function obterReprovacao(projetoId: string, reprovacaoId: string) {
  const registro = await prisma.historicoReprovacaoVistoria.findFirst({
    where: { id: reprovacaoId, projetoId },
    include: { criadoPor: { select: { id: true, name: true } } },
  });
  if (!registro) throw new Error('Reprovação não encontrada');
  return hydrateReprovacao(registro);
}

export async function atualizarReprovacao(
  projetoId: string,
  reprovacaoId: string,
  input: AtualizarReprovaVistoriaInput,
) {
  const existente = await prisma.historicoReprovacaoVistoria.findFirst({
    where: { id: reprovacaoId, projetoId },
  });
  if (!existente) throw new Error('Reprovação não encontrada');

  const validacao = validarItensAvaliacaoReprova(input.itensAvaliacao);
  if (!validacao.ok) {
    throw new Error((validacao as { ok: false; message: string }).message);
  }

  let dataReprovacao = existente.dataReprovacao;
  if (input.dataReprovacao != null) {
    const parsed = new Date(input.dataReprovacao);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Data da reprovação inválida');
    }
    dataReprovacao = parsed;
  }

  const motivosExtra = input.motivos != null ? String(input.motivos).trim() : '';
  const motivos = motivosExtra || validacao.motivosResumo;

  const atualizado = await prisma.historicoReprovacaoVistoria.update({
    where: { id: reprovacaoId },
    data: {
      dataReprovacao,
      motivos,
      itensReprovados: validacao.itensReprovados as Prisma.InputJsonValue,
      itensAvaliacao: validacao.itens as Prisma.InputJsonValue,
    },
    include: { criadoPor: { select: { id: true, name: true } } },
  });

  return hydrateReprovacao(atualizado);
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
    historicoReprovacoesVistoria: atualizado.historicoReprovacoesVistoria.map((h) =>
      hydrateReprovacao(h),
    ),
    ...calcularPrazo(atualizado.dataProtocoloVistoria),
    qtdReprovacoes: atualizado.historicoReprovacoesVistoria.length,
  };
}

/**
 * Vistoria CELESC não bloqueia a conclusão da OS.
 * Mantida para compatibilidade de imports/mocks — sempre libera.
 */
export function validarConclusaoVistoriaCelesc(_projeto: {
  exigeVistoriaCelesc: boolean;
  statusVistoria: StatusVistoriaCelesc | string | null;
}): string | null {
  return null;
}
