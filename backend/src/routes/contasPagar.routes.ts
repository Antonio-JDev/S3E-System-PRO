import express from 'express';
import { ContasPagarController } from '../controllers/contasPagarController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

/**
 * Roteador de Contas a Pagar
 *
 * Todas as rotas estão protegidas por autenticação JWT
 * Maioria requer permissões de admin ou financeiro
 */

// Criar conta a pagar única
router.post(
    '/',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.criarConta
);

// Criar contas a pagar parceladas
router.post(
    '/parceladas',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.criarContasParceladas
);

// Listar contas a pagar (com filtros)
router.get(
    '/',
    authenticate,
    authorize('admin', 'financeiro', 'gerente'),
    ContasPagarController.listarContas
);

// Buscar conta específica
router.get(
    '/:id',
    authenticate,
    authorize('admin', 'financeiro', 'gerente'),
    ContasPagarController.buscarConta
);

// Marcar conta como paga
router.put(
    '/:id/pagar',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.pagarConta
);

// Cancelar conta
router.put(
    '/:id/cancelar',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.cancelarConta
);

// Atualizar vencimento
router.put(
    '/:id/vencimento',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.atualizarVencimento
);

// Agendar pagamento
router.put(
    '/:id/agendar',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.agendarPagamento
);

// Remover agendamento
router.put(
    '/:id/remover-agendamento',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.removerAgendamento
);

// Buscar contas em atraso
router.get(
    '/alertas/atrasadas',
    authenticate,
    authorize('admin', 'financeiro', 'gerente'),
    ContasPagarController.getContasEmAtraso
);

// Buscar contas a vencer
router.get(
    '/alertas/a-vencer',
    authenticate,
    authorize('admin', 'financeiro', 'gerente'),
    ContasPagarController.getContasAVencer
);

// Listar contas por tipo
router.get(
    '/tipo/:tipo',
    authenticate,
    ContasPagarController.listarPorTipo
);

// Gerar contas de salários do mês
router.post(
    '/gerar/salarios',
    authenticate,
    ContasPagarController.gerarContasSalarios
);

// Gerar contas de despesas fixas do mês
router.post(
    '/gerar/despesas-fixas',
    authenticate,
    ContasPagarController.gerarContasDespesasFixas
);

export default router;

