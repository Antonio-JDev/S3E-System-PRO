import emojiRegex from 'emoji-regex';

/**
 * Conta emojis "visíveis" em uma string considerando sequências ZWJ como uma
 * única unidade — ex.: 👨‍👩‍👧‍👦 (família) é contado como 1, não 4.
 *
 * Implementado em cima do `emoji-regex` (mesmo dataset Unicode CLDR usado pelo
 * `emoji-mart`/Slack) que já lida com:
 *  - sequências ZWJ (\u200d) e variation selectors (\ufe0f)
 *  - skin tone modifiers (👍🏽)
 *  - bandeiras (regional indicators)
 */
export function countEmojis(text: string): number {
  if (!text) return 0;
  const re = emojiRegex();
  let count = 0;
  while (re.exec(text) !== null) {
    count += 1;
    if (count > 10) return count;
  }
  return count;
}

/**
 * Detecta se o conteúdo deve receber o tratamento "emoji jumbo" do WhatsApp
 * Web — mensagem com 1, 2 ou 3 emojis E sem mais nada (espaços tolerados).
 *
 * Retorna a contagem (1, 2 ou 3) quando elegível; 0 caso contrário.
 *
 * O caller usa esse número para escalar a fonte:
 *   1 → ~64px, 2 → ~56px, 3 → ~48px.
 *
 * Acima de 3 emojis OU presença de qualquer caractere não-emoji/não-whitespace
 * resulta em retorno 0 — o caller renderiza dentro da bolha normal.
 */
export function getEmojiOnlyCount(text: string | null | undefined, limit = 3): 0 | 1 | 2 | 3 {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;

  // Após remover emojis, ZWJ e variation selectors, só pode sobrar whitespace
  // para a mensagem ser considerada "puro emoji".
  const re = emojiRegex();
  const stripped = trimmed
    .replace(re, '')
    .replace(/[\u200d\ufe0f]/g, '')
    .replace(/\s/g, '');
  if (stripped.length > 0) return 0;

  const count = countEmojis(trimmed);
  if (count < 1 || count > limit) return 0;
  return count as 1 | 2 | 3;
}
