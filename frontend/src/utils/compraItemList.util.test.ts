import { describe, it, expect } from 'vitest';
import {
  itemParaDraft,
  aplicarDraftNoItem,
  atualizarCampoNumericoItem,
  parseDecimalInput,
  commitInlineNumericDraft,
  getInlineNumericDisplay,
  reindexInlineNumericDraftAfterRemove
} from './compraItemList.util';

describe('compraItemList.util', () => {
  const item = {
    productName: 'Cabo ABC',
    quantity: 3,
    unitCost: 10,
    totalCost: 30,
    ncm: '123',
    sku: 'SKU-1',
    unidadeMedida: 'un'
  };

  it('itemParaDraft converte item para rascunho', () => {
    expect(itemParaDraft(item)).toEqual({
      productName: 'Cabo ABC',
      quantity: '3',
      unitCost: '10',
      ncm: '123',
      sku: 'SKU-1',
      unidadeMedida: 'un'
    });
  });

  it('atualizarCampoNumericoItem recalcula subtotal', () => {
    const updated = atualizarCampoNumericoItem(item, 'quantity', '2');
    expect(updated?.quantity).toBe(2);
    expect(updated?.totalCost).toBe(20);
  });

  it('atualizarCampoNumericoItem aceita vírgula decimal', () => {
    const updated = atualizarCampoNumericoItem(item, 'unitCost', '12,50');
    expect(updated?.unitCost).toBe(12.5);
    expect(updated?.totalCost).toBe(37.5);
  });

  it('aplicarDraftNoItem valida e aplica alterações', () => {
    const draft = itemParaDraft(item);
    draft.quantity = '5';
    const result = aplicarDraftNoItem(item, draft);
    expect(result?.quantity).toBe(5);
    expect(result?.totalCost).toBe(50);
  });

  it('aplicarDraftNoItem rejeita quantidade inválida', () => {
    const draft = itemParaDraft(item);
    draft.quantity = '0';
    expect(aplicarDraftNoItem(item, draft)).toBeNull();
  });

  it('aplicarDraftNoItem rejeita valor unitário negativo', () => {
    const draft = itemParaDraft(item);
    draft.unitCost = '-1';
    expect(aplicarDraftNoItem(item, draft)).toBeNull();
  });

  describe('parseDecimalInput', () => {
    it('converte vírgula em ponto', () => {
      expect(parseDecimalInput('10,5')).toBe(10.5);
    });

    it('retorna null para string vazia', () => {
      expect(parseDecimalInput('')).toBeNull();
      expect(parseDecimalInput('   ')).toBeNull();
    });

    it('retorna null para texto inválido', () => {
      expect(parseDecimalInput('abc')).toBeNull();
    });
  });

  describe('commitInlineNumericDraft', () => {
    it('confirma qtd e valor e recalcula total', () => {
      const result = commitInlineNumericDraft(item, { quantity: '4', unitCost: '7,5' });
      expect(result).toEqual({
        ...item,
        quantity: 4,
        unitCost: 7.5,
        totalCost: 30
      });
    });

    it('rejeita rascunho incompleto', () => {
      expect(commitInlineNumericDraft(item, { quantity: '', unitCost: '10' })).toBeNull();
      expect(commitInlineNumericDraft(item, { quantity: '2', unitCost: '' })).toBeNull();
    });
  });

  describe('getInlineNumericDisplay', () => {
    it('prioriza rascunho inline sobre valor do item', () => {
      expect(
        getInlineNumericDisplay('quantity', item, { quantity: '9', unitCost: '10' })
      ).toBe('9');
    });

    it('usa rascunho da linha em edição completa', () => {
      const rowDraft = itemParaDraft(item);
      rowDraft.unitCost = '99';
      expect(getInlineNumericDisplay('unitCost', item, undefined, rowDraft, true)).toBe('99');
    });

    it('mostra valor do item quando não há rascunho', () => {
      expect(getInlineNumericDisplay('quantity', item)).toBe('3');
    });
  });

  describe('reindexInlineNumericDraftAfterRemove', () => {
    it('reindexa chaves após remover item do meio', () => {
      const draft = {
        0: { quantity: '1', unitCost: '1' },
        1: { quantity: '2', unitCost: '2' },
        2: { quantity: '3', unitCost: '3' }
      };
      expect(reindexInlineNumericDraftAfterRemove(draft, 1)).toEqual({
        0: { quantity: '1', unitCost: '1' },
        1: { quantity: '3', unitCost: '3' }
      });
    });
  });
});
