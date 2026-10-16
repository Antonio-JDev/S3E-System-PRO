import { inspect } from 'util';

/**
 * Buffer circular em memória do processo Node.
 * A página Logs (histórico) continua em `audit_logs`.
 * Aqui ficam só os eventos recentes para o MCP ler em request/response.
 * Não guarda Authorization, cookie, query string nem corpo de webhook.
 */

export const CAPACIDADE_BUFFER = 400;
const LIMITE_PADRAO = 100;
const LIMITE_MAX = 500;
const TEXTO_MAX = 1500;

export type NivelRuntime = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type FonteRuntime = 'console' | 'http';

export type RuntimeLogEntry = {
  id: number;
  createdAt: string;
  level: NivelRuntime;
  source: FonteRuntime;
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  stack?: string;
};

const METODOS_HTTP = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);
const PREFIXOS_IGNORADOS = ['/api/health', '/health', '/api/mcp'];

const buffer: RuntimeLogEntry[] = [];
let proximoId = 1;
let capturaConsoleInstalada = false;
let capturando = false;

const consoleOriginal = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

export function resetRuntimeLogBufferForTests(): void {
  buffer.length = 0;
  proximoId = 1;
}

export function pathSemQuery(raw: string): string {
  const texto = String(raw || '');
  const semHash = texto.split('#')[0] || '';
  const semQuery = semHash.split('?')[0] || '';
  return semQuery.slice(0, 300);
}

export function deveIgnorarPathHttp(path: string): boolean {
  const p = pathSemQuery(path);
  return PREFIXOS_IGNORADOS.some((prefixo) => p === prefixo || p.startsWith(`${prefixo}/`));
}

/** Só aceita id já resolvido no req (não JWT, não Bearer). */
export function userIdSeguro(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const id = valor.trim();
  if (!id || id.length > 80 || /\s/.test(id)) return undefined;
  if (/bearer/i.test(id)) return undefined;
  if (/^eyJ[A-Za-z0-9_-]+\./.test(id)) return undefined;
  return id;
}

