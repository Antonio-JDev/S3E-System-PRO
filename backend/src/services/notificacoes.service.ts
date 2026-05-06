import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type TipoNotificacao = 'kanban_ordem_servico' | 'kanban_obras' | 'financeiro' | 'tarefas_internas';

export interface CriarNotificacaoInput {
  userId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  metadata?: { entityId?: string; entityType?: string; link?: string; [k: string]: unknown };
  enviarEmail?: boolean;
}

/**
 * Cria uma notificação para um usuário e opcionalmente envia por e-mail
 */
export async function criarNotificacao(input: CriarNotificacaoInput) {
  const { userId, tipo, titulo, mensagem, metadata, enviarEmail = true } = input;

  const notificacao = await prisma.notificacao.create({
    data: {
      userId,
      tipo,
      titulo,
      mensagem,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      emailEnviado: false,
    },
  });

  if (enviarEmail) {
    try {
      const { sendNotificationEmail } = await import('./email.service');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (user?.email) {
        await sendNotificationEmail(user.email, user.name || 'Usuário', titulo, mensagem);
        await prisma.notificacao.update({
          where: { id: notificacao.id },
          data: { emailEnviado: true },
        });
      }
    } catch (err) {
      console.error('Erro ao enviar e-mail de notificação:', err);
    }
  }

  return notificacao;
}

/**
 * Lista notificações do usuário (não lidas primeiro, depois por data)
 */
