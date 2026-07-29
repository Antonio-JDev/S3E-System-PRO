import { Prisma, ProjetoStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import obraService from './obra.service';
import { validarConclusaoOsEngenharia } from './projetosEngenharia.service';
import { ContasReceberService } from './contasReceber.service';
import {
  entrarNaFilaSeAplicavel,
  validarConclusaoVistoriaCelesc,
} from './vistoriaCelesc.service';

export type OsWorkflowTipo =
  | 'PROJETOS_ELETRICOS'
  | 'LAUDO_TECNICO'
  | 'MANUTENCAO_EMERGENCIA'
  | 'QUADROS_PAINEIS'
  | 'DESLIGAMENTO';

export const OS_WORKFLOW_TEMPLATES: Record<OsWorkflowTipo, readonly string[]> = {
  PROJETOS_ELETRICOS: [
    'Vistoria',
    'Pré-projeto',
    'Levantamento',
    'Abertura de Protocolo',
    'Aprovação do Projeto',
    'Organização Final',
    'Cobrança',
    'Entrega',
  ],
  LAUDO_TECNICO: ['Levantamento', 'Ensaio In Loco', 'Relatório Final', 'Cobrança', 'Entrega'],
  MANUTENCAO_EMERGENCIA: ['Levantamento', 'Cobrança'],
  QUADROS_PAINEIS: ['Levantamento', 'Montagem', 'Entrega', 'Cobrança'],
  DESLIGAMENTO: [
    'Levantamento',
    'Aprovação do Desligamento',
    'Relatório Final',
    'Cobrança',
    'Entrega',
  ],
};

export const OS_WORKFLOW_COBRANCA_TASK = 'Cobrança';
export const OS_WORKFLOW_CONCLUSAO_TASK_PROJETOS_ELETRICOS = 'Organização Final';
export const OS_WORKFLOW_COBRANCA_OBS_MARKER_PREFIX = 'workflow-os:projeto:';

export function isOsWorkflowTipo(tipo: string): tipo is OsWorkflowTipo {
  return Object.prototype.hasOwnProperty.call(OS_WORKFLOW_TEMPLATES, tipo);
}

export interface CriarProjetoInput {
  orcamentoId: string;
  clienteId: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  responsavelId?: string | null;
  valorTotal?: number;
  dataInicio?: Date;
  dataPrevisao?: Date | null;
  criadoPorId?: string | null;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  valorHoraEngenharia?: number | null;
  valorDiariaEquipe?: number | null;
  exigeVistoriaCelesc?: boolean;
}

export class EstoqueInsuficienteError extends Error {
  code = 'ESTOQUE_INSUFICIENTE' as const;
  materiaisFaltantes: Array<{
    nome: string;
    necessario: number;
    disponivel: number;
    falta: number;
    bancoFrio?: boolean;
  }>;

  constructor(
    materiaisFaltantes: EstoqueInsuficienteError['materiaisFaltantes'],
    contexto: 'APROVACAO' | 'EXECUCAO' = 'EXECUCAO'
  ) {
    const titulo =
      contexto === 'APROVACAO'
        ? 'APROVAÇÃO BLOQUEADA'
        : 'EXECUÇÃO BLOQUEADA';
    const lista = materiaisFaltantes
      .map(
        (m) =>
          `• ${m.nome}\n  Necessário: ${m.necessario} | Disponível: ${m.disponivel} | Falta: ${m.falta}${m.bancoFrio ? ' (Banco Frio)' : ''}`
      )
      .join('\n\n');
    super(`${titulo}! Há ${materiaisFaltantes.length} item(ns) sem estoque suficiente:\n\n${lista}`);
    this.name = 'EstoqueInsuficienteError';
    this.materiaisFaltantes = materiaisFaltantes;
  }
}

export interface AtualizarStatusOptions {
  ignorarEstoque?: boolean;
  userId?: string;
}

export interface CamposPlanejamentoOsInput {
  responsavelId?: string | null;
  dataInicio?: Date | string | null;
  dataPrevisao?: Date | string | null;
  horasEngenhariaOrcadas?: number | null;
  diariasEquipeOrcadas?: number | null;
}

export function validarCamposPlanejamentoOs(data: CamposPlanejamentoOsInput): void {
  if (!data.responsavelId) {
    throw new Error('Gerente do projeto é obrigatório');
  }
  if (!data.dataInicio) {
    throw new Error('Data de início é obrigatória');
  }
  if (!data.dataPrevisao) {
    throw new Error('Data de fim (previsão) é obrigatória');
  }
  const inicio = new Date(data.dataInicio);
  const fim = new Date(data.dataPrevisao);
  if (fim < inicio) {
    throw new Error('Data de fim deve ser igual ou posterior à data de início');
  }
  const horas = Number(data.horasEngenhariaOrcadas);
  const diarias = Number(data.diariasEquipeOrcadas);
  if (!Number.isFinite(horas) || horas < 0) {
    throw new Error('Horas de engenharia orçadas inválidas');
  }
  if (!Number.isFinite(diarias) || diarias < 0) {
    throw new Error('Diárias de equipe orçadas inválidas');
  }
  if (horas === 0 && diarias === 0) {
    throw new Error('Informe ao menos horas de engenharia ou diárias de equipe orçadas');
  }
}

type PrismaTx = Prisma.TransactionClient;

function scaffoldWorkflowTasks(
  tx: PrismaTx,
  projetoId: string,
  tipo: string,
  criadoPorId?: string | null,
) {
  if (!isOsWorkflowTipo(tipo)) return Promise.resolve();
  return tx.task.createMany({
    data: OS_WORKFLOW_TEMPLATES[tipo].map((titulo, ordem) => ({
      projetoId,
      titulo,
      status: 'ToDo',
      prioridade: 'Media',
      ordem,
      criadoPorId: criadoPorId ?? null,
    })),
  });
}

/**
 * Gera conta a receber ao concluir a task "Cobrança" no Kanban da OS.
 */
export async function gerarContaReceberCobrancaOs(projetoId: string, taskId: string): Promise<void> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      cliente: { select: { nome: true } },
      orcamento: { select: { numeroSequencial: true, precoVenda: true } },
      vendas: {
        take: 1,
        include: { contasReceber: { select: { id: true } } },
      },
    },
  });

  if (!projeto) return;

  const venda = projeto.vendas[0];
  if (venda?.contasReceber?.length) {
    console.log('[workflow-os] Cobrança: PV já possui contas a receber — skip.');
    return;
  }

  const marker = `${OS_WORKFLOW_COBRANCA_OBS_MARKER_PREFIX}${projetoId}`;
  const contaExistente = await prisma.contaReceber.findFirst({
    where: { observacoes: { contains: marker } },
    select: { id: true },
  });
  if (contaExistente) {
    console.log('[workflow-os] Cobrança: conta já gerada para esta OS — skip.');
    return;
  }

  const valorParcela = projeto.valorTotal || projeto.orcamento?.precoVenda || 0;
  if (valorParcela <= 0) {
    console.warn('[workflow-os] Cobrança: valor zero — conta a receber não criada.');
    return;
  }

  const numeroOs = projeto.orcamento?.numeroSequencial
    ? `OS-${projeto.orcamento.numeroSequencial}`
    : projetoId;

  const dataVencimento = new Date();
  dataVencimento.setUTCDate(dataVencimento.getUTCDate() + 30);

  await ContasReceberService.criarContaReceberManual({
    tipo: 'ENTRADA',
    pagadorNome: projeto.cliente?.nome,
    descricao: `Cobrança — ${numeroOs} — ${projeto.titulo}`,
    valorParcela,
    dataVencimento,
    observacoes: `${marker} | task:${taskId} | Gerado automaticamente ao concluir task Cobrança`,
  });
}

