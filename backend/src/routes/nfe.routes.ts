import { Router } from 'express';
import { NFeController } from '../controllers/nfeController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * @route POST /api/nfe/emitir
 * @desc Emitir NF-e a partir de um pedido
 * @access Admin/Gerente
 */
router.post('/emitir', authorize('admin', 'gerente'), NFeController.emitirNFe);

/**
 * @route GET /api/nfe/notas
 * @desc Listar notas fiscais emitidas
 * @access Admin/Gerente
 */
router.get('/notas', authorize('admin', 'gerente'), NFeController.listarNotasFiscais);

/**
 * @route GET /api/nfe/notas/:id
 * @desc Buscar nota fiscal específica
 * @access Admin/Gerente
 */
router.get('/notas/:id', authorize('admin', 'gerente'), NFeController.buscarNotaFiscal);

/**
 * @route POST /api/nfe/preview-xml
 * @desc Gerar XML da NF-e para pré-visualização (sem envio à SEFAZ)
 * @access Admin/Gerente
 */
router.post('/preview-xml', authorize('admin', 'gerente'), NFeController.previewXmlNFe);

/**
 * @route POST /api/nfe/cancelar
 * @desc Cancelar NF-e autorizada
 * @access Admin/Gerente
 */
router.post('/cancelar', authorize('admin', 'gerente'), NFeController.cancelarNFe);

/**
 * @route POST /api/nfe/corrigir
 * @desc Enviar Carta de Correção (CC-e)
 * @access Admin/Gerente
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
 * @route GET /api/nfe/notas/:id/danfe
 * @desc Gerar DANFE em PDF a partir da nota fiscal salva
 * @access Admin/Gerente
 */
router.get('/notas/:id/danfe', authorize('admin', 'gerente'), NFeController.gerarDanfePorNota);

/**
 * @route POST /api/nfe/config
 * @desc Salvar configurações fiscais (certificado e ambiente)
 * @access Admin only
 */
router.post('/config', authorize('admin'), NFeController.salvarConfig);

/**
 * @route GET /api/nfe/consultar/:chaveAcesso
 * @desc Consultar status de NF-e na SEFAZ
 * @access Admin/Gerente
 */
router.get('/consultar/:chaveAcesso', authorize('admin', 'gerente'), NFeController.consultarNFe);

export default router;

