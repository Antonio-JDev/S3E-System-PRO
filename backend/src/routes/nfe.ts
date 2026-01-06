import { Router } from 'express';
import { NFeController } from '../controllers/nfeController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas de NFe requerem autenticação
router.use(authenticate);

/**
 * @route GET /api/nfe
 * @desc Lista todas as notas fiscais
 * @access Authenticated
 */
router.get('/', NFeController.listarNotasFiscais);

/**
 * @route GET /api/nfe/notas/:id/danfe
 * @desc Gerar DANFE em PDF a partir da nota fiscal salva
 * @access Admin/Gerente
 */
router.get('/notas/:id/danfe', authorize('admin', 'gerente'), NFeController.gerarDanfePorNota);

/**
 * @route GET /api/nfe/consultar/:chaveAcesso
 * @desc Consultar status de NF-e na SEFAZ
 * @access Admin/Gerente only
 */
router.get('/consultar/:chaveAcesso', authorize('admin', 'gerente'), NFeController.consultarNFe);

/**
 * @route GET /api/nfe/:id
 * @desc Busca uma nota fiscal específica
 * @access Authenticated
 */
router.get('/:id', NFeController.buscarNotaFiscal);

/**
 * @route POST /api/nfe
 * @desc Cria uma nova nota fiscal
 * @access Admin/Gerente only
 */
router.post('/', authorize('admin', 'gerente'), NFeController.criarNotaFiscal);

/**
 * @route PUT /api/nfe/:id
 * @desc Atualiza uma nota fiscal
 * @access Admin/Gerente only
 */
router.put('/:id', authorize('admin', 'gerente'), NFeController.atualizarNotaFiscal);

/**
 * @route DELETE /api/nfe/:id
 * @desc Cancela uma nota fiscal
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), NFeController.cancelarNotaFiscal);

/**
 * @route POST /api/nfe/validar
 * @desc Valida dados de uma nota fiscal antes da criação
 * @access Authenticated
 */
router.post('/validar', NFeController.validarNotaFiscal);

/**
 * @route POST /api/nfe/emitir
 * @desc Emitir NF-e via SEFAZ (integração fiscal)
 * @access Admin/Gerente only
 */
router.post('/emitir', authorize('admin', 'gerente'), NFeController.emitirNFe);

/**
 * @route POST /api/nfe/preview-xml
 * @desc Gerar XML da NF-e para pré-visualização (sem envio à SEFAZ)
 * @access Admin/Gerente
 */
router.post('/preview-xml', authorize('admin', 'gerente'), NFeController.previewXmlNFe);

/**
 * @route POST /api/nfe/cancelar
 * @desc Cancelar NF-e autorizada
 * @access Admin/Gerente only
 */
router.post('/cancelar', authorize('admin', 'gerente'), NFeController.cancelarNFe);

/**
 * @route POST /api/nfe/corrigir
 * @desc Enviar Carta de Correção (CC-e)
 * @access Admin/Gerente only
 */
router.post('/corrigir', authorize('admin', 'gerente'), NFeController.corrigirNFe);

/**
 * @route POST /api/nfe/inutilizar
 * @desc Inutilizar faixa de numeração de NF-e
 * @access Admin/Gerente
 */
router.post('/inutilizar', authorize('admin', 'gerente'), NFeController.inutilizarNumeracao);

/**
 * @route POST /api/nfe/manifestar
 * @desc Manifestação do destinatário de NF-e
 * @access Admin/Gerente
 */
router.post('/manifestar', authorize('admin', 'gerente'), NFeController.manifestarDestinatario);

/**
 * @route POST /api/nfe/danfe-preview
 * @desc Gerar DANFE em PDF a partir de um XML procNFe (preview)
 * @access Admin/Gerente
 */
router.post('/danfe-preview', authorize('admin', 'gerente'), NFeController.gerarDanfe);

/**
 * @route POST /api/nfe/config
 * @desc Salvar configurações fiscais
 * @access Admin only
 */
router.post('/config', authorize('admin'), NFeController.salvarConfig);

export default router;
