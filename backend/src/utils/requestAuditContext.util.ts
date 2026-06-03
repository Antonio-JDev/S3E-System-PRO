import type { Request } from 'express';
import type { AuthRequest } from '../middlewares/auth';

export type RequestNetworkContext = {
  clientIp: string;
  ipChain: string[];
  realIp?: string;
  remoteAddress?: string;
  host?: string;
  protocol: string;
  secure: boolean;
  origin?: string;
  referer?: string;
  forwardedProto?: string;
  forwardedHost?: string;
  userAgent?: string;
};

const SKIP_PATH_PREFIXES = [
  '/api/health',
  '/health',
  '/api/docs',
  '/api/webhooks/',
  '/uploads/',
  '/api/configuracoes/logo/',
  '/api/materiais/imagem/',
];

const SKIP_EXACT = new Set([
  'GET /api/logs/audit',
  'GET /api/logs/analytics',
  'OPTIONS',
]);

/** Rotas com auditoria manual mais rica — evita duplicata genérica. */
const SKIP_MANUAL_AUDIT = new Set([
  'POST /api/auth/login',
]);

function normalizeIp(raw: string | undefined): string | undefined {
  if (!raw || raw === 'unknown') return undefined;
  const t = raw.trim();
  if (t.startsWith('::ffff:')) return t.slice(7);
  return t;
}

function parseForwardedChain(header: string | string[] | undefined): string[] {
  if (!header) return [];
  const raw = Array.isArray(header) ? header.join(',') : header;
  return raw
    .split(',')
    .map((p) => normalizeIp(p))
    .filter((p): p is string => Boolean(p));
}

/**
 * IP do cliente considerando proxy reverso (nginx, Traefik, etc.).
 */
export function resolveClientIp(req: Request): string {
  const chain = parseForwardedChain(req.headers['x-forwarded-for']);
  const real = normalizeIp(
    typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : undefined
  );
  const expressIp = normalizeIp(req.ip);
  const socketIp = normalizeIp(req.socket?.remoteAddress);

  return chain[0] || real || expressIp || socketIp || 'desconhecido';
}

export function buildNetworkContext(req: Request): RequestNetworkContext {
  const ipChain = parseForwardedChain(req.headers['x-forwarded-for']);
  const clientIp = resolveClientIp(req);
  const realIp = normalizeIp(
    typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : undefined
  );

  return {
    clientIp,
    ipChain: ipChain.length ? ipChain : clientIp !== 'desconhecido' ? [clientIp] : [],
    realIp,
    remoteAddress: normalizeIp(req.socket?.remoteAddress),
    host: req.headers.host,
    protocol: req.protocol,
    secure: Boolean(req.secure),
    origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    referer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
    forwardedProto:
      typeof req.headers['x-forwarded-proto'] === 'string'
        ? req.headers['x-forwarded-proto']
        : undefined,
    forwardedHost:
      typeof req.headers['x-forwarded-host'] === 'string'
        ? req.headers['x-forwarded-host']
        : undefined,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

export function parseApiResource(path: string): { entity: string; entityId?: string } {
  const clean = path.split('?')[0] || path;
  const match = clean.match(/^\/api\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return { entity: 'api' };

  const entity = match[1];
  const second = match[2];
  const reserved = new Set([
    'search',
    'stats',
    'export',
    'health',
    'audit',
    'analytics',
    'backfill-orcamentista',
    'meta',
    'openapi.json',
    'swagger',
  ]);
  const entityId =
    second && !reserved.has(second) && second.length <= 64 ? second : undefined;

  return { entity, entityId };
}

export function httpMethodToAction(method: string, statusCode: number): string {
  if (statusCode >= 400) return 'ERROR';
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD') return 'VIEW';
  if (m === 'POST') return 'CREATE';
  if (m === 'PUT' || m === 'PATCH') return 'UPDATE';
  if (m === 'DELETE') return 'DELETE';
  return 'ACCESS';
}

export function shouldSkipAuditRequest(req: Request): boolean {
  if (req.method === 'OPTIONS') return true;
  const path = req.path || req.url?.split('?')[0] || '';
  if (!path.startsWith('/api')) return true;
  for (const prefix of SKIP_PATH_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  const key = `${req.method} ${path}`;
  if (SKIP_EXACT.has(key)) return true;
  if (SKIP_MANUAL_AUDIT.has(key)) return true;
  return false;
}

export function shouldAuditHttpRequest(req: Request, statusCode: number): boolean {
  if (shouldSkipAuditRequest(req)) return false;
  const method = req.method.toUpperCase();
  if (statusCode >= 400) return true;
  if (method === 'GET' || method === 'HEAD') return false;
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export function buildAuditDescription(
  req: Request,
  statusCode: number,
  action: string,
  entity?: string,
  entityId?: string
): string {
  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.path;
  const target = entityId ? `${entity}/${entityId}` : entity || 'recurso';
  if (action === 'ERROR') {
    return `Falha ${method} ${path} → HTTP ${statusCode} (${target})`;
  }
  return `${action} ${target} via ${method} ${path} → HTTP ${statusCode}`;
}

export function getAuditUserFromRequest(req: Request): {
  userId?: string;
  userName?: string;
  userRole?: string;
} {
  const user = (req as AuthRequest).user;
  if (!user) return {};
  return {
    userId: user.userId,
    userName: user.name,
    userRole: user.role,
  };
}

/** Campos sensíveis removidos do corpo antes de gravar em metadata. */
const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'refreshToken',
  'secret',
  'authorization',
]);

export function sanitizeBodyForAudit(body: unknown): unknown {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return body === undefined ? undefined : body;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeBodyForAudit(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
