import { EventoStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calcularCustoEvento, type MembroEquipeCusto } from '../utils/custoEventoCalendario';

const equipeSelect = {
  id: true,
  nome: true,
  cargo: true,
  email: true,
  valorHora: true,
  valorDiaria: true,
  status: true,
} as const;

const orcamentoSelect = {
  id: true,
  titulo: true,
  numeroSequencial: true,
  previsaoInicio: true,
  previsaoTermino: true,
  status: true,
} as const;

const includePadrao = {
  equipe: { select: equipeSelect },
  orcamento: { select: orcamentoSelect },
};

export interface ListarEventosParams {
  dataInicio: Date;
  dataFim: Date;
  status?: EventoStatus;
  tipo?: string;
  busca?: string;
}

export interface CriarEventoInput {
  titulo: string;
  descricao?: string | null;
  dataInicio: Date;
  dataFim: Date;
  status?: EventoStatus;
  tipo?: string;
  orcamentoId?: string | null;
  custoVeiculo?: number | null;
  equipeIds?: string[];
}

export type AtualizarEventoInput = Partial<CriarEventoInput>;

export interface UsuarioCusto {
  role?: string;
  isAdmin?: boolean;
}

export function podeVerCustoProjetado(user?: UsuarioCusto | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'desenvolvedor') return true;
  if (user.isAdmin === true) return true;
  return role === 'admin' || role === 'administrador';
}

function anexarCustoProjetado<T extends { dataInicio: Date; dataFim: Date; custoVeiculo: unknown; equipe: Array<{ valorHora: unknown; valorDiaria: unknown }> }>(
  evento: T,
  incluirCusto: boolean
) {
  if (!incluirCusto) return evento;
  const custo = calcularCustoEvento(
    new Date(evento.dataInicio),
    new Date(evento.dataFim),
    evento.equipe.map(
      (m): MembroEquipeCusto => ({
        valorHora: m.valorHora != null ? Number(m.valorHora) : null,
        valorDiaria: m.valorDiaria != null ? Number(m.valorDiaria) : null,
      })
    ),
    evento.custoVeiculo != null ? Number(evento.custoVeiculo) : 0
  );
  return { ...evento, ...custo };
}

async function validarEquipeIds(equipeIds: string[]) {
  if (equipeIds.length === 0) return;
  const funcionarios = await prisma.funcionario.findMany({
    where: { id: { in: equipeIds }, status: 'Ativo' },
    select: { id: true },
  });
  if (funcionarios.length !== equipeIds.length) {
    throw new Error('Um ou mais membros da equipe são inválidos ou inativos');
  }
}

async function validarOrcamentoId(orcamentoId?: string | null) {
  if (!orcamentoId) return;
  const orcamento = await prisma.orcamento.findUnique({ where: { id: orcamentoId }, select: { id: true } });
  if (!orcamento) throw new Error('Orçamento não encontrado');
}

function validarDatas(dataInicio: Date, dataFim: Date) {
  if (dataFim < dataInicio) {
    throw new Error('Data fim deve ser maior ou igual à data início');
  }
}

export class EventosCalendarioService {
  async listar(params: ListarEventosParams, user?: UsuarioCusto) {
    const { dataInicio, dataFim, status, tipo, busca } = params;
    const where: Prisma.EventoCalendarioWhereInput = {
      dataInicio: { lte: dataFim },
      dataFim: { gte: dataInicio },
    };
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (busca?.trim()) {
      const termo = busca.trim();
      where.OR = [
        { titulo: { contains: termo, mode: 'insensitive' } },
        { descricao: { contains: termo, mode: 'insensitive' } },
      ];
    }

    const incluirCusto = podeVerCustoProjetado(user);
    const eventos = await prisma.eventoCalendario.findMany({
      where,
      include: includePadrao,
      orderBy: { dataInicio: 'asc' },
    });

    return eventos.map((e) => anexarCustoProjetado(e, incluirCusto));
  }

  async buscarPorId(id: string, user?: UsuarioCusto) {
    const evento = await prisma.eventoCalendario.findUnique({
      where: { id },
      include: includePadrao,
    });
    if (!evento) return null;
    return anexarCustoProjetado(evento, podeVerCustoProjetado(user));
  }

  async criar(data: CriarEventoInput, user?: UsuarioCusto) {
    const dataInicio = new Date(data.dataInicio);
    const dataFim = new Date(data.dataFim);
    validarDatas(dataInicio, dataFim);
    await validarOrcamentoId(data.orcamentoId);
    const equipeIds = data.equipeIds ?? [];
    await validarEquipeIds(equipeIds);

    const evento = await prisma.eventoCalendario.create({
      data: {
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        dataInicio,
        dataFim,
        status: data.status ?? EventoStatus.PREVISAO,
        tipo: data.tipo ?? 'REUNIAO',
        orcamentoId: data.orcamentoId || null,
        custoVeiculo: data.custoVeiculo ?? 0,
        equipe: equipeIds.length
          ? { connect: equipeIds.map((id) => ({ id })) }
          : undefined,
      },
      include: includePadrao,
    });

    return anexarCustoProjetado(evento, podeVerCustoProjetado(user));
  }

