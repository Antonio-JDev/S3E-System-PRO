import { Request, Response } from 'express';
import tarefasInternasService from '../services/tarefasInternas.service';
import { StatusTarefaInterna } from '@prisma/client';

export class TarefasInternasController {
  static async getKanban(req: Request, res: Response): Promise<void> {
    try {
      const data = await tarefasInternasService.getKanban();
      res.json(data);
    } catch (error: any) {
      console.error('Erro ao listar kanban tarefas internas:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao listar kanban' });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await tarefasInternasService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao obter estatísticas' });
    }
  }

  static async getRelatorioUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.query as { start?: string; end?: string };
      const report = await (tarefasInternasService as any).getRelatorioUsuarios({ start, end });
      res.json({ success: true, ...report });
    } catch (error: any) {
      console.error('Erro ao gerar relatório de usuários (tarefas internas):', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao gerar relatório' });
    }
  }

  static async getRelatorioUsuarioDetalhes(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as { userId: string };
      const { start, end } = req.query as { start?: string; end?: string };
      const report = await (tarefasInternasService as any).getRelatorioUsuarioDetalhes(userId, { start, end });
      res.json({ success: true, data: report });
    } catch (error: any) {
      console.error('Erro ao gerar relatório detalhado (tarefas internas):', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao gerar relatório detalhado' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { titulo, motivo, descricao, prioridade, progresso, coluna, userId, userIds, prazo } = req.body;
      if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
        res.status(400).json({ success: false, message: 'Título é obrigatório' });
        return;
      }
      const task = await tarefasInternasService.create({
        titulo: titulo.trim(),
        motivo: motivo?.trim(),
        descricao: descricao?.trim(),
        prioridade,
        progresso,
        coluna,
        userId: userId || undefined,
        userIds: Array.isArray(userIds) ? userIds : undefined,
        prazo: prazo ? new Date(prazo) : undefined
      });
      res.status(201).json(task);
    } catch (error: any) {
      console.error('Erro ao criar tarefa interna:', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao criar tarefa' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { titulo, motivo, descricao, prioridade, progresso, coluna, userId, userIds, prazo } = req.body;
      const task = await tarefasInternasService.update(id, {
        titulo: titulo?.trim(),
        motivo: motivo !== undefined ? (motivo ?? null) : undefined,
        descricao: descricao !== undefined ? (descricao ?? null) : undefined,
        prioridade,
        progresso,
        coluna,
        userId: userId !== undefined ? (userId || null) : undefined,
        userIds: Array.isArray(userIds) ? userIds : undefined,
        prazo: prazo !== undefined ? (prazo ? new Date(prazo) : null) : undefined
      });
      if (!task) {
        res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
        return;
      }
      res.json(task);
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa interna:', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao atualizar tarefa' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await tarefasInternasService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao excluir tarefa interna:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao excluir tarefa' });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { coluna } = req.body;
      if (!coluna || !['BACKLOG', 'A_FAZER', 'ANDAMENTO', 'CONCLUIDO'].includes(coluna)) {
        res.status(400).json({ success: false, message: 'Coluna inválida' });
        return;
      }
      const task = await tarefasInternasService.updateStatus(id, coluna as StatusTarefaInterna);
      res.json(task);
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao atualizar status' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await tarefasInternasService.getById(id);
      if (!task) {
        res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
        return;
      }
      res.json(task);
    } catch (error: any) {
      console.error('Erro ao buscar tarefa interna:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao buscar tarefa' });
    }
  }

  static async createItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { titulo, descricao, dataInicio, dataPrevisaoFim, observacoes } = req.body;
      if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
        res.status(400).json({ success: false, message: 'Título da subtarefa é obrigatório' });
        return;
      }
      const item = await tarefasInternasService.createItem(id, {
        titulo: titulo.trim(),
        descricao: descricao?.trim(),
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataPrevisaoFim: dataPrevisaoFim ? new Date(dataPrevisaoFim) : undefined,
        observacoes: observacoes?.trim()
      });
      res.status(201).json(item);
    } catch (error: any) {
      console.error('Erro ao criar item tarefa interna:', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao criar subtarefa' });
    }
  }

  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;
      const { titulo, descricao, dataInicio, dataPrevisaoFim, observacoes, concluido } = req.body;
      const item = await tarefasInternasService.updateItem(id, itemId, {
        titulo: titulo?.trim(),
        descricao: descricao !== undefined ? (descricao ?? null) : undefined,
        dataInicio: dataInicio !== undefined ? (dataInicio ? new Date(dataInicio) : null) : undefined,
        dataPrevisaoFim: dataPrevisaoFim !== undefined ? (dataPrevisaoFim ? new Date(dataPrevisaoFim) : null) : undefined,
        observacoes: observacoes !== undefined ? (observacoes ?? null) : undefined,
        concluido
      });
      res.json(item);
    } catch (error: any) {
      console.error('Erro ao atualizar item tarefa interna:', error);
      res.status(400).json({ success: false, message: error.message || 'Erro ao atualizar subtarefa' });
    }
  }

  static async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;
      await tarefasInternasService.deleteItem(id, itemId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao excluir item tarefa interna:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao excluir subtarefa' });
    }
  }
}
