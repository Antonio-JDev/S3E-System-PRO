import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import obraService from '../services/obra.service';

import { EstoqueService } from '../services/estoque.service';

export class ObraController {
  /**
   * POST /api/obras/gerar
   * Gera uma Obra a partir de um Projeto
   */
  static async gerarObra(req: Request, res: Response): Promise<void> {
    try {
      const { projetoId, nomeObra } = req.body;

      if (!projetoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID do projeto é obrigatório' 
        });
        return;
      }

      const obra = await obraService.gerarObraAPartirDoProjeto(projetoId, nomeObra);

      res.status(201).json({ 
        success: true, 
        data: obra,
        message: 'Obra criada com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao gerar obra:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Erro ao gerar obra' 
      });
    }
  }

  /**
   * POST /api/obras/manutencao
   * Cria uma Obra de Manutenção (sem projeto)
   */
  static async criarObraManutencao(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId, nomeObra, descricao, endereco, dataPrevistaInicio, dataPrevistaFim } = req.body;

      if (!clienteId || !nomeObra) {
        res.status(400).json({ 
          success: false, 
          message: 'Cliente e nome da obra são obrigatórios' 
        });
        return;
      }

      console.log('🔧 Criando obra de manutenção:', { clienteId, nomeObra });

      const obra = await obraService.criarObraManutencao({
        clienteId,
        nomeObra,
        descricao,
        endereco,
        dataPrevistaInicio: dataPrevistaInicio ? new Date(dataPrevistaInicio) : undefined,
        dataPrevistaFim: dataPrevistaFim ? new Date(dataPrevistaFim) : undefined
      });

      res.status(201).json({ 
        success: true, 
        data: obra,
        message: 'Obra de manutenção criada com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao criar obra de manutenção:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Erro ao criar obra de manutenção' 
      });
    }
  }

  /**
   * GET /api/obras/kanban
   * Lista obras agrupadas por status (Kanban)
   */
  static async getObrasKanban(req: Request, res: Response): Promise<void> {
    try {
      const kanbanData = await obraService.getObrasKanban();

      res.status(200).json({ success: true, data: kanbanData });
    } catch (error: any) {
      console.error('Erro ao buscar obras kanban:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar obras', 
        error: error.message 
      });
    }
  }

  /**
   * GET /api/obras/:id
   * Busca uma obra específica por ID
   */
  static async getObraPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          success: false, 
          message: 'ID da obra é obrigatório' 
        });
        return;
      }

      const obra = await obraService.buscarObraPorId(id);

      if (!obra) {
        res.status(404).json({ 
          success: false, 
          message: 'Obra não encontrada' 
        });
        return;
      }

      res.status(200).json({ success: true, data: obra });
    } catch (error: any) {
      console.error('Erro ao buscar obra:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar obra', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/obras/:id/status
   * Atualiza status da obra (move no Kanban)
   */
  static async updateObraStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ 
          success: false, 
          message: 'Status é obrigatório' 
        });
        return;
      }

      const validStatuses = ['BACKLOG', 'A_FAZER', 'ANDAMENTO', 'CONCLUIDO'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ 
          success: false, 
          message: `Status inválido. Permitidos: ${validStatuses.join(', ')}` 
        });
        return;
      }

      const obra = await obraService.updateObraStatus(id, status);

      res.status(200).json({ 
        success: true, 
        data: obra,
        message: `Obra movida para: ${status}` 
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar status da obra', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/obras/:id/iniciar-execucao
   * Permite que eletricistas iniciem a execução de uma obra (mover de A_FAZER para ANDAMENTO)
   */
  static async iniciarExecucao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role?.toLowerCase();

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Buscar a obra atual
      const obra = await obraService.buscarObraPorId(id);

      if (!obra) {
        res.status(404).json({ 
          success: false, 
          message: 'Obra não encontrada' 
        });
        return;
      }

      // Verificar se a obra está em A_FAZER
      if (obra.status !== 'A_FAZER') {
        res.status(400).json({ 
          success: false, 
          message: `A obra precisa estar em "A Fazer" para iniciar execução. Status atual: ${obra.status}` 
        });
        return;
      }

      // Verificar se o usuário tem tarefa atribuída nesta obra (para eletricistas)
      if (userRole === 'eletricista') {
        // 1. Verificar tarefas atribuídas diretamente ao eletricista
        const temTarefaDireta = await prisma.tarefaObra.findFirst({
          where: {
            obraId: id,
            atribuidoA: userId
          }
        });

        if (temTarefaDireta) {
          // Tem tarefa direta, pode iniciar
          console.log(`✅ Eletricista ${userId} tem tarefa direta atribuída na obra ${id}`);
        } else {
          // 2. Buscar todas as equipes onde o eletricista está
          const equipesDoEletricista = await prisma.equipe.findMany({
            where: {
              membros: {
                has: userId // Verifica se userId está no array de membros
              },
              ativa: true
            },
            select: {
              id: true,
              nome: true
            }
          });

          if (equipesDoEletricista.length === 0) {
            res.status(403).json({ 
              success: false, 
              message: 'Você não tem tarefas atribuídas nesta obra nem está em uma equipe alocada' 
            });
            return;
          }

          const equipeIds = equipesDoEletricista.map(e => e.id);
          console.log(`🔍 Eletricista ${userId} está em ${equipesDoEletricista.length} equipe(s):`, equipesDoEletricista.map(e => e.nome));

          // 3. Verificar se há tarefas atribuídas às equipes do eletricista nesta obra
          const temTarefaEquipe = await prisma.tarefaObra.findFirst({
            where: {
              obraId: id,
              equipeId: {
                in: equipeIds
              }
            }
          });

          // 4. Verificar se há alocações das equipes do eletricista nesta obra/projeto
          let temAlocacaoEquipe = false;
          // Buscar projetoId da obra (pode estar direto ou dentro do include)
          const projetoId = obra.projetoId || (obra as any).projeto?.id;
          if (projetoId) {
            const alocacao = await prisma.alocacaoObra.findFirst({
              where: {
                projetoId: projetoId,
                equipeId: {
                  in: equipeIds
                },
                status: {
                  in: ['Planejada', 'EmAndamento']
                }
              }
            });
            temAlocacaoEquipe = !!alocacao;
            if (alocacao) {
              console.log(`✅ Encontrada alocação da equipe ${alocacao.equipeId} no projeto ${projetoId}`);
            }
          }

          if (!temTarefaEquipe && !temAlocacaoEquipe) {
            res.status(403).json({ 
              success: false, 
              message: 'Você não tem tarefas atribuídas nesta obra. Nenhuma das suas equipes está alocada a esta obra.' 
            });
            return;
          }

          console.log(`✅ Eletricista autorizado - Tarefa de equipe: ${!!temTarefaEquipe}, Alocação: ${!!temAlocacaoEquipe}`);
        }
      }

      // Atualizar status para ANDAMENTO
      const obraAtualizada = await obraService.updateObraStatus(id, 'ANDAMENTO');

      res.status(200).json({ 
        success: true, 
        data: obraAtualizada,
        message: 'Execução iniciada com sucesso!' 
      });
    } catch (error: any) {
      console.error('Erro ao iniciar execução:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao iniciar execução da obra', 
        error: error.message 
      });
    }
  }

  /**
   * GET /api/obras/tarefas/:id
   * Busca detalhes de uma tarefa
   */
  static async getTarefa(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tarefa = await obraService.getTarefa(id);

      res.status(200).json({ success: true, data: tarefa });
    } catch (error: any) {
      console.error('Erro ao buscar tarefa:', error);
      res.status(404).json({ 
        success: false, 
        message: 'Tarefa não encontrada', 
        error: error.message 
      });
    }
  }

  /**
   * POST /api/obras/tarefas/:id/registro
   * Adiciona registro de atividade em uma tarefa
   */
  static async addRegistroAtividade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { descricaoAtividade, horasTrabalhadas, observacoes } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!descricaoAtividade || horasTrabalhadas === undefined) {
        res.status(400).json({ 
          success: false, 
          message: 'Descrição e horas trabalhadas são obrigatórias' 
        });
        return;
      }

      const registro = await obraService.addRegistroAtividade(id, {
        usuarioId: userId,
        descricaoAtividade,
        horasTrabalhadas: parseFloat(horasTrabalhadas),
        observacoes
      });

      res.status(201).json({ 
        success: true, 
        data: registro,
        message: 'Registro de atividade salvo com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao adicionar registro:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao adicionar registro de atividade', 
        error: error.message 
      });
    }
  }

  /**
   * POST /api/obras/:id/tarefas
   * Cria nova tarefa em uma obra
   */
  static async criarTarefa(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { descricao, atribuidoA, dataPrevista } = req.body;

      if (!descricao) {
        res.status(400).json({ 
          success: false, 
          message: 'Descrição da tarefa é obrigatória' 
        });
        return;
      }

      const tarefa = await obraService.criarTarefa(id, {
        descricao,
        atribuidoA,
        dataPrevista: dataPrevista ? new Date(dataPrevista) : undefined
      });

      res.status(201).json({ 
        success: true, 
        data: tarefa,
        message: 'Tarefa criada com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar tarefa', 
        error: error.message 
      });
    }
  }

  /**
   * PUT /api/obras/tarefas/:id/progresso
   * Atualiza progresso de uma tarefa
   */
  static async atualizarProgressoTarefa(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { progresso } = req.body;

      if (progresso === undefined) {
        res.status(400).json({ 
          success: false, 
          message: 'Progresso é obrigatório (0-100)' 
        });
        return;
      }

      const tarefa = await obraService.atualizarProgressoTarefa(id, progresso);

      res.status(200).json({ 
        success: true, 
        data: tarefa,
        message: `Progresso atualizado: ${progresso}%` 
      });
    } catch (error: any) {
      console.error('Erro ao atualizar progresso:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar progresso', 
        error: error.message 
      });
    }
  }

  /**
   * GET /api/obras/alocacao
   * Busca alocação de equipes (para calendário)
   */
  static async getAlocacaoEquipes(req: Request, res: Response): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const alocacoes = await obraService.getAlocacaoEquipes(
        dataInicio ? new Date(dataInicio as string) : undefined,
        dataFim ? new Date(dataFim as string) : undefined
      );

      res.status(200).json({ success: true, data: alocacoes });
    } catch (error: any) {
      console.error('Erro ao buscar alocações:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar alocações de equipes', 
        error: error.message 
      });
    }
  }

  /**

   * GET /api/obras/verificar-estoque/:projetoId
   * Verifica disponibilidade de estoque antes de criar obra
   */
  static async verificarEstoque(req: Request, res: Response): Promise<void> {
    try {
      const { projetoId } = req.params;

      if (!projetoId) {
        res.status(400).json({
          success: false,
          message: 'ID do projeto é obrigatório'
        });
        return;
      }

      const verificacao = await EstoqueService.verificarDisponibilidadeProjeto(projetoId);

      res.status(200).json({
        success: true,
        data: verificacao
      });
    } catch (error: any) {
      console.error('Erro ao verificar estoque:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao verificar estoque'
      });
    }
  }

  /**
   * GET /api/obras/projeto/:projetoId
   * Busca obra associada a um projeto
   */
  static async getObraPorProjeto(req: Request, res: Response): Promise<void> {
    try {
      const { projetoId } = req.params;

      if (!projetoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID do projeto é obrigatório' 
        });
        return;
      }

      const obra = await obraService.buscarObraPorProjeto(projetoId);

      if (!obra) {
        // Retornar 200 com success: false (não é um erro, é um estado válido - projeto sem obra ainda)
        res.status(200).json({ 
          success: false, 
          message: 'Obra não encontrada para este projeto',
          data: null
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        data: obra 
      });
    } catch (error: any) {
      console.error('Erro ao buscar obra por projeto:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar obra', 
        error: error.message 
      });
    }
  }

  /**
   * DELETE /api/obras/:id
   * Deleta uma obra (apenas admin e desenvolvedor)
   */
  static async deleteObra(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          success: false, 
          message: 'ID da obra é obrigatório' 
        });
        return;
      }

      const resultado = await obraService.deletarObra(id);

      res.status(200).json({ 
        success: true, 
        message: resultado.message || 'Obra excluída com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro ao deletar obra:', error);
      
      // Se for erro de validação (tarefas em andamento), retornar 400
      if (error.message.includes('Não é possível excluir') || error.message.includes('não encontrada')) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
        return;
      }

      res.status(500).json({ 
        success: false, 
        message: 'Erro ao deletar obra', 
        error: error.message 
      });
    }
  }
}

export default new ObraController();

