import { Router } from 'express';
import { ServicosController } from '../controllers/servicosController';
import { authenticate } from '../middlewares/auth';
import { checkPermission, checkDeletePermission } from '../middlewares/rbac';

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
 * @access RBAC: create_servico (admin, gerente, engenheiro, comprador)
 */
router.post('/', checkPermission('create_servico'), ServicosController.criarServico);

/**
 * @route PUT /api/servicos/:id
 * @desc Atualiza um serviço
 * @access RBAC: update_servico (admin, gerente, engenheiro, comprador)
 */
router.put('/:id', checkPermission('update_servico'), ServicosController.atualizarServico);

/**
 * @route DELETE /api/servicos/:id
 * @desc Desativa um serviço (soft delete)
 * @access RBAC: checkDeletePermission (admin, gerente podem deletar permanentemente; engenheiro, comprador podem desativar)
 */
router.delete('/:id', checkDeletePermission('servico'), ServicosController.desativarServico);

/**
 * @route PUT /api/servicos/:id/reativar
 * @desc Reativa um serviço desativado
 * @access RBAC: update_servico (admin, gerente, engenheiro, comprador)
 */
router.put('/:id/reativar', checkPermission('update_servico'), ServicosController.reativarServico);

/**
 * @route POST /api/servicos/import/json
 * @desc Importa serviços em lote via JSON
 * @access RBAC: create_servico (admin, gerente, engenheiro, comprador)
 */
router.post('/import/json', checkPermission('create_servico'), ServicosController.importarServicos);

/**
 * @route GET /api/servicos/export/json
 * @desc Exporta serviços para JSON
 * @access Authenticated
 */
router.get('/export/json', ServicosController.exportarServicos);

export default router;
