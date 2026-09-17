import { onlyDigits } from './masks';

/**
 * Normaliza telefone BR para chave WhatsApp (com DDI 55).
 * Aceita formatos com hífen/espaços/parênteses.
 */
export function normalizeBrWhatsappDigits(raw: string): string {
  let d = onlyDigits(raw || '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length >= 11) d = d.slice(1);
  if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) {
    d = `55${d}`;
  }
  return d;
}

/**
 * Quando o número vem com “dois 9” após o DDD (ex.: 47 99 636-2471 /
 * 47996362471), remove o nono dígito extra para ficar no formato com um
 * único 9 (4796362471 / 554796362471) — o que o WhatsApp costuma aceitar
 * nestes casos de digitação duplicada.
 */
export function stripBrDuplicateNinthDigit(digitsRaw: string): string {
  const d = onlyDigits(digitsRaw || '');
  if (!d) return '';

  // 55 + DDD + 99… (13 dígitos) → remove o nono dígito (índice 4)
  if (d.startsWith('55') && d.length === 13 && d[4] === '9' && d[5] === '9') {
    return `${d.slice(0, 4)}${d.slice(5)}`;
  }

  // DDD + 99… (11 dígitos, sem 55) → remove o nono dígito (índice 2)
  if (!d.startsWith('55') && d.length === 11 && d[2] === '9' && d[3] === '9') {
    return `${d.slice(0, 2)}${d.slice(3)}`;
  }

  return d;
}

/** Variantes BR com/sem nono dígito e com/sem DDI, para resolve/open. */
export function brWhatsappOpenDigitCandidates(raw: string): string[] {
  const base = normalizeBrWhatsappDigits(raw);
  if (!base || base.length < 12) {
    const stripped = stripBrDuplicateNinthDigit(onlyDigits(raw));
    const normalizedStripped = normalizeBrWhatsappDigits(stripped);
    return [...new Set([base, normalizedStripped].filter((x) => x.length >= 12))];
  }

  const out = new Set<string>();
  const add = (v: string) => {
    const n = normalizeBrWhatsappDigits(v);
    if (n.length >= 12 && n.length <= 13) out.add(n);
  };

  add(base);
  add(stripBrDuplicateNinthDigit(base));

  // Com nono dígito ↔ sem nono dígito
  if (base.startsWith('55') && base.length === 13 && base[4] === '9') {
    add(`${base.slice(0, 4)}${base.slice(5)}`); // sem 9
  }
  if (base.startsWith('55') && base.length === 12) {
    add(`${base.slice(0, 4)}9${base.slice(4)}`); // com 9
  }

  // Preferência: variante sem 9 duplicado primeiro
  const preferred = normalizeBrWhatsappDigits(stripBrDuplicateNinthDigit(base));
  const rest = [...out].filter((x) => x !== preferred);
  return preferred && out.has(preferred) ? [preferred, ...rest] : [...out];
}

/**
 * Dígitos preferidos ao abrir conversa a partir de texto/vCard.
 * Aplica a regra dos “dois 9” e garante DDI 55.
 */
export function preferBrWhatsappDigitsForOpen(raw: string): string {
  const candidates = brWhatsappOpenDigitCandidates(raw);
  return candidates[0] || normalizeBrWhatsappDigits(raw);
}
