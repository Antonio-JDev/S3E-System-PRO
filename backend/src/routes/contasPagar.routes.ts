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

// Sugerir contas relacionadas para unificação
router.post(
    '/sugerir-unificacao',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.sugerirUnificacao
);

// Unificar contas a pagar (cancela origens e cria parcela(s) consolidada(s))
router.post(
    '/unificar',
    authenticate,
    authorize('admin', 'financeiro'),
    ContasPagarController.unificarContas
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

// Atualizar dados da conta (admin/isAdmin, financeiro e desenvolvedor)
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'financeiro', 'financeiro_faturamento', 'desenvolvedor'),
    ContasPagarController.atualizarConta
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

// Excluir parcela (admin/isAdmin, financeiro e desenvolvedor)
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'financeiro', 'financeiro_faturamento', 'desenvolvedor'),
    ContasPagarController.excluirParcela
);

export default router;

