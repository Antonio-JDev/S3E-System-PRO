import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class HistoricoController {
  static async listarHistorico(req: Request, res: Response): Promise<void> {
    try {
      const { 
        module, 
        userId, 
        dataInicio, 
        dataFim, 
        page = '1', 
        limit = '50' 
      } = req.query;

      const where: any = {};
      
      if (module) where.module = module;
      if (userId) where.userId = userId;
      
      if (dataInicio || dataFim) {
        where.timestamp = {};
        if (dataInicio) where.timestamp.gte = new Date(dataInicio as string);
        if (dataFim) where.timestamp.lte = new Date(dataFim as string);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [historico, total] = await Promise.all([
        prisma.historyLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.historyLog.count({ where })
      ]);

      res.status(200).json({ 
        success: true, 
        data: {
          historico,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error: any) {
      console.error('Erro ao listar histórico:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar histórico', error: error.message });
    }
  }

  static async listarHistoricoPorModulo(req: Request, res: Response): Promise<void> {
    try {
      const { modulo } = req.params;
      const { userId, dataInicio, dataFim, page = '1', limit = '50' } = req.query;

      const where: any = { module: modulo };
      
      if (userId) where.userId = userId;
      
      if (dataInicio || dataFim) {
        where.timestamp = {};
        if (dataInicio) where.timestamp.gte = new Date(dataInicio as string);
        if (dataFim) where.timestamp.lte = new Date(dataFim as string);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [historico, total] = await Promise.all([
        prisma.historyLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.historyLog.count({ where })
      ]);

      res.status(200).json({ 
        success: true, 
        data: {
          historico,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error: any) {
      console.error('Erro ao listar histórico por módulo:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar histórico por módulo', error: error.message });
    }
  }

  static async criarHistoryLog(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userName, action, module, entityId, details, ip } = req.body;

      // Validação básica
      if (!userId || !userName || !action || !module) {
        res.status(400).json({ 
          success: false, 
          message: 'userId, userName, action e module são obrigatórios' 
        });
        return;
      }

      const historyLog = await prisma.historyLog.create({
        data: {
          userId,
          userName,
          action,
          module,
          entityId,
          details,
          ip
        }
      });

      res.status(201).json({ success: true, data: historyLog });
    } catch (error: any) {
      console.error('Erro ao criar log de histórico:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar log de histórico', error: error.message });
    }
  }

  // Método utilitário para criar log automaticamente
  static async logAction(
    userId: string,
    userName: string,
    action: string,
    module: string,
    entityId?: string,
    details?: any,
    ip?: string
  ) {
    try {
      await prisma.historyLog.create({
        data: {
          userId,
          userName,
          action,
          module,
          entityId,
          details: details ? JSON.stringify(details) : null,
          ip
        }
      });
    } catch (error) {
      console.error('Erro ao criar log automático:', error);
      // Não falhar a operação principal por causa do log
    }
  }
}
