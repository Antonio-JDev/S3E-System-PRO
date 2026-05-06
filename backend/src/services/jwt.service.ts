import jwt from 'jsonwebtoken';

/**
 * Serviço de JWT - Geração e Validação de Tokens
 * 
 * Este serviço centraliza toda a lógica de autenticação JWT,
 * garantindo consistência em todo o sistema.
 */

// Obter JWT_SECRET do ambiente (com fallback para desenvolvimento)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Tempo de expiração do token: 7 dias
const JWT_EXPIRATION = '7d';

/**
 * Interface do payload do JWT
 */
export interface JwtPayload {
  userId: string;
  role: string;
}

/**
 * Interface do token decodificado (inclui campos adicionais do JWT)
 */
export interface DecodedToken extends JwtPayload {
  iat?: number;  // Issued at
  exp?: number;  // Expiration time
  isAdmin?: boolean;  // Flag de admin (acesso universal exceto Logs)
  name?: string;  // Nome do usuário (usado como orçamentista ao criar orçamento)
}

/**
 * Gera um token JWT
 * 
 * @param payload - Objeto contendo id e role do usuário
 * @param payload.id - ID único do usuário
 * @param payload.role - Role/perfil do usuário (admin, user, etc)
 * @param expiration - Tempo de expiração (padrão: 7 dias)
 * @param extraFields - Campos extras para incluir no payload
 * @returns Token JWT assinado
 * 
 * @example
 * ```typescript
 * const token = generateToken({ id: 'user-123', role: 'admin' });
 * // Retorna: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * ```
 */
export const generateToken = (
  payload: { id: string; role: string },
  expiration: string = JWT_EXPIRATION,
  extraFields?: Record<string, any>
): string => {
  try {
    // Criar payload padronizado (usando 'userId' para compatibilidade com código existente)
    const tokenPayload: any = {
      userId: payload.id,
      role: payload.role,
      ...extraFields
    };

    // Gerar e retornar o token
    const token = jwt.sign(tokenPayload, JWT_SECRET as string, {
      expiresIn: expiration
    } as jwt.SignOptions);

    return token;
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw new Error('Falha ao gerar token de autenticação');
  }
};

/**
 * Valida e decodifica um token JWT
 * 
 * @param token - Token JWT a ser validado
 * @returns Payload decodificado do token
 * @throws Error se o token for inválido ou expirado
 * 
 * @example
 * ```typescript
 * try {
 *   const decoded = verifyToken(token);
 *   console.log(decoded.userId); // "user-123"
 *   console.log(decoded.role);   // "admin"
 * } catch (error) {
 *   console.error('Token inválido');
 * }
 * ```
 */
export const verifyToken = (token: string): DecodedToken => {
  try {
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    return decoded;
  } catch (error) {
    // Diferentes tipos de erro do JWT
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token ainda não é válido');
    } else {
      throw new Error('Falha ao validar token');
    }
  }
};

/**
 * Extrai o token do header Authorization
 * 
 * @param authHeader - Header de autorização (formato: "Bearer <token>")
 * @returns Token extraído ou null se inválido
 * 
 * @example
 * ```typescript
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (token) {
 *   const decoded = verifyToken(token);
 * }
 * ```
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove "Bearer " prefix
};

/**
 * Decodifica um token sem verificar a assinatura (útil para debug)
 * 
 * ⚠️ ATENÇÃO: Não use para validação de autenticação!
 * Esta função apenas decodifica sem verificar se o token é válido.
 * 
 * @param token - Token JWT
 * @returns Payload decodificado (sem validação)
 */
export const decodeTokenWithoutVerification = (token: string): any => {
  return jwt.decode(token);
};

// Exportar constantes úteis
export const JWT_CONFIG = {
  secret: JWT_SECRET,
  expiration: JWT_EXPIRATION
} as const;

