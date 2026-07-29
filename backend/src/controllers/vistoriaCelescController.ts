import { Request, Response } from 'express';
import * as vistoriaCelescService from '../services/vistoriaCelesc.service';

type AuthRequest = Request & { user?: { userId?: string; name?: string } };

/**
 * GET /api/projetos/vistorias-celesc
 */
export async function listarVistoriasCelesc(_req: Request, res: Response): Promise<void> {
  try {
    const data = await vistoriaCelescService.listarFila();
    res.json({ success: true, data, total: data.length });
  } catch (error: unknown) {
    console.error('Erro ao listar vistorias CELESC:', error);
    const message = error instanceof Error ? error.message : 'Erro ao listar vistorias CELESC';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * PATCH /api/projetos/:id/protocolar-vistoria
 */
export async function protocolarVistoria(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'id é obrigatório' });
      return;
    }
    const data = await vistoriaCelescService.protocolar(id);
    res.json({ success: true, data, message: 'Protocolo de vistoria confirmado' });
  } catch (error: unknown) {
    console.error('Erro ao protocolar vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao protocolar vistoria';
    const status = message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

/**
 * POST /api/projetos/:id/reprovar-vistoria
 */
export async function reprovarVistoria(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'id é obrigatório' });
      return;
    }
    const { dataReprovacao, motivos, itensReprovados } = req.body ?? {};
    if (!dataReprovacao) {
      res.status(400).json({ success: false, error: 'dataReprovacao é obrigatória' });
      return;
    }
    const authUser = (req as AuthRequest).user;
    const data = await vistoriaCelescService.reprovar(id, {
      dataReprovacao,
      motivos,
      itensReprovados,
      criadoPorId: authUser?.userId ?? null,
    });
    res.json({ success: true, data, message: 'Reprovação registrada' });
  } catch (error: unknown) {
    console.error('Erro ao reprovar vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao reprovar vistoria';
    const status = message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

/**
 * PATCH /api/projetos/:id/aprovar-vistoria
 */
export async function aprovarVistoria(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'id é obrigatório' });
      return;
    }
    const data = await vistoriaCelescService.aprovar(id);
    res.json({ success: true, data, message: 'Vistoria CELESC aprovada' });
  } catch (error: unknown) {
    console.error('Erro ao aprovar vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao aprovar vistoria';
    const status = message.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ success: false, error: message });
  }
}
