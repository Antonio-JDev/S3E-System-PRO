import { describe, expect, it } from 'vitest';
import {
  parseMoney,
  calcValorARegistrar,
  calcValorBaseFromEfetivo,
  formatBRL,
  parcelaQuitadaPorPagamento,
} from './financeiroValor';

describe('financeiroValor (frontend)', () => {
  describe('calcValorARegistrar', () => {
    it('soma juros e subtrai desconto do valor base', () => {
      expect(calcValorARegistrar(1000, 10, 50)).toBe(960);
    });

    it('aceita strings de formulário', () => {
      expect(calcValorARegistrar('1000', '10', '50')).toBe(960);
    });
  });

  describe('calcValorBaseFromEfetivo', () => {
    it('reconstrói valor base a partir do líquido e juros/desconto previstos', () => {
      // parcela líquida 960 com +10 juros e -50 desconto → base 1000
      expect(calcValorBaseFromEfetivo(960, 10, 50)).toBe(1000);
    });

    it('sem juros/desconto, base = líquido', () => {
      expect(calcValorBaseFromEfetivo(500, 0, 0)).toBe(500);
    });
  });

  describe('parseMoney e formatBRL', () => {
    it('parseMoney trata vírgula decimal', () => {
      expect(parseMoney('10,50')).toBe(10.5);
    });

    it('formatBRL formata em pt-BR', () => {
      expect(formatBRL(960)).toMatch(/960,00/);
    });
  });

  describe('parcelaQuitadaPorPagamento', () => {
    it('aceita base igual ao saldo com desconto na hora do pagamento', () => {
      expect(parcelaQuitadaPorPagamento(1698.85, 1698.85, 8)).toBe(true);
    });

    it('aceita título com desconto embutido (base − desconto = saldo)', () => {
      expect(parcelaQuitadaPorPagamento(900, 1000, 100)).toBe(true);
    });
  });
});
