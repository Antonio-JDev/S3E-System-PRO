import express from 'express';
import { FaturaCartaoController } from '../controllers/faturaCartaoController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'gerente', 'financeiro_faturamento', 'desenvolvedor'),
  FaturaCartaoController.listar
);

router.get(
  '/preview',
  authenticate,
  authorize('admin', 'financeiro', 'gerente', 'financeiro_faturamento', 'desenvolvedor'),
  FaturaCartaoController.preview
);

router.post(
  '/gerar-e-pagar',
  authenticate,
  authorize('admin', 'financeiro', 'desenvolvedor'),
  FaturaCartaoController.gerarEPagar
);

export default router;
