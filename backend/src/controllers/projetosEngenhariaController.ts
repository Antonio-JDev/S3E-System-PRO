import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as projetosEngenhariaService from '../services/projetosEngenharia.service';
import { isPrivilegedRole } from './engenhariaDocumentosReferenciaController';

function getUserId(req: Request): string | null {
  const auth = req as AuthRequest;
  return auth.user?.userId ?? (auth.user as any)?.id ?? null;
}

export async function listarEngenharia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    const verTodos = isPrivilegedRole(req) && req.query.todos === 'true';
    const data = await projetosEngenhariaService.listarProjetosEngenharia(userId, verTodos);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao listar projetos de engenharia:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao listar projetos de engenharia' });
  }
}

export async function listarResumoTarefasEngenharia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    const verTodos = isPrivilegedRole(req) && req.query.todos === 'true';
    const data = await projetosEngenhariaService.listarResumoTarefasKanbanUsuario(userId, verTodos);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao listar resumo de tarefas:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao listar tarefas' });
  }
}

export async function patchEngenharia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const {
      nomeProjeto,
      tiposProjeto,
      statusEngenharia,
      statusCelesc,
      comentarioEngenharia,
      prioridade,
      responsavelEngenhariaId,
    } = req.body;

    if (!isPrivilegedRole(req) && userId) {
      const atual = await projetosEngenhariaService.getEngenhariaByProjetoId(id);
      if (atual && atual.engenharia?.responsavelEngenhariaId !== userId) {
        res.status(403).json({ success: false, error: 'Sem permissão para editar este projeto' });
        return;
      }
    }

    const data = await projetosEngenhariaService.upsertMetadadosEngenharia(id, {
      nomeProjeto,
      tiposProjeto: Array.isArray(tiposProjeto) ? tiposProjeto : undefined,
      statusEngenharia,
      statusCelesc: Array.isArray(statusCelesc) ? statusCelesc : undefined,
      comentarioEngenharia,
      prioridade,
      responsavelEngenhariaId,
    });

    if (!data) {
      res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao atualizar metadados de engenharia:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao atualizar metadados' });
  }
}

export async function getInfoAtribuicaoEngenharia(req: Request, res: Response): Promise<void> {
  try {
    const raw = String(req.query.ids || '').trim();
    const projetoIds = raw
      ? raw.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    const data = await projetosEngenhariaService.getInfoAtribuicaoOsBatch(projetoIds);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao obter info de atribuição engenharia:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao obter informações' });
  }
}

export async function atribuirEngenharia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { responsavelEngenhariaId } = req.body;

    const data = await projetosEngenhariaService.atribuirSetorEngenharia(
      id,
      responsavelEngenhariaId,
      userId,
    );

    if (!data) {
      res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      return;
    }

    res.json({ success: true, data, message: 'OS atribuída ao setor de engenharia' });
  } catch (error: any) {
    console.error('Erro ao atribuir OS à engenharia:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao atribuir à engenharia' });
  }
}
