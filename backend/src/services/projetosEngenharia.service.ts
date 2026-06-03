import { prisma } from '../lib/prisma';
import {
  buildServicoLookupMaps,
  projetoTemServicoEngenharia,
  projetoTemServicoEngenhariaAtribuivelSetor,
} from '../utils/servicoEngenhariaMatcher.util';
import { taskAtribuidaAoUsuario } from '../utils/taskResponsaveis.util';
import {
  isStatusEngenhariaConcluido,
  STATUS_ENGENHARIA_OPCOES,
} from '../utils/engenhariaStatus.util';

export { STATUS_ENGENHARIA_OPCOES, isStatusEngenhariaConcluido };
export const PRIORIDADE_OPCOES = ['Alta', 'Média', 'Baixa'] as const;
export const TIPOS_PROJETO_OPCOES = ['Entrada', 'Interno'] as const;
export const STATUS_CELESC_OPCOES = [
  'ENROLADO',
  'PEGAR DOCUMENTOS',
  'AGUARDANDO CLIENTE',
  'AGUARDANDO CELESC',
  'ENVIADO',
  'APROVADO',
  'REPROVADO',
] as const;

export type ProjetoEngenhariaPatch = {
  nomeProjeto?: string | null;
  tiposProjeto?: string[] | null;
  statusEngenharia?: string;
  statusCelesc?: string[] | null;
  comentarioEngenharia?: string | null;
  prioridade?: string;
  responsavelEngenhariaId?: string | null;
};

function defaultNomeProjeto(numeroSequencial: number | null | undefined, clienteNome: string): string {
  const num = numeroSequencial != null ? String(numeroSequencial) : '—';
  return `${num} - ${clienteNome}`;
}

function parseStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  return [];
}

async function calcularProgressoMap(ids: string[]) {
  const map: Record<string, number> = {};
  if (ids.length === 0) return map;

  const projetos = await prisma.projeto.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, semObra: true },
  });

  const groups = await prisma.task.groupBy({
    by: ['projetoId', 'status'],
    where: { projetoId: { in: ids } },
    _count: { id: true },
  });

  const counts: Record<string, { tasksTotal: number; tasksConcluidas: number }> = {};
  projetos.forEach((p) => {
    counts[p.id] = { tasksTotal: 0, tasksConcluidas: 0 };
  });

  groups.forEach((g) => {
    const pid = g.projetoId as string;
    const count = g._count?.id ?? 0;
    if (!counts[pid]) counts[pid] = { tasksTotal: 0, tasksConcluidas: 0 };
    counts[pid].tasksTotal += count;
    const statusStr = String(g.status || '').toLowerCase();
    if (['done', 'concluído', 'concluido', 'concluded'].includes(statusStr)) {
      counts[pid].tasksConcluidas += count;
    }
  });

  projetos.forEach((p) => {
    const entry = counts[p.id] || { tasksTotal: 0, tasksConcluidas: 0 };
    const obrasTotal = p.semObra ? 0 : p.status === 'EXECUCAO' || p.status === 'CONCLUIDO' ? 1 : 0;
    const obrasConcluidas = p.semObra ? 0 : p.status === 'CONCLUIDO' ? 1 : 0;

    let percentual = 0;
    if (p.semObra) {
      if (p.status === 'CONCLUIDO') percentual = 100;
      else if (entry.tasksTotal === 0) percentual = 0;
      else {
        percentual = Math.round((entry.tasksConcluidas / entry.tasksTotal) * 100);
        if (entry.tasksConcluidas === entry.tasksTotal) percentual = 100;
      }
    } else {
      const totalItens = entry.tasksTotal + obrasTotal;
      const totalConcluidos = entry.tasksConcluidas + obrasConcluidas;
      percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    }
    map[p.id] = percentual;
  });

  return map;
}

async function ensureEngenhariaRecord(
  projetoId: string,
  numeroSequencial: number | null | undefined,
  clienteNome: string,
  atribuido = false,
) {
  const existing = await prisma.projetoEngenharia.findUnique({ where: { projetoId } });
  if (existing) return existing;

  return prisma.projetoEngenharia.create({
    data: {
      projetoId,
      nomeProjeto: defaultNomeProjeto(numeroSequencial, clienteNome),
      statusEngenharia: 'A fazer',
      prioridade: 'Média',
      atribuidoSetorEngenharia: atribuido,
    },
  });
}

