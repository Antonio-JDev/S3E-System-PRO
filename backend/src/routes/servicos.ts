import { Router } from 'express';
import { ServicosController } from '../controllers/servicosController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas de serviços requerem autenticação
router.use(authenticate);

/**
 * @route GET /api/servicos
 * @desc Lista todos os serviços
 * @access Authenticated
 */
router.get('/', ServicosController.listarServicos);

/**
 * @route GET /api/servicos/:id
 * @desc Busca um serviço específico
 * @access Authenticated
 */
router.get('/:id', ServicosController.buscarServico);

/**
 * @route POST /api/servicos
 * @desc Cria um novo serviço
 * @access Admin/Gerente only
 */
router.post('/', authorize('admin', 'gerente'), ServicosController.criarServico);

/**
 * @route PUT /api/servicos/:id
 * @desc Atualiza um serviço
 * @access Admin/Gerente only
 */
router.put('/:id', authorize('admin', 'gerente'), ServicosController.atualizarServico);

/**
 * @route DELETE /api/servicos/:id
 * @desc Desativa um serviço (soft delete)
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), ServicosController.desativarServico);

/**
 * @route POST /api/servicos/import/json
 * @desc Importa serviços em lote via JSON
 * @access Admin/Gerente only
 */
router.post('/import/json', authorize('admin', 'gerente'), ServicosController.importarServicos);

/**
 * @route GET /api/servicos/export/json
 * @desc Exporta serviços para JSON
 * @access Authenticated
 */
router.get('/export/json', ServicosController.exportarServicos);

export default router;
