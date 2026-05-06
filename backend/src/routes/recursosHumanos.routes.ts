import { Router } from 'express';
import { RecursosHumanosController } from '../controllers/recursosHumanosController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas
router.get('/', RecursosHumanosController.listar);
router.get('/:id', RecursosHumanosController.buscar);
router.get('/:id/historico', RecursosHumanosController.buscarHistorico);
router.get('/funcionario/:funcionarioId/historico', RecursosHumanosController.buscarHistoricoPorFuncionario);
router.post('/', RecursosHumanosController.criar);
router.post('/:id/entregas', RecursosHumanosController.registrarEntregas);
router.put('/:id', RecursosHumanosController.atualizar);
router.delete('/:id', RecursosHumanosController.excluir);
router.post('/criar-de-compra/:compraId', RecursosHumanosController.criarDeCompra);

export default router;
