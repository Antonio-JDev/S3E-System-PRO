import {
  httpMethodToAction,
  parseApiResource,
  resolveClientIp,
  shouldAuditHttpRequest,
  shouldSkipAuditRequest,
} from './requestAuditContext.util';

describe('requestAuditContext', () => {
  it('resolveClientIp prioriza x-forwarded-for', () => {
    const req = {
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.2' },
      socket: { remoteAddress: '10.0.0.9' },
    } as any;
    expect(resolveClientIp(req)).toBe('203.0.113.5');
  });

  it('parseApiResource extrai entidade e id', () => {
    expect(parseApiResource('/api/orcamentos/abc-123')).toEqual({
      entity: 'orcamentos',
      entityId: 'abc-123',
    });
    expect(parseApiResource('/api/logs/audit')).toEqual({ entity: 'logs' });
  });

  it('httpMethodToAction mapeia erro e mutações', () => {
    expect(httpMethodToAction('POST', 201)).toBe('CREATE');
    expect(httpMethodToAction('DELETE', 404)).toBe('ERROR');
    expect(httpMethodToAction('GET', 200)).toBe('VIEW');
  });

  it('shouldAuditHttpRequest ignora GET ok e audita POST', () => {
    const getReq = { method: 'GET', path: '/api/vendas', url: '/api/vendas' } as any;
    expect(shouldAuditHttpRequest(getReq, 200)).toBe(false);
    const postReq = { method: 'POST', path: '/api/vendas', url: '/api/vendas' } as any;
    expect(shouldAuditHttpRequest(postReq, 201)).toBe(true);
    expect(shouldAuditHttpRequest(getReq, 403)).toBe(true);
  });

  it('shouldSkipAuditRequest ignora polling de logs', () => {
    const req = { method: 'GET', path: '/api/logs/audit', url: '/api/logs/audit' } as any;
    expect(shouldSkipAuditRequest(req)).toBe(true);
  });
});
