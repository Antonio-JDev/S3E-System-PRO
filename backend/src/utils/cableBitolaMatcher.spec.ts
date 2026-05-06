import {
  normalizeNomeCabo,
  extrairBaseSemCor,
  extrairBitolaMm2,
  nomePertenceFamilia,
  combinaFamiliaEBitola,
  bitolasIguais,
  BITOLAS_POR_FAMILIA
} from './cableBitolaMatcher';

describe('cableBitolaMatcher', () => {
  describe('normalizeNomeCabo', () => {
    it('remove acentos e unifica MM²', () => {
      expect(normalizeNomeCabo('Cabo Rígido 1KV')).toBe('CABO RIGIDO 1KV');
      expect(normalizeNomeCabo('MM² test')).toContain('MM2');
    });
  });

  describe('FLEX_750V', () => {
    it('detecta família e extrai bitola', () => {
      const n = 'CABO FLEX 750V 2,50MM AMARELO';
      expect(nomePertenceFamilia(n, 'FLEX_750V')).toBe(true);
      expect(extrairBitolaMm2(n, 'FLEX_750V')).toBe(2.5);
      expect(combinaFamiliaEBitola(n, 'FLEX_750V', 2.5)).toBe(true);
    });

    it('não confunde com 1KV', () => {
      expect(nomePertenceFamilia('CABO FLEX 1KV 2,50MM AMARELO', 'FLEX_750V')).toBe(false);
    });
  });

  describe('FLEX_1KV', () => {
    it('com e sem HEPR', () => {
      expect(extrairBitolaMm2('CABO FLEX 1KV 2.50MM² AMARELO', 'FLEX_1KV')).toBe(2.5);
      expect(extrairBitolaMm2('CABO FLEX 1KV HEPR 150,00MM² BRANCO', 'FLEX_1KV')).toBe(150);
    });

    it('typo VEMELHO ainda permite match de bitola', () => {
      const n = 'CABO FLEX 1KV 2.50MM² VEMELHO';
      expect(combinaFamiliaEBitola(n, 'FLEX_1KV', 2.5)).toBe(true);
    });
  });

  describe('RIGIDO_1KV', () => {
    it('aceita Rígido com acento', () => {
      const n = 'CABO RÍGIDO 1KV 6,0MM2 PRETO';
      expect(nomePertenceFamilia(n, 'RIGIDO_1KV')).toBe(true);
      expect(extrairBitolaMm2(n, 'RIGIDO_1KV')).toBe(6);
    });

    it('HEPR opcional', () => {
      expect(
        extrairBitolaMm2('CABO RIGIDO 1KV HEPR 95,00MM2 AZUL', 'RIGIDO_1KV')
      ).toBe(95);
    });
  });

  describe('bitolasIguais', () => {
    it('equivale 2.5 e 2.50', () => {
      expect(bitolasIguais(2.5, 2.5)).toBe(true);
      expect(bitolasIguais(2.5, 2.5000001)).toBe(true);
    });
  });

  describe('extrairBaseSemCor', () => {
    it('remove cor do final', () => {
      const b = extrairBaseSemCor('CABO FLEX 1KV 2,50MM2 AMARELO');
      expect(b).not.toContain('AMARELO');
      expect(b).toContain('2,50MM2');
    });
  });

  describe('BITOLAS_POR_FAMILIA', () => {
    it('750V tem menos bitolas que 1KV', () => {
      expect(BITOLAS_POR_FAMILIA.FLEX_750V.length).toBeLessThan(
        BITOLAS_POR_FAMILIA.FLEX_1KV.length
      );
    });
  });
});
