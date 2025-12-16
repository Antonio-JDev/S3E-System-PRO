import { Router } from 'express';
import { getAuditLogs, createAuditLog, healthCheck, getAnalytics, exportNFeAudit } from '../controllers/logsController';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @route GET /api/logs/audit
 * @desc Listar logs de auditoria (apenas desenvolvedor)
 * @access Private (Desenvolvedor)
 */
router.get('/audit', authenticate, getAuditLogs);

/**
 * @route POST /api/logs/audit
 * @desc Criar log de auditoria
 * @access Private (Sistema interno)
 */
router.post('/audit', authenticate, createAuditLog);

/**
 * @route GET /api/logs/analytics
 * @desc Buscar analytics do sistema (apenas desenvolvedor)
 * @access Private (Desenvolvedor)
 */
router.get('/analytics', authenticate, getAnalytics);

/**
 * @route GET /api/logs/audit/nfe/export
 * @desc Exportar trilha de auditoria específica de NF-e (JSON ou CSV)
 * @access Private (Desenvolvedor)
 */
router.get('/audit/nfe/export', authenticate, exportNFeAudit);

/**
 * NOTA: O health check também está disponível em /api/health diretamente (configurado no app.ts)
 * Esta rota /api/logs/health é redundante mas útil para organização
 */

export default router;

