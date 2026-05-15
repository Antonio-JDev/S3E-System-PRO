import { StatusConsistenciaPonto } from '@prisma/client';
import { calcularMinutosLiquidos, calcularMetricasRegistro } from './ponto.service';

describe('ponto.service calcularMinutosLiquidos', () => {
  it('0 batidas: consistente e 0 minutos', () => {
    const r = calcularMinutosLiquidos([]);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(0);
  });

  it('2 batidas: intervalo único', () => {
    const r = calcularMinutosLiquidos(['08:00', '12:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(4 * 60);
  });

  it('4 batidas: dois intervalos', () => {
    const r = calcularMinutosLiquidos(['08:00', '12:00', '13:00', '18:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(4 * 60 + 5 * 60);
  });

  it('1 batida: inconsistente e 0 minutos', () => {
    const r = calcularMinutosLiquidos(['08:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.INCONSISTENTE);
    expect(r.minutos).toBe(0);
  });

  it('3 batidas em ordem crescente: consistente (manhã + tarde, mesma soma que 1ª–3ª)', () => {
    const r = calcularMinutosLiquidos(['08:00', '12:00', '17:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(9 * 60);
  });

  it('3 batidas (07:53, 12:28, 17:20): consistente — caso relógio sem 4ª batida', () => {
    const r = calcularMinutosLiquidos(['07:53', '12:28', '17:20']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe((17 * 60 + 20) - (7 * 60 + 53));
  });

  it('3 batidas fora de ordem: inconsistente', () => {
    const r = calcularMinutosLiquidos(['12:00', '08:00', '17:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.INCONSISTENTE);
    expect(r.minutos).toBe(17 * 60 - 12 * 60);
  });

  it('3 batidas com horários reais do relógio (crescentes)', () => {
    const r = calcularMinutosLiquidos(['08:19', '12:36', '15:38']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe((15 * 60 + 38) - (8 * 60 + 19));
  });

  it('5 batidas: calcula primeira-última (fallback) + inconsistente', () => {
    const r = calcularMinutosLiquidos(['07:00', '11:00', '12:00', '16:00', '18:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.INCONSISTENTE);
    // Fallback: 07:00 até 18:00 = 11h
    expect(r.minutos).toBe(11 * 60);
  });

  it('6 batidas: três intervalos consistentes', () => {
    const r = calcularMinutosLiquidos(['07:00', '11:00', '12:00', '16:00', '17:00', '19:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(4 * 60 + 4 * 60 + 2 * 60);
  });

  it('fim antes do início: inconsistente', () => {
    const r = calcularMinutosLiquidos(['18:00', '08:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.INCONSISTENTE);
    expect(r.minutos).toBe(0);
  });

  it('batidas com espaços são tratadas corretamente', () => {
    const r = calcularMinutosLiquidos(['  08:00  ', '12:00']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(4 * 60);
  });

  it('batidas vazias são filtradas', () => {
    const r = calcularMinutosLiquidos(['08:00', '', '12:00', '  ']);
    expect(r.status).toBe(StatusConsistenciaPonto.CONSISTENTE);
    expect(r.minutos).toBe(4 * 60);
  });
});

describe('ponto.service calcularMetricasRegistro (compensação atraso x extra)', () => {
  it('compensa atraso na entrada com extra na saída (mesmo dia)', () => {
    const r = calcularMetricasRegistro({
      batidas: ['08:06', '17:36'],
      ano: 2026,
      mes: 5,
      dia: 6,
      tipoContrato: 'REGISTRADO',
      toleranciaMinutos: 5,
      workShift: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:30' },
    });
    // Atraso bruto 6 min, extra bruto 6 min => atraso líquido 0
    expect(r.minutosAtraso).toBe(0);
    expect(r.minutosHorasDevidas).toBe(0);
  });

  it('não compensa quando não há extra suficiente', () => {
    const r = calcularMetricasRegistro({
      // Saída 17:33 ainda está dentro da tolerância (até 17:35) → zero extra; atraso bruto 10 permanece.
      batidas: ['08:10', '17:33'],
      ano: 2026,
      mes: 5,
      dia: 6,
      tipoContrato: 'REGISTRADO',
      toleranciaMinutos: 5,
      workShift: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:30' },
    });
    expect(r.minutosAtraso).toBe(10);

    const r2 = calcularMetricasRegistro({
      // Extra na saída é medido a partir do horário nominal (17:30), não do fim da tolerância.
      // 17:38 → 8 min extra; atraso bruto na entrada 10 min → sobram 2 min de atraso líquido.
      batidas: ['08:10', '17:38'],
      ano: 2026,
      mes: 5,
      dia: 6,
      tipoContrato: 'REGISTRADO',
      toleranciaMinutos: 5,
      workShift: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:30' },
    });
    expect(r2.minutosAtraso).toBe(2);
  });
});
