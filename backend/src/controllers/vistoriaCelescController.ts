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
 * GET /api/projetos/vistorias-celesc/itens-checklist
 */
export async function listarItensChecklistVistoria(_req: Request, res: Response): Promise<void> {
  try {
    const data = vistoriaCelescService.listarItensChecklistVistoria();
    res.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Erro ao listar checklist vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao listar checklist';
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
    const { dataReprovacao, motivos, itensReprovados, itensAvaliacao } = req.body ?? {};
    if (!dataReprovacao) {
      res.status(400).json({ success: false, error: 'dataReprovacao é obrigatória' });
      return;
    }
    const authUser = (req as AuthRequest).user;
    const data = await vistoriaCelescService.reprovar(id, {
      dataReprovacao,
      motivos,
      itensReprovados,
      itensAvaliacao,
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
 * GET /api/projetos/:id/reprovacoes-vistoria/:reprovacaoId
 */
export async function obterReprovacaoVistoria(req: Request, res: Response): Promise<void> {
  try {
    const { id, reprovacaoId } = req.params;
    if (!id || !reprovacaoId) {
      res.status(400).json({ success: false, error: 'id e reprovacaoId são obrigatórios' });
      return;
    }
    const data = await vistoriaCelescService.obterReprovacao(id, reprovacaoId);
    res.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Erro ao obter reprovação vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao obter reprovação';
    const status = message.includes('não encontrada') ? 404 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

/**
 * PATCH /api/projetos/:id/reprovacoes-vistoria/:reprovacaoId
 */
export async function atualizarReprovacaoVistoria(req: Request, res: Response): Promise<void> {
  try {
    const { id, reprovacaoId } = req.params;
    if (!id || !reprovacaoId) {
      res.status(400).json({ success: false, error: 'id e reprovacaoId são obrigatórios' });
      return;
    }
    const { dataReprovacao, motivos, itensAvaliacao } = req.body ?? {};
    if (itensAvaliacao == null) {
      res.status(400).json({ success: false, error: 'itensAvaliacao é obrigatório' });
      return;
    }
    const data = await vistoriaCelescService.atualizarReprovacao(id, reprovacaoId, {
      dataReprovacao,
      motivos,
      itensAvaliacao,
    });
    res.json({ success: true, data, message: 'Reprovação atualizada' });
  } catch (error: unknown) {
    console.error('Erro ao atualizar reprovação vistoria:', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar reprovação';
    const status = message.includes('não encontrada') ? 404 : 400;
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
