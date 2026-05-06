import { Request, Response } from 'express';
import * as notificacoesService from '../services/notificacoes.service';

/**
 * GET /api/notificacoes
 * Lista notificações do usuário logado
 */
export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const limit = parseInt(String(req.query.limit)) || 50;
    const data = await notificacoesService.listarPorUsuario(userId, limit);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/notificacoes/contagem
 * Retorna quantidade de notificações não lidas
 */
export async function contagemNaoLidas(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const total = await notificacoesService.contarNaoLidas(userId);
    res.status(200).json({ success: true, data: { total } });
  } catch (error: any) {
    console.error('Erro ao contar notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/notificacoes/:id/lida
 * Marca uma notificação como lida
 */
export async function marcarComoLida(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const updated = await notificacoesService.marcarComoLida(id, userId);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Notificação não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/notificacoes/marcar-todas-lidas
 * Marca todas as notificações do usuário como lidas
 */
export async function marcarTodasComoLidas(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    await notificacoesService.marcarTodasComoLidas(userId);
    res.status(200).json({ success: true, message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error: any) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/notificacoes/:id
 * Exclui uma notificação (apenas se pertencer ao usuário)
 */
export async function excluirUma(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const ok = await notificacoesService.excluirUma(id, userId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Notificação não encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Notificação excluída' });
  } catch (error: any) {
    console.error('Erro ao excluir notificação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/notificacoes/todas
 * Exclui todas as notificações do usuário logado (limpar container)
 */
export async function excluirTodas(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    await notificacoesService.excluirTodas(userId);
    res.status(200).json({ success: true, message: 'Notificações excluídas' });
  } catch (error: any) {
    console.error('Erro ao excluir notificações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/notificacoes
 * Cria notificação (uso interno ou quando outro módulo menciona usuário).
 * Body: { userId, tipo, titulo, mensagem, metadata?, enviarEmail? }
 * Apenas admin/gerente/desenvolvedor ou o próprio sistema (ex: após atribuição em Kanban).
 */
export async function criar(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = (req as any).user?.userId;
    const userRole = (req as any).user?.role?.toLowerCase();
    const allowedRoles = ['admin', 'administrador', 'gerente', 'desenvolvedor', 'financeiro_faturamento'];
    const isAllowed = currentUserId && allowedRoles.includes(userRole);

    const { userId, tipo, titulo, mensagem, metadata, enviarEmail } = req.body;
    if (!userId || !tipo || !titulo || !mensagem) {
      res.status(400).json({ success: false, error: 'userId, tipo, titulo e mensagem são obrigatórios' });
      return;
    }
    if (!isAllowed) {
      res.status(403).json({ success: false, error: 'Sem permissão para criar notificação para outros usuários' });
      return;
    }

    const notificacao = await notificacoesService.criarNotificacao({
      userId,
      tipo,
      titulo,
      mensagem,
      metadata,
      enviarEmail: enviarEmail !== false,
    });
    res.status(201).json({ success: true, data: notificacao });
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
