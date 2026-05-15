import { Request, Response } from 'express';
import * as labelsService from '../services/whatsappChatLabels.service';

function getUserId(req: Request): string | null {
  const u = (req as unknown as { user?: { userId?: string } }).user;
  return u?.userId || null;
}

/** GET /api/whatsapp/chat-labels — lista as etiquetas do operador. */
export async function listChatLabelsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const data = await labelsService.listLabelsForUser(userId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[chat-labels] list error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao listar listas' });
  }
}

/** POST /api/whatsapp/chat-labels — cria uma nova lista. */
export async function createChatLabelController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { nome, cor, emoji, ordem, chatIds } = req.body || {};
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      res.status(400).json({ success: false, error: 'Informe o nome da lista.' });
      return;
    }
    const data = await labelsService.createLabel({
      userId,
      nome,
      cor: typeof cor === 'string' ? cor : null,
      emoji: typeof emoji === 'string' ? emoji : null,
      ordem: typeof ordem === 'number' ? ordem : undefined,
      chatIds: Array.isArray(chatIds) ? chatIds.filter((x) => typeof x === 'string') : []
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Você já tem uma lista com esse nome.' });
      return;
    }
    console.error('[chat-labels] create error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao criar lista' });
  }
}

/** PATCH /api/whatsapp/chat-labels/:id — renomeia, recolore, reordena. */
export async function updateChatLabelController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { nome, cor, emoji, ordem } = req.body || {};
    const data = await labelsService.updateLabel(id, userId, {
      nome,
      cor,
      emoji,
      ordem: typeof ordem === 'number' ? ordem : undefined
    });
    if (!data) {
      res.status(404).json({ success: false, error: 'Lista não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Já existe outra lista com esse nome.' });
      return;
    }
    console.error('[chat-labels] update error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao atualizar lista' });
  }
}

/** DELETE /api/whatsapp/chat-labels/:id — remove a lista (e suas memberships via cascade). */
export async function deleteChatLabelController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const ok = await labelsService.deleteLabel(id, userId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Lista não encontrada' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[chat-labels] delete error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao remover lista' });
  }
}

/** PUT /api/whatsapp/chat-labels/:id/chats — substitui completamente o conjunto. */
export async function putChatLabelChatsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { chatIds } = req.body || {};
    if (!Array.isArray(chatIds)) {
      res.status(400).json({ success: false, error: 'Informe um array `chatIds`.' });
      return;
    }
    const data = await labelsService.setLabelChats(id, userId, chatIds.filter((x) => typeof x === 'string'));
    if (!data) {
      res.status(404).json({ success: false, error: 'Lista não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[chat-labels] set chats error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao salvar conversas da lista' });
  }
}

/** POST /api/whatsapp/chat-labels/:id/chats — adiciona chats sem remover. */
export async function postChatLabelChatsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { chatIds } = req.body || {};
    if (!Array.isArray(chatIds)) {
      res.status(400).json({ success: false, error: 'Informe um array `chatIds`.' });
      return;
    }
    const data = await labelsService.addChatsToLabel(id, userId, chatIds.filter((x) => typeof x === 'string'));
    if (!data) {
      res.status(404).json({ success: false, error: 'Lista não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[chat-labels] add chats error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao adicionar conversas' });
  }
}

/** DELETE /api/whatsapp/chat-labels/:id/chats — remove chats (lista enviada em body.chatIds). */
export async function deleteChatLabelChatsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }
    const { id } = req.params;
    const { chatIds } = req.body || {};
    if (!Array.isArray(chatIds)) {
      res.status(400).json({ success: false, error: 'Informe um array `chatIds`.' });
      return;
    }
    const data = await labelsService.removeChatsFromLabel(id, userId, chatIds.filter((x) => typeof x === 'string'));
    if (!data) {
      res.status(404).json({ success: false, error: 'Lista não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[chat-labels] remove chats error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao remover conversas' });
  }
}
