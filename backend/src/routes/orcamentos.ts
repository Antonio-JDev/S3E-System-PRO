import { Router } from 'express';
import { 
  getOrcamentos, 
  getOrcamentoById, 
  createOrcamento, 
  updateOrcamento,
  updateOrcamentoStatus,
  aprovarOrcamento,
  recusarOrcamento,
  deleteOrcamento,
  getProximoNumeroOrcamento,
  exportarTemplateOrcamentos,
  previewImportacaoOrcamentos,
  importarOrcamentos,
  resetarOrcamentos,
  backfillOrcamentista,
  uploadJSON,
  updateItemVendaDireta,
  gerarPdfItensKit
} from '../controllers/orcamentosController';
import { PDFOrcamentoController } from '../controllers/pdfOrcamentoController';
import { SincronizacaoController } from '../controllers/sincronizacaoController';
import { authenticate } from '../middlewares/auth';
import { checkPermission, checkDeletePermission } from '../middlewares/rbac';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// Rotas fixas (sem parâmetros dinâmicos)
router.get('/proximo-numero', getProximoNumeroOrcamento);

/**
 * @route POST /api/orcamentos/reset
 * @desc Resetar todos os orçamentos e a sequência (APENAS ADMIN)
 * @access RBAC: Apenas admin
 */
router.post('/reset', checkPermission('delete_orcamento'), resetarOrcamentos);

/**
 * @route POST /api/orcamentos/backfill-orcamentista
 * @desc Preenche orcamentistaNome em orçamentos vazios e atualiza vendedorNome nas vendas (APENAS DESENVOLVEDOR)
 * @access Apenas role desenvolvedor (para produção sem rodar script no servidor)
 */
router.post('/backfill-orcamentista', backfillOrcamentista);

// ==================== ROTAS DE IMPORTAÇÃO (DEVEM VIR ANTES DAS ROTAS GENÉRICAS) ====================

/**
 * @route GET /api/orcamentos/import/template
 * @desc Baixar template JSON para importação de orçamentos históricos
 * @access Private
 */
router.get('/import/template', exportarTemplateOrcamentos);

/**
 * @route POST /api/orcamentos/import/preview
 * @desc Preview de importação (validação antes de importar)
 * @access Private
 */
router.post('/import/preview', uploadJSON.single('file'), previewImportacaoOrcamentos);

/**
 * @route POST /api/orcamentos/import
 * @desc Importar orçamentos históricos de JSON
 * @access RBAC: create_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/import', uploadJSON.single('file'), checkPermission('create_orcamento'), importarOrcamentos);
router.post('/pdf/itens-kit', gerarPdfItensKit);

// ==================== ROTAS GENÉRICAS ====================

router.get('/', getOrcamentos);
/**
 * @route POST /api/orcamentos
 * @desc Cria um novo orçamento
 * @access RBAC: create_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/', checkPermission('create_orcamento'), createOrcamento);

// ==================== ROTAS ESPECÍFICAS (DEVEM VIR ANTES DE /:id) ====================
// IMPORTANTE: Rotas específicas como /:id/aprovar devem vir ANTES de /:id para evitar conflitos de roteamento

// Middleware de debug para todas as rotas PUT/PATCH
router.use((req, res, next) => {
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.path.includes('/status')) {
    console.log(`🔍 [DEBUG] ${req.method} ${req.path} - ID: ${req.params.id}, Status: ${JSON.stringify(req.body)}`);
  }
  next();
});

/**
 * @route POST /api/orcamentos/:id/aprovar
 * @route PUT /api/orcamentos/:id/aprovar
 * @desc Aprova um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
// Middleware de debug para verificar se a rota está sendo chamada
router.put('/:id/aprovar', (req, res, next) => {
  console.log('🔍 Rota PUT /:id/aprovar capturada!', { id: req.params.id, path: req.path });
  next();
}, checkPermission('update_orcamento'), aprovarOrcamento);
router.post('/:id/aprovar', (req, res, next) => {
  console.log('🔍 Rota POST /:id/aprovar capturada!', { id: req.params.id, path: req.path });
  next();
}, checkPermission('update_orcamento'), aprovarOrcamento);

/**
 * @route POST /api/orcamentos/:id/recusar
 * @desc Recusa um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.post('/:id/recusar', checkPermission('update_orcamento'), recusarOrcamento);

/**
 * @route POST /api/orcamentos/:id/sincronizar-pv
 * @desc Sincroniza manualmente o orçamento com o Pedido de Venda
 * @access RBAC: update_orcamento
 */
