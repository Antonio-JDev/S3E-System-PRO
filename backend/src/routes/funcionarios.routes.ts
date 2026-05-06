import { Router } from 'express';
import { FuncionariosController } from '../controllers/funcionariosController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Métricas (deve vir antes de :id para evitar conflitos)
router.get('/metricas', FuncionariosController.obterMetricas);

// Histórico de pagamentos (deve vir antes de :id genérico)
router.get('/:id/historico-pagamentos', FuncionariosController.historicoPagamentos);

// CRUD de funcionários
router.get('/', FuncionariosController.listar);
router.get('/:id', FuncionariosController.buscar);
router.post('/', FuncionariosController.criar);
router.put('/:id', FuncionariosController.atualizar);
router.delete('/:id', FuncionariosController.deletar);

export default router;

