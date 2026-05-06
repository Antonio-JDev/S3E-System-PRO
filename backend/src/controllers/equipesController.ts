import { Request, Response } from 'express';
import equipesService from '../services/equipes.service';

export class EquipesController {
  /**
   * Criar nova equipe
   */
  async criarEquipe(req: Request, res: Response) {
    try {
      const { nome, tipo, descricao, ativa, membrosIds } = req.body;

      // Validações
      if (!nome || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Nome e tipo são obrigatórios'
        });
      }

      if (!['MONTAGEM', 'MANUTENCAO', 'INSTALACAO', 'CAMPO', 'DISTINTA'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo deve ser MONTAGEM, MANUTENCAO ou INSTALACAO'
        });
      }

      const equipe = await equipesService.criarEquipe({
        nome,
        tipo,
        descricao,
        ativa,
        membrosIds: Array.isArray(membrosIds) ? membrosIds : []
      });

      res.status(201).json({
        success: true,
        data: equipe,
        message: 'Equipe criada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar todas as equipes
   */
  async listarEquipes(req: Request, res: Response) {
    try {
      console.log('📋 [Controller] GET /api/equipes - Iniciando...');
      const { ativa, todas } = req.query;
      console.log('🔍 [Controller] Query params:', { ativa, todas });

      let filtroAtiva: boolean | undefined;
      if (todas === 'true') {
        filtroAtiva = undefined;
      } else if (ativa === 'true') {
        filtroAtiva = true;
      } else if (ativa === 'false') {
        filtroAtiva = false;
      } else {
        filtroAtiva = true;
      }

      const equipes = await equipesService.listarEquipes(filtroAtiva);

      console.log(`✅ [Controller] ${equipes.length} equipes retornadas com sucesso`);

      res.json({
        success: true,
        data: equipes,
        message: 'Equipes listadas com sucesso'
      });

    } catch (error) {
      console.error('❌ [Controller] Erro ao listar equipes:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        message: 'Erro ao listar equipes'
      });
    }
  }

  /**
   * Buscar equipe por ID
   */
  async buscarEquipePorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const equipe = await equipesService.buscarEquipePorId(id);

      if (!equipe) {
        return res.status(404).json({
          success: false,
          message: 'Equipe não encontrada'
        });
      }

      res.json({
        success: true,
        data: equipe,
        message: 'Equipe encontrada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar equipe
   */
  async atualizarEquipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, tipo, descricao, ativa, membrosIds } = req.body;

      // Validações
      if (tipo && !['MONTAGEM', 'MANUTENCAO', 'INSTALACAO', 'CAMPO', 'DISTINTA'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo deve ser MONTAGEM, MANUTENCAO ou INSTALACAO'
        });
      }

      const equipe = await equipesService.atualizarEquipe(id, {
        nome,
        tipo,
        descricao,
        ativa,
        membrosIds: Array.isArray(membrosIds) ? membrosIds : undefined
      });

      res.json({
        success: true,
        data: equipe,
        message: 'Equipe atualizada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Desativar equipe
   */
  async desativarEquipe(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await equipesService.desativarEquipe(id);

      res.json({
        success: true,
        message: 'Equipe desativada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao desativar equipe:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Adicionar membro à equipe
   */
  async adicionarMembro(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { pessoaId } = req.body;

      if (!pessoaId) {
        return res.status(400).json({ success: false, message: 'pessoaId é obrigatório' });
      }

      await equipesService.adicionarMembro(id, pessoaId);

      res.status(201).json({
        success: true,
        message: 'Membro adicionado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Remover membro da equipe
   */
  async removerMembro(req: Request, res: Response) {
    try {
      const { id, membroId } = req.params;

      await equipesService.removerMembro(id, membroId);

      res.json({
        success: true,
        message: 'Membro removido com sucesso'
      });

    } catch (error) {
      console.error('Erro ao remover membro:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar equipes disponíveis
   */
  async buscarEquipesDisponiveis(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          success: false,
          message: 'Data de início e data de fim são obrigatórias'
        });
      }

      const equipes = await equipesService.buscarEquipesDisponiveis(
        new Date(dataInicio as string),
        new Date(dataFim as string)
      );

      res.json({
        success: true,
        data: equipes,
        message: 'Equipes disponíveis encontradas'
      });

    } catch (error) {
      console.error('Erro ao buscar equipes disponíveis:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar estatísticas das equipes
   */
  async getEstatisticas(req: Request, res: Response) {
    try {
      const estatisticas = await equipesService.getEstatisticasEquipes();

      res.json({
        success: true,
        data: estatisticas,
        message: 'Estatísticas obtidas com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}

export default new EquipesController();
