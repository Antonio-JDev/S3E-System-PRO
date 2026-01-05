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
  resetarOrcamentos,
  uploadJSON
} from '../controllers/orcamentosController';
import { PDFOrcamentoController } from '../controllers/pdfOrcamentoController';
import { authenticate } from '../middlewares/auth';
import { checkPermission, checkDeletePermission } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

// Rotas fixas (sem parâmetros dinâmicos)
router.get('/proximo-numero', getProximoNumeroOrcamento);

/**
 * @route POST /api/orcamentos/reset
 * @desc Resetar todos os orçamentos e a sequência (APENAS ADMIN)
 * @access RBAC: Apenas admin
 */
router.post('/reset', checkPermission('delete_orcamento'), resetarOrcamentos);

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
/**
 * @route POST /api/orcamentos
 * @desc Cria um novo orçamento
 * @access RBAC: create_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/', checkPermission('create_orcamento'), createOrcamento);

// ==================== ROTAS ESPECÍFICAS (DEVEM VIR ANTES DE /:id) ====================
// IMPORTANTE: Rotas específicas como /:id/aprovar devem vir ANTES de /:id para evitar conflitos de roteamento

/**
 * @route POST /api/orcamentos/:id/aprovar
 * @route PUT /api/orcamentos/:id/aprovar
 * @desc Aprova um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
// Middleware de debug para verificar se a rota está sendo chamada
router.put('/:id/aprovar', (req, res, next) => {
  console.log('🔍 Rota PUT /:id/aprovar capturada!', { id: req.params.id, path: req.path });
  next();
}, checkPermission('update_orcamento'), aprovarOrcamento);
router.post('/:id/aprovar', (req, res, next) => {
  console.log('🔍 Rota POST /:id/aprovar capturada!', { id: req.params.id, path: req.path });
  next();
}, checkPermission('update_orcamento'), aprovarOrcamento);

/**
 * @route POST /api/orcamentos/:id/recusar
 * @desc Recusa um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/:id/recusar', checkPermission('update_orcamento'), recusarOrcamento);

/**
 * @route PATCH /api/orcamentos/:id/status
 * @desc Atualiza o status de um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.patch('/:id/status', checkPermission('update_orcamento'), updateOrcamentoStatus);

// Rotas de PDF (devem vir depois de /:id/aprovar mas antes de /:id genérico)
router.post('/:id/pdf/preview-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPreviewPersonalizado);
router.post('/:id/pdf/download-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPDFPersonalizado);
router.get('/:id/pdf/download', PDFOrcamentoController.gerarPDFDownload);
router.get('/:id/pdf/html', PDFOrcamentoController.gerarHTML);
router.get('/:id/pdf/preview', PDFOrcamentoController.gerarPreview);

/**
 * @route GET /api/orcamentos/:id
 * @desc Busca um orçamento por ID
 * @access Private
 */
router.get('/:id', getOrcamentoById);

/**
 * @route PUT /api/orcamentos/:id
 * @desc Atualiza um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.put('/:id', checkPermission('update_orcamento'), updateOrcamento);

/**
 * @route DELETE /api/orcamentos/:id
 * @desc Deleta um orçamento
 * @access RBAC: checkDeletePermission (admin, gerente podem deletar permanentemente; engenheiro, comprador podem desativar)
 */
router.delete('/:id', checkDeletePermission('orcamento'), deleteOrcamento);

export default router;

