import { Router } from 'express';
import { InventarioController } from '../controllers/inventarioController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * @route GET /api/inventario/materiais
 * @desc Lista materiais ativos para contagem física
 * @access Authenticated
 */
router.get('/materiais', InventarioController.listarMateriais);

/**
 * @route POST /api/inventario/ajuste
 * @desc Aplica ajuste absoluto (saldo = quantidade contada)
 * @access Admin/Gerente (mesmo padrão de Movimentações)
 */
router.post(
  '/ajuste',
  authorize('admin', 'gerente'),
  InventarioController.aplicarAjuste
);

/**
 * @route POST /api/inventario/ajustes
 * @desc Aplica ajustes absolutos em lote
 * @access Admin/Gerente
 */
router.post(
  '/ajustes',
  authorize('admin', 'gerente'),
  InventarioController.aplicarAjustesLote
);

export default router;
