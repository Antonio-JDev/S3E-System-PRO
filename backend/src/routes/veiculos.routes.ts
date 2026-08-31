import { Router } from 'express';
import { VeiculosController } from '../controllers/veiculosController';
import { authenticate } from '../middlewares/auth';
import { checkPermission } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);
router.use(checkPermission('view_frota'));

// Métricas e alertas (deve vir antes de :id para evitar conflitos)
router.get('/metricas', VeiculosController.obterMetricas);
router.get('/alertas-ipva', VeiculosController.obterAlertasIpva);

// CRUD de veículos
router.get('/', VeiculosController.listar);
router.get('/:id/consumo', VeiculosController.obterConsumo);
router.get('/:id', VeiculosController.buscar);
router.post('/', VeiculosController.criar);
router.put('/:id', VeiculosController.atualizar);
router.delete('/:id', VeiculosController.deletar);

export default router;

