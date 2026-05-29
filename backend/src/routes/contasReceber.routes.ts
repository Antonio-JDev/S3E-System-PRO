import express from 'express';
import { ContasReceberController } from '../controllers/contasReceberController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'gerente'),
  ContasReceberController.criar
);

router.get(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'gerente'),
  ContasReceberController.listar
);

router.get(
  '/:id/historico',
  authenticate,
  authorize('admin', 'financeiro', 'gerente'),
  ContasReceberController.historico
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'desenvolvedor'),
  ContasReceberController.atualizar
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'desenvolvedor'),
  ContasReceberController.excluir
);

export default router;
