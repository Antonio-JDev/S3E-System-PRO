import express from 'express';
import { MovimentacoesCaixaController } from '../controllers/movimentacoesCaixaController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'financeiro', 'gerente'),
  MovimentacoesCaixaController.listar
);

// Atualizar movimentação (conciliação bancária) - apenas contas já pagas
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'financeiro_faturamento', 'gerente'),
  MovimentacoesCaixaController.atualizar
);

// Remover / desfazer um pagamento (conta a receber ou conta a pagar)
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'financeiro_faturamento', 'gerente'),
  MovimentacoesCaixaController.removerPagamento
);

export default router;
