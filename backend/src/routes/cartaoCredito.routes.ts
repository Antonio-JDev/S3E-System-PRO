import express from 'express';
import { CartaoCreditoController } from '../controllers/cartaoCreditoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'gerente', 'financeiro_faturamento', 'desenvolvedor'),
  CartaoCreditoController.listar
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'financeiro', 'gerente', 'financeiro_faturamento', 'desenvolvedor'),
  CartaoCreditoController.buscar
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'desenvolvedor'),
  CartaoCreditoController.criar
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'financeiro', 'desenvolvedor'),
  CartaoCreditoController.atualizar
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'financeiro', 'desenvolvedor'),
  CartaoCreditoController.excluir
);

export default router;