/**
 * Dispara gatilhos de negócio quando uma task do Kanban da OS é concluída.
 */
export async function dispararGatilhosTaskConcluida(
  projetoId: string,
  taskTitulo: string,
  taskId: string,
): Promise<void> {
  if (taskTitulo !== OS_WORKFLOW_COBRANCA_TASK) return;
  await gerarContaReceberCobrancaOs(projetoId, taskId);
}

const ORDEM_STATUS_OS: Record<string, number> = {
  PROPOSTA: 0,
  VALIDADO: 1,
  APROVADO: 2,
  EXECUCAO: 3,
  CONCLUIDO: 4,
};

const STATUS_ROLLBACK_PERMITIDOS = ['PROPOSTA', 'VALIDADO', 'APROVADO'] as const;
export type StatusRollbackOs = (typeof STATUS_ROLLBACK_PERMITIDOS)[number];

export class ProjetosService {
  /**
   * Cria OS com checklist Kanban automático quando `tipo` corresponde a um workflow.
   */
  async criarProjeto(data: CriarProjetoInput) {
    const tipo = data.tipo || 'Instalacao';

    return prisma.$transaction(async (tx) => {
      const projeto = await tx.projeto.create({
        data: {
          orcamentoId: data.orcamentoId,
          clienteId: data.clienteId,
          responsavelId: data.responsavelId ?? null,
          titulo: data.titulo,
          descricao: data.descricao ?? '',
          tipo,
          valorTotal: data.valorTotal ?? 0,
          status: ProjetoStatus.PROPOSTA,
          dataInicio: data.dataInicio ?? new Date(),
          dataPrevisao: data.dataPrevisao ?? undefined,
          horasEngenhariaOrcadas: Number(data.horasEngenhariaOrcadas) || 0,
          diariasEquipeOrcadas: Number(data.diariasEquipeOrcadas) || 0,
          valorHoraEngenharia:
            data.valorHoraEngenharia != null ? Number(data.valorHoraEngenharia) : null,
          valorDiariaEquipe:
            data.valorDiariaEquipe != null ? Number(data.valorDiariaEquipe) : null,
          exigeVistoriaCelesc: Boolean(data.exigeVistoriaCelesc),
        },
      });

      await scaffoldWorkflowTasks(tx, projeto.id, tipo, data.criadoPorId);
      return projeto;
    });
  }

