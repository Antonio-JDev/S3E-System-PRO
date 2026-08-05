import {
  aplicaHorasExtras100NoPonto,
  labelTipoContrato,
  usaDiaria,
  usaJornadaEBanco,
  usaTarifasAutonomoClassico,
} from './tipoContrato.util';

describe('tipoContrato.util', () => {
  it('usaJornadaEBanco só CLT e Autônomo+banco', () => {
    expect(usaJornadaEBanco('REGISTRADO')).toBe(true);
    expect(usaJornadaEBanco('AUTONOMO_BANCO_HORAS')).toBe(true);
    expect(usaJornadaEBanco('AUTONOMO')).toBe(false);
  });

  it('usaDiaria nos dois modos autônomo', () => {
    expect(usaDiaria('AUTONOMO')).toBe(true);
    expect(usaDiaria('AUTONOMO_BANCO_HORAS')).toBe(true);
    expect(usaDiaria('REGISTRADO')).toBe(false);
  });

  it('tarifas clássicas só no Autônomo', () => {
    expect(usaTarifasAutonomoClassico('AUTONOMO')).toBe(true);
    expect(usaTarifasAutonomoClassico('AUTONOMO_BANCO_HORAS')).toBe(false);
    expect(usaTarifasAutonomoClassico('REGISTRADO')).toBe(false);
  });

  it('HE 100% no ponto: clássico sempre; demais só com flag', () => {
    expect(aplicaHorasExtras100NoPonto('AUTONOMO', false)).toBe(true);
    expect(aplicaHorasExtras100NoPonto('REGISTRADO', false)).toBe(false);
    expect(aplicaHorasExtras100NoPonto('AUTONOMO_BANCO_HORAS', false)).toBe(false);
    expect(aplicaHorasExtras100NoPonto('AUTONOMO_BANCO_HORAS', true)).toBe(true);
  });

  it('labels', () => {
    expect(labelTipoContrato('AUTONOMO_BANCO_HORAS')).toMatch(/banco/i);
    expect(labelTipoContrato('AUTONOMO')).toBe('Autônomo');
    expect(labelTipoContrato('REGISTRADO')).toMatch(/CLT/i);
  });
});
