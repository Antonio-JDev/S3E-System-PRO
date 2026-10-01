import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  exigirDevOuAdmin,
  getConfigDevMcp,
  postGerarChaveMcp,
  putChaveMcp,
  putGemini,
} from '../controllers/configuracaoDevMcpController';

const router = Router();

router.use(authenticate, exigirDevOuAdmin);

router.get('/', getConfigDevMcp);
router.put('/chave', putChaveMcp);
router.post('/chave/gerar', postGerarChaveMcp);
router.put('/gemini', putGemini);

export default router;
