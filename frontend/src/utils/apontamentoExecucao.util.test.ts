import { describe, expect, it } from 'vitest';
import {
  diariasEquivalentes,
  formatarExecucaoDeQuantidade,
  formatarExecucaoLegivel,
  splitDiariasEquivalentes,
} from './apontamentoExecucao.util';

describe('apontamentoExecucao.util', () => {
  it('converte 1 dia + 4h em 1,5 diárias', () => {
    expect(diariasEquivalentes(1, 4)).toBe(1.5);
  });

  it('normaliza horas >= 8', () => {
    expect(diariasEquivalentes(0, 10)).toBe(1.25);
    expect(diariasEquivalentes(1, 10)).toBe(2.25);
  });

  it('splitDiariasEquivalentes reverte 1,5', () => {
    expect(splitDiariasEquivalentes(1.5)).toEqual({ dias: 1, horas: 4 });
  });

  it('formatarExecucaoLegivel', () => {
    expect(formatarExecucaoLegivel(1, 4, 1.5)).toContain('1d');
    expect(formatarExecucaoLegivel(1, 4, 1.5)).toContain('4h');
  });

  it('formatarExecucaoDeQuantidade', () => {
    expect(formatarExecucaoDeQuantidade(1.5)).toContain('1d');
  });
});
