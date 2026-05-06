import { Router } from 'express';
import * as nfseController from '../controllers/nfseController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

/** Enviar lote de RPS (RecepcionarLoteRps) - retorna protocolo */
router.post('/enviar-lote', authorize('admin', 'gerente'), nfseController.enviarLote);

/** Consultar resultado do lote pelo protocolo */
router.post('/consultar-protocolo', authorize('admin', 'gerente'), nfseController.consultarProtocolo);

/** Cancelar NFS-e */
router.post('/cancelar', authorize('admin', 'gerente'), nfseController.cancelar);

/** Listar NFS-e */
router.get('/', authorize('admin', 'gerente'), nfseController.listar);

/** Dados da venda para preencher NFS-e (itens de serviço do orçamento) */
router.get('/dados-venda/:vendaId', authorize('admin', 'gerente'), nfseController.dadosVenda);

/** Atualizar numeração RPS da empresa (último RPS enviado, série) - sincronização com site prefeitura */
router.patch('/configurar-numeracao', authorize('admin', 'gerente'), nfseController.configurarNumeracaoRps);

/** Download XML da NFS-e (antes de /:id para não capturar "id/xml") */
router.get('/:id/xml', authorize('admin', 'gerente'), nfseController.getXml);

/** Visualizar/Download PDF da NFS-e */
router.get('/:id/pdf', authorize('admin', 'gerente'), nfseController.getPdf);

/** Enviar NFS-e por email (PDF + XML) */
router.post('/:id/enviar-email', authorize('admin', 'gerente'), nfseController.enviarEmail);

/** Buscar NFS-e por ID */
router.get('/:id', authorize('admin', 'gerente'), nfseController.buscarPorId);

export default router;
