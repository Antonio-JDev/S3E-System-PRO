/**
 * Cálculo e validação de valores financeiros (base + juros - desconto).
 */
export function parseMoney(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function calcValorARegistrar(
  valorBase: unknown,
  valorJuros: unknown = 0,
  valorDesconto: unknown = 0
): number {
  const base = parseMoney(valorBase);
  const juros = parseMoney(valorJuros);
  const desconto = parseMoney(valorDesconto);
  return Math.round((base + juros - desconto) * 100) / 100;
}

export function validarValoresFinanceiros(
  valorBase: unknown,
  valorJuros?: unknown,
  valorDesconto?: unknown,
  opts?: { exigirBasePositivo?: boolean }
): { valorBase: number; valorJuros: number; valorDesconto: number; valorARegistrar: number } {
  const base = parseMoney(valorBase);
  const juros = parseMoney(valorJuros);
  const desconto = parseMoney(valorDesconto);
  const valorARegistrar = calcValorARegistrar(base, juros, desconto);

  if (opts?.exigirBasePositivo !== false && base <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }
  if (desconto > base + juros + 0.0001) {
    throw new Error('Desconto não pode ser maior que o valor + juros');
  }
  if (valorARegistrar <= 0) {
    throw new Error('Valor a registrar deve ser maior que zero (verifique juros e descontos)');
  }

  return { valorBase: base, valorJuros: juros, valorDesconto: desconto, valorARegistrar };
}
