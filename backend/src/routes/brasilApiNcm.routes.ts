import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { searchNcm, getNcmByCode } from '../controllers/brasilApiNcmController';

const router = Router();

router.use(authenticate);

router.get('/ncm/search', searchNcm);
router.get('/ncm/:code', getNcmByCode);

export default router;
