import { describe, expect, it } from 'vitest';
import {
  camposConversaoPayload,
  camposItemImportadoXml,
  desfazerConversaoAutomatica,
  registrarConversaoManual,
  type ItemComConversao,
} from './conversaoUnidadeItemCompra.util';

const itemXmlConvertido = {
  nomeProduto: 'CABO FLEXIVEL 750V 2,5MM',
  quantidade: 200,
  valorUnit: 9.7161,
  valorTotal: 1943.22,
  unidadeMedida: 'm',
  conversaoAutomatica: {
    de: 'km',
    para: 'm',
    unidadeOriginal: 'km',
    quantidadeOriginal: 0.2,
    valorUnitOriginal: 9716.1,
    motivo: 'UNIDADE_KM',
  },
};

describe('conversaoUnidadeItemCompra.util', () => {
  it('importação mantém o unitário por metro sem arredondar e registra a conversão', () => {
    const campos = camposItemImportadoXml(itemXmlConvertido);
    expect(campos.unitCost).toBe(9.7161);
    expect(campos.totalCost).toBe(1943.22);
    expect(campos.unidadeMedida).toBe('m');
    expect(campos.conversaoUnidade?.origem).toBe('AUTOMATICA_IMPORTACAO');
  });

  it('desfazer volta para os valores da NF e marca recusa', () => {
    const item = { ...camposItemImportadoXml(itemXmlConvertido) };
    const desfeito = desfazerConversaoAutomatica(item);
    expect(desfeito.quantity).toBe(0.2);
    expect(desfeito.unitCost).toBe(9716.1);
    expect(desfeito.unidadeMedida).toBe('km');
    expect(camposConversaoPayload(desfeito)).toEqual({ conversaoRecusada: true });
  });

  it('conversão manual registra origem MANUAL com os valores anteriores', () => {
    const item = { quantity: 0.2, unitCost: 9716.1, totalCost: 1943.22, unidadeMedida: 'km' };
    const convertido = registrarConversaoManual(item, { unidade: 'm', quantity: 200, unitCost: 9.7161, totalCost: 1943.22 });
    expect(camposConversaoPayload(convertido)).toEqual({
      conversaoUnidade: { de: 'km', para: 'm', quantidadeOriginal: 0.2, valorUnitOriginal: 9716.1, origem: 'MANUAL' },
    });
  });

  it('converter de volta para a unidade original limpa a conversão', () => {
    const item: ItemComConversao = { ...camposItemImportadoXml(itemXmlConvertido) };
    const voltou = registrarConversaoManual(item, { unidade: 'km', quantity: 0.2, unitCost: 9716.1, totalCost: 1943.22 });
    expect(voltou.conversaoUnidade).toBeNull();
    expect(voltou.conversaoRecusada).toBe(true);
  });
});
