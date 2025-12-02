import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../services/jwt.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log('🔐 Middleware auth - Headers:', req.headers.authorization);
    
    // Extrair token do header primeiro
    let token = extractTokenFromHeader(req.headers.authorization);
    
    // Se não encontrou no header, tentar no query parameter (útil para links diretos)
    if (!token && req.query.token) {
      token = typeof req.query.token === 'string' ? req.query.token : req.query.token[0];
      console.log('🔐 Token encontrado no query parameter');
    }
    
    if (!token) {
      console.log('❌ Token não fornecido');
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    console.log('🔐 Token encontrado:', token.substring(0, 20) + '...');

    // Verificar e decodificar token
    const decoded = verifyToken(token);
    console.log('✅ Token válido, usuário:', decoded);
    (req as AuthRequest).user = decoded;
    
    next();
  } catch (error) {
    console.log('❌ Erro na autenticação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Token inválido ou expirado';
    res.status(401).json({ error: errorMessage });
  }
};

// Alias para compatibilidade
export const authenticateToken = authenticate;

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as AuthRequest).user?.role;
    
    // DESENVOLVEDOR tem acesso UNIVERSAL a tudo
    if (userRole?.toLowerCase() === 'desenvolvedor') {
      console.log('🔓 Desenvolvedor detectado - Acesso universal concedido');
      next();
      return;
    }
    
    if (!userRole) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    
    // Comparação case-insensitive
    const userRoleLower = userRole.toLowerCase();
    const rolesLower = roles.map(r => r.toLowerCase());
    
    if (!rolesLower.includes(userRoleLower)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    
    next();
  };
};

