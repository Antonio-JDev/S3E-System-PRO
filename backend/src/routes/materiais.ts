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
  atualizarSKUsENCMs,
  exportarMateriaisCriticos,
  uploadImagemMaterial,
  uploadImagemMaterialHandler,
  deletarImagemMaterial,
  servirImagemMaterial,
  getHistoricoPrecos,
  recalcularCustoUnitario,
  getCandidatosRecalculoCusto,
  atualizarValoresVenda,
  exportarTemplateMateriais,
  importarMateriais,
  previewPrecoBitolaCabo,
  aplicarPrecoBitolaCabo
} from '../controllers/materiaisController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMateriais);
router.get('/movimentacoes/historico', getMovimentacoes);
router.post('/corrigir-nomes', corrigirNomesGenericos); // Rota de correção
router.post('/buscar-similares', buscarMateriaisSimilares); // Nova rota para verificação de duplicatas
router.post('/atualizar-skus-ncms', atualizarSKUsENCMs); // Atualizar SKUs e NCMs de materiais existentes

// Rotas de exportação e recálculo (antes das rotas com :id)
router.get('/exportar-criticos', exportarMateriaisCriticos);
router.get('/candidatos-recalculo-custo', getCandidatosRecalculoCusto);

router.get('/:id/historico-compras', getHistoricoCompras); // Rota específica antes da genérica
router.get('/:id/historico-precos', getHistoricoPrecos); // Histórico de preços
router.post('/:id/recalcular-custo', recalcularCustoUnitario); // Recálculo custo unitário (KM→M)

// Rota especial para atualizar valores de venda de todos os materiais
router.post('/atualizar-valores-venda', authenticate, atualizarValoresVenda);

// Template e importação em lote (antes da rota /:id)
router.get('/import/template', exportarTemplateMateriais);
router.post('/import', importarMateriais);

router.post('/cabos/preview-preco-bitola', previewPrecoBitolaCabo);
router.post('/cabos/aplicar-preco-bitola', aplicarPrecoBitolaCabo);

// Rotas de imagens (antes da rota genérica /:id)
router.post('/:id/upload-imagem', uploadImagemMaterial, uploadImagemMaterialHandler);
router.delete('/:id/imagem', deletarImagemMaterial);

router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

router.post('/movimentacao', registrarMovimentacao);

export default router;

