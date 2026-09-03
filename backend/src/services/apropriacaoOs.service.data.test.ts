import {
  parseDataDiaCivilInput,
  ymdCivilBrasilia,
  ymdDeDataDiaCivil,
} from '../utils/datetime-sp.util';

describe('apontamento OS — dia civil', () => {
  it('persiste e serializa o mesmo YYYY-MM-DD (meio-dia UTC)', () => {
    const entrada = '2026-09-01';
    const salvo = parseDataDiaCivilInput(entrada)!;
    expect(salvo.toISOString()).toBe('2026-09-01T12:00:00.000Z');
    expect(ymdDeDataDiaCivil(salvo)).toBe('2026-09-01');
    expect(ymdDeDataDiaCivil('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
  });

  it('hoje em Brasília é comparável por string YMD', () => {
    const hoje = ymdCivilBrasilia(new Date('2026-09-01T15:00:00.000Z'));
    expect(hoje.ano).toBe(2026);
    expect(hoje.mes).toBe(9);
    expect(hoje.dia).toBe(1);
  });
});
