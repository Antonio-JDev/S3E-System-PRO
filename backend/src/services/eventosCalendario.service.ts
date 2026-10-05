import { EventoStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calcularCustoEvento, type MembroEquipeCusto } from '../utils/custoEventoCalendario';
import { ymdDeDataDiaCivil } from '../utils/datetime-sp.util';
import {
  diariasDeHorasTotais,
  horasPorDiaAlocacao,
  particionarEquipeAlocacao,
  ymdHojeBrasilia,
  type MembroAlocacao,
} from '../utils/horasAlocacaoCalendario';
import { resolverPeriodoOsDeDatas, deveAlocarPeriodoOs } from '../utils/periodoOs.util';
import { snapWorkshiftAoDia } from '../utils/workshift.util';
import { apropriacaoOsService, type ApontamentoItemInput } from './apropriacaoOs.service';

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

const projetoSelect = {
  id: true,
  titulo: true,
  status: true,
  orcamentoId: true,
  cliente: { select: { id: true, nome: true } },
  orcamento: { select: { numeroSequencial: true } },
} as const;

const includePadrao = {
  equipe: { select: equipeSelect },
  veiculos: { select: { id: true, modelo: true, placa: true, tipo: true, status: true } },
  orcamento: { select: orcamentoSelect },
  projeto: { select: projetoSelect },
};

export interface ListarEventosParams {
  dataInicio?: Date;
  dataFim?: Date;
  status?: EventoStatus;
  tipo?: string;
  busca?: string;
  projetoId?: string;
}

export interface CriarEventoInput {
  titulo: string;
  descricao?: string | null;
  dataInicio: Date;
  dataFim: Date;
  status?: EventoStatus;
  tipo?: string;
  orcamentoId?: string | null;
  projetoId?: string | null;
  custoVeiculo?: number | null;
  equipeIds?: string[];
  equipeEngenhariaIds?: string[];
  equipeExecucaoIds?: string[];
  valorHoraEngenharia?: number | null;
  valorHoraExecucao?: number | null;
  horariosPorDia?: HorarioDiaInput[] | null;
  veiculoIds?: string[];
  snapWorkshift?: boolean;
  /** Somente quando true explicitamente: datas viram o período orçado da OS. */
  alocarPeriodoOs?: boolean;
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

function anexarCustoProjetado<
  T extends {
    dataInicio: Date;
    dataFim: Date;
    custoVeiculo: unknown;
    equipe: Array<{ id?: string; valorHora: unknown; valorDiaria: unknown }>;
    equipeEngenhariaIds?: string[];
    equipeExecucaoIds?: string[];
    valorHoraEngenharia?: unknown;
    valorHoraExecucao?: unknown;
  },
>(evento: T, incluirCusto: boolean) {
  if (!incluirCusto) return evento;
  const engIds = new Set(evento.equipeEngenhariaIds ?? []);
  const exeIds = new Set(evento.equipeExecucaoIds ?? []);
  const taxaEng = evento.valorHoraEngenharia != null ? Number(evento.valorHoraEngenharia) : 0;
  const taxaExe = evento.valorHoraExecucao != null ? Number(evento.valorHoraExecucao) : 0;
  const custo = calcularCustoEvento(
    new Date(evento.dataInicio),
    new Date(evento.dataFim),
    evento.equipe.map((m): MembroEquipeCusto => {
      if (m.id && engIds.has(m.id) && taxaEng > 0) {
        return { valorHora: taxaEng, valorDiaria: null };
      }
      if (m.id && exeIds.has(m.id) && taxaExe > 0) {
        return { valorHora: taxaExe, valorDiaria: null };
      }
      return {
        valorHora: m.valorHora != null ? Number(m.valorHora) : null,
        valorDiaria: m.valorDiaria != null ? Number(m.valorDiaria) : null,
      };
    }),
    evento.custoVeiculo != null ? Number(evento.custoVeiculo) : 0
  );
  return { ...evento, ...custo };
}

export interface HorarioDiaInput {
  dia: string;
  inicio: string;
  fim: string;
}

export function normalizarHorariosPorDia(value: unknown): HorarioDiaInput[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  const out: HorarioDiaInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const dia = String((item as { dia?: unknown }).dia || '');
    const inicio = String((item as { inicio?: unknown }).inicio || '');
    const fim = String((item as { fim?: unknown }).fim || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) continue;
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) continue;
    if (fim <= inicio) continue;
    out.push({ dia, inicio, fim });
  }
  return out;
}

