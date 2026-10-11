import express from 'express';
import { TesourariaController } from '../controllers/tesourariaController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

const ler = authorize('admin', 'financeiro', 'financeiro_faturamento', 'gerente');
const gravar = authorize('admin', 'financeiro', 'financeiro_faturamento', 'gerente');

router.get('/contas', authenticate, ler, TesourariaController.listarContas);
router.get('/contas/:id/extrato', authenticate, ler, TesourariaController.extratoConta);
router.post('/contas', authenticate, gravar, TesourariaController.criarConta);
router.patch('/contas/:id', authenticate, gravar, TesourariaController.definirAtivo);
router.post('/transferencias', authenticate, gravar, TesourariaController.criarTransferencia);
router.delete('/transferencias/:id', authenticate, gravar, TesourariaController.estornarTransferencia);

export default router;
