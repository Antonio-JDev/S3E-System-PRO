import { montarBancoHorasResumo } from './bancoHorasRh.service';

describe('bancoHorasRh faturar / resumo', () => {
  it('montarBancoHorasResumo calcula líquido positivo', () => {
    const r = montarBancoHorasResumo({
      saldoBancoHorasNormaisExcedente: 10,
      saldoBancoHorasExtras100: 0,
      saldoHorasNegativas: 9,
    });
    expect(r.horasPositivas).toBe(10);
    expect(r.horasNegativas).toBe(9);
    expect(r.horasTotalLiquido).toBe(1);
  });

  it('montarBancoHorasResumo calcula líquido negativo', () => {
    const r = montarBancoHorasResumo({
      saldoBancoHorasNormaisExcedente: 40,
      saldoBancoHorasExtras100: 0,
      saldoHorasNegativas: 45,
    });
    expect(r.horasTotalLiquido).toBe(-5);
  });
});