  async atualizar(id: string, data: AtualizarEventoInput, user?: UsuarioCusto) {
    const existente = await prisma.eventoCalendario.findUnique({ where: { id } });
    if (!existente) return null;

    const dataInicio = data.dataInicio ? new Date(data.dataInicio) : existente.dataInicio;
    const dataFim = data.dataFim ? new Date(data.dataFim) : existente.dataFim;
    validarDatas(dataInicio, dataFim);

    if (data.orcamentoId !== undefined) {
      await validarOrcamentoId(data.orcamentoId);
    }

    if (data.equipeIds) {
      await validarEquipeIds(data.equipeIds);
    }

    const updateData: Prisma.EventoCalendarioUpdateInput = {
      ...(data.titulo !== undefined && { titulo: data.titulo.trim() }),
      ...(data.descricao !== undefined && { descricao: data.descricao?.trim() || null }),
      ...(data.dataInicio !== undefined && { dataInicio }),
      ...(data.dataFim !== undefined && { dataFim }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.orcamentoId !== undefined && { orcamentoId: data.orcamentoId || null }),
      ...(data.custoVeiculo !== undefined && { custoVeiculo: data.custoVeiculo ?? 0 }),
      ...(data.equipeIds !== undefined && {
        equipe: { set: data.equipeIds.map((equipeId) => ({ id: equipeId })) },
      }),
    };

    const evento = await prisma.eventoCalendario.update({
      where: { id },
      data: updateData,
      include: includePadrao,
    });

    return anexarCustoProjetado(evento, podeVerCustoProjetado(user));
  }

  async excluir(id: string) {
    const existente = await prisma.eventoCalendario.findUnique({ where: { id } });
    if (!existente) return false;
    await prisma.eventoCalendario.delete({ where: { id } });
    return true;
  }

  async buscarFuncionarios(termo?: string, excluirIds: string[] = []) {
    const q = termo?.trim();
    const where: Prisma.FuncionarioWhereInput = {
      status: { equals: 'Ativo', mode: 'insensitive' },
      ...(excluirIds.length > 0 && { id: { notIn: excluirIds } }),
      ...(q && {
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { cargo: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    return prisma.funcionario.findMany({
      where,
      select: equipeSelect,
      orderBy: { nome: 'asc' },
      take: q ? 15 : 20,
    });
  }

  /** @deprecated use buscarFuncionarios */
  async buscarEquipe(termo?: string, excluirIds: string[] = []) {
    return this.buscarFuncionarios(termo, excluirIds);
  }

  async buscarEquipesPreMontadas(termo?: string) {
    const q = termo?.trim();
    const equipes = await prisma.equipe.findMany({
      where: {
        ativa: true,
        ...(q && { nome: { contains: q, mode: 'insensitive' } }),
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        descricao: true,
        membros: true,
      },
      orderBy: { nome: 'asc' },
      take: q ? 15 : 20,
    });

    return equipes.map((e) => ({
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      descricao: e.descricao,
      totalMembros: (e.membros || []).length,
    }));
  }

  async resolverFuncionariosEquipePreMontada(equipeId: string, excluirIds: string[] = []) {
    const equipe = await prisma.equipe.findFirst({
      where: { id: equipeId, ativa: true },
      select: { id: true, nome: true, membros: true },
    });
    if (!equipe) {
      throw new Error('Equipe não encontrada ou inativa');
    }

    const userIds = equipe.membros || [];
    if (userIds.length === 0) {
      return { equipeNome: equipe.nome, funcionarios: [] as Awaited<ReturnType<typeof this.buscarFuncionarios>> };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, active: true },
      select: { id: true, email: true, name: true },
    });

    const emails = users
      .map((u) => u.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e));

    const funcionariosPorEmail = emails.length
      ? await prisma.funcionario.findMany({
          where: {
            status: { equals: 'Ativo', mode: 'insensitive' },
            email: { in: emails, mode: 'insensitive' },
            ...(excluirIds.length > 0 && { id: { notIn: excluirIds } }),
          },
          select: equipeSelect,
        })
      : [];

    const emailParaFuncionario = new Map(
      funcionariosPorEmail
        .filter((f) => f.email)
        .map((f) => [String(f.email).trim().toLowerCase(), f])
    );

    const jaIncluidos = new Set(funcionariosPorEmail.map((f) => f.id));
    const funcionariosPorNome: typeof funcionariosPorEmail = [];

    for (const user of users) {
      const emailKey = user.email?.trim().toLowerCase();
      if (emailKey && emailParaFuncionario.has(emailKey)) continue;

      const porNome = await prisma.funcionario.findFirst({
        where: {
          status: { equals: 'Ativo', mode: 'insensitive' },
          nome: { equals: user.name, mode: 'insensitive' },
          id: { notIn: [...excluirIds, ...jaIncluidos, ...funcionariosPorNome.map((f) => f.id)] },
        },
        select: equipeSelect,
      });
      if (porNome) {
        funcionariosPorNome.push(porNome);
        jaIncluidos.add(porNome.id);
      }
    }

    const funcionarios = [...funcionariosPorEmail, ...funcionariosPorNome];

    return {
      equipeNome: equipe.nome,
      funcionarios,
      membrosNaoVinculados: Math.max(0, users.length - funcionarios.length),
    };
  }
}

export const eventosCalendarioService = new EventosCalendarioService();
