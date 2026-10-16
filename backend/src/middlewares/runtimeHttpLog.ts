import { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from './auth';
import { pathSemQuery, recordHttpExchange, userIdSeguro } from '../utils/runtimeLogBuffer';

/**
 * Alimenta o buffer em memória no `finish` da resposta.
 * Não lê Authorization, cookie nem query string. Não grava corpo (webhook inclusive).
 * `/api/health` e `/api/mcp` são ignorados para não lotar o buffer.
 */
export function runtimeHttpLog(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();

  res.on('finish', () => {
    try {
      const user = (req as AuthRequest).user;
      recordHttpExchange({
        method: req.method,
        path: pathSemQuery(req.originalUrl || req.path || ''),
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
        userId: userIdSeguro(user?.userId),
      });
    } catch {
      /* buffer não pode derrubar a resposta */
    }
  });

  next();
}
