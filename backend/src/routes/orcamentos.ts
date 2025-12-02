import { Router } from 'express';
import { 
  getOrcamentos, 
  getOrcamentoById, 
  createOrcamento, 
  updateOrcamento,
  updateOrcamentoStatus,
  aprovarOrcamento,
  recusarOrcamento,
  deleteOrcamento,
  getProximoNumeroOrcamento
} from '../controllers/orcamentosController';
import { PDFOrcamentoController } from '../controllers/pdfOrcamentoController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Rotas de PDF (devem vir antes de /:id para evitar conflito)
router.post('/:id/pdf/preview-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPreviewPersonalizado);
router.post('/:id/pdf/download-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPDFPersonalizado);
router.get('/:id/pdf/download', PDFOrcamentoController.gerarPDFDownload);
router.get('/:id/pdf/html', PDFOrcamentoController.gerarHTML);
router.get('/:id/pdf/preview', PDFOrcamentoController.gerarPreview);

router.get('/proximo-numero', getProximoNumeroOrcamento);
router.get('/', getOrcamentos);
router.get('/:id', getOrcamentoById);
router.post('/', createOrcamento);
router.put('/:id', updateOrcamento);
router.patch('/:id/status', updateOrcamentoStatus);
router.post('/:id/aprovar', aprovarOrcamento);
router.post('/:id/recusar', recusarOrcamento);
router.delete('/:id', deleteOrcamento);

export default router;

