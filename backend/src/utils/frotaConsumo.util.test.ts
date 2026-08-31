import { calcularIntervalosConsumo, calcularResumoConsumo } from './frotaConsumo.util';

describe('frotaConsumo.util', () => {
  it('calcula intervalos entre abastecimentos', () => {
    const intervalos = calcularIntervalosConsumo([
      { tipo: 'Combustível', data: '2026-01-01', km: 1000, litros: 40 },
      { tipo: 'Combustível', data: '2026-01-15', km: 1100, litros: 10 },
    ]);
    expect(intervalos.length).toBe(1);
    expect(intervalos[0].kmRodados).toBe(100);
    expect(intervalos[0].litros).toBe(10);
    expect(intervalos[0].kmPorLitro).toBe(10);
  });

  it('ignora intervalo com km negativo ou zero', () => {
    const intervalos = calcularIntervalosConsumo([
      { tipo: 'Combustível', data: '2026-01-01', km: 1100, litros: 40 },
      { tipo: 'Combustível', data: '2026-01-15', km: 1000, litros: 10 },
    ]);
    expect(intervalos.length).toBe(0);
  });

  it('resume consumo mensal e total', () => {
    const resumo = calcularResumoConsumo(
      [
        { tipo: 'Combustível', data: '2026-01-01', km: 1000, litros: 50 },
        { tipo: 'Combustível', data: '2026-01-20', km: 1500, litros: 50 },
        { tipo: 'Combustível', data: '2026-02-10', km: 2000, litros: 40 },
      ],
      '2026-02'
    );
    expect(resumo.consumoMedioTotalKmL).toBeCloseTo(11.111, 2);
    expect(resumo.historicoMensal.length).toBe(2);
    expect(resumo.consumoMedioMesAtualKmL).toBe(12.5);
  });
});
