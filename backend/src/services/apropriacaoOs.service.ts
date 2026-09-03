import { ProjetoStatus, TipoRecursoApontamento } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calcularMaoDeObraCalendarioOs } from './horasCustoContabil.service';
import {
  calcularResultadoOs,
  calcularTotaisApropriacao,
  type ResultadoOsCalculado,
} from '../utils/apropriacaoOs.util';
import {
  calcularCustoItemApontamento,
  resolverTaxaFuncionario,
} from '../utils/taxaFuncionario.util';
import {
  parseDataDiaCivilInput,
  ymdCivilBrasilia,
  ymdDeDataDiaCivil,
} from '../utils/datetime-sp.util';

export interface ApontamentoItemInput {
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
  userId?: string | null;
  funcionarioId?: string | null;
}

export interface CriarApontamentoInput {
  dataApontamento: string;
  observacoes?: string | null;
  itens: ApontamentoItemInput[];
}

const STATUS_BLOQUEADOS_APONTAMENTO: ProjetoStatus[] = ['CANCELADO'];

function apontamentoPermitido(status: ProjetoStatus): boolean {
  return !STATUS_BLOQUEADOS_APONTAMENTO.includes(status);
}

function apontamentoContabilizadoNoResultado(status: ProjetoStatus): boolean {
  return status === 'EXECUCAO' || status === 'CONCLUIDO';
}

const includeApontamento = {
  criadoPor: { select: { id: true, name: true } },
  itens: {
    include: {
      user: { select: { id: true, name: true } },
      funcionario: { select: { id: true, nome: true, cargo: true } },
    },
  },
} as const;

function parseDataApontamento(value: string): Date {
  const d = parseDataDiaCivilInput(value);
  if (!d) {
    throw new Error('Data de apontamento inválida');
  }
  return d;
}

function validarDataApontamentoNaoFutura(dataApontamento: Date): void {
  const ymd = ymdDeDataDiaCivil(dataApontamento);
  if (!ymd) {
    throw new Error('Data de apontamento inválida');
  }
  const hoje = ymdCivilBrasilia();
  const hojeYmd = `${hoje.ano}-${String(hoje.mes).padStart(2, '0')}-${String(hoje.dia).padStart(2, '0')}`;
  if (ymd > hojeYmd) {
    throw new Error('Data de apontamento não pode ser futura');
  }
}

type ApontamentoComData = {
  dataApontamento: Date;
  [key: string]: unknown;
};

function serializarApontamento<T extends ApontamentoComData>(row: T): Omit<T, 'dataApontamento'> & { dataApontamento: string } {
  return {
    ...row,
    dataApontamento: ymdDeDataDiaCivil(row.dataApontamento) ?? String(row.dataApontamento),
  };
}

function validarItens(itens: ApontamentoItemInput[]): void {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Informe ao menos um colaborador com tempo alocado');
  }

  for (const item of itens) {
    const qtd = Number(item.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      throw new Error('Quantidade deve ser maior que zero em todos os itens');
    }

    if (item.tipoRecurso === 'HORA_ENGENHARIA') {
      if (!item.userId) {
        throw new Error('Hora de engenharia exige um usuário (userId)');
      }
      if (item.funcionarioId) {
        throw new Error('Hora de engenharia não deve ter funcionarioId');
      }
    } else if (item.tipoRecurso === 'DIARIA_EQUIPE') {
      if (!item.funcionarioId) {
        throw new Error('Diária de equipe exige um funcionário (funcionarioId)');
      }
      if (item.userId) {
        throw new Error('Diária de equipe não deve ter userId');
      }
    } else {
      throw new Error(`Tipo de recurso inválido: ${item.tipoRecurso}`);
    }
  }
}

async function buscarItensApropriacao(projetoId: string) {
  const rows = await prisma.apontamentoOsItem.findMany({
    where: { apontamento: { projetoId } },
    select: { tipoRecurso: true, quantidade: true },
  });
  return rows;
}

const selectTaxaFuncionario = {
  id: true,
  email: true,
  salario: true,
  salarioBase: true,
  cargaHorariaMensal: true,
  valorHora: true,
  valorDiaria: true,
  tipoContrato: true,
  valorHoraNormalAutonomo: true,
} as const;

