import { Router } from 'express';
import { TarefasInternasController } from '../controllers/tarefasInternasController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/tarefas-internas/kanban - Lista tasks agrupadas por coluna
 */
router.get('/kanban', TarefasInternasController.getKanban);

/**
 * GET /api/tarefas-internas/stats - Estatísticas para o cabeçalho
 */
router.get('/stats', TarefasInternasController.getStats);

/**
 * GET /api/tarefas-internas/relatorios/usuarios - Relatório por usuário (Admin/Dev)
 */
router.get('/relatorios/usuarios', authorize('admin'), TarefasInternasController.getRelatorioUsuarios);

/**
 * GET /api/tarefas-internas/relatorios/usuarios/:userId - Relatório detalhado por usuário (Admin/Dev)
 */
router.get('/relatorios/usuarios/:userId', authorize('admin'), TarefasInternasController.getRelatorioUsuarioDetalhes);

/**
 * POST /api/tarefas-internas - Criar task
 */
router.post('/', TarefasInternasController.create);

/**
 * Rotas com :id devem vir depois das rotas específicas
 * POST /api/tarefas-internas/:id/itens - Criar subtarefa
 * PUT /api/tarefas-internas/:id/itens/:itemId - Editar subtarefa
 * DELETE /api/tarefas-internas/:id/itens/:itemId - Excluir subtarefa
 */
router.post('/:id/itens', TarefasInternasController.createItem);
router.put('/:id/itens/:itemId', TarefasInternasController.updateItem);
router.delete('/:id/itens/:itemId', TarefasInternasController.deleteItem);

/**
 * PUT /api/tarefas-internas/:id/status - Atualizar coluna (drag-and-drop)
 */
router.put('/:id/status', TarefasInternasController.updateStatus);

/**
 * GET /api/tarefas-internas/:id - Detalhe da task + itens
 */
router.get('/:id', TarefasInternasController.getById);

/**
 * PUT /api/tarefas-internas/:id - Editar task
 */
router.put('/:id', TarefasInternasController.update);

/**
 * DELETE /api/tarefas-internas/:id - Hard delete da task
 */
router.delete('/:id', TarefasInternasController.delete);

export default router;