function serializeEngenhariaRow(
  projeto: {
    id: string;
    titulo: string;
    status: string;
    cliente: { id: string; nome: string };
    orcamento: {
      id: string;
      numeroSequencial: number | null;
    };
    engenharia: {
      id: string;
      nomeProjeto: string | null;
      tiposProjeto: unknown;
      statusEngenharia: string;
      statusCelesc: unknown;
      comentarioEngenharia: string | null;
      prioridade: string;
      responsavelEngenhariaId: string | null;
      atribuidoSetorEngenharia: boolean;
      responsavelEngenharia?: { id: string; name: string } | null;
    } | null;
  },
  progresso: number,
  matchAutomatico: boolean,
) {
  const eng = projeto.engenharia;
  return {
    projetoId: projeto.id,
    titulo: projeto.titulo,
    statusOs: projeto.status,
    numeroSequencial: projeto.orcamento.numeroSequencial,
    cliente: projeto.cliente,
    orcamentoId: projeto.orcamento.id,
    matchAutomatico,
    progresso,
    engenharia: eng
      ? {
          id: eng.id,
          nomeProjeto: eng.nomeProjeto,
          tiposProjeto: parseStringArray(eng.tiposProjeto),
          statusEngenharia: eng.statusEngenharia,
          statusCelesc: parseStringArray(eng.statusCelesc),
          comentarioEngenharia: eng.comentarioEngenharia,
          prioridade: eng.prioridade,
          responsavelEngenhariaId: eng.responsavelEngenhariaId,
          atribuidoSetorEngenharia: eng.atribuidoSetorEngenharia,
          responsavelEngenharia: eng.responsavelEngenharia
            ? { id: eng.responsavelEngenharia.id, nome: eng.responsavelEngenharia.name }
            : null,
        }
      : null,
  };
}

function usuarioPodeVerProjetoEngenharia(
  engenharia: { responsavelEngenhariaId: string | null } | null | undefined,
  userId: string,
  verTodos: boolean,
): boolean {
  if (verTodos) return true;
  return engenharia?.responsavelEngenhariaId === userId;
}

