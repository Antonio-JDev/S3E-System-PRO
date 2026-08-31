import { Router } from 'express';
import { GastosVeiculoController } from '../controllers/gastosVeiculoController';
import { authenticate } from '../middlewares/auth';
import { checkPermission } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);
router.use(checkPermission('view_frota'));

// CRUD de gastos de veículo
router.get('/', GastosVeiculoController.listar);
router.get('/:id', GastosVeiculoController.buscar);
router.post('/', GastosVeiculoController.criar);
router.put('/:id', GastosVeiculoController.atualizar);
router.delete('/:id', GastosVeiculoController.deletar);

export default router;