function jsonHorarios(
  value: HorarioDiaInput[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.length === 0) return Prisma.DbNull;
  return value as unknown as Prisma.InputJsonValue;
}

/** Esconde a previsão quando ainda existe a cópia confirmada legada (eventoOrigemId). */
export function semPrevisaoSubstituida<T extends { id: string; eventoOrigemId?: string | null }>(
  eventos: T[],
): T[] {
  const origens = new Set(
    eventos.map((evento) => evento.eventoOrigemId).filter((id): id is string => Boolean(id)),
  );
  return eventos.filter((evento) => !origens.has(evento.id));
}

function emailNorm(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

async function resolverUsersEngenharia(membros: MembroAlocacao[]): Promise<{
  userPorFuncionario: Map<string, string>;
  falhas: Array<{ pessoa: string; mensagem: string }>;
}> {
  const userPorFuncionario = new Map<string, string>();
  const falhas: Array<{ pessoa: string; mensagem: string }> = [];
  if (membros.length === 0) return { userPorFuncionario, falhas };

  const emails = [...new Set(membros.map((m) => emailNorm(m.email)).filter(Boolean))];
  const nomes = [...new Set(membros.map((m) => m.nome?.trim()).filter((n): n is string => Boolean(n)))];
  const users =
    emails.length || nomes.length
      ? await prisma.user.findMany({
          where: {
            active: true,
            OR: [
              ...(emails.length > 0 ? [{ email: { in: emails, mode: 'insensitive' as const } }] : []),
              ...(nomes.length > 0 ? [{ name: { in: nomes, mode: 'insensitive' as const } }] : []),
            ],
          },
          select: { id: true, email: true, name: true },
        })
      : [];

  for (const membro of membros) {
    const nome = membro.nome?.trim() || 'Funcionário';
    const email = emailNorm(membro.email);
    const porEmail = email ? users.filter((u) => emailNorm(u.email) === email) : [];
    if (porEmail.length === 1) {
      userPorFuncionario.set(membro.id, porEmail[0].id);
      continue;
    }
    if (porEmail.length > 1) {
      falhas.push({
        pessoa: nome,
        mensagem: `Não foi possível apontar ${nome}: há mais de um usuário ativo com este e-mail.`,
      });
      continue;
    }
    const nomeKey = emailNorm(membro.nome);
    const porNome = nomeKey ? users.filter((u) => emailNorm(u.name) === nomeKey) : [];
    if (porNome.length === 1) {
      userPorFuncionario.set(membro.id, porNome[0].id);
      continue;
    }
    falhas.push({
      pessoa: nome,
      mensagem: `Não foi possível apontar ${nome}: nenhum usuário ativo com o mesmo e-mail ou nome deste funcionário.`,
    });
  }

  return { userPorFuncionario, falhas };
}

function idsLimpos(ids?: string[]): string[] | undefined {
  if (!ids) return undefined;
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

function normalizarAlocacao(data: {
  equipeIds?: string[];
  equipeEngenhariaIds?: string[];
  equipeExecucaoIds?: string[];
}) {
  let engenharia = idsLimpos(data.equipeEngenhariaIds);
  let execucao = idsLimpos(data.equipeExecucaoIds);
  if (engenharia && execucao) {
    const engSet = new Set(engenharia);
    execucao = execucao.filter((id) => !engSet.has(id));
  }
  let equipeIds = idsLimpos(data.equipeIds);
  if (engenharia || execucao) {
    equipeIds = [...new Set([...(equipeIds ?? []), ...(engenharia ?? []), ...(execucao ?? [])])];
  }
  return { equipeIds, equipeEngenhariaIds: engenharia, equipeExecucaoIds: execucao };
}

async function validarVeiculoIds(veiculoIds: string[]) {
  if (veiculoIds.length === 0) return;
  const veiculos = await prisma.veiculo.findMany({
    where: { id: { in: veiculoIds }, status: { equals: 'Ativo', mode: 'insensitive' } },
    select: { id: true },
  });
  if (veiculos.length !== veiculoIds.length) {
    throw new Error('Um ou mais veículos são inválidos ou não estão ativos');
  }
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

async function resolverProjeto(projetoId?: string | null): Promise<{
  id: string;
  orcamentoId: string;
} | null> {
  if (!projetoId) return null;
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, orcamentoId: true, status: true },
  });
  if (!projeto) throw new Error('Ordem de serviço não encontrada');
  if (projeto.status === 'CANCELADO') throw new Error('Não é possível vincular a uma OS cancelada');
  return projeto;
}

