import { prisma } from '../lib/prisma';
import { AuditoriaService } from './auditoria.service';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from './jwt.service';
import jwt from 'jsonwebtoken';

/**
 * Serviço de Autenticação
 * 
 * Centraliza toda a lógica de negócio relacionada à autenticação,
 * mantendo os controllers limpos e focados apenas em lidar com requisições HTTP.
 */

/**
 * Interface do resultado de autenticação
 */
export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    setor?: string | null;
    role: string;
    isAdmin?: boolean;
  };
}

/**
 * Interface para criação de usuário
 */
export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  setor?: string | null;
  role?: string;
}

/**
 * Autentica um usuário com email e senha
 * 
 * @param email - Email do usuário
 * @param password - Senha em texto plano
 * @returns Objeto com token JWT e dados do usuário
 * @throws Error com mensagem "Credenciais inválidas" se falhar
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await authenticateUser('user@s3e.com', '123456');
 *   console.log(result.token); // "eyJhbGci..."
 *   console.log(result.user);  // { id: "...", email: "...", ... }
 * } catch (error) {
 *   console.error('Login falhou:', error.message);
 * }
 * ```
 */
export const authenticateUser = async (
  email: string, 
  password: string
): Promise<AuthResult> => {
  // 1. Buscar usuário no banco de dados
  const user = await prisma.user.findUnique({ 
    where: { email } 
  });

  // 2. Verificar se usuário existe e está ativo
  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  if (!user.active) {
    throw new Error('Usuário inativo. Entre em contato com o administrador.');
  }

  // 3. Comparar senha fornecida com o hash armazenado
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Credenciais inválidas');
  }

  // 4. Gerar token JWT (incluir isAdmin e name para orçamentista / RBAC no backend)
  const token = generateToken(
    { id: user.id, role: user.role },
    undefined,
    { isAdmin: (user as any).isAdmin ?? false, name: user.name, setor: (user as any).setor ?? null }
  );

  // 5. Retornar token e dados do usuário (sem a senha)
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      setor: (user as any).setor ?? null,
      role: user.role,
      isAdmin: (user as any).isAdmin ?? false
    }
  };
};

/**
 * Registra um novo usuário no sistema
 * 
 * @param data - Dados do usuário a ser criado
 * @returns Objeto com token JWT e dados do usuário criado
 * @throws Error se o email já estiver cadastrado
 * 
 * @example
 * ```typescript
 * const result = await registerUser({
 *   email: 'novo@s3e.com',
 *   password: '123456',
 *   name: 'Novo Usuário',
 *   role: 'user'
 * });
 * ```
 */
export const registerUser = async (
  data: CreateUserData
): Promise<AuthResult> => {
  // 1. Verificar se o email já está cadastrado
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error('Email já cadastrado');
  }

  // 2. Hash da senha
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 3. Criar usuário no banco de dados
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      setor: data.setor?.trim() || null,
      role: data.role || 'user'
    }
  });

  // 4. Gerar token JWT (incluir isAdmin e name para orçamentista / RBAC no backend)
  const token = generateToken(
    { id: user.id, role: user.role },
    undefined,
    { isAdmin: (user as any).isAdmin ?? false, name: user.name, setor: (user as any).setor ?? null }
  );

  // 5. Retornar token e dados do usuário
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      setor: (user as any).setor ?? null,
      role: user.role,
      isAdmin: (user as any).isAdmin ?? false
    }
  };
};

/**
 * Busca informações de um usuário pelo ID
 * 
 * @param userId - ID do usuário
 * @returns Dados do usuário (sem senha)
 * @throws Error se usuário não for encontrado
 * 
 * @example
 * ```typescript
 * const user = await getUserById('user-123');
 * console.log(user.email);
 * ```
 */
export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      setor: true,
      role: true, 
      isAdmin: true,
      contaProtegida: true,
      active: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  return user;
};

/**
 * Atualiza a senha de um usuário
 * 
 * @param userId - ID do usuário
 * @param currentPassword - Senha atual
 * @param newPassword - Nova senha
 * @throws Error se a senha atual estiver incorreta
 * 
 * @example
 * ```typescript
 * await updatePassword('user-123', 'senhaAtual', 'novaSenha123');
 * ```
 */
