import fs from 'fs';
import path from 'path';

/** Em produção o código roda em `dist/` com arquivos `.js`; em dev pode ser `src/routes` `.ts`. */
export function getRoutesDir(): string {
  const candidates = [
    path.join(__dirname, '../routes'),
    path.join(process.cwd(), 'dist', 'routes'),
    path.join(process.cwd(), 'src', 'routes'),
  ];
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    const hasRoutes = fs.readdirSync(dir).some((f) => /\.(ts|js)$/.test(f));
    if (hasRoutes) return dir;
  }
  return path.join(__dirname, '../routes');
}

/** Chave estável para casar `auth.ts` (registry) com `auth.js` (produção). */
export function normalizeRouteFileKey(filename: string): string {
  return path.basename(filename).replace(/\.(ts|js)$/i, '').toLowerCase();
}

export function resolveRouteFilePath(routeFile: string): string | null {
  const dir = getRoutesDir();
  const base = routeFile.replace(/\.(ts|js)$/i, '');
  const candidates = [`${base}.ts`, `${base}.js`, routeFile];
  for (const name of candidates) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

export interface ScannedRoute {
  method: string;
  relativePath: string;
  sourceFile: string;
}

const ROUTER_METHOD_RE =
  /router\.(get|post|put|patch|delete|options|head)\(\s*(?:\/\*[^*]*\*\/\s*)?['"`]([^'"`]+)['"`]/gi;

const APP_METHOD_RE =
  /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/gi;

function scanContent(content: string, sourceFile: string, target: ScannedRoute[]): void {
  let m: RegExpExecArray | null;
  ROUTER_METHOD_RE.lastIndex = 0;
  while ((m = ROUTER_METHOD_RE.exec(content)) !== null) {
    target.push({
      method: m[1].toUpperCase(),
      relativePath: m[2],
      sourceFile,
    });
  }
}

export function scanRouteFile(filename: string): ScannedRoute[] {
  const filePath = resolveRouteFilePath(filename);
  if (!filePath) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const routes: ScannedRoute[] = [];
  const sourceFile = path.basename(filePath);
  scanContent(content, sourceFile, routes);
  return routes;
}

/** Alguns módulos usam mais de um arquivo de rota no mesmo prefixo. */
const EXTRA_ROUTE_FILES: Record<string, string[]> = {
  'obra.routes.ts': ['obras.routes.ts', 'tarefasObra.ts', 'alocacao.routes.ts'],
  'nfe.ts': ['nfe.routes.ts'],
};

export function scanAllRouteFiles(): ScannedRoute[] {
  const routesDir = getRoutesDir();
  const all: ScannedRoute[] = [];
  const seenFiles = new Set<string>();

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|js)$/.test(entry.name) || seenFiles.has(full)) continue;
      seenFiles.add(full);
      const content = fs.readFileSync(full, 'utf8');
      if (!content.includes('router.')) continue;
      scanContent(content, path.relative(routesDir, full).replace(/\\/g, '/'), all);
    }
  };

  walk(routesDir);
  return all;
}

export function joinApiPath(prefix: string, relativePath: string): string {
  const p = prefix.replace(/\/$/, '');
  if (!relativePath || relativePath === '/') return p;
  const r = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${p}${r}`.replace(/\/{2,}/g, '/');
}

export function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}
