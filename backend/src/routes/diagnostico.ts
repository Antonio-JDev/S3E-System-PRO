import { Router } from 'express';
import { diagnosticarTarefasUsuario } from '../controllers/diagnosticoTarefasController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 🔍 Diagnóstico de tarefas do usuário (requer autenticação)
router.get('/tarefas-usuario', authenticate, diagnosticarTarefasUsuario);

export default router;

