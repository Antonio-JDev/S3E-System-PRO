import { describe, expect, it } from 'vitest';
import { osVisivelNoCalendario } from './osCalendarioLista.util';

describe('osVisivelNoCalendario', () => {
  it('mostra pendente, validada, aprovada e em execução', () => {
    expect(osVisivelNoCalendario('PROPOSTA')).toBe(true);
    expect(osVisivelNoCalendario('VALIDADO')).toBe(true);
    expect(osVisivelNoCalendario('APROVADO')).toBe(true);
    expect(osVisivelNoCalendario('EXECUCAO')).toBe(true);
  });

  it('esconde concluída e cancelada', () => {
    expect(osVisivelNoCalendario('CONCLUIDO')).toBe(false);
    expect(osVisivelNoCalendario('CANCELADO')).toBe(false);
  });
});
