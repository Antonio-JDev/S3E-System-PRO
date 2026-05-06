import { Router } from 'express';
import { register, login, getMe, getAllUsers, forgotPassword, validateResetToken, resetPassword, setUserIsAdmin, getPermissions } from '../controllers/authController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

/**
 * Rotas de Autenticação
 * 
 * POST /api/auth/register - Registrar novo usuário
 * POST /api/auth/login    - Fazer login
 * GET  /api/auth/me       - Obter dados do usuário autenticado
 * GET  /api/auth/users    - Listar todos os usuários (protegido)
 */

// Registro de novo usuário (público)
router.post('/register', validate(registerSchema), register);

// Login (público)
router.post('/login', validate(loginSchema), login);

// Obter dados do usuário autenticado (protegido)
router.get('/me', authenticateToken, getMe);

// Listar todos os usuários (qualquer autenticado - para atribuição em tarefas/kanban)
router.get('/users', authenticateToken, getAllUsers);

// Obter permissões do usuário autenticado (útil para frontend)
router.get('/permissions', authenticateToken, getPermissions);

// Atualizar flag isAdmin de um usuário (apenas admin)
router.patch('/users/:id/is-admin', authenticateToken, authorize('admin'), setUserIsAdmin);

// Recuperação de senha (público)
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);

export default router;

