import { normalizeRouteFileKey, resolveRouteFilePath } from './scanRoutes';

describe('scanRoutes', () => {
  it('normalizeRouteFileKey iguala .ts e .js', () => {
    expect(normalizeRouteFileKey('auth.ts')).toBe('auth');
    expect(normalizeRouteFileKey('auth.js')).toBe('auth');
    expect(normalizeRouteFileKey('vendas.routes.ts')).toBe('vendas.routes');
  });

  it('resolveRouteFilePath encontra auth após build', () => {
    const resolved = resolveRouteFilePath('auth.ts');
    expect(resolved).toBeTruthy();
    expect(resolved).toMatch(/auth\.(ts|js)$/);
  });
});
