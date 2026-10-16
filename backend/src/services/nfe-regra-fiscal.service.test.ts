import {
  definirCacheRegrasFiscais,
  limparCacheRegrasFiscais,
  resolverTributosItem,
  type RegraFiscalNfeCache,
} from './nfe-regra-fiscal.service';

function regra(parcial: Partial<RegraFiscalNfeCache> & Pick<RegraFiscalNfeCache, 'regime'>): RegraFiscalNfeCache {
  return {
    origem: '0',
    cstIcms: parcial.regime === 'SimplesNacional' ? '102' : '00',
    aliquotaIcms: 0,
    cstPis: parcial.regime === 'SimplesNacional' ? '49' : '01',
    aliquotaPis: 0,
    cstCofins: parcial.regime === 'SimplesNacional' ? '49' : '01',
    aliquotaCofins: 0,
    cstIpi: '99',
    aliquotaIpi: 0,
    informarTotTrib: false,
    ativo: true,
    ...parcial,
  };
}

describe('resolverTributosItem', () => {
  beforeEach(() => {
    limparCacheRegrasFiscais();
  });

  it('sem regra cai no fallback do regime normal', () => {
    const tributos = resolverTributosItem({
      regimeTributario: 'RegimeNormal',
      valorTotal: 1000,
      cfop: '5102',
      ncm: '85044010',
    });

    expect(tributos.icms).toEqual({ origem: '0', cst: '00', aliquota: 12, valor: 120 });
    expect(tributos.pis).toEqual({ cst: '01', aliquota: 1.65, valor: 16.5 });
    expect(tributos.cofins).toEqual({ cst: '01', aliquota: 7.6, valor: 76 });
    expect(tributos.ipi).toEqual({ cst: '99', aliquota: 0, valor: 0 });
    expect(tributos.vTotTrib).toBe(212.5);
  });

  it('sem regra que case também usa o fallback, com valores arredondados', () => {
    definirCacheRegrasFiscais([
      regra({
        regime: 'RegimeNormal',
        cfop: '6102',
        ncm: '85044010',
        aliquotaIcms: 18,
      }),
    ]);

    const tributos = resolverTributosItem({
      regimeTributario: 'RegimeNormal',
      valorTotal: 10.01,
      cfop: '5102',
      ncm: '12345678',
    });

    expect(tributos.icms.aliquota).toBe(12);
    expect(tributos.icms.valor).toBe(1.2);
    expect(tributos.pis.valor).toBe(0.17);
    expect(tributos.cofins.valor).toBe(0.76);
    expect(tributos.vTotTrib).toBe(2.13);
  });

  it('com regra de NCM a alíquota da regra vence a do CFOP e a do regime', () => {
    definirCacheRegrasFiscais([
      regra({
        regime: 'RegimeNormal',
        aliquotaIcms: 4,
        aliquotaPis: 1.65,
        aliquotaCofins: 7.6,
      }),
      regra({
        regime: 'RegimeNormal',
        cfop: '5102',
        aliquotaIcms: 7,
        aliquotaPis: 1.65,
        aliquotaCofins: 7.6,
      }),
      regra({
        regime: 'RegimeNormal',
        cfop: '5102',
        ncm: '8504',
        aliquotaIcms: 4,
        aliquotaPis: 0.65,
        aliquotaCofins: 3,
      }),
      regra({
        regime: 'RegimeNormal',
        cfop: '5102',
        ncm: '85044010',
        cstIcms: '00',
        aliquotaIcms: 18,
        cstPis: '01',
        aliquotaPis: 1.65,
        cstCofins: '01',
        aliquotaCofins: 7.6,
        cstIpi: '99',
        aliquotaIpi: 0,
      }),
    ]);

    const tributos = resolverTributosItem({
      regimeTributario: 'RegimeNormal',
      valorTotal: 200,
      cfop: '5102',
      ncm: '8504.4010',
    });

    expect(tributos.icms).toEqual({ origem: '0', cst: '00', aliquota: 18, valor: 36 });
    expect(tributos.pis.aliquota).toBe(1.65);
    expect(tributos.pis.valor).toBe(3.3);
    expect(tributos.cofins.valor).toBe(15.2);
    expect(tributos.vTotTrib).toBe(54.5);
  });

  it('no Simples Nacional sem regra mantém vTotTrib zerado', () => {
    const tributos = resolverTributosItem({
      regimeTributario: 'SimplesNacional',
      valorTotal: 500,
      cfop: '5102',
    });

    expect(tributos.icms).toEqual({ origem: '0', cst: '102', aliquota: 0, valor: 0 });
    expect(tributos.pis).toEqual({ cst: '49', aliquota: 0, valor: 0 });
    expect(tributos.cofins).toEqual({ cst: '49', aliquota: 0, valor: 0 });
    expect(tributos.ipi).toEqual({ cst: '99', aliquota: 0, valor: 0 });
    expect(tributos.vTotTrib).toBe(0);
  });

  it('no Simples a regra pode mudar a alíquota e o vTotTrib continua 0 até informarTotTrib', () => {
    definirCacheRegrasFiscais([
      regra({
        regime: 'SimplesNacional',
        cfop: '5102',
        ncm: '85044010',
        cstIcms: '102',
        aliquotaIcms: 3,
        informarTotTrib: false,
      }),
    ]);

    const semTotal = resolverTributosItem({
      regimeTributario: 'SimplesNacional',
      valorTotal: 100,
      cfop: '5102',
      ncm: '85044010',
    });
    expect(semTotal.icms.aliquota).toBe(3);
    expect(semTotal.icms.valor).toBe(3);
    expect(semTotal.vTotTrib).toBe(0);

    definirCacheRegrasFiscais([
      regra({
        regime: 'SimplesNacional',
        cfop: '5102',
        ncm: '85044010',
        cstIcms: '102',
        aliquotaIcms: 3,
        informarTotTrib: true,
      }),
    ]);

    const comTotal = resolverTributosItem({
      regimeTributario: 'SimplesNacional',
      valorTotal: 100,
      cfop: '5102',
      ncm: '85044010',
    });
    expect(comTotal.vTotTrib).toBe(3);
  });
});
