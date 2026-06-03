import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from '../services/auditoria.service';
import { isProtectedAccount } from '../utils/userProtection.util';
import { buildNetworkContext } from '../utils/requestAuditContext.util';

/**
 * Controllers de Autenticação
 * 
 * Responsáveis por:
 * - Receber requisições HTTP
 * - Validar dados (via middleware)
 * - Chamar services para lógica de negócio
 * - Retornar respostas HTTP apropriadas
 */

/**
 * Controller de Login
 * 
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * 
 * @example
 * Request:
 * POST /api/auth/login
 * {
 *   "email": "user@s3e.com",
 *   "password": "123456"
 * }
 * 
 * Response (200):
 * {
 *   "message": "Login realizado com sucesso",
 *   "token": "eyJhbGci...",
 *   "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
 * }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Dados já validados pelo middleware de validação
    const { email, password } = req.body as LoginInput;

    // Chamar service de autenticação
    const result = await authService.authenticateUser(email, password);

    try {
      const network = buildNetworkContext(req);
      await AuditoriaService.registrarEvento({
        userId: result.user.id,
        userName: result.user.name,
        userRole: result.user.role,
        action: 'LOGIN',
        description: `Usuário ${result.user.name} fez login no sistema`,
        ipAddress: network.clientIp,
        userAgent: network.userAgent,
        metadata: { network, email },
      });
    } catch (logError) {
      console.error('Erro ao registrar login (auditoria):', logError);
    }

    // Retornar sucesso
    res.status(200).json({
      message: 'Login realizado com sucesso',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    // Tratamento de erros específicos
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
    
    try {
      const { email } = req.body as LoginInput;
      const network = buildNetworkContext(req);
      await AuditoriaService.registrarEvento({
        action: 'LOGIN_FAILED',
        description: `Tentativa de login falhada para ${email}: ${errorMessage}`,
        ipAddress: network.clientIp,
        userAgent: network.userAgent,
        metadata: { email, error: errorMessage, network },
      });
    } catch (logError) {
      console.error('Erro ao registrar falha de login (auditoria):', logError);
    }
    
    if (errorMessage === 'Credenciais inválidas') {
      res.status(401).json({ error: errorMessage });
      return;
    }

    if (errorMessage.includes('Usuário inativo')) {
      res.status(403).json({ error: errorMessage });
      return;
    }

    // Erro genérico
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

/**
 * Controller de Registro
 * 
 * POST /api/auth/register
 * Body: { email: string, password: string, name: string, role?: string }
 * 
 * @example
 * Request:
 * POST /api/auth/register
 * {
 *   "email": "novo@s3e.com",
 *   "password": "123456",
 *   "name": "Novo Usuário",
 *   "role": "user"
 * }
 * 
 * Response (201):
 * {
 *   "message": "Usuário criado com sucesso",
 *   "token": "eyJhbGci...",
 *   "user": { ... }
 * }
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Dados já validados pelo middleware de validação
    const body = req.body as RegisterInput;
    
    // Garantir que campos obrigatórios estão presentes
    const userData: authService.CreateUserData = {
      email: body.email!,
      password: body.password!,
      name: body.name!,
      setor: typeof (body as any).setor === 'string' ? (body as any).setor : undefined,
      role: body.role
    };

    // Chamar service de registro
    const result = await authService.registerUser(userData);

    // Retornar sucesso
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    // Tratamento de erros específicos
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar usuário';
    
    if (errorMessage === 'Email já cadastrado') {
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Erro genérico
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

/**
 * Controller para obter dados do usuário autenticado
 * 
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 * 
 * @example
 * Request:
 * GET /api/auth/me
 * Headers: { Authorization: "Bearer eyJhbGci..." }
 * 
 * Response (200):
 * {
 *   "id": "...",
 *   "email": "user@s3e.com",
 *   "name": "Usuário",
 *   "role": "admin",
 *   "active": true,
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // userId vem do middleware de autenticação
    const userId = (req as any).user.userId;
    
    // Buscar dados do usuário
    const user = await authService.getUserById(userId);

    // Retornar dados
    res.status(200).json(user);
  } catch (error) {
    // Tratamento de erros
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar usuário';
    
    if (errorMessage === 'Usuário não encontrado') {
      res.status(404).json({ error: errorMessage });
      return;
    }

    // Erro genérico
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

/**
 * Controller para listar todos os usuários
 * 
 * GET /api/auth/users
 * Headers: Authorization: Bearer <token>
 * 
 * @example
 * Request:
 * GET /api/auth/users
 * Headers: { Authorization: "Bearer eyJhbGci..." }
 * 
 * Response (200):
 * {
 *   "users": [
 *     {
 *       "id": "...",
 *       "email": "user@s3e.com",
 *       "name": "Usuário",
 *       "role": "admin",
 *       "active": true
 *     },
 *     ...
 *   ]
 * }
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar todos os usuários
    const users = await authService.getAllUsers();

    // Retornar lista
    res.status(200).json({
      users: users
    });
  } catch (error) {
    // Erro genérico
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

/**
 * GET /api/auth/permissions
 * Retorna permissões efetivas do usuário autenticado (útil para frontend)
 * Ex.: { canAccessAdminPages: true, role: 'financeiro', isAdmin: true }
 */
