/**
 * Rodar: npm test -- conversaoUnidadeCompra.util.test.ts
 */

import {
  calcularConversao,
  confereSubtotal,
  detectarConversaoKmParaM,
  fatorConversao,
  normalizarUnidade,
  prepararUnidadeItemCompra,
} from './conversaoUnidadeCompra.util';

const CABO = 'CABO FLEXIVEL 750V 2,5MM PRETO';

describe('normalizarUnidade / fatorConversao', () => {
  it('normaliza aliases', () => {
    expect(normalizarUnidade('KM')).toBe('km');
    expect(normalizarUnidade('Quilômetro')).toBe('km');
    expect(normalizarUnidade('metros')).toBe('m');
    expect(normalizarUnidade('')).toBe('un');
    expect(normalizarUnidade('UN')).toBe('un');
  });

  it('calcula fatores', () => {
    expect(fatorConversao('km', 'm')).toBe(1000);
    expect(fatorConversao('m', 'cm')).toBe(100);
    expect(fatorConversao('m', 'km')).toBe(0.001);
    expect(() => fatorConversao('km', 'km')).toThrow();
    expect(() => fatorConversao('un', 'm')).toThrow();
  });
});

describe('calcularConversao', () => {
  it('0,2 km a R$ 9.716,10 vira 200 m a R$ 9,7161 mantendo R$ 1.943,22', () => {
    const r = calcularConversao({ quantidade: 0.2, valorUnit: 9716.1, valorTotal: 1943.22 }, 'km', 'm');
    expect(r.quantidade).toBe(200);
    expect(r.valorUnit).toBe(9.7161);
    expect(r.valorTotal).toBe(1943.22);
    expect(confereSubtotal(r.quantidade, r.valorUnit, r.valorTotal)).toBe(true);
  });
});

describe('detectarConversaoKmParaM', () => {
  const base = { nomeProduto: CABO, quantidade: 0.2, valorUnit: 9716.1, valorTotal: 1943.22 };

  it('converte cabo com unidade km explícita', () => {
    expect(detectarConversaoKmParaM({ ...base, unidadeMedida: 'KM' })).toMatchObject({
      converter: true,
      motivo: 'UNIDADE_KM',
    });
  });

  it('converte cabo sem unidade quando o preço é ~1000x o preço por metro do material', () => {
    const r = detectarConversaoKmParaM({
      ...base,
      valorUnit: 300,
      valorTotal: 60,
      unidadeMedida: 'un',
      precoMaterialPorMetro: 0.3,
    });
    expect(r).toMatchObject({ converter: true, motivo: 'PRECO_PROPORCIONAL_MATERIAL' });
  });

  it('converte cabo sem unidade quando o preço passa do limite plausível por metro', () => {
    expect(detectarConversaoKmParaM({ ...base, unidadeMedida: null, precoMaterialPorMetro: 9716.1 })).toMatchObject({
      converter: true,
      motivo: 'PRECO_ACIMA_LIMITE_METRO',
    });
  });

  it('não converte cabo já em metros com preço normal', () => {
    expect(
      detectarConversaoKmParaM({ ...base, quantidade: 200, valorUnit: 9.7161, unidadeMedida: 'm' }).converter,
    ).toBe(false);
    expect(
      detectarConversaoKmParaM({ ...base, quantidade: 200, valorUnit: 9.7161, unidadeMedida: 'un' }).converter,
    ).toBe(false);
  });

  it('ignora itens que não são cabos 750V/1kV', () => {
    expect(
      detectarConversaoKmParaM({ ...base, nomeProduto: 'DISJUNTOR 32A', unidadeMedida: 'km' }).converter,
    ).toBe(false);
    expect(
      detectarConversaoKmParaM({ ...base, nomeProduto: 'CABO DE REDE CAT6', unidadeMedida: 'km' }).converter,
    ).toBe(false);
  });

  it('não converte quando quantidade x unitário não bate com o subtotal', () => {
    expect(detectarConversaoKmParaM({ ...base, unidadeMedida: 'km', valorTotal: 500 }).converter).toBe(false);
  });

  it('não converte rolo/bobina com metragem no nome vendido por UN', () => {
    const rolo = { nomeProduto: 'CABO FLEXIVEL 750V 10MM ROLO 100M', quantidade: 2, valorUnit: 800, valorTotal: 1600 };
    expect(detectarConversaoKmParaM({ ...rolo, unidadeMedida: 'UN' }).converter).toBe(false);
    expect(
      detectarConversaoKmParaM({ ...rolo, nomeProduto: 'CABO 1KV 16MM 100 METROS', unidadeMedida: 'UN' }).converter,
    ).toBe(false);
  });
});

describe('prepararUnidadeItemCompra', () => {
  const agora = new Date('2026-10-05T12:00:00Z');

  it('mantém a conversão feita no formulário com 6 casas no valor unitário', () => {
    const r = prepararUnidadeItemCompra(
      {
        nomeProduto: CABO,
        quantidade: 200,
        valorUnit: 9.7161,
        unidadeMedida: 'm',
        conversaoUnidade: { de: 'km', quantidadeOriginal: 0.2, valorUnitOriginal: 9716.1, origem: 'AUTOMATICA_IMPORTACAO' },
      },
      agora,
    );
    expect(r.valorUnit).toBe(9.7161);
    expect(r.campos).toEqual({
      unidadeMedida: 'm',
      unidadeOriginal: 'km',
      quantidadeOriginal: 0.2,
      valorUnitOriginal: 9716.1,
      conversaoUnidadeEm: agora,
      conversaoUnidadeOrigem: 'AUTOMATICA_IMPORTACAO',
    });
  });

  it('converte automaticamente cabo lançado em km', () => {
    const r = prepararUnidadeItemCompra({ nomeProduto: CABO, quantidade: 0.2, valorUnit: 9716.1, unidadeMedida: 'KM' }, agora);
    expect(r.quantidade).toBe(200);
    expect(r.valorUnit).toBe(9.7161);
    expect(r.campos.unidadeOriginal).toBe('km');
  });

  it('respeita quando o usuário desfez a conversão', () => {
    const r = prepararUnidadeItemCompra(
      { nomeProduto: CABO, quantidade: 0.2, valorUnit: 9716.1, unidadeMedida: 'km', conversaoRecusada: true },
      agora,
    );
    expect(r.quantidade).toBe(0.2);
    expect(r.campos).toEqual({ unidadeMedida: 'km' });
  });

  it('itens comuns seguem com valor unitário em 2 casas', () => {
    const r = prepararUnidadeItemCompra({ nomeProduto: 'DISJUNTOR', quantidade: 3, valorUnit: 10.456 }, agora);
    expect(r.valorUnit).toBe(10.46);
    expect(r.campos).toEqual({ unidadeMedida: 'un' });
  });
});