async function carregarWorkShift(funcionarioId?: string) {
  if (!funcionarioId) return null;
  const config = await prisma.configuracaoPonto.findUnique({
    where: { funcionarioId },
    include: { workShift: true },
  });
  return config?.workShift ?? null;
}

/** Snap: início = entrada1 no 1º dia; fim = saida2 no último dia (suporta multi-dia). */
async function snapDatasWorkshift(equipeIds: string[], dataInicio: Date, dataFim: Date) {
  if (equipeIds.length === 0) return { dataInicio, dataFim };
  const shift = await carregarWorkShift(equipeIds[0]);
  const inicio = snapWorkshiftAoDia(dataInicio, shift);
  const mesmoDia =
    dataInicio.getUTCFullYear() === dataFim.getUTCFullYear() &&
    dataInicio.getUTCMonth() === dataFim.getUTCMonth() &&
    dataInicio.getUTCDate() === dataFim.getUTCDate();
  if (mesmoDia) {
    return { dataInicio: inicio.dataInicio, dataFim: inicio.dataFim };
  }
  const fim = snapWorkshiftAoDia(dataFim, shift);
  return { dataInicio: inicio.dataInicio, dataFim: fim.dataFim };
}

export async function resolverPeriodoOs(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      dataInicio: true,
      dataPrevisao: true,
      dataFim: true,
      orcamento: {
        select: { previsaoInicio: true, previsaoTermino: true },
      },
    },
  });
  if (!projeto) throw new Error('Ordem de serviço não encontrada');
  return resolverPeriodoOsDeDatas({
    dataInicio: projeto.dataInicio,
    dataPrevisao: projeto.dataPrevisao,
    dataFim: projeto.dataFim,
    previsaoInicioOrcamento: projeto.orcamento?.previsaoInicio,
    previsaoTerminoOrcamento: projeto.orcamento?.previsaoTermino,
  });
}


function validarDatas(dataInicio: Date, dataFim: Date) {
  if (dataFim < dataInicio) {
    throw new Error('Data fim deve ser maior ou igual à data início');
  }
}

