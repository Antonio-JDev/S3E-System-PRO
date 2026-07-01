import { Router } from 'express';
import {
  list,
  getById,
  create,
  update,
  uploadContaEnergiaWithErrorHandling,
  uploadContaEnergiaHandler,
  remove
} from '../controllers/atendimentoCrmController';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/upload-conta', uploadContaEnergiaWithErrorHandling, uploadContaEnergiaHandler);
router.delete('/:id', remove);

export default router;