router.post('/:id/sincronizar-pv', checkPermission('update_orcamento'), SincronizacaoController.sincronizarManualmente);

/**
 * @route GET /api/orcamentos/:id/validar-modificacao
 * @desc Valida se o orçamento pode ser modificado (verifica status do PV)
 * @access Private
 */
router.get('/:id/validar-modificacao', SincronizacaoController.validarModificacao);

/**
 * @route POST /api/orcamentos/:orcamentoId/items/:itemId/aplicar-margem
 * @desc Aplica margem padrão a um item específico
 * @access RBAC: update_orcamento
 */
router.post('/:orcamentoId/items/:itemId/aplicar-margem', checkPermission('update_orcamento'), SincronizacaoController.aplicarMargemItem);

/**
 * @route PATCH /api/orcamentos/:orcamentoId/items/:itemId/venda-direta
 * @desc Marca ou desmarca item como "Venda direta do fornecedor para o cliente" (não entra em contas a receber, estoque nem NF-e)
 * @access RBAC: update_orcamento
 */
router.patch('/:orcamentoId/items/:itemId/venda-direta', checkPermission('update_orcamento'), updateItemVendaDireta);

/**
 * @route PUT /api/orcamentos/:orcamentoId/items/:itemId/vincular-material
 * @desc Vincula ou altera a vinculação de um item do banco frio a um material do estoque
 * @access RBAC: update_orcamento
 */
router.put('/:orcamentoId/items/:itemId/vincular-material', checkPermission('update_orcamento'), async (req, res) => {
  try {
    const { orcamentoId, itemId } = req.params;
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Material ID é obrigatório' 
      });
    }

    // Verificar se o item existe e é do banco frio
    const item = await prisma.orcamentoItem.findUnique({
        where: { id: itemId },
        include: { 
          cotacao: true,
          material: true // Incluir material atual para verificar se já está vinculado
        }
      });

      if (!item) {
        return res.status(404).json({ 
          success: false, 
          error: 'Item não encontrado' 
        });
      }

      if (item.tipo !== 'COTACAO' && !item.cotacaoId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Este item não é do banco frio' 
        });
      }

      // Verificar se o material existe
      const material = await prisma.material.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        return res.status(404).json({ 
          success: false, 
          error: 'Material não encontrado' 
        });
      }

      // Verificar se já está vinculado ao mesmo material
      const jaVinculado = item.materialId === materialId;
      
      // Atualizar o item com o materialId vinculado (ou alterar a vinculação)
      const itemAtualizado = await prisma.orcamentoItem.update({
        where: { id: itemId },
        data: {
          materialId: materialId
        },
        include: {
          material: true,
          cotacao: true
        }
      });

      // Mensagem apropriada dependendo se é nova vinculação ou alteração
      const mensagem = jaVinculado 
        ? 'Material já estava vinculado a este item'
        : item.materialId 
          ? `Vinculação alterada com sucesso. Material anterior: ${item.material?.nome || 'Desconhecido'}`
          : 'Material vinculado com sucesso';

      console.log(`✅ Vinculação ${item.materialId ? 'alterada' : 'criada'}: Item ${itemId} -> Material ${materialId} (${material.nome})`);

      res.json({ 
        success: true, 
        data: itemAtualizado,
        message: mensagem,
        isUpdate: !!item.materialId // Indica se foi atualização ou nova vinculação
      });
  } catch (error: any) {
    console.error('Erro ao vincular/alterar vinculação de material:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao vincular material' 
    });
  }
});

/**
 * @route PUT /api/orcamentos/:orcamentoId/items/:parentItemId/itens-do-kit/vincular
 * @desc Vincula um sub-item do banco frio (dentro de itensDoKit de um kit unificado) a um material do estoque
 * @access RBAC: update_orcamento
 */
