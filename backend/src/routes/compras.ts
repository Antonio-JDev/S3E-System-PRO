import { Router } from 'express';
import { getCompras, getCompraById, createCompra, updateCompraStatus, receberRemessaParcial, receberComAssociacoes, parseXML, deleteCompra, cancelarCompra } from '../controllers/comprasController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCompras);
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.put('/:id/status', updateCompraStatus);
router.put('/:id/receber-parcial', receberRemessaParcial);
router.put('/:id/receber-com-associacoes', receberComAssociacoes); // Nova rota para receber com verificação de duplicatas
router.put('/:id/cancelar', cancelarCompra); // Cancelar compra
router.post('/parse-xml', parseXML);
router.delete('/:id', authorize('admin', 'desenvolvedor'), deleteCompra);

export default router;

