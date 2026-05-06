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
 * @route POST /api/nfe/emitir-fracionado
 * @desc Faturamento fracionado: N NF-es para N clientes a partir de um pedido
 * @access Admin/Gerente
 */
router.post('/emitir-fracionado', authorize('admin', 'gerente'), NFeController.emitirFracionado);

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
 * @route GET /api/nfe/notas/:id/eventos
 * @desc Listar eventos (logs) de uma nota fiscal
 * @access Admin/Gerente
 */
router.get('/notas/:id/eventos', authorize('admin', 'gerente'), NFeController.listarEventosNota);

/**
 * @route POST /api/nfe/notas/:id/reprocessar
 * @desc Enfileirar e tentar reprocessar agora uma nota em contingência
 * @access Admin/Gerente
 */
router.post('/notas/:id/reprocessar', authorize('admin', 'gerente'), NFeController.reprocessarNota);

// Alternative explicit endpoints to avoid nested-routing conflicts
router.get('/eventos/:notaId', authorize('admin', 'gerente'), NFeController.listarEventosNota);
router.post('/reprocessar/:notaId', authorize('admin', 'gerente'), NFeController.reprocessarNota);

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
router.get('/notas/:id/danfe', authorize('admin', 'gerente', 'financeiro'), NFeController.gerarDanfePorNota);

/**
 * Compatibilidade: rotas antigas/usadas por clientes externos
 * @route GET /api/nfe/:id/danfe
 */
router.get('/:id/danfe', authorize('admin', 'gerente', 'financeiro'), NFeController.gerarDanfePorNota);

/**
 * Compatibilidade: download XML por /api/nfe/:id/xml
 */
router.get('/:id/xml', authorize('admin', 'gerente', 'financeiro'), NFeController.getXmlNota);

/**
 * Compatibilidade: envio por email por /api/nfe/:id/enviar-email
 */
router.post('/:id/enviar-email', authorize('admin', 'gerente', 'financeiro'), NFeController.enviarEmailNota);

/**
 * @route GET /api/nfe/notas/:id/xml
 * @desc Download XML da NF-e
 * @access Admin/Gerente
 */
router.get('/notas/:id/xml', authorize('admin', 'gerente', 'financeiro'), NFeController.getXmlNota);

/**
 * @route POST /api/nfe/notas/:id/enviar-email
 * @desc Enviar NF-e (DANFE + XML) por email
 * @access Admin/Gerente
 */
router.post('/notas/:id/enviar-email', authorize('admin', 'gerente', 'financeiro'), NFeController.enviarEmailNota);

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

