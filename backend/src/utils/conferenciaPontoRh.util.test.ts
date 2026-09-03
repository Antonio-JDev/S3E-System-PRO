import {
  botaoHabilitadoConferencia,
  ehFaltaDiaConferencia,
  temCreditoAvaliacaoConferencia,
  temDebitoAvaliacaoConferencia,
} from './conferenciaPontoRh.util';

describe('conferenciaPontoRh.util', () => {
  it('detecta falta de dia útil sem registro', () => {
    expect(
      ehFaltaDiaConferencia({
        temRegistro: false,
        ehFimDeSemana: false,
        ehFeriado: false,
        faltaJustificada: false,
      }),
    ).toBe(true);
  });

  it('habilita A apenas com débito', () => {
    const ctx = {
      temRegistro: true,
      ehFimDeSemana: false,
      ehFeriado: false,
      faltaJustificada: false,
      minutosAtraso: 6,
      minutosExtraTotal: 0,
    };
    expect(temDebitoAvaliacaoConferencia(ctx)).toBe(true);
    expect(temCreditoAvaliacaoConferencia(ctx)).toBe(false);
    expect(botaoHabilitadoConferencia('A', ctx)).toBe(true);
    expect(botaoHabilitadoConferencia('P', ctx)).toBe(false);
  });

  it('habilita B com crédito de fim de semana trabalhado', () => {
    const ctx = {
      temRegistro: true,
      ehFimDeSemana: true,
      ehFeriado: false,
      faltaJustificada: false,
      horasLiquidas: 4,
      minutosExtraTotal: 0,
      minutosExtra20: 0,
    };
    expect(botaoHabilitadoConferencia('B', ctx)).toBe(true);
    expect(botaoHabilitadoConferencia('A', ctx)).toBe(false);
  });
});
