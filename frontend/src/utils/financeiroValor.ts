export function parseMoney(value: string | number | undefined | null): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function calcValorARegistrar(
  valorBase: string | number,
  valorJuros: string | number = 0,
  valorDesconto: string | number = 0
): number {
  const base = parseMoney(valorBase);
  const juros = parseMoney(valorJuros);
  const desconto = parseMoney(valorDesconto);
  return Math.round((base + juros - desconto) * 100) / 100;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte valor líquido (parcela/saldo) em valor base, dado juros e desconto já definidos */
export function calcValorBaseFromEfetivo(
  valorEfetivo: number,
  valorJuros: number = 0,
  valorDesconto: number = 0
): number {
  return Math.round((valorEfetivo + valorDesconto - valorJuros) * 100) / 100;
}
