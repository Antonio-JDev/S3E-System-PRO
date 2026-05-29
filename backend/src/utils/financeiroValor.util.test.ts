/**
 * Testes — cálculo base + juros − desconto (contas a receber/pagar)
 * Rodar: npm test -- financeiroValor.util.test.ts
 */

import {
  parseMoney,
  calcValorARegistrar,
  validarValoresFinanceiros,
} from './financeiroValor.util';

describe('financeiroValor.util', () => {
  describe('parseMoney', () => {
    it('converte string com vírgula decimal', () => {
      expect(parseMoney('10,50')).toBe(10.5);
    });

    it('retorna 0 para valores inválidos', () => {
      expect(parseMoney('abc')).toBe(0);
      expect(parseMoney(null)).toBe(0);
    });

    it('não aceita negativos', () => {
      expect(parseMoney(-5)).toBe(0);
    });
  });

  describe('calcValorARegistrar', () => {
    it('aplica fórmula base + juros − desconto', () => {
      expect(calcValorARegistrar(1000, 10, 50)).toBe(960);
    });

    it('arredonda em 2 casas decimais', () => {
      expect(calcValorARegistrar(10.333, 0.001, 0)).toBe(10.33);
    });
  });

  describe('validarValoresFinanceiros', () => {
    it('retorna componentes validados', () => {
      const r = validarValoresFinanceiros(1000, 10, 50);
      expect(r).toEqual({
        valorBase: 1000,
        valorJuros: 10,
        valorDesconto: 50,
        valorARegistrar: 960,
      });
    });

    it('rejeita valor base zero quando exigirBasePositivo', () => {
      expect(() => validarValoresFinanceiros(0, 0, 0)).toThrow('Valor deve ser maior que zero');
    });

    it('rejeita valor a registrar zero', () => {
      expect(() => validarValoresFinanceiros(100, 0, 100)).toThrow(
        'Valor a registrar deve ser maior que zero'
      );
    });

    it('rejeita desconto maior que base + juros', () => {
      expect(() => validarValoresFinanceiros(100, 5, 106)).toThrow(
        'Desconto não pode ser maior que o valor + juros'
      );
    });

    it('permite base zero quando exigirBasePositivo é false', () => {
      const r = validarValoresFinanceiros(0, 100, 0, { exigirBasePositivo: false });
      expect(r.valorARegistrar).toBe(100);
    });
  });
});
