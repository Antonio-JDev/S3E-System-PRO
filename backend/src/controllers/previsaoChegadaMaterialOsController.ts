import { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import {
  definirPrevisoesChegada,
  listarPrevisoesChegada,
  removerPrevisoesChegada,
} from '../services/previsaoChegadaMaterialOs.service';

function statusDoErro(message: string): number {
  if (message.includes('não encontrado')) return 404;
  if (message.includes('inválid') || message.includes('Selecione') || message.includes('Máximo')) return 400;
  return 500;
}

/**
 * GET /api/projetos/:id/previsoes-chegada
 */
export const getPrevisoesChegada = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await listarPrevisoesChegada(req.params.id);
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao listar previsões de chegada';
    res.status(statusDoErro(message)).json({ success: false, error: message });
  }
};

/**
 * PUT /api/projetos/:id/previsoes-chegada
 * body: { itens: [{ itemKey, descricao?, materialId? }], dataChegada: 'YYYY-MM-DD', tipoReferencia?, referencia? }
 */
export const putPrevisoesChegada = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = (req as AuthRequest).user;
    const data = await definirPrevisoesChegada(req.params.id, req.body, {
      id: authUser?.userId,
      nome: authUser?.name,
    });
    res.json({ success: true, data, message: 'Data de chegada definida' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao definir data de chegada';
    res.status(statusDoErro(message)).json({ success: false, error: message });
  }
};

/**
 * POST /api/projetos/:id/previsoes-chegada/remover
 * body: { itemKeys: string[] }
 */
export const removerPrevisoesChegadaHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await removerPrevisoesChegada(req.params.id, req.body?.itemKeys);
    res.json({ success: true, data, message: 'Previsão de chegada removida' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao remover previsão de chegada';
    res.status(statusDoErro(message)).json({ success: false, error: message });
  }
};
