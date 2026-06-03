import { Request, Response, NextFunction } from 'express';
import { AuditoriaService } from '../services/auditoria.service';
import {
  buildAuditDescription,
  buildNetworkContext,
  getAuditUserFromRequest,
  httpMethodToAction,
  parseApiResource,
  resolveClientIp,
  sanitizeBodyForAudit,
  shouldAuditHttpRequest,
} from '../utils/requestAuditContext.util';

/**
 * Registra mutações da API (POST/PUT/PATCH/DELETE) e respostas com erro (HTTP ≥ 400)
 * em `audit_logs`, com IP, cadeia de proxy e contexto de rede para segurança e debug.
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  res.on('finish', () => {
    try {
      if (!shouldAuditHttpRequest(req, res.statusCode)) return;

      const network = buildNetworkContext(req);
      const { entity, entityId } = parseApiResource(req.path || req.url || '');
      const action = httpMethodToAction(req.method, res.statusCode);
      const user = getAuditUserFromRequest(req);
      const description = buildAuditDescription(req, res.statusCode, action, entity, entityId);

      const body =
        req.method !== 'GET' && req.body && typeof req.body === 'object'
          ? sanitizeBodyForAudit(req.body)
          : undefined;

      void AuditoriaService.registrarEvento({
        ...user,
        action,
        entity,
        entityId,
        description,
        ipAddress: network.clientIp,
        userAgent: network.userAgent,
        metadata: {
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          network,
          query: Object.keys(req.query || {}).length ? req.query : undefined,
          body: body && Object.keys(body as object).length ? body : undefined,
          params: Object.keys(req.params || {}).length ? req.params : undefined,
        },
      });
    } catch (err) {
      console.warn('auditLogger: falha ao registrar evento:', err instanceof Error ? err.message : err);
    }
  });

  next();
};

/** Registra exceções não tratadas (middleware de erro global). */
export function auditUnhandledError(req: Request, err: Error): void {
  const network = buildNetworkContext(req);
  const { entity, entityId } = parseApiResource(req.path || req.url || '');
  const user = getAuditUserFromRequest(req);

  void AuditoriaService.registrarEvento({
    ...user,
    action: 'ERROR',
    entity,
    entityId,
    description: `Exceção não tratada: ${req.method} ${req.originalUrl || req.path} — ${err.message}`,
    ipAddress: network.clientIp,
    userAgent: network.userAgent,
    metadata: {
      method: req.method,
      path: req.originalUrl || req.path,
      network,
      errorMessage: err.message,
      errorName: err.name,
      stack: process.env.NODE_ENV === 'production' ? err.stack?.split('\n').slice(0, 8) : err.stack,
    },
  });
}

export { resolveClientIp, buildNetworkContext };
