import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
import {
  countAuditLogsResilient,
  isAuditLogsReadable,
  listAuditLogsResilient,
} from '../utils/auditLogsSchema.util';

const disableAuditLogs = String(process.env.DISABLE_AUDIT_LOGS || '').toLowerCase() === 'true';

(async function checkAuditAvailability() {
  try {
    const ok = await isAuditLogsReadable();
    console.log(ok ? '🔎 audit_logs disponível - leitura de logs ativada.' : '🔎 audit_logs ausente ou incompleta.');
  } catch (err) {
    console.warn('🔎 Falha ao verificar audit_logs:', err instanceof Error ? err.message : err);
  }
})();

export class LogsController {
  /**
   * Listar logs de auditoria
   * GET /api/logs/audit
   * Acesso: Apenas Desenvolvedor
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Verificar permissão: desenvolvedor, admin, gerente ou financeiro_faturamento
      const allowed = ['desenvolvedor', 'admin', 'gerente', 'financeiro_faturamento'];
      if (!userRole || !allowed.includes(userRole.toLowerCase())) {
        res.status(403).json({
          success: false,
          error: '🚫 Acesso negado. Permissões insuficientes.'
        });
        return;
      }

      const limitNum = Math.min(Number(req.query.limit) || 500, 2000);
      const offsetNum = Number(req.query.offset) || 0;
      const action = req.query.action ? String(req.query.action) : undefined;
      const entity = req.query.entity ? String(req.query.entity) : undefined;
      const userId = req.query.userId ? String(req.query.userId) : undefined;

      const filters = { action, entity, userId };
      const auditReadable = !disableAuditLogs && (await isAuditLogsReadable());

      let logs: any[] = [];
      if (auditReadable) {
        logs = await listAuditLogsResilient({
          limit: limitNum,
          offset: offsetNum,
          ...filters,
        });
      } else if (disableAuditLogs) {
        console.log('🔒 Leitura de audit_logs desabilitada por DISABLE_AUDIT_LOGS=true.');
      }

      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { active: true } });

      let totalActions = 0;
      let errorActions = 0;
      let totalFiltered = logs.length;
      if (auditReadable) {
        totalActions = await countAuditLogsResilient();
        errorActions = await countAuditLogsResilient({ action: 'ERROR' });
        totalFiltered = await countAuditLogsResilient(filters);
      }

      const errorRate = totalActions > 0 ? (errorActions / totalActions) * 100 : 0;

      res.json({
        success: true,
        data: {
          logs,
          stats: {
            totalUsers,
            activeUsers,
            totalActions,
            errorRate,
          },
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: totalFiltered,
          },
          auditAvailable: auditReadable,
        },
      });
    } catch (error: any) {
      console.error('Erro ao buscar logs:', error);
      let totalUsers = 0;
      let activeUsers = 0;
      try {
        totalUsers = await prisma.user.count();
        activeUsers = await prisma.user.count({ where: { active: true } });
      } catch {
        /* ignore */
      }
      const limitNum = Math.min(Number(req.query?.limit) || 500, 2000);
      const offsetNum = Number(req.query.offset) || 0;
      res.status(200).json({
        success: true,
        data: {
          logs: [],
          stats: { totalUsers, activeUsers, totalActions: 0, errorRate: 0 },
          pagination: { limit: limitNum, offset: offsetNum, total: 0 },
          auditAvailable: false,
        },
      });
    }
  }

  /**
   * Criar log de auditoria
   * POST /api/logs/audit
   * Uso interno pelo sistema
   */
  async createAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { action, entity, entityId, description, metadata } = req.body;
      const userId = (req as any).user?.userId;
      const userName = (req as any).user?.name;
      const userRole = (req as any).user?.role;
      const { buildNetworkContext } = await import('../utils/requestAuditContext.util');
      const network = buildNetworkContext(req);

      try {
        const evt = await AuditoriaService.registrarEvento({
          userId,
          userName,
          userRole,
          action,
          entity,
          entityId,
          description,
          ipAddress: network.clientIp,
          userAgent: network.userAgent,
          metadata: { ...(metadata || {}), network },
        });
        res.json({
          success: true,
          data: evt
        });
      } catch (err) {
        console.error('Erro ao registrar audit log (stub):', err);
        res.status(500).json({ success: false, error: 'Erro ao criar log' });
      }
    } catch (error) {
      console.error('Erro ao criar log:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar log'
      });
    }
  }

  /**
   * Health check do sistema
   * GET /api/health
   * Acesso: Público (para monitoramento)
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Testar conexão com o banco
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        success: true,
        data: {
          status: 'online',
          timestamp: new Date().toISOString(),
          database: 'connected',
          uptime: process.uptime()
        }
      });
    } catch (error) {
      console.error('Health check falhou:', error);
      res.status(503).json({
        success: false,
        error: 'Serviço indisponível',
        data: {
          status: 'offline',
          timestamp: new Date().toISOString(),
          database: 'disconnected'
        }
      });
    }
  }

  /**
   * Analytics do sistema
   * GET /api/logs/analytics
   * Acesso: Apenas Desenvolvedor
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      if (userRole?.toLowerCase() !== 'desenvolvedor') {
        res.status(403).json({
          success: false,
          error: '🚫 Acesso negado.'
        });
        return;
      }

      const allLogs = disableAuditLogs || !(await isAuditLogsReadable())
        ? []
        : await listAuditLogsResilient({ limit: 5000, offset: 0 });

      const actionCounts = new Map<string, number>();
      const userCounts = new Map<string, { userId: string | null; userName: string | null; count: number }>();
      const entityCounts = new Map<string, number>();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity: { createdAt: Date; action: string }[] = [];

      for (const log of allLogs) {
        actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
        const uKey = log.userId || log.userName || 'anon';
        const prev = userCounts.get(uKey) ?? {
          userId: log.userId,
          userName: log.userName,
          count: 0,
        };
        prev.count += 1;
        userCounts.set(uKey, prev);
        if (log.entity) {
          entityCounts.set(log.entity, (entityCounts.get(log.entity) ?? 0) + 1);
        }
        const created = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
        if (created >= sevenDaysAgo) {
          recentActivity.push({ createdAt: created, action: log.action });
        }
      }

      const actionsByType = [...actionCounts.entries()]
        .map(([action, count]) => ({ action, _count: count }))
        .sort((a, b) => b._count - a._count);

      const actionsByUser = [...userCounts.values()]
        .map((u) => ({
          userId: u.userId,
          userName: u.userName,
          _count: u.count,
        }))
        .sort((a, b) => b._count - a._count)
        .slice(0, 10);

      const actionsByEntity = [...entityCounts.entries()]
        .map(([entity, count]) => ({ entity, _count: count }))
        .sort((a, b) => b._count - a._count);

      res.json({
        success: true,
        data: {
          actionsByType,
          actionsByUser,
          actionsByEntity,
          recentActivity,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      res.status(200).json({
        success: true,
        data: {
          actionsByType: [],
          actionsByUser: [],
          actionsByEntity: [],
          recentActivity: [],
        },
      });
    }
  }

  /**
   * Exportar trilha de auditoria específica de NF-e (cadeia imutável)
   * GET /api/logs/audit/nfe/export
   * Acesso: Apenas Desenvolvedor
   *
   * Query params:
   * - from (ISO)   -> data inicial
   * - to   (ISO)   -> data final
   * - chainId      -> opcional (chave de acesso / notaFiscalId / pedidoId)
   * - format       -> 'json' (padrão) ou 'csv'
   */
  async exportNFeAudit(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      if (userRole?.toLowerCase() !== 'desenvolvedor') {
        res.status(403).json({
          success: false,
          error: '🚫 Acesso negado. Esta funcionalidade é restrita a desenvolvedores.'
        });
        return;
      }

      const { from, to, chainId, format = 'json' } = req.query as {
        from?: string;
        to?: string;
        chainId?: string;
        format?: string;
      };

      const where: any = {
        entity: 'NFe'
      };

      if (from || to) {
        where.createdAt = {};
        if (from) {
          where.createdAt.gte = new Date(from);
        }
        if (to) {
          where.createdAt.lte = new Date(to);
        }
      }

      if (chainId) {
        where.chainId = chainId;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: [
          { chainId: 'asc' } as any,
          { sequence: 'asc' } as any,
          { createdAt: 'asc' }
        ]
      });

      if ((format || '').toLowerCase() === 'csv') {
        // Exportar como CSV simples
        const header = [
          'id',
          'createdAt',
          'action',
          'entity',
          'entityId',
          'description',
          'userName',
          'userRole',
          'hash',
          'previousHash',
          'chainId',
          'sequence',
          'metadata'
        ];

        const rows = logs.map((log) => {
          return [
            log.id,
            log.createdAt.toISOString(),
            log.action,
            log.entity || '',
            log.entityId || '',
            (log.description || '').replace(/\r?\n/g, ' '),
            log.userName || '',
            log.userRole || '',
            (log as any).hash || '',
            (log as any).previousHash || '',
            (log as any).chainId || '',
            (log as any).sequence != null ? String((log as any).sequence) : '',
            log.metadata ? JSON.stringify(log.metadata) : ''
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(',');
        });

        const csv = [header.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="nfe_audit_${new Date().toISOString()}.csv"`
        );
        res.send(csv);
        return;
      }

      // Resposta padrão em JSON
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Erro ao exportar auditoria de NF-e:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao exportar auditoria de NF-e'
      });
    }
  }
}

export const logsController = new LogsController();
export const getAuditLogs = logsController.getAuditLogs.bind(logsController);
export const createAuditLog = logsController.createAuditLog.bind(logsController);
export const healthCheck = logsController.healthCheck.bind(logsController);
export const getAnalytics = logsController.getAnalytics.bind(logsController);
export const exportNFeAudit = logsController.exportNFeAudit.bind(logsController);