export class EventosCalendarioService {
  async listar(params: ListarEventosParams, user?: UsuarioCusto) {
    const { dataInicio, dataFim, status, tipo, busca, projetoId } = params;
    if ((!dataInicio || !dataFim) && !projetoId) {
      throw new Error('Informe o período ou a ordem de serviço');
    }
    const where: Prisma.EventoCalendarioWhereInput = {};
    if (dataInicio && dataFim) {
      where.dataInicio = { lte: dataFim };
      where.dataFim = { gte: dataInicio };
    }
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (projetoId) where.projetoId = projetoId;
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

    return semPrevisaoSubstituida(eventos).map((e) => anexarCustoProjetado(e, incluirCusto));
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
    let dataInicio = new Date(data.dataInicio);
    let dataFim = new Date(data.dataFim);
    const alocacao = normalizarAlocacao(data);
    const equipeIds = alocacao.equipeIds ?? [];
    const veiculoIds = data.veiculoIds ?? [];
    await validarEquipeIds(equipeIds);
    await validarVeiculoIds(veiculoIds);

    const projeto = await resolverProjeto(data.projetoId);
    if (deveAlocarPeriodoOs({ alocarPeriodoOs: data.alocarPeriodoOs, projetoId: projeto?.id || data.projetoId })) {
      const periodo = await resolverPeriodoOs(String(projeto?.id || data.projetoId));
      dataInicio = periodo.inicio;
      dataFim = periodo.fim;
    }

    if (data.snapWorkshift) {
      const snapped = await snapDatasWorkshift(equipeIds, dataInicio, dataFim);
      dataInicio = snapped.dataInicio;
      dataFim = snapped.dataFim;
    } else if (deveAlocarPeriodoOs({ alocarPeriodoOs: data.alocarPeriodoOs, projetoId: projeto?.id || data.projetoId })) {
      const snapped = await snapDatasWorkshift(equipeIds, dataInicio, dataFim);
      dataInicio = snapped.dataInicio;
      dataFim = snapped.dataFim;
    }
    validarDatas(dataInicio, dataFim);

    const orcamentoId = projeto?.orcamentoId || data.orcamentoId || null;
    await validarOrcamentoId(orcamentoId);

    const evento = await prisma.eventoCalendario.create({
      data: {
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        dataInicio,
        dataFim,
        status: data.status ?? EventoStatus.PREVISAO,
        tipo: data.tipo ?? 'REUNIAO',
        orcamentoId,
        projetoId: projeto?.id || null,
        custoVeiculo: data.custoVeiculo ?? 0,
        equipeEngenhariaIds: alocacao.equipeEngenhariaIds ?? [],
        equipeExecucaoIds: alocacao.equipeExecucaoIds ?? [],
        valorHoraEngenharia: data.valorHoraEngenharia ?? null,
        valorHoraExecucao: data.valorHoraExecucao ?? null,
        horariosPorDia: jsonHorarios(data.horariosPorDia ?? null),
        equipe: equipeIds.length
          ? { connect: equipeIds.map((id) => ({ id })) }
          : undefined,
        veiculos: veiculoIds.length
          ? { connect: veiculoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: includePadrao,
    });

    return anexarCustoProjetado(evento, podeVerCustoProjetado(user));
  }

  async atualizar(id: string, data: AtualizarEventoInput, user?: UsuarioCusto) {
    const existente = await prisma.eventoCalendario.findUnique({ where: { id } });
    if (!existente) return null;

    let dataInicio = data.dataInicio ? new Date(data.dataInicio) : existente.dataInicio;
    let dataFim = data.dataFim ? new Date(data.dataFim) : existente.dataFim;
    const alocacao = normalizarAlocacao(data);
    const statusAtualizacao =
      data.status === EventoStatus.VALIDO && existente.status === EventoStatus.PREVISAO
        ? undefined
        : data.status;

    if (alocacao.equipeIds) {
      await validarEquipeIds(alocacao.equipeIds);
    }
    if (data.veiculoIds) {
      await validarVeiculoIds(data.veiculoIds);
    }

    let orcamentoId = data.orcamentoId;
    let projetoId = data.projetoId;
    if (data.projetoId !== undefined) {
      const projeto = await resolverProjeto(data.projetoId);
      projetoId = projeto?.id || null;
      if (projeto) orcamentoId = projeto.orcamentoId;
    }

    const projetoIdEfetivo = data.projetoId !== undefined ? projetoId : existente.projetoId;
    if (deveAlocarPeriodoOs({ alocarPeriodoOs: data.alocarPeriodoOs, projetoId: projetoIdEfetivo })) {
      const periodo = await resolverPeriodoOs(String(projetoIdEfetivo));
      dataInicio = periodo.inicio;
      dataFim = periodo.fim;
      const equipeIdsSnap = alocacao.equipeIds ?? (
        await prisma.eventoCalendario.findUnique({
          where: { id },
          select: { equipe: { select: { id: true } } },
        })
      )?.equipe.map((e) => e.id) ?? [];
      const snapped = await snapDatasWorkshift(equipeIdsSnap, dataInicio, dataFim);
      dataInicio = snapped.dataInicio;
      dataFim = snapped.dataFim;
    } else if (data.snapWorkshift && alocacao.equipeIds?.length) {
      const snapped = await snapDatasWorkshift(alocacao.equipeIds, dataInicio, dataFim);
      dataInicio = snapped.dataInicio;
      dataFim = snapped.dataFim;
    }

    validarDatas(dataInicio, dataFim);
    if (orcamentoId !== undefined) {
      await validarOrcamentoId(orcamentoId);
    }

    const updateData: Prisma.EventoCalendarioUpdateInput = {
      ...(data.titulo !== undefined && { titulo: data.titulo.trim() }),
      ...(data.descricao !== undefined && { descricao: data.descricao?.trim() || null }),
      ...((data.dataInicio !== undefined || data.alocarPeriodoOs === true) && { dataInicio }),
      ...((data.dataFim !== undefined || data.alocarPeriodoOs === true) && { dataFim }),
      ...(statusAtualizacao !== undefined && { status: statusAtualizacao }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(orcamentoId !== undefined && {
        orcamento: orcamentoId ? { connect: { id: orcamentoId } } : { disconnect: true },
      }),
      ...(data.projetoId !== undefined && {
        projeto: projetoId ? { connect: { id: projetoId } } : { disconnect: true },
      }),
      ...(data.custoVeiculo !== undefined && { custoVeiculo: data.custoVeiculo ?? 0 }),
      ...(alocacao.equipeEngenhariaIds !== undefined && {
        equipeEngenhariaIds: alocacao.equipeEngenhariaIds,
      }),
      ...(alocacao.equipeExecucaoIds !== undefined && {
        equipeExecucaoIds: alocacao.equipeExecucaoIds,
      }),
      ...(data.valorHoraEngenharia !== undefined && {
        valorHoraEngenharia: data.valorHoraEngenharia,
      }),
      ...(data.valorHoraExecucao !== undefined && {
        valorHoraExecucao: data.valorHoraExecucao,
      }),
      ...(data.horariosPorDia !== undefined && {
        horariosPorDia: jsonHorarios(data.horariosPorDia),
      }),
      ...(alocacao.equipeIds !== undefined && {
        equipe: { set: alocacao.equipeIds.map((equipeId) => ({ id: equipeId })) },
      }),
      ...(data.veiculoIds !== undefined && {
        veiculos: { set: data.veiculoIds.map((veiculoId) => ({ id: veiculoId })) },
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

  async confirmar(id: string, user?: UsuarioCusto) {
    const existente = await prisma.eventoCalendario.findUnique({
      where: { id },
      include: includePadrao,
    });
    if (!existente) return null;
    if (existente.tipo === 'OBRA' && !existente.projetoId && existente.status !== EventoStatus.VALIDO) {
      throw new Error('Vincule uma ordem de serviço antes de confirmar');
    }

    await prisma.eventoCalendario.deleteMany({ where: { eventoOrigemId: id } });

    if (existente.status === EventoStatus.VALIDO) {
      return anexarCustoProjetado(existente, podeVerCustoProjetado(user));
    }

    const evento = await prisma.eventoCalendario.update({
      where: { id },
      data: { status: EventoStatus.VALIDO },
      include: includePadrao,
    });

    return anexarCustoProjetado(evento, podeVerCustoProjetado(user));
  }

  /**
   * Atalho da agenda: o mesmo evento deixa de ser previsão e o apontamento
   * das pessoas é gravado no mesmo gesto. Não cria cópia nem eventoOrigemId.
   */
  async executar(id: string, criadoPorId: string, user?: UsuarioCusto) {
    if (!criadoPorId) throw new Error('Usuário não autenticado');

    const existente = await prisma.eventoCalendario.findUnique({
      where: { id },
      include: includePadrao,
    });
    if (!existente) return null;
    if (existente.tipo !== 'OBRA') {
      throw new Error('Executar OS está disponível apenas para alocação de obra');
    }
    if (!existente.projetoId) {
      throw new Error('Vincule uma ordem de serviço antes de executar');
    }
    if (!existente.equipe.length) {
      throw new Error('Inclua ao menos uma pessoa na equipe antes de executar');
    }

    const projeto = await prisma.projeto.findUnique({
      where: { id: existente.projetoId },
      select: { id: true, status: true },
    });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');
    if (projeto.status === 'CANCELADO') {
      throw new Error('Não é possível executar: a ordem de serviço está cancelada');
    }

    const manuais = normalizarHorariosPorDia(existente.horariosPorDia);
    const dias = horasPorDiaAlocacao(
      new Date(existente.dataInicio),
      new Date(existente.dataFim),
      manuais && manuais.length > 0 ? manuais : null,
    );
    if (dias.length === 0) {
      throw new Error('Não há horas no ciclo comercial (07:30–17:30) para apontar nesta alocação');
    }

    const hoje = ymdHojeBrasilia();
    const diasIgnoradosFuturos = dias.filter((d) => d.dia > hoje).map((d) => d.dia);
    const elegiveis = dias.filter((d) => d.dia <= hoje && d.horas > 0);

    const { engenharia, execucao } = particionarEquipeAlocacao(
      existente.equipe,
      existente.equipeEngenhariaIds,
      existente.equipeExecucaoIds,
    );
    const { userPorFuncionario, falhas } = await resolverUsersEngenharia(engenharia);

    const existentes = elegiveis.length
      ? await prisma.apontamentoOsItem.findMany({
          where: { apontamento: { projetoId: existente.projetoId } },
          select: {
            tipoRecurso: true,
            userId: true,
            funcionarioId: true,
            apontamento: { select: { dataApontamento: true } },
          },
        })
      : [];
    const jaApontados = new Set(
      existentes
        .map((item) => {
          const dia = ymdDeDataDiaCivil(item.apontamento.dataApontamento);
          if (!dia) return null;
          if (item.tipoRecurso === 'HORA_ENGENHARIA' && item.userId) {
            return `${dia}|HORA_ENGENHARIA|${item.userId}`;
          }
          if (item.tipoRecurso === 'DIARIA_EQUIPE' && item.funcionarioId) {
            return `${dia}|DIARIA_EQUIPE|${item.funcionarioId}`;
          }
          return null;
        })
        .filter((chave): chave is string => Boolean(chave)),
    );

    const pulados: Array<{ dia: string; pessoa: string; tipo: 'engenharia' | 'execução' }> = [];
    const diasApontados: string[] = [];
    const observacoes = `Apontamento gerado pelo calendário (evento ${existente.id}).`;

    for (const dia of elegiveis) {
      const itens: ApontamentoItemInput[] = [];

      for (const membro of engenharia) {
        const userId = userPorFuncionario.get(membro.id);
        if (!userId) continue;
        const chave = `${dia.dia}|HORA_ENGENHARIA|${userId}`;
        if (jaApontados.has(chave)) {
          pulados.push({ dia: dia.dia, pessoa: membro.nome || 'Engenharia', tipo: 'engenharia' });
          continue;
        }
        itens.push({
          tipoRecurso: 'HORA_ENGENHARIA',
          quantidade: dia.horas,
          userId,
        });
        jaApontados.add(chave);
      }

      const diarias = diariasDeHorasTotais(dia.horas);
      for (const membro of execucao) {
        if (diarias <= 0) continue;
        const chave = `${dia.dia}|DIARIA_EQUIPE|${membro.id}`;
        if (jaApontados.has(chave)) {
          pulados.push({ dia: dia.dia, pessoa: membro.nome || 'Execução', tipo: 'execução' });
          continue;
        }
        itens.push({
          tipoRecurso: 'DIARIA_EQUIPE',
          quantidade: diarias,
          funcionarioId: membro.id,
        });
        jaApontados.add(chave);
      }

      if (itens.length === 0) continue;

      await apropriacaoOsService.criarApontamento(existente.projetoId, criadoPorId, {
        dataApontamento: dia.dia,
        observacoes,
        itens,
      });
      diasApontados.push(dia.dia);
    }

    if (diasApontados.length === 0 && falhas.length > 0 && pulados.length === 0 && elegiveis.length > 0) {
      throw new Error(falhas.map((f) => f.mensagem).join(' '));
    }

    let evento = existente;
    if (existente.status !== EventoStatus.VALIDO) {
      await prisma.eventoCalendario.deleteMany({ where: { eventoOrigemId: id } });
      evento = await prisma.eventoCalendario.update({
        where: { id },
        data: { status: EventoStatus.VALIDO },
        include: includePadrao,
      });
    }

    return {
      evento: anexarCustoProjetado(evento, podeVerCustoProjetado(user)),
      diasApontados,
      diasIgnoradosFuturos,
      pulados,
      falhas,
    };
  }

  async listarFuncionariosAlocacao() {
    const funcionarios = await prisma.funcionario.findMany({
      where: { status: { equals: 'Ativo', mode: 'insensitive' } },
      select: {
        ...equipeSelect,
        configuracaoPonto: {
          select: {
            workShift: {
              select: {
                id: true,
                nome: true,
                entrada1: true,
                saida1: true,
                entrada2: true,
                saida2: true,
              },
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return funcionarios.map((f) => ({
      id: f.id,
      nome: f.nome,
      cargo: f.cargo,
      email: f.email,
      valorHora: f.valorHora,
      valorDiaria: f.valorDiaria,
      status: f.status,
      workShift: f.configuracaoPonto?.workShift ?? {
        id: null,
        nome: 'Padrão',
        entrada1: '07:30',
        saida1: '12:00',
        entrada2: '13:00',
        saida2: '17:30',
      },
    }));
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
