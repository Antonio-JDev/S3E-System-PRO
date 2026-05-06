import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
// Verificar rapidamente se a tabela/colunas audit_logs estão disponíveis para evitar queries falhando repetidamente.
let auditAvailable = false;
(async function checkAuditAvailability() {
  try {
    // Verificar se existem todas as colunas essenciais esperadas pelo Prisma model.
    // Evita casos onde a tabela existe mas falta mapeamento (ex: user_id ou user_name).
    const rows: any = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_logs'
    `);
    const found = Array.isArray(rows) ? rows.map((r: any) => String((r && typeof r === 'object' ? Object.values(r)[0] : r) ?? '').toLowerCase()) : [];
    const hasAction = found.includes('action');
    const hasCreated = found.some((c: string) => c === 'created_at' || c === 'createdat');
    const hasUser = found.some((c: string) => c === 'user_id' || c === 'userid') || found.some((c: string) => c === 'user_name' || c === 'username');
    if (hasAction && hasCreated && hasUser) {
      auditAvailable = true;
      console.log('🔎 audit_logs disponível - leitura de logs ativada.');
    } else {
      auditAvailable = false;
      console.log('🔎 audit_logs ausente ou incompatível - leitura desativada.');
    }
  } catch (err) {
    auditAvailable = false;
    console.warn('🔎 Falha ao verificar audit_logs (continuando com auditoria desativada):', err instanceof Error ? err.message : err);
  }
})();
// Opcional: desativar leitura de audit_logs via env (ex.: DISABLE_AUDIT_LOGS=true).
// Por padrão a leitura está ATIVADA quando a tabela audit_logs existe e tem as colunas esperadas.
const disableAuditLogs = String(process.env.DISABLE_AUDIT_LOGS || '').toLowerCase() === 'true';

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

      const { limit = 100, offset = 0, action, entity, userId } = req.query;

      // Construir filtros
      const where: any = {};
      if (action) where.action = String(action);
      if (entity) where.entity = String(entity);
      if (userId) where.userId = String(userId);

      // Consultar audit_logs quando a tabela estiver disponível e a leitura não estiver desativada por env.
      let logs: any[] = [];
      if (!auditAvailable || disableAuditLogs) {
        if (disableAuditLogs) {
          console.log('🔒 Leitura de audit_logs desabilitada por DISABLE_AUDIT_LOGS=true.');
        } else {
          console.warn('⚠️ audit_logs ausente ou incompatível: retornando lista vazia (auditAvailable=false)');
        }
        logs = [];
      } else {
        try {
          logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          });
        } catch (err: any) {
          // Se ocorrer erro de schema, marcar auditAvailable=false para não tentar novamente
          if (err?.code === 'P2022' || /does not exist/i.test(String(err?.message || ''))) {
            console.warn('⚠️ audit_logs schema incompatível detectado: desativando auditoria para evitar falhas repetidas.', err.message || err);
            auditAvailable = false;
            logs = [];
          } else {
            throw err;
          }
        }
      }

      // Estatísticas (users sempre; audit só quando disponível)
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { active: true } });
      let totalActions = 0;
      let errorActions = 0;
      let totalFiltered = logs.length;
      if (auditAvailable && !disableAuditLogs) {
        try {
          totalActions = await prisma.auditLog.count();
          errorActions = await prisma.auditLog.count({ where: { action: 'ERROR' } });
          totalFiltered = await prisma.auditLog.count({ where });
        } catch {
          totalFiltered = logs.length;
        }
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
            errorRate
          },
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: totalFiltered
          },
          auditAvailable: auditAvailable && !disableAuditLogs
        }
      });
    } catch (error: any) {
      console.error('Erro ao buscar logs:', error);
      // Resposta resiliente: 200 com dados vazios para não quebrar o frontend
      // Se erro de schema (ex: P2022), retornar resposta com auditAvailable=false
      if ((error as any)?.code === 'P2022' || /audit_logs/.test(String(error?.message || ''))) {
        res.status(200).json({
          success: true,
          data: {
            logs: [],
            stats: { totalUsers: 0, activeUsers: 0, totalActions: 0, errorRate: 0 },
            pagination: {
               limit: Number(req.query?.limit) || 100,
               offset: Number(req.query?.offset) || 0},
            total: 0,
            auditAvailable: false
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          logs: [],
          stats: { totalUsers: 0, activeUsers: 0, totalActions: 0, errorRate: 0 },
          pagination: { limit: Number(req.query?.limit) || 100, offset: Number(req.query?.offset) || 0, total: 0 },
          auditAvailable: false
        }
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
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Registrar via serviço de auditoria (stub em ambientes onde persistência está desativada)
      try {
        const evt = await AuditoriaService.registrarEvento({
          userId,
          userName,
          userRole,
          action,
          entity,
          entityId,
          description,
          metadata: metadata || undefined
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

      // Ações por tipo
      const actionsByType = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } }
      });

      // Ações por usuário
      const actionsByUser = await prisma.auditLog.groupBy({
        by: ['userId', 'userName'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      });

      // Ações por entidade
      const actionsByEntity = await prisma.auditLog.groupBy({
        by: ['entity'],
        _count: true,
        where: { entity: { not: null } },
        orderBy: { _count: { entity: 'desc' } }
      });

      // Atividade nos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentActivity = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo }
        },
        select: {
          createdAt: true,
          action: true
        }
      });

      res.json({
        success: true,
        data: {
          actionsByType,
          actionsByUser,
          actionsByEntity,
          recentActivity
        }
      });
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar analytics'
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

