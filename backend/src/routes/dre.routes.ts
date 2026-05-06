import { Router } from 'express';
import { DREController } from '../controllers/dreController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Todas as rotas de DRE requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/financeiro/dre
 * Calcula DRE para um período específico
 * Query params: inicio (YYYY-MM-DD), fim (YYYY-MM-DD)
 */
router.get('/', DREController.calcularDRE);

/**
 * GET /api/financeiro/dre/mensal
 * Calcula DRE mensal (últimos N meses)
 * Query params: meses (opcional, default: 12)
 */
router.get('/mensal', DREController.calcularDREMensal);

/**
 * GET /api/financeiro/dre/pdf
 * Exporta DRE em formato para PDF
 * Query params: inicio (YYYY-MM-DD), fim (YYYY-MM-DD)
 */
router.get('/pdf', DREController.exportarPDF);

/**
 * GET /api/financeiro/dre/periodo/:periodo
 * Calcula DRE para períodos pré-definidos
 * Períodos: mes-atual, mes-anterior, trimestre, semestre, ano
 */
router.get('/periodo/:periodo', DREController.calcularPorPeriodo);

/**
 * GET /api/financeiro/dre/lucro-real
 * Calcula Lucro Real produto por produto com custo do último XML
 * Query params: inicio (YYYY-MM-DD), fim (YYYY-MM-DD)
 */
router.get('/lucro-real', DREController.calcularLucroReal);

/**
 * GET /api/financeiro/dre/lucro-real/periodo/:periodo
 * Calcula Lucro Real para períodos pré-definidos
 */
router.get('/lucro-real/periodo/:periodo', DREController.calcularLucroRealPorPeriodo);

/**
 * GET /api/financeiro/dre/lucro-real/top-lucrativos
 * Busca produtos mais lucrativos
 * Query params: inicio, fim, limit (opcional, default: 10)
 */
router.get('/lucro-real/top-lucrativos', DREController.getProdutosMaisLucrativos);

/**
 * GET /api/financeiro/dre/lucro-real/prejuizo
 * Busca produtos com margem negativa (prejuízo)
 * Query params: inicio, fim
 */
router.get('/lucro-real/prejuizo', DREController.getProdutosComPrejuizo);

export default router;
