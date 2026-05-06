import { Router } from 'express';
import { FluxoCaixaController } from '../controllers/fluxoCaixaController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/financeiro/fluxo-caixa
 * @desc Calcula fluxo de caixa futuro projetado
 * @query dias - Número de dias para projetar (30, 60, 90)
 * @query modo - 'confirmado' ou 'previsao'
 * @access Private
 */
router.get('/', FluxoCaixaController.calcularFluxoCaixa);

/**
 * @route GET /api/financeiro/fluxo-caixa/comparacao
 * @desc Compara cenário confirmado vs previsão
 * @query dias - Número de dias para projetar
 * @access Private
 */
router.get('/comparacao', FluxoCaixaController.compararConfirmadoVsPrevisao);

/**
 * @route GET /api/financeiro/fluxo-caixa/dia/:data
 * @desc Busca movimentações de um dia específico
 * @param data - Data no formato YYYY-MM-DD
 * @access Private
 */
router.get('/dia/:data', FluxoCaixaController.buscarMovimentacoesDia);

export default router;
