import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { ObrasController } from '../controllers/obrasController';

const router = Router();
router.use(authenticateToken);
router.get('/:obraId/materiais', ObrasController.getMateriaisObra);
router.get('/:obraId/compras-avulsas', ObrasController.getComprasAvulsasObra);

export { router as obrasRoutes };
