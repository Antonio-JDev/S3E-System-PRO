/**
 * Testes — cálculo base + juros − desconto (contas a receber/pagar)
 * Rodar: npm test -- financeiroValor.util.test.ts
 */

import {
  parseMoney,
  calcValorARegistrar,
  calcAbateParcela,
  calcAbateParcelaFromBase,
  validarValoresFinanceiros,
  validarRecebimentoComDiferenca,
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

  describe('calcAbateParcela', () => {
    it('extrai principal do total em caixa (ex.: parcela + juros por atraso)', () => {
      expect(calcAbateParcela(1225.6, 25.6, 0)).toBe(1200);
    });

    it('calcAbateParcelaFromBase subtrai desconto do principal', () => {
      expect(calcAbateParcelaFromBase(1000, 50)).toBe(950);
    });
  });

  describe('validarRecebimentoComDiferenca', () => {
    it('aceita título 15000 com caixa 14000 e diferença 1000', () => {
      const r = validarRecebimentoComDiferenca(15000, 14000, 1000);
      expect(r.valorEntradaCaixa).toBe(14000);
      expect(r.valorDiferenca).toBe(1000);
      expect(r.abateParcela).toBe(15000);
      expect(r.valorARegistrar).toBe(14000);
    });

    it('rejeita quando soma não fecha o saldo', () => {
      expect(() => validarRecebimentoComDiferenca(15000, 14000, 500)).toThrow(
        'deve igualar o saldo'
      );
    });
  });
});
