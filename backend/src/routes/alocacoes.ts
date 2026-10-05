import { Router, Request, Response } from 'express';

/**
 * Alocações de equipe por tarefa (agenda desta obra e tarefas de campo).
 * O calendário principal usa /api/obras/alocacoes e /api/eventos-calendario.
 */
const router = Router();

const descontinuado = (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Alocação de equipes por tarefa foi descontinuada.',
  });
};

router.all('/periodo', descontinuado);
router.all('/obra/:obraId', descontinuado);
router.all('/equipe/:equipeId', descontinuado);
router.all('/verificar-conflitos', descontinuado);
router.all('/disponibilidade', descontinuado);
router.all('/:id', descontinuado);
router.all('/', descontinuado);

export default router;
