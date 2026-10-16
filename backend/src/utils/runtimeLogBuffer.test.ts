import { runtimeHttpLog } from '../middlewares/runtimeHttpLog';
import {
  CAPACIDADE_BUFFER,
  consultarBackendLogs,
  consultarHttpRequests,
  recordConsoleEvent,
  recordHttpExchange,
  resetRuntimeLogBufferForTests,
} from './runtimeLogBuffer';

describe('buffer de logs do backend', () => {
  beforeEach(() => {
    resetRuntimeLogBufferForTests();
  });

  it('guarda HTTP 2xx, 3xx, 4xx e 5xx sem query string, token ou userId em JWT', () => {
    recordHttpExchange({
      method: 'GET',
      path: '/api/clientes?token=segredo&page=1',
      statusCode: 200,
      durationMs: 12,
      userId: 'user-1',
    });
    recordHttpExchange({
      method: 'POST',
      path: '/api/orcamentos',
      statusCode: 302,
      durationMs: 4,
      userId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb',
    });
    recordHttpExchange({ method: 'PUT', path: '/api/compras/1', statusCode: 404, durationMs: 8, userId: 'user-2' });
    recordHttpExchange({ method: 'DELETE', path: '/api/kits/9', statusCode: 500, durationMs: 30, userId: 'user-3' });
    recordHttpExchange({ method: 'PATCH', path: '/api/health', statusCode: 200, durationMs: 1 });
    recordHttpExchange({ method: 'GET', path: '/api/mcp', statusCode: 200, durationMs: 2 });
    recordHttpExchange({ method: 'GET', path: '/api/ignorado', statusCode: 199, durationMs: 1 });
    recordHttpExchange({ method: 'OPTIONS', path: '/api/clientes', statusCode: 204, durationMs: 1 });

    const http = consultarHttpRequests({});
    expect(http.ok).toBe(true);
    const requests = http.requests as Array<{ method: string; path: string; statusCode: number; userId: string | null }>;
    expect(requests.map((item) => `${item.method} ${item.path} ${item.statusCode}`)).toEqual([
      'DELETE /api/kits/9 500',
      'PUT /api/compras/1 404',
      'POST /api/orcamentos 302',
      'GET /api/clientes 200',
    ]);
    expect(requests[3].userId).toBe('user-1');
    expect(requests[2].userId).toBeNull();
    expect(JSON.stringify(http)).not.toContain('segredo');
    expect(JSON.stringify(http)).not.toContain('eyJ');
    expect(JSON.stringify(http)).not.toContain('Authorization');
  });

  it('filtra método e faixa de status', () => {
    recordHttpExchange({ method: 'GET', path: '/api/a', statusCode: 200, durationMs: 1 });
    recordHttpExchange({ method: 'POST', path: '/api/b', statusCode: 422, durationMs: 1 });
    recordHttpExchange({ method: 'POST', path: '/api/c', statusCode: 503, durationMs: 1 });

    const soPost4xx = consultarHttpRequests({ method: 'POST', statusMin: 400, statusMax: 499 });
    const requests = soPost4xx.requests as Array<{ path: string; statusCode: number }>;
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ path: '/api/b', statusCode: 422 });
  });

  it('filtra logs por nível, path e since e descarta o token do console', () => {
    recordConsoleEvent('INFO', ['subiu']);
    recordConsoleEvent('ERROR', ['falha', new Error('stack de teste')]);
    recordConsoleEvent('WARN', ['Headers: Bearer abcdef-token-falso']);
    recordHttpExchange({ method: 'GET', path: '/api/logs/audit', statusCode: 200, durationMs: 5, userId: 'dev-1' });

    const erros = consultarBackendLogs({ level: 'ERROR', path: '/api/nao-existe' });
    expect((erros.logs as unknown[])).toHaveLength(0);

    const httpInfo = consultarBackendLogs({ level: 'INFO', path: 'logs/audit' });
    expect(httpInfo.total).toBe(1);

    const futuro = consultarBackendLogs({ since: '2999-01-01T00:00:00.000Z' });
    expect(futuro.total).toBe(0);

    const aviso = JSON.stringify(consultarBackendLogs({ level: 'WARN' }));
    expect(aviso).not.toContain('abcdef-token-falso');
    expect(aviso).toContain('[redigido]');

    const erro = JSON.stringify(consultarBackendLogs({ level: 'ERROR' }));
    expect(erro).toContain('stack de teste');

    recordConsoleEvent('INFO', ['chave', 'Bearer s3e_abc_def-123']);
    const comChave = JSON.stringify(consultarBackendLogs({}));
    expect(comChave).not.toContain('s3e_abc_def-123');
    expect(comChave).toContain('Bearer [redigido]');

    recordConsoleEvent('INFO', ['🔐 Middleware auth - Headers:', 'Bearer s3e_outro_token']);
    expect(JSON.stringify(consultarBackendLogs({}))).not.toContain('Middleware auth');
    expect(JSON.stringify(consultarBackendLogs({}))).not.toContain('s3e_outro_token');
  });

  it('mantém no máximo a capacidade do buffer', () => {
    for (let i = 0; i < CAPACIDADE_BUFFER + 25; i += 1) {
      recordHttpExchange({ method: 'GET', path: `/api/item/${i}`, statusCode: 200, durationMs: 1 });
    }
    const todos = consultarBackendLogs({ limit: 500 });
    const logs = todos.logs as Array<{ path: string }>;
    expect(logs).toHaveLength(CAPACIDADE_BUFFER);
    expect(logs[0].path).toBe(`/api/item/${CAPACIDADE_BUFFER + 24}`);
    expect(logs.some((item) => item.path === '/api/item/0')).toBe(false);
  });

  it('o middleware grava método, rota, status e userId sem header nem query', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/vendas?token=segredo',
      path: '/api/vendas',
      headers: { authorization: 'Bearer s3e_abc_def', cookie: 'session=1' },
      user: { userId: 'user-9' },
    };
    let finish: (() => void) | undefined;
    const res = {
      statusCode: 201,
      on: (evento: string, fn: () => void) => {
        if (evento === 'finish') finish = fn;
      },
    };

    runtimeHttpLog(req as never, res as never, () => undefined);
    finish?.();

    const texto = JSON.stringify(consultarHttpRequests({ method: 'POST' }));
    expect(texto).toContain('"path":"/api/vendas"');
    expect(texto).toContain('"statusCode":201');
    expect(texto).toContain('"userId":"user-9"');
    expect(texto).not.toContain('segredo');
    expect(texto).not.toContain('s3e_abc_def');
    expect(texto).not.toContain('session');
    expect(texto).not.toContain('authorization');
  });
});
