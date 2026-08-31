import { describe, expect, it } from 'vitest';
import { deveAlocarPeriodoOs } from './periodoOs.util';

describe('deveAlocarPeriodoOs', () => {
  it('retorna false por padrão mesmo com projetoId', () => {
    expect(deveAlocarPeriodoOs({ projetoId: 'p1' })).toBe(false);
    expect(deveAlocarPeriodoOs({ projetoId: 'p1', alocarPeriodoOs: false })).toBe(false);
  });

  it('retorna true apenas com flag explícita', () => {
    expect(deveAlocarPeriodoOs({ projetoId: 'p1', alocarPeriodoOs: true })).toBe(true);
  });

  it('retorna false sem projeto', () => {
    expect(deveAlocarPeriodoOs({ alocarPeriodoOs: true })).toBe(false);
  });
});
