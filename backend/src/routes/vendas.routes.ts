import express from 'express';
import { VendasController, uploadContratoAssinadoMulter } from '../controllers/vendasController';
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

// Upload do PDF do contrato assinado pelo cliente (PV)
router.put('/:id/contrato-assinado', authenticate, uploadContratoAssinadoMulter, VendasController.uploadContratoAssinado);

// Salvar HTML do contrato editado (Jodit) no PV
router.put('/:id/contrato', authenticate, VendasController.updateContratoHtml);

// Realizar nova venda (cria venda + contas a receber)
router.post('/realizar', authenticate, VendasController.realizarVenda);

// Cancelar venda
router.put('/:id/cancelar', authenticate, VendasController.cancelarVenda);

// Atualizar status da venda (ex.: Faturado após emissão NF-e/NFS-e)
router.put('/:id/status', authenticate, VendasController.atualizarStatus);

// Atualizar valor do PV e parcelas com o valor final do orçamento (apenas Desenvolvedor) — rota mais específica antes do PATCH /:id
router.patch('/:id/atualizar-valor-orcamento', authenticate, authorize('desenvolvedor'), VendasController.atualizarValorDoOrcamento);

// Atualização parcial: parcelas (datas/valores) e NCM dos itens do orçamento
router.patch('/:id', authenticate, VendasController.atualizarVenda);

// Pagar conta a receber
router.put('/contas/:id/pagar', authenticate, VendasController.pagarConta);

// Excluir venda (apenas Desenvolvedor/Administrador)
router.delete('/:id', authenticate, authorize('admin', 'desenvolvedor'), VendasController.excluirVenda);

export default router;
