import { Router } from 'express';
import {
  listarRegrasFiscais,
  criarRegraFiscal,
  atualizarRegraFiscal,
  desativarRegraFiscal,
} from '../controllers/regraFiscalNfeController';
import { authenticate, authorize } from '../middlewares/auth';
import { carregarRegrasFiscais } from '../services/nfe-regra-fiscal.service';

const router = Router();

if (process.env.NODE_ENV !== 'test') {
  void carregarRegrasFiscais().catch((error) => {
    console.error('Não foi possível carregar as regras fiscais da NF-e:', error);
  });
}

router.use(authenticate);

router.get('/', authorize('admin', 'gerente'), listarRegrasFiscais);
router.post('/', authorize('admin', 'gerente'), criarRegraFiscal);
router.put('/:id', authorize('admin', 'gerente'), atualizarRegraFiscal);
router.patch('/:id/desativar', authorize('admin', 'gerente'), desativarRegraFiscal);

export default router;
