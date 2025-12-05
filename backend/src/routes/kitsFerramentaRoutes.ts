import { Router } from 'express';
import { 
  listarKits,
  buscarKit,
  listarKitsPorEletricista,
  criarKit,
  atualizarKit,
  deletarKit,
  gerarRecibo,
  gerarReciboPreviewPersonalizado,
  uploadFolhaTimbradaHandler,
  uploadFotoKit,
  uploadFotoKitHandler
} from '../controllers/kitsFerramentaController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/kits-ferramenta - Listar todos
router.get('/', listarKits);

// GET /api/kits-ferramenta/eletricista/:eletricistaId - Listar kits de um eletricista
router.get('/eletricista/:eletricistaId', listarKitsPorEletricista);

// POST /api/kits-ferramenta/:id/recibo/preview-personalizado - Preview personalizado com folha timbrada
router.post('/:id/recibo/preview-personalizado', uploadFolhaTimbradaHandler, gerarReciboPreviewPersonalizado);

// GET /api/kits-ferramenta/:id/recibo - Gerar recibo em PDF
router.get('/:id/recibo', gerarRecibo);

// GET /api/kits-ferramenta/:id - Buscar um específico
router.get('/:id', buscarKit);

// POST /api/kits-ferramenta/upload-foto - Upload de foto do kit
router.post('/upload-foto', uploadFotoKit, uploadFotoKitHandler);

// POST /api/kits-ferramenta - Criar novo
router.post('/', criarKit);

// PUT /api/kits-ferramenta/:id - Atualizar
router.put('/:id', atualizarKit);

// DELETE /api/kits-ferramenta/:id - Desativar
router.delete('/:id', deletarKit);

export default router;