  /**
   * Cria Projeto a partir de um Orçamento, aprova o orçamento
   */
  async criarProjetoAPartirDoOrcamento(
    orcamentoId: string,
    options?: { tipo?: string; criadoPorId?: string | null },
  ) {
    const orcamento = await prisma.orcamento.findUnique({ where: { id: orcamentoId } });
    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (orcamento.status !== 'Aprovado') {
      await prisma.orcamento.update({
        where: { id: orcamentoId },
        data: { status: 'Aprovado', aprovedAt: new Date() },
      });
    }

    const existente = await prisma.projeto.findUnique({ where: { orcamentoId } });
    if (existente) {
      return existente;
    }

    return this.criarProjeto({
      orcamentoId,
      clienteId: orcamento.clienteId,
      titulo: orcamento.titulo,
      descricao: orcamento.descricao ?? undefined,
      valorTotal: orcamento.precoVenda,
      tipo: options?.tipo,
      criadoPorId: options?.criadoPorId,
      dataInicio: orcamento.previsaoInicio ?? new Date(),
      dataPrevisao: orcamento.previsaoTermino ?? orcamento.previsaoInicio ?? undefined,
      horasEngenhariaOrcadas: 0,
      diariasEquipeOrcadas: 0,
    });
  }

  private async verificarMateriaisFaltantes(projeto: {
    orcamento: {
      items: Array<{
        tipo: string;
        materialId: string | null;
        kitId: string | null;
        cotacaoId: string | null;
        quantidade: number;
        descricao: string | null;
        vendaDiretaFornecedor?: boolean;
      }>;
    } | null;
  }) {
    if (!projeto.orcamento) {
      throw new Error('Projeto sem orçamento vinculado');
    }

    const materiaisFaltantes: EstoqueInsuficienteError['materiaisFaltantes'] = [];

    for (const item of projeto.orcamento.items) {
      if ((item as { vendaDiretaFornecedor?: boolean }).vendaDiretaFornecedor) {
        continue;
      }
      if (item.tipo === 'SERVICO' || item.tipo === 'QUADRO_PRONTO' || item.tipo === 'CUSTO_EXTRA') {
        continue;
      }

      if (item.tipo === 'MATERIAL' && item.materialId) {
        const material = await prisma.material.findUnique({
          where: { id: item.materialId },
        });
        if (!material || material.estoque < item.quantidade) {
          materiaisFaltantes.push({
            nome: material?.nome || 'Material desconhecido',
            necessario: item.quantidade,
            disponivel: material?.estoque || 0,
            falta: item.quantidade - (material?.estoque || 0),
          });
        }
      }

      if (item.tipo === 'KIT' && item.kitId) {
        const kit = await prisma.kit.findUnique({
          where: { id: item.kitId },
          include: { items: { include: { material: true } } },
        });
        if (kit) {
          for (const kitItem of kit.items) {
            const mat = kitItem.material;
            if (!mat) continue;
            const necessario = kitItem.quantidade * item.quantidade;
            if (mat.estoque < necessario) {
              materiaisFaltantes.push({
                nome: `${mat.nome} (do kit ${kit.nome})`,
                necessario,
                disponivel: mat.estoque,
                falta: necessario - mat.estoque,
              });
            }
          }
        }
      }

      if (item.tipo === 'COTACAO') {
        const cotacao = item.cotacaoId
          ? await prisma.cotacao.findUnique({
              where: { id: item.cotacaoId },
              select: { nome: true },
            })
          : null;
        materiaisFaltantes.push({
          nome: cotacao?.nome || item.descricao || 'Item de cotação',
          necessario: item.quantidade,
          disponivel: 0,
          falta: item.quantidade,
          bancoFrio: true,
        });
      }
    }

    return materiaisFaltantes;
  }

