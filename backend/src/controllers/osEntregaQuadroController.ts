import { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import {
  obterEntregaQuadroProjeto,
  salvarEntregaQuadroProjeto,
} from '../services/osEntregaQuadro.service';
import { gerarPdfRomaneioQuadro } from '../services/pdfRomaneioQuadro.service';

/**
 * GET /api/projetos/:id/entrega-quadro
 */
export const getEntregaQuadro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await obterEntregaQuadroProjeto(id);
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao obter entrega';
    const status = message.includes('não encontrado') ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
};

/**
 * PUT /api/projetos/:id/entrega-quadro
 */
export const putEntregaQuadro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const entrega = await salvarEntregaQuadroProjeto(id, req.body?.entrega ?? req.body);
    const data = await obterEntregaQuadroProjeto(id);
    res.json({
      success: true,
      data: { ...data, entrega },
      message: 'Dados de entrega salvos',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar entrega';
    let status = 500;
    if (message.includes('não encontrado')) status = 404;
    else if (
      message.includes('só se aplica') ||
      message.includes('inválidos')
    ) {
      status = 400;
    }
    res.status(status).json({ success: false, error: message });
  }
};

/**
 * GET /api/projetos/:id/romaneio.pdf
 * PDF do romaneio (pdfmake + folha timbrada do usuário).
 */
export const getRomaneioPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const { buffer, filename } = await gerarPdfRomaneioQuadro(id, userId);
    const encoded = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar romaneio';
    let status = 500;
    if (message.includes('não encontrado')) status = 404;
    else if (message.includes('só se aplica')) status = 400;
    res.status(status).json({ success: false, error: message });
  }
};
