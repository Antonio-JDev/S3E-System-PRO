/**
 * Identificação de cabos por família (tensão/tipo) e bitola (mm²), ignorando cor no sufixo.
 */

export type CableFamilia = 'FLEX_750V' | 'FLEX_1KV' | 'RIGIDO_1KV';

const COLOR_SUFFIXES = [
  'BRANCO',
  'PRETO',
  'AZUL',
  'AMARELO',
  'VERDE',
  'VERMELHO',
  'VEMELHO'
] as const;

/** Bitolas usadas no cadastro (UI / modal). */
export const BITOLAS_FLEX_750V: number[] = [
  1.0, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50
];

export const BITOLAS_FLEX_1KV: number[] = [
  ...BITOLAS_FLEX_750V,
  70, 95, 120, 150, 185, 240
];

export const BITOLAS_RIGIDO_1KV: number[] = [...BITOLAS_FLEX_1KV];

export const BITOLAS_POR_FAMILIA: Record<CableFamilia, number[]> = {
  FLEX_750V: BITOLAS_FLEX_750V,
  FLEX_1KV: BITOLAS_FLEX_1KV,
  RIGIDO_1KV: BITOLAS_RIGIDO_1KV
};

export const LABEL_FAMILIA: Record<CableFamilia, string> = {
  FLEX_750V: 'Cabo Flex 750V',
  FLEX_1KV: 'Cabo Flex 1KV',
  RIGIDO_1KV: 'Cabo Rígido 1KV'
};

/** Remove acentos, unifica MM², colapsa espaços. */
export function normalizeNomeCabo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/MM²/gi, 'MM2')
    .replace(/²/g, '2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nome sem sufixo de cor (útil para logs). */
export function extrairBaseSemCor(nome: string): string {
  const n = normalizeNomeCabo(nome);
  for (const c of COLOR_SUFFIXES) {
    const suf = ` ${c}`;
    if (n.endsWith(suf)) {
      return n.slice(0, -suf.length).trim();
    }
  }
  return n;
}

function familiaPrefixNorm(familia: CableFamilia): string {
  switch (familia) {
    case 'FLEX_750V':
      return 'CABO FLEX 750V';
    case 'FLEX_1KV':
      return 'CABO FLEX 1KV';
    case 'RIGIDO_1KV':
      return 'CABO RIGIDO 1KV';
    default:
      return '';
  }
}

export function nomePertenceFamilia(nome: string, familia: CableFamilia): boolean {
  const n = normalizeNomeCabo(nome);
  if (!n.startsWith('CABO')) return false;
  const prefix = familiaPrefixNorm(familia);
  return n.startsWith(prefix + ' ') || n === prefix;
}

/**
 * Extrai a bitola (mm²) do nome após o prefixo da família e opcionalmente HEPR.
 */
export function extrairBitolaMm2(nome: string, familia: CableFamilia): number | null {
  const n = normalizeNomeCabo(nome);
  if (!nomePertenceFamilia(nome, familia)) return null;
  const prefix = familiaPrefixNorm(familia);
  let rest = n.slice(prefix.length).trim();
  if (rest.startsWith('HEPR ')) {
    rest = rest.slice(5).trim();
  }
  const m = rest.match(/^(\d+[.,]\d+)\s*MM2?/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

/** Compara bitolas com tolerância numérica (2,5 vs 2,50). */
export function bitolasIguais(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) <= eps;
}

export function combinaFamiliaEBitola(
  nome: string,
  familia: CableFamilia,
  bitolaMm2: number
): boolean {
  if (!nomePertenceFamilia(nome, familia)) return false;
  const g = extrairBitolaMm2(nome, familia);
  if (g === null) return false;
  return bitolasIguais(g, bitolaMm2);
}

export function isCableFamilia(v: string): v is CableFamilia {
  return v === 'FLEX_750V' || v === 'FLEX_1KV' || v === 'RIGIDO_1KV';
}
