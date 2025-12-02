import express from 'express';
import { VendasController } from '../controllers/vendasController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

/**
 * Roteador de Vendas e Contas a Receber
 *
 * Todas as rotas estão protegidas por autenticação JWT
 */

// Dashboard financeiro
router.get('/dashboard', authenticate, VendasController.getDashboard);

// Verificar disponibilidade de estoque para orçamento
router.get('/estoque/:orcamentoId', authenticate, VendasController.verificarEstoque);

// Listar vendas (com paginação)
router.get('/', authenticate, VendasController.listarVendas);

// Buscar venda específica
router.get('/:id', authenticate, VendasController.buscarVenda);

// Realizar nova venda (cria venda + contas a receber)
router.post('/realizar', authenticate, VendasController.realizarVenda);

// Cancelar venda
router.put('/:id/cancelar', authenticate, VendasController.cancelarVenda);

// Pagar conta a receber
router.put('/contas/:id/pagar', authenticate, VendasController.pagarConta);

// Excluir venda (apenas Desenvolvedor/Administrador)
router.delete('/:id', authenticate, authorize('admin', 'desenvolvedor'), VendasController.excluirVenda);

export default router;
