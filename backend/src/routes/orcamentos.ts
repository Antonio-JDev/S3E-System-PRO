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
  getProximoNumeroOrcamento,
  exportarTemplateOrcamentos,
  previewImportacaoOrcamentos,
  importarOrcamentos,
  uploadJSON
} from '../controllers/orcamentosController';
import { PDFOrcamentoController } from '../controllers/pdfOrcamentoController';
import { authenticate } from '../middlewares/auth';
import { checkPermission, checkDeletePermission } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

// Rotas de PDF (devem vir antes de /:id para evitar conflito)
router.post('/:id/pdf/preview-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPreviewPersonalizado);
router.post('/:id/pdf/download-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPDFPersonalizado);
router.get('/:id/pdf/download', PDFOrcamentoController.gerarPDFDownload);
router.get('/:id/pdf/html', PDFOrcamentoController.gerarHTML);
router.get('/:id/pdf/preview', PDFOrcamentoController.gerarPreview);

router.get('/proximo-numero', getProximoNumeroOrcamento);

// ==================== ROTAS DE IMPORTAÇÃO (DEVEM VIR ANTES DAS ROTAS GENÉRICAS) ====================

/**
 * @route GET /api/orcamentos/import/template
 * @desc Baixar template JSON para importação de orçamentos históricos
 * @access Private
 */
router.get('/import/template', exportarTemplateOrcamentos);

/**
 * @route POST /api/orcamentos/import/preview
 * @desc Preview de importação (validação antes de importar)
 * @access Private
 */
router.post('/import/preview', uploadJSON.single('file'), previewImportacaoOrcamentos);

/**
 * @route POST /api/orcamentos/import
 * @desc Importar orçamentos históricos de JSON
 * @access RBAC: create_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/import', uploadJSON.single('file'), checkPermission('create_orcamento'), importarOrcamentos);

// ==================== ROTAS GENÉRICAS ====================

router.get('/', getOrcamentos);
router.get('/:id', getOrcamentoById);
/**
 * @route POST /api/orcamentos
 * @desc Cria um novo orçamento
 * @access RBAC: create_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/', checkPermission('create_orcamento'), createOrcamento);
/**
 * @route PUT /api/orcamentos/:id
 * @desc Atualiza um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.put('/:id', checkPermission('update_orcamento'), updateOrcamento);
router.patch('/:id/status', checkPermission('update_orcamento'), updateOrcamentoStatus);
router.post('/:id/aprovar', checkPermission('update_orcamento'), aprovarOrcamento);
router.post('/:id/recusar', checkPermission('update_orcamento'), recusarOrcamento);
/**
 * @route DELETE /api/orcamentos/:id
 * @desc Deleta um orçamento
 * @access RBAC: checkDeletePermission (admin, gerente podem deletar permanentemente; engenheiro, comprador podem desativar)
 */
router.delete('/:id', checkDeletePermission('orcamento'), deleteOrcamento);

export default router;

