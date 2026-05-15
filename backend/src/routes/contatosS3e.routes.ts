import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  deleteContatoS3eController,
  getContatosS3eList,
  getContatoS3eByIdController,
  patchContatoS3e,
  postContatoS3e,
  postContatosS3eImport
} from '../controllers/contatosS3eController';

const router = Router();
router.use(authenticate);

router.get('/', getContatosS3eList);
router.post('/', postContatoS3e);
router.post('/import', postContatosS3eImport);
router.get('/:id', getContatoS3eByIdController);
router.patch('/:id', patchContatoS3e);
router.delete('/:id', deleteContatoS3eController);

export default router;