async function calcularCustoApontamentoPorColaborador(
  projetoId: string,
  fallback: { valorHoraEngenharia?: number | null; valorDiariaEquipe?: number | null },
): Promise<number> {
  const itens = await prisma.apontamentoOsItem.findMany({
    where: { apontamento: { projetoId } },
    include: {
      funcionario: { select: selectTaxaFuncionario },
      user: { select: { id: true, email: true } },
    },
  });

  if (itens.length === 0) return 0;

  const emailsEngenharia = [
    ...new Set(
      itens
        .map((i) => i.user?.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  ];

  const funcionariosPorEmail =
    emailsEngenharia.length > 0
      ? await prisma.funcionario.findMany({
          where: { email: { in: emailsEngenharia, mode: 'insensitive' } },
          select: selectTaxaFuncionario,
        })
      : [];

  const funcPorEmail = new Map(
    funcionariosPorEmail
      .filter((f) => f.email)
      .map((f) => [f.email!.trim().toLowerCase(), f]),
  );

  let total = 0;
  for (const item of itens) {
    let func = item.funcionario;
    if (!func && item.user?.email) {
      func = funcPorEmail.get(item.user.email.trim().toLowerCase()) ?? null;
    }

    const taxa = resolverTaxaFuncionario(func, {
      valorHora:
        item.tipoRecurso === 'HORA_ENGENHARIA'
          ? fallback.valorHoraEngenharia
          : undefined,
      valorDiaria:
        item.tipoRecurso === 'DIARIA_EQUIPE' ? fallback.valorDiariaEquipe : undefined,
    });

    total += calcularCustoItemApontamento(item.tipoRecurso, item.quantidade, taxa);
  }

  return Math.round(total * 100) / 100;
}

function calcularDiasCorridos(dataInicio: Date | null | undefined, ref: Date = new Date()): number {
  if (!dataInicio) return 0;
  const start = new Date(dataInicio);
  start.setHours(0, 0, 0, 0);
  const end = new Date(ref);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export interface CockpitResumoItem {
  diariasEquipeOrcadas: number;
  diariasEquipeRealizadas: number;
  custoTempoOrcado: number;
  dataPrevisao: string | null;
  diasCorridos: number;
  estouroDiarias: boolean;
  estouroDiasCorridos: boolean;
}

async function montarResumo(projetoId: string): Promise<ResultadoOsCalculado> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: { orcamento: { select: { precoVenda: true } } },
  });
  if (!projeto) throw new Error('Ordem de serviço não encontrada');

  const itens = await buscarItensApropriacao(projetoId);
  const totais = calcularTotaisApropriacao(itens);
  const custoApontamentoItens = await calcularCustoApontamentoPorColaborador(projetoId, {
    valorHoraEngenharia: projeto.valorHoraEngenharia,
    valorDiariaEquipe: projeto.valorDiariaEquipe,
  });
  const calendarioValido = await calcularMaoDeObraCalendarioOs(projetoId, {
    apenasStatus: 'VALIDO',
  });
  const calendarioPrevisto = await calcularMaoDeObraCalendarioOs(projetoId, {
    apenasStatus: 'PREVISAO',
  });

  return calcularResultadoOs(
    {
      horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas,
      diariasEquipeOrcadas: projeto.diariasEquipeOrcadas,
      valorHoraEngenharia: projeto.valorHoraEngenharia,
      valorDiariaEquipe: projeto.valorDiariaEquipe,
      valorTotal: projeto.valorTotal,
      precoVendaOrcamento: projeto.orcamento?.precoVenda,
    },
    totais,
    {
      custoCalendario: calendarioValido.custoTotal,
      custoCalendarioPrevisto: calendarioPrevisto.custoTotal,
      horasEngenharia: calendarioValido.horasEngenharia,
      diariasEquipe: calendarioValido.diariasEquipe,
      linhas: [...calendarioPrevisto.linhas, ...calendarioValido.linhas],
    },
    {
      apontamentoContabilizado: apontamentoContabilizadoNoResultado(projeto.status),
      custoApontamentoItens,
    },
  );
}

