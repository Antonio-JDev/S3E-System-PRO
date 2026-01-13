import { Router } from 'express';
import { PDFCustomizationController, uploadWatermark, uploadCornerDesign } from '../controllers/pdfCustomizationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @route POST /api/pdf/generate-custom
 * @desc Gera PDF personalizado com customizações
 * @access Authenticated
 */
router.post('/generate-custom', PDFCustomizationController.generateCustomPDF);

/**
 * @route POST /api/pdf/templates
 * @desc Salva template de personalização
 * @access Authenticated
 */
router.post('/templates', PDFCustomizationController.saveTemplate);

/**
 * @route GET /api/pdf/templates
 * @desc Lista todos os templates do usuário
 * @access Authenticated
 */
router.get('/templates', PDFCustomizationController.listTemplates);

/**
 * @route GET /api/pdf/templates/:id
 * @desc Carrega template específico
 * @access Authenticated
 */
router.get('/templates/:id', PDFCustomizationController.loadTemplate);

/**
 * @route PUT /api/pdf/templates/:id
 * @desc Atualiza template existente
 * @access Authenticated
 */
router.put('/templates/:id', PDFCustomizationController.updateTemplate);

/**
 * @route DELETE /api/pdf/templates/:id
 * @desc Deleta template
 * @access Authenticated
 */
router.delete('/templates/:id', PDFCustomizationController.deleteTemplate);

/**
 * @route POST /api/pdf/upload-watermark
 * @desc Upload de imagem para marca d'água
 * @access Authenticated
 */
router.post('/upload-watermark', uploadWatermark, PDFCustomizationController.uploadWatermarkImage);

/**
 * @route POST /api/pdf/upload-corner-design
 * @desc Upload de design de canto customizado
 * @access Authenticated
 */
router.post('/upload-corner-design', uploadCornerDesign, PDFCustomizationController.uploadCornerDesignImage);

/**
 * @route GET /api/pdf-customization/folhas-timbradas
 * @desc Lista todas as folhas timbradas já importadas
 * @access Authenticated
 */
router.get('/folhas-timbradas', (req, res, next) => {
    console.log('🔍 [ROUTE] GET /api/pdf-customization/folhas-timbradas chamado');
    console.log('🔍 [ROUTE] PDFCustomizationController.listFolhasTimbradas:', typeof PDFCustomizationController.listFolhasTimbradas);
    if (typeof PDFCustomizationController.listFolhasTimbradas === 'function') {
        return PDFCustomizationController.listFolhasTimbradas(req, res);
    } else {
        console.error('❌ [ROUTE] listFolhasTimbradas não é uma função!');
        res.status(500).json({ success: false, error: 'Método não encontrado' });
    }
});

/**
 * @route DELETE /api/pdf-customization/folhas-timbradas/:filename
 * @desc Deleta uma folha timbrada
 * @access Authenticated
 */
router.delete('/folhas-timbradas/:filename', PDFCustomizationController.deleteFolhaTimbrada);

export default router;

