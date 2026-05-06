import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas de dashboard requerem autenticação
router.use(authenticate);

/**
 * @route GET /api/dashboard/estatisticas
 * @desc Retorna estatísticas gerais do sistema
 * @access Authenticated
 */
router.get('/estatisticas', DashboardController.getEstatisticas);

/**
 * @route GET /api/dashboard/graficos
 * @desc Retorna dados para gráficos do dashboard
 * @access Authenticated
 */
router.get('/graficos', DashboardController.getGraficos);

/**
 * @route GET /api/dashboard/alertas
 * @desc Retorna alertas críticos do sistema
 * @access Authenticated
 */
router.get('/alertas', DashboardController.getAlertas);

/**
 * @route GET /api/dashboard/evolucao-obras
 * @desc Retorna evolução de obras por período
 * @access Authenticated
 */
router.get('/evolucao-obras', DashboardController.getEvolucaoObras);

/**
 * @route GET /api/dashboard/graficos-executivo
 * @desc Evoluções (orçamentos, OS, obras, vendas), comparativo e categorias de venda
 * @access Authenticated
 */
router.get('/graficos-executivo', DashboardController.getGraficosExecutivo);

/**
 * @route GET /api/dashboard/producao-quadros
 * @desc Retorna dados de produção de quadros elétricos
 * @access Authenticated
 */
router.get('/producao-quadros', DashboardController.getProducaoQuadros);

/**
 * @route GET /api/dashboard/exportar
 * @desc Exporta dados do dashboard em formato PDF ou Excel
 * @access Authenticated
 */
router.get('/exportar', DashboardController.exportarDados);

/**
 * @route GET /api/dashboard/atividades
 * @desc Retorna atividades/sessões do sistema
 * @access Authenticated
 */
router.get('/atividades', DashboardController.getAtividades);

/**
 * @route GET /api/dashboard/resumo-financeiro
 * @desc Retorna resumo financeiro completo
 * @access Authenticated
 */
router.get('/resumo-financeiro', DashboardController.getResumoFinanceiro);

export default router;