router.put('/:orcamentoId/items/:parentItemId/itens-do-kit/vincular', checkPermission('update_orcamento'), async (req, res) => {
  try {
    const { orcamentoId, parentItemId } = req.params;
    const { subIndex, materialId } = req.body;

    if (materialId == null || materialId === '') {
      return res.status(400).json({ success: false, error: 'Material ID é obrigatório' });
    }
    if (typeof subIndex !== 'number' && (typeof subIndex !== 'string' || isNaN(Number(subIndex)))) {
      return res.status(400).json({ success: false, error: 'subIndex (índice do sub-item em itensDoKit) é obrigatório' });
    }
    const idx = typeof subIndex === 'number' ? subIndex : Number(subIndex);

    const parent = await prisma.orcamentoItem.findFirst({
        where: { id: parentItemId, orcamentoId },
        select: { id: true, itensDoKit: true, tipo: true }
      });

      if (!parent) {
        return res.status(404).json({ success: false, error: 'Item do orçamento não encontrado' });
      }

      const itensDoKit = parent.itensDoKit as any[] | null;
      if (!Array.isArray(itensDoKit) || idx < 0 || idx >= itensDoKit.length) {
        return res.status(400).json({ success: false, error: 'Sub-item inválido ou índice fora do intervalo' });
      }

      const sub = itensDoKit[idx];
      if (!sub || !sub.cotacaoId) {
        return res.status(400).json({ success: false, error: 'Este sub-item não é do banco frio (cotação)' });
      }

      const material = await prisma.material.findUnique({ where: { id: materialId } });
      if (!material) {
        return res.status(404).json({ success: false, error: 'Material não encontrado' });
      }

      const updated = [...itensDoKit];
      updated[idx] = { ...sub, materialVinculadoId: materialId };

      await prisma.orcamentoItem.update({
        where: { id: parentItemId },
        data: { itensDoKit: updated }
      });

      console.log(`✅ Vinculação itensDoKit: Item ${parentItemId} sub[${idx}] -> Material ${materialId} (${material.nome})`);
    res.json({
      success: true,
      message: 'Material vinculado ao item do banco frio (kit unificado).',
      data: { parentItemId, subIndex: idx, materialId }
    });
  } catch (error: any) {
    console.error('Erro ao vincular material em itensDoKit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao vincular material no kit'
    });
  }
});

/**
 * @route POST /api/orcamentos/:id/solicitar-reabertura
 * @desc Solicita reabertura de pedido bloqueado para modificação
 * @access Private
 */
router.post('/:id/solicitar-reabertura', SincronizacaoController.solicitarReabertura);

/**
 * @route GET /api/orcamentos/:id/logs-auditoria
 * @desc Busca logs de auditoria de um orçamento específico
 * @access Private
 */
router.get('/:id/logs-auditoria', SincronizacaoController.buscarLogsAuditoria);

/**
 * @route PATCH /api/orcamentos/:id/status
 * @route PUT /api/orcamentos/:id/status
 * @desc Atualiza o status de um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.patch('/:id/status', (req, res, next) => {
  console.log('🔍 Rota PATCH /:id/status capturada!', { id: req.params.id, status: req.body?.status });
  next();
}, checkPermission('update_orcamento'), updateOrcamentoStatus);
router.put('/:id/status', (req, res, next) => {
  console.log('🔍 Rota PUT /:id/status capturada!', { id: req.params.id, status: req.body?.status });
  next();
}, checkPermission('update_orcamento'), updateOrcamentoStatus);

// Rotas de PDF (devem vir depois de /:id/aprovar mas antes de /:id genérico)
router.post('/:id/pdf/preview-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPreviewPersonalizado);
router.post('/:id/pdf/download-personalizado', PDFOrcamentoController.uploadMiddleware, PDFOrcamentoController.gerarPDFPersonalizado);
router.get('/:id/pdf/download', PDFOrcamentoController.gerarPDFDownload);
router.get('/:id/pdf/html', PDFOrcamentoController.gerarHTML);

/**
 * @route GET /api/orcamentos/:id
 * @desc Busca um orçamento por ID
 * @access Private
 */
router.get('/:id', getOrcamentoById);

/**
 * @route PUT /api/orcamentos/:id
 * @desc Atualiza um orçamento
 * @access RBAC: update_orcamento (admin, gerente, engenheiro, comprador)
 */
router.put('/:id', checkPermission('update_orcamento'), updateOrcamento);

/**
 * @route DELETE /api/orcamentos/:id
 * @desc Deleta um orçamento
 * @access RBAC: checkDeletePermission (admin, gerente podem deletar permanentemente; engenheiro, comprador podem desativar)
 */
router.delete('/:id', checkDeletePermission('orcamento'), deleteOrcamento);

export default router;

