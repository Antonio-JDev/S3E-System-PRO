import { Request, Response } from 'express';
import { importarPresencaXls } from '../services/ponto.service';

function parseOptionalInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export class PontoController {
  /**
   * POST /api/ponto/importar-presenca
   * multipart: file (xls), opcional: ano, mes (form fields ou query)
   */
  static async importarPresenca(req: Request, res: Response): Promise<void> {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file?.buffer?.length) {
        res.status(400).json({
          success: false,
          message: 'Envie o arquivo no campo "file" (multipart/form-data).',
        });
        return;
      }

      const ano =
        parseOptionalInt(req.query.ano) ??
        parseOptionalInt(req.body?.ano);
      const mes =
        parseOptionalInt(req.query.mes) ??
        parseOptionalInt(req.body?.mes);

      const data = await importarPresencaXls(file.buffer, {
        ano,
        mes,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Erro ao importar presença:', error);
      res.status(400).json({
        success: false,
        message: error?.message ?? 'Erro ao processar arquivo de ponto',
      });
    }
  }
}
