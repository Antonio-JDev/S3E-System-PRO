import { describe, expect, it } from 'vitest';
import {
  HORAS_JORNADA_APONTAMENTO,
  calcularHoraExtra,
  decomporHorasDoDia,
  decomporQuantidadeNoDia,
  diariasDeHorasTotais,
  diariasEquivalentes,
  diariasEquivalentesVariosDias,
  formatarExecucaoComHe,
  formatarExecucaoDeQuantidade,
  formatarExecucaoLegivel,
  horasTotaisDeDiarias,
  horasTotaisDoDia,
  separarTotalEmRegularesEHe,
  splitDiariasEquivalentes,
} from './apontamentoExecucao.util';

describe('apontamentoExecucao.util', () => {
  it('constante de jornada padrão é 8,48h', () => {
    expect(HORAS_JORNADA_APONTAMENTO).toBe(8.48);
  });

  it('converte 1 dia + 4h em 1,5 diárias (sem rollover)', () => {
    expect(diariasEquivalentes(1, 4)).toBe(1.5);
  });

  it('horas >= 8 NÃO viram dia seguinte — ficam na mesma quantidade', () => {
    expect(diariasEquivalentes(0, 10)).toBe(1.25);
    expect(diariasEquivalentes(1, 10)).toBe(2.25);
  });

  it('10h no mesmo dia → 8,48 regulares + 1,52 HE', () => {
    expect(calcularHoraExtra(10)).toBe(1.52);
    expect(decomporHorasDoDia(10)).toEqual({
      horasRegulares: 8.48,
      horaExtra: 1.52,
      horasTotais: 10,
    });
    expect(diariasDeHorasTotais(10)).toBe(1.25);
  });

  it('9h no mesmo dia → 8,48 regulares + 0,52 HE', () => {
    expect(calcularHoraExtra(9)).toBe(0.52);
    expect(decomporHorasDoDia(9)).toEqual({
      horasRegulares: 8.48,
      horaExtra: 0.52,
      horasTotais: 9,
    });
  });

  it('horas dentro da jornada não geram HE', () => {
    expect(calcularHoraExtra(8)).toBe(0);
    expect(calcularHoraExtra(8.48)).toBe(0);
    expect(decomporHorasDoDia(8)).toEqual({
      horasRegulares: 8,
      horaExtra: 0,
      horasTotais: 8,
    });
  });

  it('HE manual pode ser sobrescrita pelo usuário', () => {
    expect(decomporHorasDoDia(10, 2)).toEqual({
      horasRegulares: 8,
      horaExtra: 2,
      horasTotais: 10,
    });
  });

  it('separarTotalEmRegularesEHe e horasTotaisDoDia (campos editáveis)', () => {
    expect(separarTotalEmRegularesEHe(10)).toEqual({
      horasRegulares: 8.48,
      horaExtra: 1.52,
      horasTotais: 10,
    });
    expect(horasTotaisDoDia(8.48, 1.52)).toBe(10);
    expect(diariasDeHorasTotais(horasTotaisDoDia(8.48, 2))).toBe(1.31);
  });

  it('vários dias calculam HE por dia e somam diárias', () => {
    const dias = [
      { horas: 10 }, // 8.48 + 1.52 HE → 1.25d
      { horas: 9 }, // 8.48 + 0.52 HE → 1.125d
      { horas: 8 }, // sem HE → 1d
    ];
    expect(dias.map((d) => calcularHoraExtra(d.horas))).toEqual([1.52, 0.52, 0]);
    expect(diariasEquivalentesVariosDias(dias)).toBe(1.25 + 1.125 + 1);
  });

  it('decomporQuantidadeNoDia reabre 10h (1,25d) com HE', () => {
    const qtd = diariasDeHorasTotais(10);
    expect(qtd).toBe(1.25);
    expect(decomporQuantidadeNoDia(qtd)).toEqual({
      horasRegulares: 8.48,
      horaExtra: 1.52,
      horasTotais: 10,
      diarias: 1.25,
    });
  });

  it('horasTotaisDeDiarias é inverso de diariasDeHorasTotais', () => {
    expect(horasTotaisDeDiarias(1.25)).toBe(10);
    expect(horasTotaisDeDiarias(1)).toBe(8);
  });

  it('splitDiariasEquivalentes reverte 1,5', () => {
    expect(splitDiariasEquivalentes(1.5)).toEqual({ dias: 1, horas: 4 });
  });

  it('formatarExecucaoLegivel', () => {
    expect(formatarExecucaoLegivel(1, 4, 1.5)).toContain('1d');
    expect(formatarExecucaoLegivel(1, 4, 1.5)).toContain('4h');
  });

  it('formatarExecucaoComHe e formatarExecucaoDeQuantidade com HE', () => {
    expect(formatarExecucaoComHe(8.48, 1.52, 1.25)).toContain('HE');
    expect(formatarExecucaoDeQuantidade(1.25)).toContain('HE');
    expect(formatarExecucaoDeQuantidade(1.5)).toContain('HE');
  });

  it('formatarExecucaoDeQuantidade sem HE mantém formato legado', () => {
    expect(formatarExecucaoDeQuantidade(1)).toBe('1d');
    expect(formatarExecucaoDeQuantidade(0.5)).toContain('4h');
  });

  it('1 hora de execução não vira 1,04h após salvar e reabrir', () => {
    const eq = diariasEquivalentes(0, 1);
    expect(eq).toBe(0.125);
    expect(splitDiariasEquivalentes(eq)).toEqual({ dias: 0, horas: 1 });
  });
});