export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const role = typeof authUser.role === 'string' ? authUser.role : '';
    const isAdminFlag = !!authUser.isAdmin;

    const roleLower = role.toLowerCase();
    const canAccessAdminPages = isAdminFlag || roleLower === 'admin' || roleLower === 'desenvolvedor';

    res.status(200).json({
      canAccessAdminPages,
      role,
      isAdmin: isAdminFlag
    });
  } catch (error: any) {
    console.error('Erro ao obter permissões do usuário:', error);
    res.status(500).json({ error: 'Erro ao obter permissões' });
  }
};

/**
 * PATCH /api/auth/users/:id/is-admin
 * Atualiza a flag isAdmin de um usuário (apenas admin pode chamar)
 * Body: { isAdmin: boolean }
 */
export const setUserIsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body as { isAdmin?: boolean };

    if (typeof isAdmin !== 'boolean') {
      res.status(400).json({ error: 'Campo isAdmin (boolean) é obrigatório' });
      return;
    }

    // Verificar usuário existe
    const user = await authService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    if (isProtectedAccount(user as { contaProtegida?: boolean | null })) {
      res.status(403).json({ error: 'Conta protegida do sistema — permissão de admin não pode ser alterada por terceiros' });
      return;
    }

    await authService.updateIsAdmin(id, isAdmin);

    res.status(200).json({ success: true, message: `isAdmin atualizado para ${isAdmin}` });
  } catch (error: any) {
    console.error('Erro ao atualizar isAdmin do usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar isAdmin do usuário' });
  }
};

/**
 * Controller para solicitar recuperação de senha
 * 
 * POST /api/auth/forgot-password
 * Body: { email: string }
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email é obrigatório' });
      return;
    }

    // Gerar token de recuperação (o email será enviado automaticamente pelo serviço)
    const token = await authService.generatePasswordResetToken(email);

    // Retornar sucesso (por segurança, não revelar se o email existe ou não)
    res.status(200).json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha',
      // Em desenvolvimento, retornar o token para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { token })
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar solicitação';
    
    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    res.status(200).json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
    });
  }
};

/**
 * Controller para validar token de recuperação
 * 
 * GET /api/auth/validate-reset-token?token=...
 */
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ valid: false, error: 'Token não fornecido' });
      return;
    }

    const isValid = await authService.validatePasswordResetToken(token);

    if (isValid) {
      res.status(200).json({ valid: true });
    } else {
      res.status(400).json({ valid: false, error: 'Token inválido ou expirado' });
    }
  } catch (error) {
    console.error('Erro ao validar token:', error);
    res.status(400).json({ valid: false, error: 'Token inválido ou expirado' });
  }
};

/**
 * Controller para redefinir senha com token
 * 
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token e senha são obrigatórios' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
      return;
    }

    // Validar se a senha contém pelo menos 1 caractere especial
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (!specialCharRegex.test(password)) {
      res.status(400).json({ error: 'A senha deve conter pelo menos 1 caractere especial' });
      return;
    }

    // Redefinir senha
    await authService.resetPasswordWithToken(token, password);

    res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao redefinir senha';
    
    if (errorMessage.includes('Token inválido') || errorMessage.includes('expirado')) {
      res.status(400).json({ error: errorMessage });
      return;
    }

    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
};

