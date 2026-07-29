import { Router } from 'express';
import { BIController } from '../controllers/biController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas de BI requerem autenticação
router.use(authenticate);

// Endpoints de BI
router.get('/dashboard', BIController.getDashboard); // Novo endpoint principal do dashboard
router.get('/investimentos-produtos', BIController.getInvestimentosProdutos);
router.get('/gastos-fornecedor', BIController.getGastosFornecedor);
router.get('/custos-quadros', BIController.getCustosQuadros);
router.get('/lucros-quadros', BIController.getLucrosQuadros);
router.get('/vendas', BIController.getVendas);
router.get('/markup-itens', BIController.getMarkupItens);
router.get('/evolucao-orcamentos-servicos', BIController.getEvolucaoOrcamentosServicos);
router.get('/gastos-fixos', BIController.getGastosFixos);
router.get('/resumo-geral', BIController.getResumoGeral);
// Novos endpoints para melhorias do BI
router.get('/orcamentos-por-status', BIController.getOrcamentosPorStatus);
router.get('/orcamentos-por-tipo-servico-classificado', BIController.getOrcamentosPorTipoServicoClassificado);
router.get('/vendas-compras-classificacao', BIController.getVendasEComprasPorClassificacao);
router.get('/materiais-mais-comprados-periodo', BIController.getMateriaisMaisCompradosPeriodo);
router.get('/gastos-cartao-credito', BIController.getGastosCartaoCredito);
router.get('/metodos-pagamento-comparativo', BIController.getMetodosPagamentoComparativo);
router.get('/evolucao-faturas-cartao', BIController.getEvolucaoFaturasCartao);

export default router;

