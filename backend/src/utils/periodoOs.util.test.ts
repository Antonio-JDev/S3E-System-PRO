import { resolverPeriodoOsDeDatas, deveAlocarPeriodoOs } from './periodoOs.util';

describe('resolverPeriodoOsDeDatas', () => {
  it('usa dataInicio e dataPrevisao do projeto', () => {
    const r = resolverPeriodoOsDeDatas({
      dataInicio: new Date('2026-10-01T12:00:00.000Z'),
      dataPrevisao: new Date('2026-10-10T12:00:00.000Z'),
    });
    expect(r.diasCorridos).toBe(10);
  });

  it('faz fallback para datas do orçamento', () => {
    const r = resolverPeriodoOsDeDatas({
      previsaoInicioOrcamento: new Date('2026-11-01T12:00:00.000Z'),
      previsaoTerminoOrcamento: new Date('2026-11-05T12:00:00.000Z'),
    });
    expect(r.diasCorridos).toBe(5);
  });

  it('erro se faltar período', () => {
    expect(() => resolverPeriodoOsDeDatas({ dataInicio: new Date() })).toThrow(/período válido/i);
  });
});

describe('deveAlocarPeriodoOs', () => {
  it('só aloca quando flag explícita e há projeto', () => {
    expect(deveAlocarPeriodoOs({ projetoId: 'p1', alocarPeriodoOs: true })).toBe(true);
    expect(deveAlocarPeriodoOs({ projetoId: 'p1' })).toBe(false);
  });
});
