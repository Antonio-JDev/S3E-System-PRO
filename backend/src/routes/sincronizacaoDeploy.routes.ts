import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { sincronizar } from '../controllers/sincronizacaoDeployController';

const router = Router();

router.use(authenticate);

/**
 * POST /api/sistema/sincronizar
 * Sincroniza atualizações pós-deploy (ex.: migrações do banco).
 * Acesso: apenas desenvolvedor.
 */
router.post('/sincronizar', authorize('desenvolvedor'), sincronizar);

export default router;
