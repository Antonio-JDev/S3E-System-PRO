import {
  extrairFinalNumericoPlaca,
  ipvaJaPagoNoAno,
  ipvaVenceNoMes,
  mesVencimentoIpvaCotaUnica,
} from './ipvaPlaca.util';

describe('ipvaPlaca.util', () => {
  it('extrai final numérico de placas antigas e Mercosul', () => {
    expect(extrairFinalNumericoPlaca('ABC-1234')).toBe(4);
    expect(extrairFinalNumericoPlaca('ABC1D23')).toBe(3);
    expect(extrairFinalNumericoPlaca('invalid')).toBeNull();
  });

  it('mapeia mês de vencimento SC', () => {
    expect(mesVencimentoIpvaCotaUnica(1)).toBe(1);
    expect(mesVencimentoIpvaCotaUnica(4)).toBe(2);
    expect(mesVencimentoIpvaCotaUnica(9)).toBe(5);
    expect(mesVencimentoIpvaCotaUnica(0)).toBe(5);
  });

  it('detecta vencimento no mês', () => {
    expect(ipvaVenceNoMes('ABC-1234', 2)).toBe(true);
    expect(ipvaVenceNoMes('ABC-1234', 1)).toBe(false);
  });

  it('detecta IPVA pago no ano', () => {
    expect(
      ipvaJaPagoNoAno(
        [{ tipo: 'IPVA', data: '2026-03-15' }, { tipo: 'Combustível', data: '2026-01-01' }],
        2026
      )
    ).toBe(true);
    expect(ipvaJaPagoNoAno([{ tipo: 'IPVA', data: '2025-03-15' }], 2026)).toBe(false);
  });
});
