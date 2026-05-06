import { Router } from 'express';
import multer from 'multer';
import { PontoController } from '../controllers/pontoController';
import { authenticate } from '../middlewares/auth';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname?.toLowerCase().endsWith('.xls') ||
      file.originalname?.toLowerCase().endsWith('.xlsx');
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .xls ou .xlsx são aceitos.'));
    }
  },
});

const router = Router();
router.use(authenticate);

router.post(
  '/importar-presenca',
  upload.single('file'),
  PontoController.importarPresenca,
);

export default router;
