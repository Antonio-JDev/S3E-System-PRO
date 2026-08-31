import { calcularDiasAteVencimento, enriquecerVencimentosVeiculo } from './vencimentoVeiculo.util';

describe('vencimentoVeiculo.util', () => {
  it('calcula dias até vencimento', () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const futuro = new Date(hoje);
    futuro.setDate(futuro.getDate() + 10);
    const ymd = futuro.toISOString().slice(0, 10);
    expect(calcularDiasAteVencimento(ymd)).toBe(10);
  });

  it('marca proximo vencimento em 30 dias', () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const futuro = new Date(hoje);
    futuro.setDate(futuro.getDate() + 15);
    const r = enriquecerVencimentosVeiculo({ dataVencimentoIpva: futuro.toISOString().slice(0, 10) });
    expect(r.ipvaProximoVencimento).toBe(true);
    expect(r.diasAteVencimentoIpva).toBe(15);
  });
});
