import { dataReferenciaDiaCivilUtc } from './datetime-sp.util';
import { calcularDiasAteVencimento, enriquecerVencimentosVeiculo } from './vencimentoVeiculo.util';

describe('vencimentoVeiculo.util', () => {
  it('calcula dias até vencimento em horário de Brasília', () => {
    const agora = dataReferenciaDiaCivilUtc(2026, 8, 1);
    expect(calcularDiasAteVencimento('2026-08-11', agora)).toBe(10);
  });

  it('marca proximo vencimento em 30 dias', () => {
    const agora = dataReferenciaDiaCivilUtc(2026, 8, 1);
    const r = enriquecerVencimentosVeiculo({ dataVencimentoIpva: '2026-08-16' }, agora);
    expect(r.ipvaProximoVencimento).toBe(true);
    expect(r.diasAteVencimentoIpva).toBe(15);
  });

  it('preserva dia civil em ISO meio-dia UTC (sem shift)', () => {
    const agora = dataReferenciaDiaCivilUtc(2026, 3, 15);
    expect(calcularDiasAteVencimento('2026-03-20T12:00:00.000Z', agora)).toBe(5);
  });
});
