import fs from 'fs';
import path from 'path';
import { API_MOUNTS, INLINE_APP_ROUTES } from './mountRegistry';
import {
  joinApiPath,
  normalizeRouteFileKey,
  scanRouteFile,
  scanAllRouteFiles,
  toOpenApiPath,
  type ScannedRoute,
} from './scanRoutes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OasDoc = Record<string, any>;

let cachedSpec: OasDoc | null = null;

const OPENAPI_ARTIFACT_PATH = path.join(__dirname, '../openapi.generated.json');

function loadArtifactSpec(): OasDoc | null {
  if (process.env.OPENAPI_SKIP_ARTIFACT === '1') return null;
  const custom = process.env.OPENAPI_SPEC_FILE;
  const artifactPath = custom && fs.existsSync(custom) ? custom : OPENAPI_ARTIFACT_PATH;
  if (!fs.existsSync(artifactPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as OasDoc;
  } catch (err) {
    console.warn('OpenAPI: artefato inválido, regenerando via scan:', err instanceof Error ? err.message : err);
    return null;
  }
}

function operationId(method: string, path: string): string {
  const slug = path
    .replace(/^\/api\/?/, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${method.toLowerCase()}_${slug || 'root'}`;
}

function defaultOperation(
  method: string,
  path: string,
  tag: string,
  summary?: string
): Record<string, unknown> {
  const isPublic =
    path.includes('/public/') ||
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/forgot-password') ||
    path.includes('/auth/reset-password') ||
    path.includes('/auth/validate-reset-token') ||
    path.includes('/webhooks/') ||
    path.endsWith('/health') ||
    path.includes('/logo/') ||
    path.includes('/imagem/');

  const op: Record<string, unknown> = {
    tags: [tag],
    summary: summary || `${method} ${path}`,
    operationId: operationId(method, path),
    responses: {
      '200': { description: 'Sucesso' },
      '400': { description: 'Requisição inválida' },
      '401': { description: 'Não autenticado' },
      '403': { description: 'Sem permissão' },
      '404': { description: 'Não encontrado' },
      '500': { description: 'Erro interno' },
    },
  };

  if (!isPublic) {
    op.security = [{ bearerAuth: [] }];
  }

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    op.requestBody = {
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    };
  }

  return op;
}

function addPath(
  paths: Record<string, Record<string, unknown>>,
  method: string,
  fullPath: string,
  tag: string,
  summary?: string
): void {
  const oaPath = toOpenApiPath(fullPath);
  if (!paths[oaPath]) paths[oaPath] = {};
  const key = method.toLowerCase();
  const existing = paths[oaPath];
  if (existing[key]) return;
  existing[key] = defaultOperation(
    method,
    fullPath,
    tag,
    summary
  );
}

function routesForMount(mount: (typeof API_MOUNTS)[0], allScanned: ScannedRoute[]): ScannedRoute[] {
  if (!mount.routeFile) return [];
  const mountKey = normalizeRouteFileKey(mount.routeFile);
  const primary = scanRouteFile(mount.routeFile);
  const fromScan = allScanned.filter((r) => normalizeRouteFileKey(r.sourceFile) === mountKey);
  const merged = [...primary, ...fromScan];
  const seen = new Set<string>();
  return merged.filter((r) => {
    const k = `${r.method}:${r.relativePath}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function buildOpenApiSpec(): OasDoc {
  if (cachedSpec) return cachedSpec;

  const fromArtifact = loadArtifactSpec();
  if (fromArtifact) {
    cachedSpec = fromArtifact;
    return fromArtifact;
  }

  const paths: Record<string, Record<string, unknown>> = {};
  const allScanned = scanAllRouteFiles();
  const tagSet = new Map<string, string>();

  for (const mount of API_MOUNTS) {
    tagSet.set(mount.tag, mount.description);
    const routes = routesForMount(mount, allScanned);
    if (routes.length === 0) {
      addPath(paths, 'GET', mount.prefix, mount.tag, `Base ${mount.tag}`);
      continue;
    }
    for (const r of routes) {
      const full = joinApiPath(mount.prefix, r.relativePath);
      addPath(paths, r.method, full, mount.tag);
    }
  }

  for (const inline of INLINE_APP_ROUTES) {
    tagSet.set(inline.tag, tagSet.get(inline.tag) || inline.tag);
    addPath(paths, inline.method, inline.path, inline.tag, inline.summary);
  }

  const tags = Array.from(tagSet.entries())
    .map(([name, description]) => ({ name, description }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const spec: OasDoc = {
    openapi: '3.0.3',
    info: {
      title: 'S3E System API',
      version: '1.0.0',
      description: [
        'Documentação REST do **S3E System PRO** — engenharia elétrica, orçamentos, vendas, obras, financeiro, NF-e e WhatsApp.',
        '',
        'Autenticação: envie `Authorization: Bearer <token>` (JWT obtido em `POST /api/auth/login`).',
        '',
        'Interface interativa: `/api/docs/swagger` · JSON: `/api/docs/openapi.json`',
      ].join('\n'),
      contact: {
        name: 'S3E Engenharia',
      },
    },
    servers: [
      { url: '/', description: 'Servidor atual (relativo)' },
      { url: 'http://localhost:3001', description: 'Desenvolvimento local' },
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token retornado pelo login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  };

  cachedSpec = spec;
  return spec;
}

export function clearOpenApiCache(): void {
  cachedSpec = null;
}
