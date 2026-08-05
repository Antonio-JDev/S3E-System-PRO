import { WORK_SHIFT_TEMPLATES_44H, calculateMonthlyTotal, calculateTimeDifference, jornadaMinutosPorDia } from './workshift.util';

describe('workshift.util', () => {
  it('calcula minutos de jornada diária corretamente', () => {
    const minutos = jornadaMinutosPorDia({
      entrada1: '08:00',
      saida1: '12:00',
      entrada2: '13:00',
      saida2: '17:48',
    });
    expect(minutos).toBe(528);
  });

  it('calcula total mensal sem hardcode para 220h', () => {
    const total = calculateMonthlyTotal(
      {
        entrada1: '08:00',
        saida1: '12:00',
        entrada2: '13:00',
        saida2: '17:00',
      },
      2026,
      4,
    );
    expect(total).toBeGreaterThan(0);
    expect(total).not.toBe(220);
  });

  it('considera tolerância de 5 minutos — atraso só além da janela', () => {
    const diff = calculateTimeDifference({
      batidaEntrada: new Date(2026, 3, 14, 8, 6, 0),
      batidaSaida: new Date(2026, 3, 14, 16, 54, 0),
      shiftEntrada: '08:00',
      shiftSaida: '17:00',
      toleranceMin: 5,
    });
    // 08:06 vs janela até 08:05 → 1 min; 16:54 vs janela desde 16:55 → 1 min
    expect(diff.minutosAtrasoEntrada).toBe(1);
    expect(diff.minutosSaidaAntecipada).toBe(1);
    expect(diff.minutosAtrasoTotal).toBe(2);
  });

  it('conta hora extra só o que passar da tolerância', () => {
    const diff = calculateTimeDifference({
      batidaEntrada: new Date(2026, 3, 14, 7, 54, 0),
      batidaSaida: new Date(2026, 3, 14, 17, 8, 0),
      shiftEntrada: '08:00',
      shiftSaida: '17:00',
      toleranceMin: 5,
    });
    // 07:54 vs janela desde 07:55 → 1 min; 17:08 vs janela até 17:05 → 3 min
    expect(diff.minutosExtraEntrada).toBe(1);
    expect(diff.minutosExtraSaida).toBe(3);
    expect(diff.minutosExtraTotal).toBe(4);
  });

  it('dentro da tolerância: zero atraso e zero extra', () => {
    const diff = calculateTimeDifference({
      batidaEntrada: new Date(2026, 3, 14, 8, 5, 0),
      batidaSaida: new Date(2026, 3, 14, 16, 55, 0),
      shiftEntrada: '08:00',
      shiftSaida: '17:00',
      toleranceMin: 5,
    });
    expect(diff.minutosAtrasoEntrada).toBe(0);
    expect(diff.minutosSaidaAntecipada).toBe(0);
    expect(diff.minutosExtraEntrada).toBe(0);
    expect(diff.minutosExtraSaida).toBe(0);
  });

  it('inclui template de jornada 40h (08:00–12:00 / 13:00–17:00)', () => {
    const t = WORK_SHIFT_TEMPLATES_44H.find((x) => x.nome.startsWith('40h'));
    expect(t).toBeTruthy();
    expect(t?.entrada1).toBe('08:00');
    expect(t?.saida1).toBe('12:00');
    expect(t?.entrada2).toBe('13:00');
    expect(t?.saida2).toBe('17:00');
  });
});
