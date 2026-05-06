import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as NotificacoesController from '../controllers/notificacoesController';

const router = Router();

router.use(authenticate);

/**
 * @route GET /api/notificacoes
 * @desc Lista notificações do usuário logado
 */
router.get('/', NotificacoesController.listar);

/**
 * @route GET /api/notificacoes/contagem
 * @desc Retorna quantidade de notificações não lidas
 */
router.get('/contagem', NotificacoesController.contagemNaoLidas);

/**
 * @route PATCH /api/notificacoes/marcar-todas-lidas
 * @desc Marca todas as notificações do usuário como lidas
 */
router.patch('/marcar-todas-lidas', NotificacoesController.marcarTodasComoLidas);

/**
 * @route DELETE /api/notificacoes/todas
 * @desc Exclui todas as notificações do usuário (limpar container)
 */
router.delete('/todas', NotificacoesController.excluirTodas);

/**
 * @route DELETE /api/notificacoes/:id
 * @desc Exclui uma notificação (apenas se pertencer ao usuário)
 */
router.delete('/:id', NotificacoesController.excluirUma);

/**
 * @route PATCH /api/notificacoes/:id/lida
 * @desc Marca uma notificação como lida
 */
router.patch('/:id/lida', NotificacoesController.marcarComoLida);

/**
 * @route POST /api/notificacoes
 * @desc Cria notificação (admin/gerente/desenvolvedor/financeiro ou sistema ao atribuir em Kanban)
 */
router.post('/', NotificacoesController.criar);

export default router;