export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/=_]+/gi, 'Bearer [redigido]')
    .replace(/(authorization["']?\s*[:=]\s*["']?)([^"'\s,}\]]+)/gi, '$1[redigido]')
    .replace(/(cookie["']?\s*[:=]\s*["']?)([^"'\n]+)/gi, '$1[redigido]')
    .replace(/([?&](?:token|access_token|refresh_token|api_key|apikey|authorization)=)[^&\s#]+/gi, '$1[redigido]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[jwt redigido]');
}

function truncar(texto: string, max = TEXTO_MAX): string {
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max)}…`;
}

function formatarArgs(args: unknown[]): string {
  const texto = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return inspect(arg, { depth: 2, maxStringLength: 200, breakLength: 120, compact: true });
      } catch {
        return String(arg);
      }
    })
    .join(' ');
  return truncar(redactSecrets(texto));
}

function empurrar(entrada: Omit<RuntimeLogEntry, 'id' | 'createdAt'> & { createdAt?: string }): void {
  const message = entrada.message.trim();
  if (!message) return;
  buffer.push({
    ...entrada,
    message,
    id: proximoId++,
    createdAt: entrada.createdAt || new Date().toISOString(),
  });
  while (buffer.length > CAPACIDADE_BUFFER) buffer.shift();
}

function ehDespejoDeCredencial(texto: string): boolean {
  return /middleware auth\s*-\s*headers/i.test(texto) || /authorization\s*[:=]/i.test(texto);
}

export function recordConsoleEvent(level: NivelRuntime, args: unknown[]): void {
  const message = formatarArgs(args);
  if (ehDespejoDeCredencial(message)) return;
  const err = args.find((item): item is Error => item instanceof Error);
  const stack = err?.stack ? truncar(redactSecrets(err.stack)) : undefined;
  empurrar({
    level,
    source: 'console',
    message,
    stack,
  });
}

export function recordHttpExchange(input: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
}): void {
  const method = String(input.method || '').toUpperCase();
  const path = pathSemQuery(input.path);
  if (!METODOS_HTTP.has(method)) return;
  if (deveIgnorarPathHttp(path)) return;
  const statusCode = Number(input.statusCode);
  if (!Number.isInteger(statusCode) || statusCode < 200 || statusCode > 599) return;

  const level: NivelRuntime = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
  const durationMs = Math.max(0, Math.round(Number(input.durationMs) || 0));
  empurrar({
    level,
    source: 'http',
    method,
    path,
    statusCode,
    durationMs,
    userId: userIdSeguro(input.userId),
    message: `${method} ${path} → HTTP ${statusCode} (${durationMs} ms)`,
  });
}

function envolverConsole(
  level: NivelRuntime,
  original: (...args: unknown[]) => void
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    if (!capturando) {
      capturando = true;
      try {
        recordConsoleEvent(level, args);
      } catch {
        /* o buffer não pode quebrar o log original */
      } finally {
        capturando = false;
      }
    }
    original(...args);
  };
}

/** Uma vez por processo. Morgan segue no stdout e não é copiado para não duplicar a request. */
export function installRuntimeConsoleCapture(): void {
  if (capturaConsoleInstalada) return;
  capturaConsoleInstalada = true;
  console.log = envolverConsole('INFO', consoleOriginal.log) as typeof console.log;
  console.info = envolverConsole('INFO', consoleOriginal.info) as typeof console.info;
  console.warn = envolverConsole('WARN', consoleOriginal.warn) as typeof console.warn;
  console.error = envolverConsole('ERROR', consoleOriginal.error) as typeof console.error;
  console.debug = envolverConsole('DEBUG', consoleOriginal.debug) as typeof console.debug;
}

type FiltroComum = {
  limit?: number;
  path?: string;
  statusMin?: number;
  statusMax?: number;
  since?: string;
  level?: string;
  method?: string;
};

function limitar(valor: unknown): { ok: true; limit: number } | { ok: false; error: string } {
  if (valor == null || valor === '') return { ok: true, limit: LIMITE_PADRAO };
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > LIMITE_MAX) {
    return { ok: false, error: `limit deve ser um inteiro entre 1 e ${LIMITE_MAX}.` };
  }
  return { ok: true, limit: n };
}

function statusOpcional(
  valor: unknown,
  nome: string
): { ok: true; status?: number } | { ok: false; error: string } {
  if (valor == null || valor === '') return { ok: true };
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 200 || n > 599) {
    return { ok: false, error: `${nome} deve ser um inteiro entre 200 e 599.` };
  }
  return { ok: true, status: n };
}

function sinceOpcional(valor: unknown): { ok: true; since?: Date } | { ok: false; error: string } {
  if (valor == null || String(valor).trim() === '') return { ok: true };
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return { ok: false, error: 'since inválido. Use uma data ISO-8601.' };
  return { ok: true, since: data };
}

function filtrar(entradas: RuntimeLogEntry[], filtro: FiltroComum, since?: Date): RuntimeLogEntry[] {
  const trecho = filtro.path?.trim().toLowerCase();
  return entradas.filter((item) => {
    if (filtro.level && item.level !== filtro.level) return false;
    if (filtro.method && item.method !== filtro.method) return false;
    if (since && new Date(item.createdAt).getTime() < since.getTime()) return false;
    if (trecho) {
      if (!item.path || !item.path.toLowerCase().includes(trecho)) return false;
    }
    if (filtro.statusMin != null || filtro.statusMax != null) {
      if (item.statusCode == null) return false;
      if (filtro.statusMin != null && item.statusCode < filtro.statusMin) return false;
      if (filtro.statusMax != null && item.statusCode > filtro.statusMax) return false;
    }
    return true;
  });
}

function maisRecentes(entradas: RuntimeLogEntry[], limit: number): RuntimeLogEntry[] {
  return [...entradas].reverse().slice(0, limit);
}

export function consultarBackendLogs(params: FiltroComum = {}): Record<string, unknown> {
  const nivel = params.level == null || String(params.level).trim() === '' ? undefined : String(params.level).trim().toUpperCase();
  if (nivel && nivel !== 'ERROR' && nivel !== 'WARN' && nivel !== 'INFO' && nivel !== 'DEBUG') {
    return { ok: false, error: 'level deve ser ERROR, WARN, INFO ou DEBUG.' };
  }
  const limite = limitar(params.limit);
  if (!limite.ok) return limite;
  const minimo = statusOpcional(params.statusMin, 'statusMin');
  if (!minimo.ok) return minimo;
  const maximo = statusOpcional(params.statusMax, 'statusMax');
  if (!maximo.ok) return maximo;
  if (minimo.status != null && maximo.status != null && minimo.status > maximo.status) {
    return { ok: false, error: 'statusMin não pode ser maior que statusMax.' };
  }
  const desde = sinceOpcional(params.since);
  if (!desde.ok) return desde;

  const filtro: FiltroComum = {
    level: nivel as NivelRuntime | undefined,
    path: typeof params.path === 'string' ? params.path : undefined,
    statusMin: minimo.status,
    statusMax: maximo.status,
  };
  const logs = maisRecentes(filtrar(buffer, filtro, desde.since), limite.limit);
  return {
    ok: true,
    fonte: 'buffer_memoria',
    capacidade: CAPACIDADE_BUFFER,
    filtro: {
      level: nivel ?? null,
      limit: limite.limit,
      since: desde.since ? desde.since.toISOString() : null,
      path: filtro.path?.trim() || null,
      statusMin: minimo.status ?? null,
      statusMax: maximo.status ?? null,
    },
    total: logs.length,
    logs,
  };
}

export function consultarHttpRequests(params: FiltroComum = {}): Record<string, unknown> {
  const metodoBruto = params.method == null || String(params.method).trim() === '' ? undefined : String(params.method).trim().toUpperCase();
  if (metodoBruto && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(metodoBruto)) {
    return { ok: false, error: 'method deve ser GET, POST, PUT, PATCH ou DELETE.' };
  }
  const limite = limitar(params.limit);
  if (!limite.ok) return limite;
  const minimo = statusOpcional(params.statusMin ?? 200, 'statusMin');
  if (!minimo.ok) return minimo;
  const maximo = statusOpcional(params.statusMax ?? 599, 'statusMax');
  if (!maximo.ok) return maximo;
  if (minimo.status != null && maximo.status != null && minimo.status > maximo.status) {
    return { ok: false, error: 'statusMin não pode ser maior que statusMax.' };
  }

  const http = buffer.filter((item) => item.source === 'http');
  const requests = maisRecentes(
    filtrar(http, { method: metodoBruto, statusMin: minimo.status, statusMax: maximo.status }, undefined),
    limite.limit
  ).map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    method: item.method,
    path: item.path,
    statusCode: item.statusCode,
    durationMs: item.durationMs,
    userId: item.userId ?? null,
    level: item.level,
  }));

  return {
    ok: true,
    fonte: 'buffer_memoria',
    filtro: {
      method: metodoBruto ?? null,
      statusMin: minimo.status ?? 200,
      statusMax: maximo.status ?? 599,
      limit: limite.limit,
    },
    total: requests.length,
    requests,
  };
}
