import { Router } from 'express';
import { BeneficiosController } from '../controllers/beneficiosController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

router.get('/', BeneficiosController.listar);
router.get('/:id', BeneficiosController.buscar);
router.post('/', BeneficiosController.criar);
router.put('/:id', BeneficiosController.atualizar);
router.delete('/:id', BeneficiosController.deletar);

export default router;

