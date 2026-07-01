import express from 'express';
import { AlocacaoController } from '../controllers/alocacaoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

/**
 * Roteador de Gestão Operacional - Equipes e Alocações de Obras
 * 
 * Todas as rotas estão protegidas por autenticação JWT.
 * Rotas de criação, atualização e exclusão requerem permissão de admin.
 */

// =============================================
// ROTAS DE EQUIPES
// =============================================

/**
 * @route   POST /api/obras/equipes
 * @desc    Cria uma nova equipe
 * @access  Admin only
 */
router.post('/equipes', authenticate, authorize('admin'), AlocacaoController.criarEquipe);

/**
 * @route   GET /api/obras/equipes
 * @desc    Lista todas as equipes
 * @query   ?todas=true (para incluir equipes inativas)
 * @access  Authenticated
 */
router.get('/equipes', authenticate, AlocacaoController.listarEquipes);

/**
 * @route   GET /api/obras/equipes/disponiveis
 * @desc    Retorna equipes disponíveis em um período
 * @query   ?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
 * @access  Authenticated
 */
router.get('/equipes/disponiveis', authenticate, AlocacaoController.getEquipesDisponiveis);

/**
 * @route   GET /api/obras/equipes/:id
 * @desc    Busca uma equipe específica
 * @access  Authenticated
 */
router.get('/equipes/:id', authenticate, AlocacaoController.buscarEquipe);

/**
 * @route   PUT /api/obras/equipes/:id
 * @desc    Atualiza uma equipe
 * @access  Admin only
 */
router.put('/equipes/:id', authenticate, authorize('admin'), AlocacaoController.atualizarEquipe);

/**
 * @route   DELETE /api/obras/equipes/:id
 * @desc    Desativa uma equipe (soft delete)
 * @access  Admin only
 */
router.delete('/equipes/:id', authenticate, authorize('admin'), AlocacaoController.desativarEquipe);

// =============================================
// ROTAS DE ALOCAÇÕES
// =============================================

/**
 * @route   POST /api/obras/alocar
 * @desc    Aloca uma equipe a um projeto/obra
 * @access  Admin only
 */
router.post('/alocar', authenticate, authorize('admin'), AlocacaoController.alocarEquipe);

/**
 * @route   POST /api/obras/alocar-eletricista
 * @desc    Aloca um eletricista individual a um projeto/obra
 * @access  Admin only
 */
router.post('/alocar-eletricista', authenticate, authorize('admin'), AlocacaoController.alocarEletricista);

/**
 * @route   GET /api/obras/alocacoes
 * @desc    Lista todas as alocações com filtros opcionais
 * @query   ?equipeId=xxx&eletricistaId=xxx&projetoId=xxx&status=xxx&dataInicio=xxx&dataFim=xxx
 * @access  Authenticated
 */
router.get('/alocacoes', authenticate, AlocacaoController.listarAlocacoes);

/**
 * @route   GET /api/obras/alocacoes/calendario
 * @desc    Busca alocações formatadas para calendário
 * @query   ?mes=1-12&ano=YYYY
 * @access  Authenticated
 */
router.get('/alocacoes/calendario', authenticate, AlocacaoController.getAlocacoesCalendario);

/**
 * @route   GET /api/obras/alocacoes/relatorio-ocupacao
 * @desc    Relatório de ocupação de equipes e eletricistas (horizonte de capacidade)
 * @access  Authenticated
 */
router.get('/alocacoes/relatorio-ocupacao', authenticate, AlocacaoController.getRelatorioOcupacao);

/**
 * @route   GET /api/obras/alocacoes/:id
 * @desc    Busca uma alocação específica
 * @access  Authenticated
 */
router.get('/alocacoes/:id', authenticate, AlocacaoController.buscarAlocacao);

/**
 * @route   PUT /api/obras/alocacoes/:id
 * @desc    Atualiza uma alocação
 * @access  Admin only
 */
router.put('/alocacoes/:id', authenticate, authorize('admin'), AlocacaoController.atualizarAlocacao);

/**
 * @route   PUT /api/obras/alocacoes/:id/iniciar
 * @desc    Inicia uma alocação (muda status para EmAndamento)
 * @access  Admin only
 */
router.put('/alocacoes/:id/iniciar', authenticate, authorize('admin'), AlocacaoController.iniciarAlocacao);

/**
 * @route   PUT /api/obras/alocacoes/:id/concluir
 * @desc    Conclui uma alocação
 * @access  Admin only
 */
router.put('/alocacoes/:id/concluir', authenticate, authorize('admin'), AlocacaoController.concluirAlocacao);

/**
 * @route   PUT /api/obras/alocacoes/:id/cancelar
 * @desc    Cancela uma alocação
 * @access  Admin only
 */
router.put('/alocacoes/:id/cancelar', authenticate, authorize('admin'), AlocacaoController.cancelarAlocacao);

// =============================================
// ROTAS DE ESTATÍSTICAS
// =============================================

/**
 * @route   GET /api/obras/estatisticas
 * @desc    Retorna estatísticas gerais de alocações e equipes
 * @access  Authenticated
 */
router.get('/estatisticas', authenticate, AlocacaoController.getEstatisticas);

export default router;

