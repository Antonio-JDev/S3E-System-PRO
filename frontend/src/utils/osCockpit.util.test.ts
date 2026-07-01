import { describe, expect, it } from 'vitest';
import {
  calcularCustoTempoOrcado,
  calcularDiasCorridos,
  calcularDiasEntreDatas,
  calcularDiasEstimadosTexto,
  calcularLucroPerdaPrazo,
  detectarEstouroPrazoExecucao,
  type CockpitResumoItem,
} from './osCockpit.util';

describe('osCockpit.util', () => {
  it('calcula custo de tempo orçado (horas + diárias)', () => {
    expect(
      calcularCustoTempoOrcado({
        horasEngenhariaOrcadas: 10,
        diariasEquipeOrcadas: 5,
        valorHoraEngenharia: 100,
        valorDiariaEquipe: 400,
      })
    ).toBe(3000);
  });

  it('trata valores nulos como zero no custo orçado', () => {
    expect(
      calcularCustoTempoOrcado({
        horasEngenhariaOrcadas: 0,
        diariasEquipeOrcadas: 3,
        valorHoraEngenharia: null,
        valorDiariaEquipe: null,
      })
    ).toBe(0);
  });

  it('calcula dias corridos desde data de início', () => {
    const inicio = new Date('2026-01-01T12:00:00');
    const ref = new Date('2026-01-06T12:00:00');
    expect(calcularDiasCorridos(inicio, ref)).toBe(5);
    expect(calcularDiasCorridos(null)).toBe(0);
  });

  it('calcula dias entre datas de calendário', () => {
    expect(calcularDiasEntreDatas('2026-01-01', '2026-01-11')).toBe(10);
    expect(calcularDiasEntreDatas(null, '2026-01-11')).toBeNull();
  });

  it('formata texto de dias estimados priorizando diárias orçadas', () => {
    expect(calcularDiasEstimadosTexto(5)).toBe('~5 diárias');
    expect(calcularDiasEstimadosTexto(1)).toBe('~1 diária');
    expect(calcularDiasEstimadosTexto(0, '2026-01-01', '2026-01-08')).toBe('~7 dias');
    expect(calcularDiasEstimadosTexto(0)).toBe('—');
  });

  it('detecta estouro por diárias realizadas em EXECUCAO', () => {
    expect(
      detectarEstouroPrazoExecucao({
        status: 'EXECUCAO',
        diariasOrcadas: 10,
        diariasRealizadas: 11,
        diasCorridos: 5,
      })
    ).toEqual({ estourou: true, motivo: 'diarias' });
  });

  it('detecta estouro por dias corridos em EXECUCAO', () => {
    expect(
      detectarEstouroPrazoExecucao({
        status: 'EXECUCAO',
        diariasOrcadas: 10,
        diariasRealizadas: 8,
        diasCorridos: 12,
      })
    ).toEqual({ estourou: true, motivo: 'dias_corridos' });
  });

  it('não sinaliza estouro fora de EXECUCAO', () => {
    expect(
      detectarEstouroPrazoExecucao({
        status: 'APROVADO',
        diariasOrcadas: 5,
        diariasRealizadas: 20,
        diasCorridos: 30,
      })
    ).toEqual({ estourou: false, motivo: null });
  });

  it('calcula lucro/perda de prazo com desvio positivo (economia)', () => {
    const lucro = calcularLucroPerdaPrazo(
      {
        horasEngenhariaOrcadas: 20,
        horasEngenhariaRealizadas: 10,
        diariasEquipeOrcadas: 10,
        diariasEquipeRealizadas: 8,
      },
      { valorHoraEngenharia: 100, valorDiariaEquipe: 400 }
    );
    // (10h * 100) + (2d * 400) = 1800
    expect(lucro).toBe(1800);
  });

  it('CockpitResumoItem aceita shape esperado (type-check em runtime)', () => {
    const item: CockpitResumoItem = {
      diariasEquipeOrcadas: 10,
      diariasEquipeRealizadas: 3,
      custoTempoOrcado: 5000,
      dataPrevisao: '2026-12-31T00:00:00.000Z',
      diasCorridos: 4,
      estouroDiarias: false,
      estouroDiasCorridos: false,
    };
    expect(item.custoTempoOrcado).toBe(5000);
  });
});
