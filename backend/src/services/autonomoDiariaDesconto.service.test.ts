import { diasUteisSemRegistroPonto } from './autonomoDiariaDesconto.service';

describe('diasUteisSemRegistroPonto', () => {
  it('exclui fins de semana e dias com registro', () => {
    // Março/2026: 1 = domingo → primeiro dia útil 2
    const adm = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
    const dias = diasUteisSemRegistroPonto({
      ano: 2026,
      mes: 3,
      dataAdmissao: adm,
      diasComRegistro: new Set([2, 3, 4, 5, 6]),
    });
    expect(dias).not.toContain(7);
    expect(dias).not.toContain(8);
    expect(dias).not.toContain(2);
    expect(dias.length).toBeGreaterThan(0);
  });

  it('não inclui dias anteriores à admissão', () => {
    const adm = new Date(Date.UTC(2026, 2, 15, 12, 0, 0));
    const dias = diasUteisSemRegistroPonto({
      ano: 2026,
      mes: 3,
      dataAdmissao: adm,
      diasComRegistro: new Set(),
    });
    expect(dias.every((d) => d >= 15)).toBe(true);
  });
});
