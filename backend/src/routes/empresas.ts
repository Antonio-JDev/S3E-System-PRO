import { Router } from 'express';
import { EmpresasController } from '../controllers/empresasController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas de empresas requerem autenticação
router.use(authenticate);

/**
 * @route GET /api/empresas
 * @desc Lista todas as empresas fiscais
 * @access Authenticated
 */
router.get('/', EmpresasController.listarEmpresas);

/**
 * @route GET /api/empresas/:id
 * @desc Busca uma empresa específica
 * @access Authenticated
 */
router.get('/:id', EmpresasController.buscarEmpresa);

/**
 * @route POST /api/empresas
 * @desc Cria uma nova empresa fiscal
 * @access Admin only
 */
router.post('/', authorize('admin'), EmpresasController.criarEmpresa);

/**
 * @route PUT /api/empresas/:id
 * @desc Atualiza uma empresa fiscal
 * @access Admin only
 */
router.put('/:id', authorize('admin'), EmpresasController.atualizarEmpresa);

/**
 * @route DELETE /api/empresas/:id
 * @desc Desativa uma empresa fiscal (soft delete)
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), EmpresasController.desativarEmpresa);

/**
 * @route PATCH /api/empresas/:id/numero-nfe
 * @desc Atualiza ultimoNumeroNFe e serieNFe da empresa
 * @access Admin only
 */
router.patch('/:id/numero-nfe', authorize('admin'), EmpresasController.configurarNumeracaoNFe);

export default router;