export async function listarProjetosEngenharia(userId: string, verTodos = false) {
  const servicos = await prisma.servico.findMany({
    select: { id: true, codigo: true, nome: true, tipoServico: true },
  });
  const { byId, byNome } = buildServicoLookupMaps(servicos);

  const projetos = await prisma.projeto.findMany({
    where: { status: { not: 'CANCELADO' } },
    include: {
      cliente: { select: { id: true, nome: true } },
      orcamento: {
        select: {
          id: true,
          numeroSequencial: true,
          items: {
            include: {
              servico: { select: { id: true, codigo: true, nome: true, tipoServico: true } },
              kit: { select: { id: true, itensFaltantes: true } },
            },
          },
        },
      },
      engenharia: {
        include: {
          responsavelEngenharia: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const elegiveis: typeof projetos = [];

  for (const projeto of projetos) {
    const atribuido = projeto.engenharia?.atribuidoSetorEngenharia === true;
    const matchAuto = projetoTemServicoEngenhariaAtribuivelSetor(
      projeto.orcamento.items,
      byId,
      byNome,
    );
    if (!(atribuido || matchAuto)) continue;
    if (!usuarioPodeVerProjetoEngenharia(projeto.engenharia, userId, verTodos)) continue;
    elegiveis.push(projeto);
  }

  for (const projeto of elegiveis) {
    if (!projeto.engenharia) {
      await ensureEngenhariaRecord(
        projeto.id,
        projeto.orcamento.numeroSequencial,
        projeto.cliente.nome,
        false,
      );
    }
  }

  const ids = elegiveis.map((p) => p.id);
  const progressoMap = await calcularProgressoMap(ids);

  const refreshed = elegiveis.length
    ? await prisma.projeto.findMany({
        where: { id: { in: ids } },
        include: {
          cliente: { select: { id: true, nome: true } },
          orcamento: { select: { id: true, numeroSequencial: true, items: true } },
          engenharia: {
            include: {
              responsavelEngenharia: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return refreshed.map((p) => {
    const matchAuto = projetoTemServicoEngenhariaAtribuivelSetor(p.orcamento.items as any, byId, byNome);
    return serializeEngenhariaRow(p as any, progressoMap[p.id] ?? 0, matchAuto);
  });
}

export async function upsertMetadadosEngenharia(projetoId: string, patch: ProjetoEngenhariaPatch) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      cliente: { select: { nome: true } },
      orcamento: { select: { numeroSequencial: true } },
      engenharia: true,
    },
  });
  if (!projeto) return null;

  await ensureEngenhariaRecord(
    projetoId,
    projeto.orcamento.numeroSequencial,
    projeto.cliente.nome,
    projeto.engenharia?.atribuidoSetorEngenharia ?? false,
  );

  const data: Record<string, unknown> = {};
  if (patch.nomeProjeto !== undefined) data.nomeProjeto = patch.nomeProjeto;
  if (patch.tiposProjeto !== undefined) data.tiposProjeto = patch.tiposProjeto;
  if (patch.statusEngenharia !== undefined) data.statusEngenharia = patch.statusEngenharia;
  if (patch.statusCelesc !== undefined) data.statusCelesc = patch.statusCelesc;
  if (patch.comentarioEngenharia !== undefined) data.comentarioEngenharia = patch.comentarioEngenharia;
  if (patch.prioridade !== undefined) data.prioridade = patch.prioridade;
  if (patch.responsavelEngenhariaId !== undefined) {
    data.responsavelEngenhariaId = patch.responsavelEngenhariaId || null;
  }

  await prisma.projetoEngenharia.update({
    where: { projetoId },
    data,
  });

  return getEngenhariaByProjetoId(projetoId);
}

export async function listarResumoTarefasKanbanUsuario(userId: string, verTodos = false) {
  const projetosRows = await listarProjetosEngenharia(userId, verTodos);
  const projetoIds = projetosRows.map((p) => p.projetoId);
  if (projetoIds.length === 0) return [];

  const tasks = await prisma.task.findMany({
    where: { projetoId: { in: projetoIds } },
    orderBy: [{ prazo: 'asc' }, { createdAt: 'desc' }],
    include: {
      projeto: {
        select: {
          id: true,
          titulo: true,
          orcamento: { select: { numeroSequencial: true } },
          cliente: { select: { nome: true } },
        },
      },
    },
  });

  return tasks
    .filter((t) => verTodos || taskAtribuidaAoUsuario(t, userId))
    .map((t) => ({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status,
      prioridade: t.prioridade,
      prazo: t.prazo,
      dataInicio: t.dataInicio,
      projetoId: t.projetoId,
      numeroSequencial: t.projeto.orcamento?.numeroSequencial ?? null,
      osTitulo: t.projeto.titulo,
      clienteNome: t.projeto.cliente?.nome ?? null,
    }));
}

export async function atribuirSetorEngenharia(
  projetoId: string,
  responsavelEngenhariaId?: string | null,
  usuarioAtribuinteId?: string | null,
) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      cliente: { select: { nome: true } },
      orcamento: { select: { numeroSequencial: true } },
      engenharia: true,
    },
  });
  if (!projeto) return null;

  const responsavelFinal =
    responsavelEngenhariaId !== undefined && responsavelEngenhariaId !== null && responsavelEngenhariaId !== ''
      ? responsavelEngenhariaId
      : usuarioAtribuinteId || null;

  await ensureEngenhariaRecord(
    projetoId,
    projeto.orcamento.numeroSequencial,
    projeto.cliente.nome,
    true,
  );

  await prisma.projetoEngenharia.update({
    where: { projetoId },
    data: {
      atribuidoSetorEngenharia: true,
      responsavelEngenhariaId: responsavelFinal,
    },
  });

  return getEngenhariaByProjetoId(projetoId);
}

export async function getEngenhariaByProjetoId(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      cliente: { select: { id: true, nome: true } },
      orcamento: {
        select: {
          id: true,
          numeroSequencial: true,
          items: {
            include: {
              servico: { select: { id: true, codigo: true, nome: true, tipoServico: true } },
              kit: { select: { id: true, itensFaltantes: true } },
            },
          },
        },
      },
      engenharia: {
        include: {
          responsavelEngenharia: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!projeto) return null;

  const servicos = await prisma.servico.findMany({
    select: { id: true, codigo: true, nome: true, tipoServico: true },
  });
  const { byId, byNome } = buildServicoLookupMaps(servicos);
  const matchAuto = projetoTemServicoEngenhariaAtribuivelSetor(projeto.orcamento.items, byId, byNome);
  const progressoMap = await calcularProgressoMap([projetoId]);

  return serializeEngenhariaRow(projeto as any, progressoMap[projetoId] ?? 0, matchAuto);
}

/** Bloqueia conclusão da OS se houver serviço de eng. atribuível ao setor e projeto eng. não concluído. */
export async function validarConclusaoOsEngenharia(projetoId: string): Promise<string | null> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      orcamento: {
        select: {
          items: {
            include: {
              servico: { select: { id: true, codigo: true, nome: true, tipoServico: true } },
              kit: { select: { id: true, itensFaltantes: true } },
            },
          },
        },
      },
      engenharia: {
        select: {
          statusEngenharia: true,
        },
      },
    },
  });
  if (!projeto?.orcamento) return null;

  const servicos = await prisma.servico.findMany({
    select: { id: true, codigo: true, nome: true, tipoServico: true },
  });
  const { byId, byNome } = buildServicoLookupMaps(servicos);
  const precisaEquipe = projetoTemServicoEngenhariaAtribuivelSetor(
    projeto.orcamento.items,
    byId,
    byNome,
  );
  if (!precisaEquipe) return null;

  const status = projeto.engenharia?.statusEngenharia;
  if (isStatusEngenhariaConcluido(status)) return null;

  if (!projeto.engenharia) {
    return 'Essa ordem de serviço não pode ser concluída pois o projeto ainda não está concluído. Pressione a equipe de projetos!';
  }

  return `Essa ordem de serviço não pode ser concluída: o projeto de engenharia está "${status}". Marque como Concluído na aba Projetos e pressione a equipe de projetos!`;
}

