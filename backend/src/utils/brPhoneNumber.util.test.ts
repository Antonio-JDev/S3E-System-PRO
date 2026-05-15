import { sanitizeBrPhone } from './brPhoneNumber.util';

describe('sanitizeBrPhone', () => {
  describe('formatos humanos comuns', () => {
    it('aceita "(47) 99999-9999" e devolve 5547999999999', () => {
      const r = sanitizeBrPhone('(47) 99999-9999');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: '' });
    });

    it('aceita "+55 47 99999 9999"', () => {
      const r = sanitizeBrPhone('+55 47 99999 9999');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: '' });
    });

    it('aceita "47 99999-9999" sem 55', () => {
      const r = sanitizeBrPhone('47 99999-9999');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: '' });
    });

    it('aceita fixo "4732489791" (10 dígitos, sem 55)', () => {
      const r = sanitizeBrPhone('4732489791');
      expect(r).toEqual({ digits: '554732489791', valid: true, reason: '' });
    });

    it('aceita já no formato canônico "5547999999999"', () => {
      const r = sanitizeBrPhone('5547999999999');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: '' });
    });
  });

  describe('prefixo de operadora 0XX', () => {
    it('remove "015" (operadora) + DDD 48 — 13 dígitos', () => {
      const r = sanitizeBrPhone('0154899782183');
      expect(r).toEqual({ digits: '554899782183', valid: true, reason: '' });
    });

    it('remove "0" inicial em "04732489791" (11 dígitos)', () => {
      const r = sanitizeBrPhone('04732489791');
      expect(r).toEqual({ digits: '554732489791', valid: true, reason: '' });
    });

    it('remove "0" inicial em "047991770332" (12 dígitos)', () => {
      const r = sanitizeBrPhone('047991770332');
      expect(r).toEqual({ digits: '5547991770332', valid: true, reason: '' });
    });
  });

  describe('sem DDD', () => {
    it('marca como inválido se não houver --ddd-padrao', () => {
      const r = sanitizeBrPhone('999999999');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('sem_ddd');
    });

    it('com DDD padrão "47", assume o DDD e marca reason=ddd_assumido', () => {
      const r = sanitizeBrPhone('999999999', '47');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: 'ddd_assumido' });
    });

    it('aceita 8 dígitos (fixo antigo) com DDD padrão', () => {
      const r = sanitizeBrPhone('32489791', '47');
      expect(r.valid).toBe(true);
      expect(r.digits).toBe('554732489791');
    });
  });

  describe('invalidos', () => {
    it('vazio retorna inválido', () => {
      expect(sanitizeBrPhone('').valid).toBe(false);
      expect(sanitizeBrPhone(null as unknown as string).valid).toBe(false);
    });

    it('curto demais (<8 dígitos) é inválido', () => {
      const r = sanitizeBrPhone('123456');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('curto_demais');
    });

    it('DDD inválido com 11 dígitos cai como curto_demais (não passa no DDD_VALIDOS)', () => {
      const r = sanitizeBrPhone('20999999999');
      expect(r.valid).toBe(false);
    });

    it('número muito longo (acima de 13 dígitos) fica muito_longo', () => {
      const r = sanitizeBrPhone('+5511419510258311026');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('muito_longo');
    });
  });

  describe('DDI internacional', () => {
    it('remove prefixo "00" antes do DDI (chamada internacional comum)', () => {
      const r = sanitizeBrPhone('005547999999999');
      expect(r).toEqual({ digits: '5547999999999', valid: true, reason: '' });
    });
  });
});
