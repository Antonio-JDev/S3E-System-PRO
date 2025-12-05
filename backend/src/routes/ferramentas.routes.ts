import { Router } from 'express';
import {
  listarFerramentas,
  buscarFerramenta,
  criarFerramenta,
  atualizarFerramenta,
  deletarFerramenta
} from '../controllers/ferramentasController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/ferramentas - Listar todas
router.get('/', listarFerramentas);

// GET /api/ferramentas/:id - Buscar uma específica
router.get('/:id', buscarFerramenta);

// POST /api/ferramentas - Criar nova
router.post('/', criarFerramenta);

// PUT /api/ferramentas/:id - Atualizar
router.put('/:id', atualizarFerramenta);

// DELETE /api/ferramentas/:id - Desativar
router.delete('/:id', deletarFerramenta);

export default router;

