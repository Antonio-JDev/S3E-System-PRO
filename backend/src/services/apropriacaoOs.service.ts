import { ProjetoStatus, TipoRecursoApontamento } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  calcularResultadoOs,
  calcularTotaisApropriacao,
  type ResultadoOsCalculado,
} from '../utils/apropriacaoOs.util';

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

const STATUS_APONTAMENTO_PERMITIDOS: ProjetoStatus[] = ['EXECUCAO', 'CONCLUIDO'];

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
  const d = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Data de apontamento inválida');
  }
  return d;
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

async function montarResumo(projetoId: string): Promise<ResultadoOsCalculado> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: { orcamento: { select: { precoVenda: true } } },
  });
  if (!projeto) throw new Error('Ordem de serviço não encontrada');

  const itens = await buscarItensApropriacao(projetoId);
  const totais = calcularTotaisApropriacao(itens);

  return calcularResultadoOs(
    {
      horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas,
      diariasEquipeOrcadas: projeto.diariasEquipeOrcadas,
      valorHoraEngenharia: projeto.valorHoraEngenharia,
      valorDiariaEquipe: projeto.valorDiariaEquipe,
      valorTotal: projeto.valorTotal,
      precoVendaOrcamento: projeto.orcamento?.precoVenda,
    },
    totais
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

    if (!STATUS_APONTAMENTO_PERMITIDOS.includes(projeto.status)) {
      throw new Error(
        'Apontamento permitido apenas para OS em execução ou concluída'
      );
    }

    validarItens(input.itens);
    const dataApontamento = parseDataApontamento(input.dataApontamento);

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    if (dataApontamento > hoje) {
      throw new Error('Data de apontamento não pode ser futura');
    }

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
    return { apontamento, resumoAtualizado };
  },

  async listarApontamentos(projetoId: string, limit = 50) {
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Ordem de serviço não encontrada');

    return prisma.apontamentoOs.findMany({
      where: { projetoId },
      include: includeApontamento,
      orderBy: [{ dataApontamento: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
  },

  async obterResumo(projetoId: string): Promise<ResultadoOsCalculado> {
    return montarResumo(projetoId);
  },
};
