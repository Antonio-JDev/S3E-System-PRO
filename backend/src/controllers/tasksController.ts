import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

/** Converte YYYY-MM-DD em Date UTC ao meio-dia (evita exibir “um dia antes” em fusos como America/Sao_Paulo). */
function parseDateOnlyToNoonUtc(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const s = typeof value === 'string' ? value.trim() : String(value);
  const datePart = s.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, day, 12, 0, 0, 0));
}

/** Prazo padrão: amanhã no calendário UTC, ao meio-dia. */
function defaultPrazoNoonUtc(): Date {
  const n = new Date();
  const y = n.getUTCFullYear();
  const mo = n.getUTCMonth();
  const d = n.getUTCDate();
  return new Date(Date.UTC(y, mo, d + 1, 12, 0, 0, 0));
}

/**
 * GET /api/projetos/:projetoId/tasks
 * Lista todas as tasks de um projeto
 */
export const getTasksByProjeto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { projetoId },
      orderBy: { createdAt: 'desc' },
      include: {
        criadoPor: { select: { id: true, name: true } }
      }
    });

    const data = tasks.map(t => ({
      ...t,
      responsaveisIds: Array.isArray(t.responsaveisIds) ? t.responsaveisIds : (t.responsavel ? [t.responsavel] : [])
    }));
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao buscar tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar tasks', 
      error: error.message 
    });
  }
};

/**
 * POST /api/projetos/:projetoId/tasks
 * Cria uma nova task para um projeto
 */
function parseResponsaveisIds(body: { responsavel?: string; responsaveis?: string[] }): string[] {
  const arr = Array.isArray(body.responsaveis) ? body.responsaveis : [];
  if (arr.length) return arr.filter(Boolean);
  if (body.responsavel) return [body.responsavel];
  return [];
}

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId } = req.params;
    const { titulo, descricao, status, prioridade, prazo, dataInicio, responsavel, responsaveis } = req.body;
    const authUser = (req as AuthRequest).user;
    const responsaveisIds = parseResponsaveisIds({ responsavel, responsaveis });
    const primeiro = responsaveisIds[0] || null;

    if (!titulo) {
      res.status(400).json({ 
        success: false, 
        message: 'Título é obrigatório' 
      });
      return;
    }

    // Verificar se o projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId }
    });

    if (!projeto) {
      res.status(404).json({ 
        success: false, 
        message: 'Projeto não encontrado' 
      });
      return;
    }

    const prazoParsed = parseDateOnlyToNoonUtc(prazo);
    const dataInicioParsed = parseDateOnlyToNoonUtc(dataInicio);

    const task = await prisma.task.create({
      data: {
        projetoId,
        titulo,
        descricao: descricao || null,
        status: status || 'ToDo',
        prioridade: prioridade || 'Media',
        dataInicio: dataInicioParsed,
        // Prazo: se o usuário não informar, padrão 1 dia (calendário UTC).
        prazo: prazoParsed ?? defaultPrazoNoonUtc(),
        responsavel: primeiro,
        ...(responsaveisIds.length ? { responsaveisIds: responsaveisIds as unknown as Prisma.InputJsonValue } : {}),
        criadoPorId: authUser?.userId || null
      }
    });

    const criadorNome = (authUser?.name && String(authUser.name).trim()) || 'Usuário';

    // Notificação para cada responsável
    for (const uid of responsaveisIds) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid)) {
        try {
          const { notificarAtribuicaoKanbanOrdemServico } = await import('../services/notificacoes.service');
          await notificarAtribuicaoKanbanOrdemServico(uid, projetoId, task.id, titulo, false, criadorNome);
        } catch (err) {
          console.error('Erro ao criar notificação de tarefa:', err);
        }
      }
    }

    const data = { ...task, responsaveisIds: responsaveisIds.length ? responsaveisIds : (task.responsaveisIds as string[] | null) ?? [] };
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao criar task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar task', 
      error: error.message 
    });
  }
};

/**
 * PUT /api/projetos/:projetoId/tasks/:taskId
 * Atualiza uma task
 */
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId, taskId } = req.params;
    const { titulo, descricao, status, prioridade, prazo, dataInicio, responsavel, responsaveis } = req.body;
    const responsaveisIds = responsaveis !== undefined
      ? parseResponsaveisIds({ responsavel, responsaveis })
      : undefined;
    const primeiro = responsaveisIds?.length ? responsaveisIds[0] : undefined;

    // Verificar se a task existe e pertence ao projeto
    const taskExistente = await prisma.task.findFirst({
      where: { id: taskId, projetoId },
      include: { criadoPor: { select: { name: true } } }
    });

    if (!taskExistente) {
      res.status(404).json({ success: false, message: 'Task não encontrada' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (titulo) updateData.titulo = titulo;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (status) updateData.status = status;
    if (prioridade) updateData.prioridade = prioridade;
    if (prazo !== undefined) {
      const p = parseDateOnlyToNoonUtc(prazo);
      updateData.prazo = p ?? defaultPrazoNoonUtc();
    }
    if (dataInicio !== undefined) {
      updateData.dataInicio = dataInicio ? parseDateOnlyToNoonUtc(dataInicio) : null;
    }
    if (responsaveisIds !== undefined) {
      updateData.responsavel = responsaveisIds[0] || null;
      updateData.responsaveisIds = responsaveisIds.length
        ? (responsaveisIds as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    } else if (responsavel !== undefined) {
      updateData.responsavel = responsavel || null;
      updateData.responsaveisIds = responsavel
        ? ([responsavel] as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { criadoPor: { select: { id: true, name: true } } }
    });

    const criadorNome = task.criadoPor?.name || taskExistente.criadoPor?.name || 'Usuário';

    if (responsaveisIds?.length) {
      for (const uid of responsaveisIds) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid)) {
          try {
            const { notificarAtribuicaoKanbanOrdemServico } = await import('../services/notificacoes.service');
            await notificarAtribuicaoKanbanOrdemServico(uid, projetoId, taskId, task.titulo, false, criadorNome);
          } catch (err) {
            console.error('Erro ao criar notificação de tarefa:', err);
          }
        }
      }
    }

    const data = { ...task, responsaveisIds: Array.isArray(task.responsaveisIds) ? task.responsaveisIds : (task.responsavel ? [task.responsavel] : []) };
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao atualizar task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar task', 
      error: error.message 
    });
  }
};

/**
 * DELETE /api/projetos/:projetoId/tasks/:taskId
 * Exclui uma task
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId, taskId } = req.params;

    // Verificar se a task existe e pertence ao projeto
    const taskExistente = await prisma.task.findFirst({
      where: { 
        id: taskId,
        projetoId 
      }
    });

    if (!taskExistente) {
      res.status(404).json({ 
        success: false, 
        message: 'Task não encontrada' 
      });
      return;
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Task excluída com sucesso' 
    });
  } catch (error: any) {
    console.error('Erro ao excluir task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir task', 
      error: error.message 
    });
  }
};