export const apropriacaoOsService = {
  async criarApontamento(
    projetoId: string,
    criadoPorId: string,
    input: CriarApontamentoInput
  ) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');

    if (!apontamentoPermitido(projeto.status)) {
      throw new Error(
        'Apontamento não permitido para OS cancelada'
      );
    }

    validarItens(input.itens);
    const dataApontamento = parseDataApontamento(input.dataApontamento);
    validarDataApontamentoNaoFutura(dataApontamento);

    const apontamento = await prisma.$transaction(async (tx) => {
      const created = await tx.apontamentoOs.create({
        data: {
          projetoId,
          dataApontamento,
          observacoes: input.observacoes?.trim() || null,
          criadoPorId,
          itens: {
            create: input.itens.map((item) => ({
              tipoRecurso: item.tipoRecurso,
              quantidade: Number(item.quantidade),
              userId:
                item.tipoRecurso === 'HORA_ENGENHARIA' ? item.userId! : null,
              funcionarioId:
                item.tipoRecurso === 'DIARIA_EQUIPE' ? item.funcionarioId! : null,
            })),
          },
        },
        include: includeApontamento,
      });
      return created;
    });

    const resumoAtualizado = await montarResumo(projetoId);
    return { apontamento: serializarApontamento(apontamento), resumoAtualizado };
  },

  async atualizarApontamento(
    projetoId: string,
    apontamentoId: string,
    input: CriarApontamentoInput
  ) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');

    if (!apontamentoPermitido(projeto.status)) {
      throw new Error(
        'Apontamento não permitido para OS cancelada'
      );
    }

    const existente = await prisma.apontamentoOs.findFirst({
      where: { id: apontamentoId, projetoId },
    });
    if (!existente) throw new Error('Apontamento não encontrado');

    validarItens(input.itens);
    const dataApontamento = parseDataApontamento(input.dataApontamento);
    validarDataApontamentoNaoFutura(dataApontamento);

    const apontamento = await prisma.$transaction(async (tx) => {
      await tx.apontamentoOsItem.deleteMany({ where: { apontamentoId } });
      return tx.apontamentoOs.update({
        where: { id: apontamentoId },
        data: {
          dataApontamento,
          observacoes: input.observacoes?.trim() || null,
          itens: {
            create: input.itens.map((item) => ({
              tipoRecurso: item.tipoRecurso,
              quantidade: Number(item.quantidade),
              userId:
                item.tipoRecurso === 'HORA_ENGENHARIA' ? item.userId! : null,
              funcionarioId:
                item.tipoRecurso === 'DIARIA_EQUIPE' ? item.funcionarioId! : null,
            })),
          },
        },
        include: includeApontamento,
      });
    });

    const resumoAtualizado = await montarResumo(projetoId);
    return { apontamento: serializarApontamento(apontamento), resumoAtualizado };
  },

  async excluirApontamento(projetoId: string, apontamentoId: string) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');

    if (!apontamentoPermitido(projeto.status)) {
      throw new Error('Apontamento não permitido para OS cancelada');
    }

    const existente = await prisma.apontamentoOs.findFirst({
      where: { id: apontamentoId, projetoId },
    });
    if (!existente) throw new Error('Apontamento não encontrado');

    await prisma.apontamentoOs.delete({ where: { id: apontamentoId } });

    const resumoAtualizado = await montarResumo(projetoId);
    return { resumoAtualizado };
  },

  async listarApontamentos(projetoId: string, limit = 50) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');

    const rows = await prisma.apontamentoOs.findMany({
      where: { projetoId },
      include: includeApontamento,
      orderBy: [{ dataApontamento: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map(serializarApontamento);
  },

  async obterResumo(projetoId: string): Promise<ResultadoOsCalculado> {
    return montarResumo(projetoId);
  },

  async montarResumo(projetoId: string): Promise<ResultadoOsCalculado> {
    return montarResumo(projetoId);
  },

  async obterCockpitResumoBatch(projetoIds: string[]): Promise<Record<string, CockpitResumoItem>> {
    const ids = [...new Set(projetoIds.filter(Boolean))];
    const map: Record<string, CockpitResumoItem> = {};
    if (ids.length === 0) return map;

    const projetos = await prisma.projeto.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        dataInicio: true,
        dataPrevisao: true,
        horasEngenhariaOrcadas: true,
        diariasEquipeOrcadas: true,
        valorHoraEngenharia: true,
        valorDiariaEquipe: true,
        valorTotal: true,
        orcamento: { select: { precoVenda: true } },
      },
    });

    const itensRows = await prisma.apontamentoOsItem.findMany({
      where: { apontamento: { projetoId: { in: ids } } },
      select: {
        tipoRecurso: true,
        quantidade: true,
        apontamento: { select: { projetoId: true } },
      },
    });

    const itensPorProjeto = new Map<string, typeof itensRows>();
    for (const row of itensRows) {
      const pid = row.apontamento.projetoId;
      const list = itensPorProjeto.get(pid) ?? [];
      list.push(row);
      itensPorProjeto.set(pid, list);
    }

    const calendarios = await Promise.all(
      ids.map(async (id) => {
        const cal = await calcularMaoDeObraCalendarioOs(id, { apenasStatus: 'VALIDO' });
        return [id, cal] as const;
      }),
    );
    const calendarioPorProjeto = new Map(calendarios);

    for (const projeto of projetos) {
      const itens = (itensPorProjeto.get(projeto.id) ?? []).map((r) => ({
        tipoRecurso: r.tipoRecurso,
        quantidade: r.quantidade,
      }));
      const totais = calcularTotaisApropriacao(itens);
      const calendario = calendarioPorProjeto.get(projeto.id);
      const resumo = calcularResultadoOs(
        {
          horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas,
          diariasEquipeOrcadas: projeto.diariasEquipeOrcadas,
          valorHoraEngenharia: projeto.valorHoraEngenharia,
          valorDiariaEquipe: projeto.valorDiariaEquipe,
          valorTotal: projeto.valorTotal,
          precoVendaOrcamento: projeto.orcamento?.precoVenda,
        },
        totais,
        calendario
          ? {
              custoCalendario: calendario.custoTotal,
              horasEngenharia: calendario.horasEngenharia,
              diariasEquipe: calendario.diariasEquipe,
              linhas: calendario.linhas,
            }
          : undefined,
      );
      const diasCorridos = calcularDiasCorridos(projeto.dataInicio);
      const diariasOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
      map[projeto.id] = {
        diariasEquipeOrcadas: diariasOrcadas,
        diariasEquipeRealizadas: resumo.diariasEquipeRealizadas,
        custoTempoOrcado: resumo.custoOrcado,
        dataPrevisao: projeto.dataPrevisao ? projeto.dataPrevisao.toISOString() : null,
        diasCorridos,
        estouroDiarias: resumo.estouroDiariasEquipe,
        estouroDiasCorridos:
          projeto.status === 'EXECUCAO' && diariasOrcadas > 0 && diasCorridos > diariasOrcadas,
      };
    }

    return map;
  },
};
