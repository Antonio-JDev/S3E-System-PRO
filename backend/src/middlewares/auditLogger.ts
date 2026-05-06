import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de auditoria DESATIVADO.
 * Motivo: funcionalidade de auditoria personalizada foi removida para evitar problemas de compatibilidade
 * com o schema do banco de dados em produção. Mantido como stub para evitar breaking changes nas importações.
 */
export const auditLogger = (_req: Request, _res: Response, next: NextFunction) => {
  // Intencionalmente não registra nada no banco.
  next();
};

