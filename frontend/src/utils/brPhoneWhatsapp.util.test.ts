import {
  brWhatsappOpenDigitCandidates,
  normalizeBrWhatsappDigits,
  preferBrWhatsappDigitsForOpen,
  stripBrDuplicateNinthDigit,
} from './brPhoneWhatsapp.util';

describe('stripBrDuplicateNinthDigit', () => {
  it('47996362471 → 4796362471 (dois 9 após DDD)', () => {
    expect(stripBrDuplicateNinthDigit('47996362471')).toBe('4796362471');
  });

  it('5547996362471 → 554796362471', () => {
    expect(stripBrDuplicateNinthDigit('5547996362471')).toBe('554796362471');
  });

  it('não altera quando já tem um único 9', () => {
    expect(stripBrDuplicateNinthDigit('4796362471')).toBe('4796362471');
    expect(stripBrDuplicateNinthDigit('554796362471')).toBe('554796362471');
  });
});

describe('normalizeBrWhatsappDigits / preferBrWhatsappDigitsForOpen', () => {
  it.each([
    ['47996362471', '554796362471'],
    ['4796362471', '554796362471'],
    ['479636-2471', '554796362471'],
    ['4799636-2471', '554796362471'],
    ['554796362471', '554796362471'],
    ['5547996362471', '554796362471'],
    ['55479636-2471', '554796362471'],
    ['554799636-2471', '554796362471'],
  ])('prefer open %s → %s', (raw, expected) => {
    expect(preferBrWhatsappDigitsForOpen(raw)).toBe(expected);
  });

  it('normalize adiciona 55', () => {
    expect(normalizeBrWhatsappDigits('4796362471')).toBe('554796362471');
  });
});

describe('brWhatsappOpenDigitCandidates', () => {
  it('inclui variantes com e sem nono dígito', () => {
    const c = brWhatsappOpenDigitCandidates('47996362471');
    expect(c[0]).toBe('554796362471');
    expect(c).toContain('5547996362471');
  });
});
