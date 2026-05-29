import { describe, expect, it } from 'vitest';
import {
  getRegredirStatusTargets,
  isOrcamentoConcretizadoVisual,
  ORCAMENTO_STATUS_PENDENTE,
} from './orcamentoStatus';

describe('orcamentoStatus (frontend)', () => {
  it('detecta concretizado visual', () => {
    expect(isOrcamentoConcretizadoVisual('Concretizado', false)).toBe(true);
    expect(isOrcamentoConcretizadoVisual('Aprovado', true)).toBe(true);
    expect(isOrcamentoConcretizadoVisual('Aprovado', false)).toBe(false);
  });

  it('opções de regressão para enviado', () => {
    expect(getRegredirStatusTargets('Enviado ao Cliente', false)).toEqual([ORCAMENTO_STATUS_PENDENTE]);
  });
});
