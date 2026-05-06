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
import { checkPermission, checkDeletePermission } from '../middlewares/rbac';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/kits-ferramenta - Listar (eletricista vê só os seus)
router.get('/', checkPermission('view_kit'), listarKits);

// GET /api/kits-ferramenta/eletricista/:eletricistaId - Listar kits de um eletricista (gestores)
router.get('/eletricista/:eletricistaId', checkPermission('view_kit', 'view_gestao_obras'), listarKitsPorEletricista);

// POST /api/kits-ferramenta/upload-foto - Upload de foto do kit (antes de /:id para não capturar como id)
router.post('/upload-foto', checkPermission('update_kit'), uploadFotoKit, uploadFotoKitHandler);

// POST /api/kits-ferramenta - Criar novo (apenas gestores, não eletricista)
router.post('/', checkPermission('create_kit'), criarKit);

// POST /api/kits-ferramenta/:id/recibo/preview-personalizado - Preview personalizado com folha timbrada
router.post('/:id/recibo/preview-personalizado', checkPermission('view_kit'), uploadFolhaTimbradaHandler, gerarReciboPreviewPersonalizado);

// GET /api/kits-ferramenta/:id/recibo - Gerar recibo em PDF
router.get('/:id/recibo', checkPermission('view_kit'), gerarRecibo);

// GET /api/kits-ferramenta/:id - Buscar um específico (eletricista só o seu)
router.get('/:id', checkPermission('view_kit'), buscarKit);

// PUT /api/kits-ferramenta/:id - Atualizar (apenas gestores)
router.put('/:id', checkPermission('update_kit'), atualizarKit);

// DELETE /api/kits-ferramenta/:id - Desativar (apenas gestores)
router.delete('/:id', checkDeletePermission('kit'), deletarKit);

export default router;

