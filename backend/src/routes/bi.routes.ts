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

export default router;