  /** Atualiza status do projeto; ao mudar para EXECUCAO, cria Obra/Alocação e gera alerta lógico */
  async atualizarStatus(
    projetoId: string,
    novoStatus: ProjetoStatus,
    options?: AtualizarStatusOptions
  ) {
    const projeto = await prisma.projeto.findUnique({ 
      where: { id: projetoId },
      include: {
        orcamento: {
          include: {
            items: {
              include: {
                material: true
              }
            }
          }
        }
      }
    });
    
    if (!projeto) throw new Error('Projeto não encontrado');

    if (novoStatus === 'CONCLUIDO') {
      const bloqueio = await validarConclusaoOsEngenharia(projetoId);
      if (bloqueio) throw new Error(bloqueio);

      const bloqueioVistoria = validarConclusaoVistoriaCelesc({
        exigeVistoriaCelesc: Boolean(
          (projeto as { exigeVistoriaCelesc?: boolean }).exigeVistoriaCelesc,
        ),
        statusVistoria:
          (projeto as { statusVistoria?: string | null }).statusVistoria ?? null,
      });
      if (bloqueioVistoria) throw new Error(bloqueioVistoria);

      if (projeto.tipo === 'PROJETOS_ELETRICOS') {
        const taskOrganizacao = await prisma.task.findFirst({
          where: { projetoId, titulo: OS_WORKFLOW_CONCLUSAO_TASK_PROJETOS_ELETRICOS },
          select: { status: true },
        });
        if (!taskOrganizacao || taskOrganizacao.status !== 'Done') {
          throw new Error(
            'Não é possível concluir a OS: a task "Organização Final" deve estar concluída.',
          );
        }
      }
    }

    const updateData: any = { status: novoStatus };
    if (novoStatus === 'CONCLUIDO') {
      updateData.dataFim = new Date();
    }

    // 🔍 SE MUDAR PARA APROVADO: APENAS VALIDAR ESTOQUE (sem dar baixa).
    // A baixa no estoque ocorre somente ao clicar em "Iniciar obra" (gerar obra), quando os materiais são alocados.
    if (novoStatus === 'APROVADO' && projeto.status !== 'APROVADO') {
      console.log('🔍 Validando aprovação do projeto - Verificando disponibilidade de estoque (sem dar baixa)...');
      
      if (!projeto.orcamento) {
        throw new Error('Projeto sem orçamento vinculado');
      }

      const itemsFrios: any[] = [];

      // Verificar estoque de todos os items (MATERIAL e COTACAO vinculada ao estoque)
      for (const item of projeto.orcamento.items) {
        // Regra: itens marcados como venda direta do fornecedor não usam estoque
        // (tratá-los como item de serviço para não gerar falta/compra).
        if ((item as any).vendaDiretaFornecedor) {
          continue;
        }

        // Material direto ou item do banco frio já vinculado a um material do estoque (materialId salvo)
        const materialIdParaBaixa = (item.tipo === 'MATERIAL' && item.materialId)
          ? item.materialId
          : (item.tipo === 'COTACAO' && item.materialId)
            ? item.materialId
            : null;

        if (materialIdParaBaixa) {
          const material = await prisma.material.findUnique({
            where: { id: materialIdParaBaixa }
          });

          if (!material) {
            itemsFrios.push({
              nome: (item as any).nome || (item as any).cotacao?.nome || 'Material não identificado',
              quantidade: item.quantidade,
              motivo: 'Material não encontrado no catálogo'
            });
          } else if (material.estoque < item.quantidade) {
            itemsFrios.push({
              materialId: material.id,
              nome: material.nome,
              sku: material.sku,
              quantidadeNecessaria: item.quantidade,
              quantidadeDisponivel: material.estoque,
              quantidadeFaltante: item.quantidade - material.estoque
            });
          }
        }
      }

      // ❌ BLOQUEAR APROVAÇÃO SE TIVER ITEMS FRIOS
      if (itemsFrios.length > 0) {
        console.log(`❄️ BLOQUEADO: ${itemsFrios.length} item(ns) sem estoque`);
        const listaItems = itemsFrios.map(i => 
          `• ${i.nome}${i.sku ? ` (${i.sku})` : ''} - Faltam: ${i.quantidadeFaltante || i.quantidadeNecessaria} unidades`
        ).join('\n');
        
        throw new Error(
          `⚠️ APROVAÇÃO BLOQUEADA!\n\n` +
          `${itemsFrios.length} item(ns) sem estoque suficiente:\n${listaItems}\n\n` +
          `📦 Realize a compra dos materiais antes de aprovar o projeto.`
        );
      }

      console.log('✅ Validação de estoque OK. A baixa será feita ao iniciar a obra.');
    }

    if (novoStatus === 'EXECUCAO' && projeto.status !== 'EXECUCAO') {
      const materiaisFaltantes = await this.verificarMateriaisFaltantes(projeto);
      if (materiaisFaltantes.length > 0 && !options?.ignorarEstoque) {
        throw new EstoqueInsuficienteError(materiaisFaltantes, 'EXECUCAO');
      }
    }

    if (novoStatus === 'EXECUCAO' && options?.ignorarEstoque && projeto.status !== 'EXECUCAO') {
      updateData.iniciadoSemEstoque = true;
      updateData.iniciadoSemEstoqueEm = new Date();
      updateData.iniciadoSemEstoquePorId = options.userId ?? null;
    }

    const atualizado = await prisma.projeto.update({ where: { id: projetoId }, data: updateData });

    // Regra "Gerar Obra"
    if (novoStatus === 'EXECUCAO') {
      if (options?.ignorarEstoque) {
        console.log('⚠️ Execução iniciada ignorando validação de estoque');
      } else {
        console.log('✅ Estoque validado - Permitindo execução');
      }

      // NÃO criar alocação automática - o usuário deve alocar equipe/eletricista manualmente
      await prisma.projeto.update({
        where: { id: projetoId },
        data: {
          descricao: `${atualizado.descricao ?? ''}\n[ALERTA] necessidade_alocacao: atribuir equipe ao projeto.`,
        },
      });
    }

    if (
      novoStatus === ProjetoStatus.APROVADO ||
      novoStatus === ProjetoStatus.EXECUCAO ||
      novoStatus === ProjetoStatus.CONCLUIDO ||
      novoStatus === ProjetoStatus.VALIDADO
    ) {
      await entrarNaFilaSeAplicavel(projetoId);
    }

    return atualizado;
  }

