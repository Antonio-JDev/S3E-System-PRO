import { describe, expect, it } from 'vitest';
import { statusBadgeClass, statusLabel } from './osStatus.util';

describe('osStatus.util', () => {
  it('mapeia labels de status da OS', () => {
    expect(statusLabel('PROPOSTA')).toBe('Pendente');
    expect(statusLabel('EXECUCAO')).toBe('Em Execução');
    expect(statusLabel('CONCLUIDO')).toBe('Concluída');
    expect(statusLabel('CUSTOM')).toBe('CUSTOM');
  });

  it('retorna classes de badge por status', () => {
    expect(statusBadgeClass('PROPOSTA')).toContain('amber');
    expect(statusBadgeClass('EXECUCAO')).toContain('sky');
    expect(statusBadgeClass('CONCLUIDO')).toContain('emerald');
  });
});