export type InfoAtribuicaoOs = {
  projetoId: string;
  precisaEquipeEngenharia: boolean;
  atribuido: boolean;
  responsavelEngenhariaId: string | null;
  responsavelNome: string | null;
  statusEngenharia: string | null;
};

export async function getInfoAtribuicaoOsBatch(projetoIds: string[]): Promise<InfoAtribuicaoOs[]> {
  if (projetoIds.length === 0) return [];

  const servicos = await prisma.servico.findMany({
    select: { id: true, codigo: true, nome: true, tipoServico: true },
  });
  const { byId, byNome } = buildServicoLookupMaps(servicos);

  const projetos = await prisma.projeto.findMany({
    where: { id: { in: projetoIds } },
    include: {
      orcamento: {
        select: {
          items: {
            include: {
              servico: { select: { id: true, codigo: true, nome: true, tipoServico: true } },
              kit: { select: { id: true, itensFaltantes: true } },
            },
          },
        },
      },
      engenharia: {
        include: {
          responsavelEngenharia: { select: { id: true, name: true } },
        },
      },
    },
  });

  return projetos.map((p) => ({
    projetoId: p.id,
    precisaEquipeEngenharia: projetoTemServicoEngenhariaAtribuivelSetor(
      p.orcamento.items as any,
      byId,
      byNome,
    ),
    atribuido: Boolean(p.engenharia?.responsavelEngenhariaId),
    responsavelEngenhariaId: p.engenharia?.responsavelEngenhariaId ?? null,
    responsavelNome: p.engenharia?.responsavelEngenharia?.name ?? null,
    statusEngenharia: p.engenharia?.statusEngenharia ?? null,
  }));
}