  /**
   * Reverte status da OS para etapa anterior (admin).
   * Ao sair de EXECUCAO/CONCLUIDO, remove a obra vinculada e estorna baixa de estoque da obra.
   */
  async reverterStatus(projetoId: string, novoStatus: StatusRollbackOs) {
    if (!STATUS_ROLLBACK_PERMITIDOS.includes(novoStatus)) {
      throw new Error('Status de destino inválido para rollback. Use: PROPOSTA, VALIDADO ou APROVADO');
    }

    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) throw new Error('Projeto não encontrado');

    const statusAtual = String(projeto.status);
    if (statusAtual === 'CANCELADO') {
      throw new Error('Não é possível reverter uma OS cancelada');
    }

    const rankAtual = ORDEM_STATUS_OS[statusAtual] ?? -1;
    const rankNovo = ORDEM_STATUS_OS[novoStatus] ?? -1;

    if (rankNovo >= rankAtual) {
      throw new Error('O status de destino deve ser anterior ao status atual da OS');
    }

    const obra = await prisma.obra.findUnique({ where: { projetoId } });
    const precisaRemoverObra =
      !!obra && (statusAtual === 'EXECUCAO' || statusAtual === 'CONCLUIDO' || rankNovo < ORDEM_STATUS_OS.EXECUCAO);

    if (precisaRemoverObra && obra) {
      await obraService.deletarObraParaRollback(obra.id);
    }

    const updateData: { status: ProjetoStatus; dataFim?: null } = {
      status: novoStatus as ProjetoStatus,
    };
    if (statusAtual === 'CONCLUIDO') {
      updateData.dataFim = null;
    }

    return prisma.projeto.update({
      where: { id: projetoId },
      data: updateData,
    });
  }

  // REMOVIDO: criarEquipePlaceholder - equipes devem ser criadas manualmente pelo usuário

  /** Lista projetos com filtros e, opcionalmente, formato kanban */
  async listarProjetos(filtros: any, modo: 'lista' | 'kanban' = 'lista') {
    const where: any = {};
    if (filtros.status) where.status = filtros.status;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.responsavelId) where.tasks = { some: { responsavel: filtros.responsavelId } };

    const projetos = await prisma.projeto.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true } },
        orcamento: { select: { id: true, precoVenda: true, status: true } },
        alocacoes: true,
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (modo === 'kanban') {
      const grupos: Record<string, any[]> = {
        PROPOSTA: [],
        APROVADO: [],
        EXECUCAO: [],
        CONCLUIDO: []
      };
      for (const p of projetos) {
        const key = (p.status as unknown as ProjetoStatus) || 'PROPOSTA';
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      }
      return grupos;
    }

    return projetos;
  }

}

export const projetosService = new ProjetosService();


