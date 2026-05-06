import { splitMinutosJornadaSegSex } from './autonomo-folha.util';

describe('autonomo-folha.util', () => {
  it('splitMinutosJornadaSegSex: 7h–19h → antes 8h extra50, jornada normal, 17h30–18h extra50, após 18h noturna', () => {
    const e = 7 * 60; // 07:00
    const s = 19 * 60; // 19:00
    const r = splitMinutosJornadaSegSex(e, s);
    expect(r.total).toBe(12 * 60);
    expect(r.normal).toBe(9 * 60 + 30); // 8:00–17:30
    expect(r.noturna).toBe(1 * 60); // 18:00–19:00
    expect(r.extra50).toBe(r.total - r.normal - r.noturna); // 60 + 30 = 90
  });
});