export async function listarPorUsuario(userId: string, limit = 50) {
  return prisma.notificacao.findMany({
    where: { userId },
    orderBy: [{ lida: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

/**
 * Conta não lidas do usuário
 */
export async function contarNaoLidas(userId: string) {
  return prisma.notificacao.count({
    where: { userId, lida: false },
  });
}

/**
 * Marca uma notificação como lida
 */
export async function marcarComoLida(id: string, userId: string) {
  const n = await prisma.notificacao.findFirst({
    where: { id, userId },
  });
  if (!n) return null;
  return prisma.notificacao.update({
    where: { id },
    data: { lida: true },
  });
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function marcarTodasComoLidas(userId: string) {
  await prisma.notificacao.updateMany({
    where: { userId },
    data: { lida: true },
  });
}

/**
 * Exclui todas as notificações do usuário (limpa o container)
 */
export async function excluirTodas(userId: string) {
  await prisma.notificacao.deleteMany({
    where: { userId },
  });
}

/**
 * Exclui uma notificação pelo id (apenas se pertencer ao usuário)
 */
export async function excluirUma(id: string, userId: string): Promise<boolean> {
  const n = await prisma.notificacao.findFirst({
    where: { id, userId },
  });
  if (!n) return false;
  await prisma.notificacao.delete({ where: { id } });
  return true;
}

/**
 * Cria notificação quando usuário é mencionado/atribuído em task do Kanban (ordem de serviço).
 * Inclui numeroOrdemServico no metadata quando o projeto tem orçamento com numeroSequencial.
 * E-mail desativado por padrão (apenas notificação in-app).
 */
export async function notificarAtribuicaoKanbanOrdemServico(
  userIdDestino: string,
  projetoId: string,
  taskId: string,
  taskTitulo: string,
  enviarEmail = false,
  criadorNome?: string
) {
  let numeroOrdemServico: string | undefined;
  try {
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { orcamento: { select: { numeroSequencial: true } } },
    });
    if (projeto?.orcamento?.numeroSequencial != null) {
      numeroOrdemServico = `OS-${projeto.orcamento.numeroSequencial}`;
    }
  } catch {
    // ignora erro ao buscar número da OS
  }
  const porCriador =
    criadorNome && criadorNome.trim()
      ? ` Tarefa criada por ${criadorNome.trim()}.`
      : '';
  return criarNotificacao({
    userId: userIdDestino,
    tipo: 'kanban_ordem_servico',
    titulo: 'Nova tarefa atribuída (Ordem de Serviço)',
    mensagem: `Você foi atribuído à tarefa "${taskTitulo}" no Kanban de Ordem de Serviço.${porCriador}`,
    metadata: {
      entityId: taskId,
      entityType: 'Task',
      projetoId,
      link: `/projetos?projeto=${projetoId}`,
      ...(numeroOrdemServico && { numeroOrdemServico }),
    },
    enviarEmail,
  });
}

/**
 * Cria notificação quando usuário é atribuído a uma tarefa no Kanban de Tarefas Internas.
 * E-mail desativado por padrão (apenas notificação in-app).
 */
export async function notificarAtribuicaoTarefaInterna(
  userIdDestino: string,
  tarefaInternaId: string,
  titulo: string,
  enviarEmail = false
) {
  return criarNotificacao({
    userId: userIdDestino,
    tipo: 'tarefas_internas',
    titulo: 'Tarefa interna atribuída a você',
    mensagem: `Você foi atribuído à tarefa "${titulo.substring(0, 80)}${titulo.length > 80 ? '...' : ''}" no Kanban de Tarefas Internas.`,
    metadata: { tarefaInternaId, entityId: tarefaInternaId, entityType: 'TarefaInterna', link: '/tarefas-internas' },
    enviarEmail,
  });
}

/**
 * Cria notificação quando usuário é atribuído em tarefa do Kanban de Obras
 */
export async function notificarAtribuicaoKanbanObras(
  userIdDestino: string,
  obraId: string,
  tarefaId: string,
  descricao: string,
  enviarEmail = true
) {
  return criarNotificacao({
    userId: userIdDestino,
    tipo: 'kanban_obras',
    titulo: 'Nova tarefa atribuída (Kanban de Obras)',
    mensagem: `Você foi atribuído à tarefa: ${descricao.substring(0, 80)}${descricao.length > 80 ? '...' : ''}`,
    metadata: { entityId: tarefaId, entityType: 'TarefaObra', obraId, link: `/obras-kanban` },
    enviarEmail,
  });
}

/**
 * Cria notificação para o financeiro (ex: tarefa ou menção)
 */
export async function notificarFinanceiro(
  userIdDestino: string,
  titulo: string,
  mensagem: string,
  metadata?: { entityId?: string; entityType?: string; link?: string },
  enviarEmail = true
) {
  return criarNotificacao({
    userId: userIdDestino,
    tipo: 'financeiro',
    titulo,
    mensagem,
    metadata,
    enviarEmail,
  });
}

/**
 * Contas a pagar vencendo no dia exato: notifica usuários da função Financeiro/Faturamento.
 * Deve ser chamado diariamente (ex: ao iniciar o app e/ou por cron às 8h).
 */
export async function notificarContasAPagarVencendoHoje(): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const contasVencendoHoje = await prisma.contaPagar.findMany({
    where: {
      dataVencimento: { gte: startOfToday, lte: endOfToday },
      status: { not: 'Pago' },
    },
    select: { id: true, descricao: true, valorParcela: true },
  });

  if (contasVencendoHoje.length === 0) return;

  const titulo = 'Contas a pagar vencendo hoje';
  const total = contasVencendoHoje.reduce((s, c) => s + c.valorParcela, 0);
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
  const mensagem =
    contasVencendoHoje.length === 1
      ? `1 conta vence hoje: ${contasVencendoHoje[0].descricao} (${valorFmt}).`
      : `${contasVencendoHoje.length} contas vencem hoje. Total: ${valorFmt}. Acesse o módulo Financeiro para detalhes.`;

  const usuariosFinanceiro = await prisma.user.findMany({
    where: {
      active: true,
      role: { equals: 'financeiro_faturamento', mode: 'insensitive' },
    },
    select: { id: true },
  });

  const hojeStr = startOfToday.toISOString().slice(0, 10);
  for (const u of usuariosFinanceiro) {
    const jaEnviada = await prisma.notificacao.findFirst({
      where: {
        userId: u.id,
        tipo: 'financeiro',
        titulo,
        createdAt: { gte: startOfToday },
      },
    });
    if (jaEnviada) continue;

    await criarNotificacao({
      userId: u.id,
      tipo: 'financeiro',
      titulo,
      mensagem,
      metadata: { subtype: 'contas_vencendo_hoje', data: hojeStr, link: '/contas-pagar' },
      enviarEmail: true,
    });
  }
}