export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // 1. Buscar usuário
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // 2. Verificar senha atual
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Senha atual incorreta');
  }

  // 3. Hash da nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Atualizar senha no banco
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
};

/**
 * Verifica se um email já está cadastrado
 * 
 * @param email - Email a ser verificado
 * @returns true se o email já existe, false caso contrário
 */
export const emailExists = async (email: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  return !!user;
};

/**
 * Gera um token de recuperação de senha para um usuário
 * 
 * @param email - Email do usuário
 * @returns Token JWT temporário (válido por 1 hora)
 * @throws Error se o email não estiver cadastrado
 */
export const generatePasswordResetToken = async (email: string): Promise<string> => {
  // 1. Verificar se o usuário existe
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Por segurança, não revelar se o email existe ou não
    throw new Error('Se o email estiver cadastrado, você receberá instruções para redefinir sua senha');
  }

  if (!user.active) {
    throw new Error('Usuário inativo. Entre em contato com o administrador.');
  }

  // 2. Gerar token JWT temporário (expira em 1 hora)
  const token = generateToken(
    { 
      id: user.id, 
      role: user.role
    },
    '1h', // Expira em 1 hora
    { 
      email: user.email,
      type: 'password-reset' // Tipo especial para reset de senha
    }
  );

  // Enviar email com o link de recuperação
  try {
    const { sendPasswordResetEmail } = await import('./email.service');
    await sendPasswordResetEmail(user.email, token, user.name);
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error);
    // Continuar mesmo se o email falhar (o token ainda é válido)
    // Em desenvolvimento, logar o link para facilitar testes
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Token de recuperação gerado para ${email}: ${token.substring(0, 20)}...`);
      const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
      console.log(`📧 Link de recuperação: ${frontendUrl}/reset-password?token=${token}`);
    }
  }

  return token;
};

/**
 * Valida um token de recuperação de senha
 * 
 * @param token - Token JWT de recuperação
 * @returns true se o token é válido, false caso contrário
 */
export const validatePasswordResetToken = async (token: string): Promise<boolean> => {
  try {
    // Verificar se o token é válido usando o serviço JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verificar se é um token de reset de senha
    if (decoded.type !== 'password-reset') {
      return false;
    }

    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id }
    });

    return !!user && user.active;
  } catch (error) {
    // Token inválido ou expirado
    return false;
  }
};

/**
 * Redefine a senha de um usuário usando um token de recuperação
 * 
 * @param token - Token JWT de recuperação
 * @param newPassword - Nova senha
 * @throws Error se o token for inválido ou expirado
 */
export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<void> => {
  try {
    // 1. Validar e decodificar o token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 2. Verificar se é um token de reset de senha
    if (decoded.type !== 'password-reset') {
      throw new Error('Token inválido');
    }

    // 3. Verificar se o usuário existe e está ativo
    const userId = decoded.userId || decoded.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!user.active) {
      throw new Error('Usuário inativo');
    }

    // 4. Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Atualizar senha no banco
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // 6. Registrar no audit log (auditoria stub)
    try {
      await AuditoriaService.registrarEvento({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'PASSWORD_RESET',
        description: `Usuário ${user.name} redefiniu a senha via recuperação`
      });
    } catch (logError) {
      console.error('Erro ao registrar reset de senha (auditoria stub):', logError);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('jwt')) {
      throw new Error('Token inválido ou expirado');
    }
    throw error;
  }
};

/**
 * Busca todos os usuários ativos do sistema
 * 
 * @returns Lista de usuários (sem senha)
 * 
 * @example
 * ```typescript
 * const users = await getAllUsers();
 * console.log(users); // [{ id: "...", name: "...", ... }, ...]
 * ```
 */
export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      setor: true,
      role: true, 
      isAdmin: true,
      active: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { name: 'asc' }
  });

  return users;
};

/**
 * Atualiza flag isAdmin de um usuário
 * @param userId - ID do usuário a atualizar
 * @param isAdmin - boolean indicando se o usuário terá privilégios de admin
 */
export const updateIsAdmin = async (userId: string, isAdmin: boolean): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin }
  });
};

