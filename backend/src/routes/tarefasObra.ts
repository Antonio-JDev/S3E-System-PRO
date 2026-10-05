import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';

/**
 * Tarefas de campo da aba Cronograma e Alocação foram descontinuadas.
 * As rotas permanecem registradas e respondem 410 para não cair em outro handler de /api/obras.
 */
const router = Router();

const descontinuado = (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Tarefas de campo foram descontinuadas nesta ordem de serviço.',
  });
};

router.use(authenticate);

router.all('/tarefas/resumo', descontinuado);
router.all('/tarefas/registros/:tarefaId', descontinuado);
router.all('/tarefas/:id', descontinuado);
router.all('/tarefas', descontinuado);
router.all('/:obraId/tarefas', descontinuado);

export default router;
