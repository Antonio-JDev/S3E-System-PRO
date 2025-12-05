import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  createCliente,
  createClienteRapido,
  updateCliente,
  deleteCliente,
  reativarCliente,
  previewImportacao,
  importarClientes,
  exportarTemplate,
  exportarClientes,
  uploadJSON
} from '../controllers/clientesController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// ==================== ROTAS ESPECÍFICAS (DEVEM VIR PRIMEIRO) ====================

/**
 * @route GET /api/clientes/template/download
 * @desc Baixar template JSON para importação
 * @access Private
 */
router.get('/template/download', exportarTemplate);

/**
 * @route GET /api/clientes/export/all
 * @desc Exportar todos os clientes ativos
 * @access Private
 */
router.get('/export/all', exportarClientes);

/**
 * @route POST /api/clientes/rapido
 * @desc Criar cliente rápido (apenas nome e tipo)
 * @access Private
 */
router.post('/rapido', createClienteRapido);

/**
 * @route POST /api/clientes/import/preview
 * @desc Preview de importação (validação)
 * @access Private
 */
router.post('/import/preview', uploadJSON.single('file'), previewImportacao);

/**
 * @route POST /api/clientes/import
 * @desc Importar clientes de JSON
 * @access Private
 */
router.post('/import', uploadJSON.single('file'), importarClientes);

// ==================== ROTAS GENÉRICAS ====================

/**
 * @route GET /api/clientes
 * @desc Listar todos os clientes com filtros opcionais
 * @query ?ativo=true&busca=nome
 * @access Private
 */
router.get('/', getClientes);

/**
 * @route POST /api/clientes
 * @desc Criar novo cliente
 * @access Private
 */
router.post('/', createCliente);

// ==================== ROTAS COM PARÂMETROS (DEVEM VIR POR ÚLTIMO) ====================

/**
 * @route PUT /api/clientes/:id/reativar
 * @desc Reativar cliente inativo
 * @access Private
 */
router.put('/:id/reativar', reativarCliente);

/**
 * @route GET /api/clientes/:id
 * @desc Buscar cliente específico com relacionamentos
 * @access Private
 */
router.get('/:id', getClienteById);

/**
 * @route PUT /api/clientes/:id
 * @desc Atualizar dados do cliente
 * @access Private
 */
router.put('/:id', updateCliente);

/**
 * @route DELETE /api/clientes/:id
 * @desc Desativar cliente (soft delete)
 * @access Private
 */
router.delete('/:id', deleteCliente);

export default router;
