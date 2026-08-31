import { diaElegivelParaFalta, ymdCivilBrasilia } from './datetime-sp.util';
import { minutosFaltaParaBanco } from './rhBancoFalta.util';

describe('diaElegivelParaFalta', () => {
  const agora = new Date('2026-08-17T18:00:00.000-03:00');

  it('rejeita dia futuro', () => {
    expect(diaElegivelParaFalta(2026, 8, 18, { agora })).toBe(false);
    expect(diaElegivelParaFalta(2026, 8, 31, { agora })).toBe(false);
  });

  it('aceita hoje e dias passados', () => {
    expect(diaElegivelParaFalta(2026, 8, 17, { agora })).toBe(true);
    expect(diaElegivelParaFalta(2026, 8, 3, { agora })).toBe(true);
  });

  it('rejeita dia anterior à admissão', () => {
    expect(
      diaElegivelParaFalta(2026, 5, 16, {
        agora,
        dataAdmissao: new Date(Date.UTC(2026, 4, 17)),
      }),
    ).toBe(false);
    expect(
      diaElegivelParaFalta(2026, 5, 18, {
        agora,
        dataAdmissao: new Date(Date.UTC(2026, 4, 17)),
      }),
    ).toBe(true);
  });
});

describe('minutosFaltaParaBanco', () => {
  const agora = new Date('2026-08-17T18:00:00.000-03:00');
  const jornada = 528; // 07:30–12:00 / 13:00–17:18

  it('Pendente RH não grava falta no banco', () => {
    expect(
      minutosFaltaParaBanco({
        minutosFaltaIntegral: jornada,
        tratamentoDebito: null,
        ano: 2026,
        mes: 8,
        dia: 3,
        agora,
      }),
    ).toBe(0);
  });

  it('B explícito em dia já ocorrido lança a jornada do dia', () => {
    expect(
      minutosFaltaParaBanco({
        minutosFaltaIntegral: jornada,
        tratamentoDebito: 'B',
        ano: 2026,
        mes: 8,
        dia: 3,
        agora,
      }),
    ).toBe(jornada);
  });

  it('não lança falta de dia futuro mesmo com B', () => {
    expect(
      minutosFaltaParaBanco({
        minutosFaltaIntegral: jornada,
        tratamentoDebito: 'B',
        ano: 2026,
        mes: 8,
        dia: 31,
        agora,
      }),
    ).toBe(0);
  });
});

describe('ymdCivilBrasilia', () => {
  it('usa o calendário de Brasília', () => {
    const d = ymdCivilBrasilia(new Date('2026-08-18T02:30:00.000Z')); // 23:30 do dia 17 em SP
    expect(d).toEqual({ ano: 2026, mes: 8, dia: 17 });
  });
});
