import { describe, expect, it } from 'vitest';
import { countEmojis, getEmojiOnlyCount } from './emojiOnly';

describe('countEmojis', () => {
  it('conta emojis simples', () => {
    expect(countEmojis('❤️')).toBe(1);
    expect(countEmojis('😂😂😂')).toBe(3);
  });

  it('trata sequência ZWJ como 1 emoji (família)', () => {
    expect(countEmojis('👨‍👩‍👧‍👦')).toBe(1);
  });

  it('conta skin tone como parte do emoji base', () => {
    expect(countEmojis('👍🏽')).toBe(1);
  });

  it('ignora texto não-emoji', () => {
    expect(countEmojis('olá mundo')).toBe(0);
  });

  it('conta emojis misturados com texto', () => {
    expect(countEmojis('oi ❤️ tudo bem 👍')).toBe(2);
  });

  it('lida com null/undefined/empty', () => {
    expect(countEmojis('')).toBe(0);
    // @ts-expect-error testando entrada não-string
    expect(countEmojis(null)).toBe(0);
  });
});

describe('getEmojiOnlyCount', () => {
  it('1 emoji → 1', () => {
    expect(getEmojiOnlyCount('❤️')).toBe(1);
    expect(getEmojiOnlyCount('  😂  ')).toBe(1);
  });

  it('2 emojis → 2', () => {
    expect(getEmojiOnlyCount('❤️😂')).toBe(2);
    expect(getEmojiOnlyCount('❤️ 😂')).toBe(2);
  });

  it('3 emojis → 3', () => {
    expect(getEmojiOnlyCount('❤️😂🙏')).toBe(3);
  });

  it('4+ emojis → 0 (cai pra bolha normal)', () => {
    expect(getEmojiOnlyCount('❤️😂🙏👍')).toBe(0);
  });

  it('emoji + texto → 0', () => {
    expect(getEmojiOnlyCount('oi ❤️')).toBe(0);
    expect(getEmojiOnlyCount('❤️ tchau')).toBe(0);
  });

  it('família ZWJ conta como 1', () => {
    expect(getEmojiOnlyCount('👨‍👩‍👧‍👦')).toBe(1);
  });

  it('strings vazias/whitespace → 0', () => {
    expect(getEmojiOnlyCount('')).toBe(0);
    expect(getEmojiOnlyCount('   ')).toBe(0);
    expect(getEmojiOnlyCount(null)).toBe(0);
    expect(getEmojiOnlyCount(undefined)).toBe(0);
  });

  it('respeita limit customizado', () => {
    expect(getEmojiOnlyCount('❤️😂', 1)).toBe(0);
    expect(getEmojiOnlyCount('❤️', 1)).toBe(1);
  });
});
