import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Função auxiliar para buscar membros da equipe (usuários pelos IDs)
async function buscarMembrosEquipe(membrosIds: string[]) {
  if (!membrosIds || membrosIds.length === 0) {
    return [];
  }
  
  const usuarios = await prisma.user.findMany({
    where: {
      id: { in: membrosIds }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  
  return usuarios.map(u => ({
    id: u.id,
    nome: u.name,
    email: u.email,
    funcao: u.role || 'Eletricista'
  }));
}

export class AlocacoesController {
  /**
   * Criar nova alocação de equipe para uma tarefa
   */
  async criar(req: Request, res: Response) {
    try {
      const { tarefaId, obraId, equipeId, dataInicio, dataFim, observacoes } = req.body;

      // Validações
      if (!tarefaId || !obraId || !equipeId || !dataInicio || !dataFim) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: tarefaId, obraId, equipeId, dataInicio, dataFim'
        });
      }

      // Verificar se a equipe existe
      const equipe = await prisma.equipe.findUnique({
        where: { id: equipeId }
      });

      if (!equipe) {
        return res.status(404).json({
          success: false,
          error: 'Equipe não encontrada'
        });
      }

      // Buscar membros da equipe
      const membros = await buscarMembrosEquipe(equipe.membros);

      // Criar alocação
      const alocacao = await prisma.alocacaoEquipe.create({
        data: {
          tarefaId,
          obraId,
          equipeId,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          status: 'PLANEJADA',
          observacoes: observacoes || null
        },
        include: {
          equipe: true
        }
      });

      // Formatar resposta
      const response = {
        id: alocacao.id,
        tarefaId: alocacao.tarefaId,
        obraId: alocacao.obraId,
        equipeId: alocacao.equipeId,
        equipeNome: equipe.nome,
        membros: membros,
        dataInicio: alocacao.dataInicio,
        dataFim: alocacao.dataFim,
        status: alocacao.status,
        observacoes: alocacao.observacoes,
        createdAt: alocacao.createdAt,
        updatedAt: alocacao.updatedAt
      };

      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Erro ao criar alocação:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao criar alocação'
      });
    }
  }

  /**
   * Buscar alocações por período
   */
  async buscarPorPeriodo(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim, equipeId, obraId } = req.query;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          success: false,
          error: 'dataInicio e dataFim são obrigatórios'
        });
      }

      const where: any = {
        AND: [
          { dataInicio: { lte: new Date(dataFim as string) } },
          { dataFim: { gte: new Date(dataInicio as string) } }
        ]
      };

      if (equipeId) {
        where.equipeId = equipeId as string;
      }

      if (obraId) {
        where.obraId = obraId as string;
      }

      const alocacoes = await prisma.alocacaoEquipe.findMany({
        where,
        include: {
          equipe: true
        },
        orderBy: { dataInicio: 'asc' }
      });

      const obraIds = [...new Set(alocacoes.map((a) => a.obraId))];
      const obrasNomes = await prisma.obra.findMany({
        where: { id: { in: obraIds } },
        select: { id: true, nomeObra: true }
      });
      const obraNomePorId = new Map(obrasNomes.map((o) => [o.id, o.nomeObra]));

      // Buscar membros para cada equipe
      const response = await Promise.all(
        alocacoes.map(async (alocacao) => {
          const membros = await buscarMembrosEquipe(alocacao.equipe.membros);
          return {
            id: alocacao.id,
            tarefaId: alocacao.tarefaId,
            obraId: alocacao.obraId,
            obraNome: obraNomePorId.get(alocacao.obraId) ?? 'Obra',
            equipeId: alocacao.equipeId,
            equipeNome: alocacao.equipe.nome,
            membros: membros,
            dataInicio: alocacao.dataInicio,
            dataFim: alocacao.dataFim,
            status: alocacao.status,
            observacoes: alocacao.observacoes,
            createdAt: alocacao.createdAt,
            updatedAt: alocacao.updatedAt
          };
        })
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Erro ao buscar alocações:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar alocações'
      });
    }
  }

  /**
   * Buscar alocações de uma obra específica
   */
  async buscarPorObra(req: Request, res: Response) {
    try {
      const { obraId } = req.params;

      const alocacoes = await prisma.alocacaoEquipe.findMany({
        where: { obraId },
        include: {
          equipe: true
        },
        orderBy: { dataInicio: 'asc' }
      });

      // Buscar membros para cada equipe
      const response = await Promise.all(
        alocacoes.map(async (alocacao) => {
          const membros = await buscarMembrosEquipe(alocacao.equipe.membros);
          return {
            id: alocacao.id,
            tarefaId: alocacao.tarefaId,
            obraId: alocacao.obraId,
            equipeId: alocacao.equipeId,
            equipeNome: alocacao.equipe.nome,
            membros: membros,
            dataInicio: alocacao.dataInicio,
            dataFim: alocacao.dataFim,
            status: alocacao.status,
            observacoes: alocacao.observacoes,
            createdAt: alocacao.createdAt,
            updatedAt: alocacao.updatedAt
          };
        })
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Erro ao buscar alocações da obra:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar alocações'
      });
    }
  }

  /**
   * Buscar alocações de uma equipe específica
   */
  async buscarPorEquipe(req: Request, res: Response) {
    try {
      const { equipeId } = req.params;

      const alocacoes = await prisma.alocacaoEquipe.findMany({
        where: { equipeId },
        include: {
          equipe: true
        },
        orderBy: { dataInicio: 'asc' }
      });

      // Buscar membros para cada equipe
      const response = await Promise.all(
        alocacoes.map(async (alocacao) => {
          const membros = await buscarMembrosEquipe(alocacao.equipe.membros);
          return {
            id: alocacao.id,
            tarefaId: alocacao.tarefaId,
            obraId: alocacao.obraId,
            equipeId: alocacao.equipeId,
            equipeNome: alocacao.equipe.nome,
            membros: membros,
            dataInicio: alocacao.dataInicio,
            dataFim: alocacao.dataFim,
            status: alocacao.status,
            observacoes: alocacao.observacoes,
            createdAt: alocacao.createdAt,
            updatedAt: alocacao.updatedAt
          };
        })
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Erro ao buscar alocações da equipe:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar alocações'
      });
    }
  }

  /**
   * Verificar conflitos de alocação
   */
  async verificarConflitos(req: Request, res: Response) {
    try {
      const { equipeId, dataInicio, dataFim } = req.query;

      if (!equipeId || !dataInicio || !dataFim) {
        return res.status(400).json({
          success: false,
          error: 'equipeId, dataInicio e dataFim são obrigatórios'
        });
      }

      // Buscar alocações que se sobrepõem
      const alocacoesConflitantes = await prisma.alocacaoEquipe.findMany({
        where: {
          equipeId: equipeId as string,
          status: { not: 'CANCELADA' },
          AND: [
            { dataInicio: { lte: new Date(dataFim as string) } },
            { dataFim: { gte: new Date(dataInicio as string) } }
          ]
        },
        include: {
          equipe: true
        }
      });

      const temConflito = alocacoesConflitantes.length > 0;

      res.json({
        success: true,
        data: {
          temConflito,
          conflitos: alocacoesConflitantes.map(a => ({
            equipeId: a.equipeId,
            equipeNome: a.equipe.nome,
            tarefaId: a.tarefaId,
            tarefaDescricao: `Tarefa #${a.tarefaId.substring(0, 8)}`,
            dataInicio: a.dataInicio,
            dataFim: a.dataFim
          }))
        }
      });
    } catch (error: any) {
      console.error('Erro ao verificar conflitos:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao verificar conflitos'
      });
    }
  }

  /**
   * Atualizar alocação
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { dataInicio, dataFim, status, observacoes } = req.body;

      const data: any = {};
      if (dataInicio) data.dataInicio = new Date(dataInicio);
      if (dataFim) data.dataFim = new Date(dataFim);
      if (status) data.status = status;
      if (observacoes !== undefined) data.observacoes = observacoes || null;

      const alocacao = await prisma.alocacaoEquipe.update({
        where: { id },
        data,
        include: {
          equipe: true
        }
      });

      // Buscar membros da equipe
      const membros = await buscarMembrosEquipe(alocacao.equipe.membros);

      const response = {
        id: alocacao.id,
        tarefaId: alocacao.tarefaId,
        obraId: alocacao.obraId,
        equipeId: alocacao.equipeId,
        equipeNome: alocacao.equipe.nome,
        membros: membros,
        dataInicio: alocacao.dataInicio,
        dataFim: alocacao.dataFim,
        status: alocacao.status,
        observacoes: alocacao.observacoes,
        createdAt: alocacao.createdAt,
        updatedAt: alocacao.updatedAt
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Erro ao atualizar alocação:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao atualizar alocação'
      });
    }
  }

  /**
   * Excluir alocação
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.alocacaoEquipe.delete({
        where: { id }
      });

      res.json({
        success: true,
        data: { success: true }
      });
    } catch (error: any) {
      console.error('Erro ao excluir alocação:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao excluir alocação'
      });
    }
  }

  /**
   * Obter disponibilidade de equipes em um período
   */
  async obterDisponibilidade(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          success: false,
          error: 'dataInicio e dataFim são obrigatórios'
        });
      }

      // Buscar todas as equipes ativas
      const equipes = await prisma.equipe.findMany({
        where: { ativa: true }
      });

      // Para cada equipe, buscar alocações no período
      const disponibilidade = await Promise.all(
        equipes.map(async (equipe) => {
          const alocacoes = await prisma.alocacaoEquipe.findMany({
            where: {
              equipeId: equipe.id,
              status: { not: 'CANCELADA' },
              AND: [
                { dataInicio: { lte: new Date(dataFim as string) } },
                { dataFim: { gte: new Date(dataInicio as string) } }
              ]
            }
          });

          const horasTotaisPeriodo = 
            (new Date(dataFim as string).getTime() - new Date(dataInicio as string).getTime()) / (1000 * 60 * 60);
          
          const horasAlocadas = alocacoes.reduce((total, alocacao) => {
            return total + (alocacao.dataFim.getTime() - alocacao.dataInicio.getTime()) / (1000 * 60 * 60);
          }, 0);

          const percentualOcupacao = Math.round((horasAlocadas / horasTotaisPeriodo) * 100);

          return {
            equipeId: equipe.id,
            equipeNome: equipe.nome,
            disponivel: alocacoes.length === 0,
            percentualOcupacao: Math.min(percentualOcupacao, 100),
            alocacoes: alocacoes.map(a => ({
              tarefaId: a.tarefaId,
              dataInicio: a.dataInicio,
              dataFim: a.dataFim
            }))
          };
        })
      );

      res.json({
        success: true,
        data: disponibilidade
      });
    } catch (error: any) {
      console.error('Erro ao obter disponibilidade:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao obter disponibilidade'
      });
    }
  }
}

export const alocacoesController = new AlocacoesController();

