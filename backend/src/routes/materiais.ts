import { Router } from 'express';
import {
  getMateriais,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  registrarMovimentacao,
  getMovimentacoes,
  getHistoricoCompras,
  corrigirNomesGenericos,
  buscarMateriaisSimilares,
  exportarMateriaisCriticos,
  importarPrecos,
  uploadImportFile,
  uploadImagemMaterial,
  uploadImagemMaterialHandler,
  deletarImagemMaterial,
  servirImagemMaterial,
  gerarTemplateImportacao,
  previewImportacao,
  getHistoricoPrecos
} from '../controllers/materiaisController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMateriais);
router.get('/movimentacoes/historico', getMovimentacoes);
router.post('/corrigir-nomes', corrigirNomesGenericos); // Rota de correção
router.post('/buscar-similares', buscarMateriaisSimilares); // Nova rota para verificação de duplicatas

// Rotas de exportação/importação (antes das rotas com :id)
router.get('/exportar-criticos', exportarMateriaisCriticos);
router.get('/template-importacao', gerarTemplateImportacao); // Gerar template JSON/PDF
router.post('/preview-importacao', uploadImportFile, previewImportacao); // Preview antes de importar
router.post('/importar-precos', uploadImportFile, importarPrecos);

router.get('/:id/historico-compras', getHistoricoCompras); // Rota específica antes da genérica
router.get('/:id/historico-precos', getHistoricoPrecos); // Histórico de preços

// Rotas de imagens (antes da rota genérica /:id)
router.post('/:id/upload-imagem', uploadImagemMaterial, uploadImagemMaterialHandler);
router.delete('/:id/imagem', deletarImagemMaterial);

router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

router.post('/movimentacao', registrarMovimentacao);

export default router;

