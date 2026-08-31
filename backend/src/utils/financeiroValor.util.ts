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

/** Converte valor líquido (parcela) em valor base, dados juros e desconto já gravados. */
export function calcValorBaseFromEfetivo(
  valorEfetivo: unknown,
  valorJuros: unknown = 0,
  valorDesconto: unknown = 0
): number {
  const efetivo = parseMoney(valorEfetivo);
  const juros = parseMoney(valorJuros);
  const desconto = parseMoney(valorDesconto);
  return Math.round((efetivo + desconto - juros) * 100) / 100;
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

/** Valor que abate o saldo da parcela (principal). Juros por atraso ficam fora do saldo. */
export function calcAbateParcelaFromBase(valorBase: unknown, valorDesconto: unknown = 0): number {
  const base = parseMoney(valorBase);
  const desconto = parseMoney(valorDesconto);
  return Math.round(Math.max(0, base - desconto) * 100) / 100;
}

/** Principal abatido a partir do valor total em caixa (valorPago = base + juros − desconto). */
export function calcAbateParcela(
  valorPagoTotal: unknown,
  valorJuros: unknown = 0,
  valorDesconto: unknown = 0
): number {
  const total = parseMoney(valorPagoTotal);
  const juros = parseMoney(valorJuros);
  const desconto = parseMoney(valorDesconto);
  return Math.round(Math.max(0, total + desconto - juros) * 100) / 100;
}

const TOLERANCIA_FINANCEIRA = 0.01;

/**
 * Recebimento com diferença (retenção/imposto): entrada em caixa + diferença quitam o saldo da parcela.
 * Ex.: título 15.000, diferença 1.000 (imposto), caixa 14.000.
 */
export function validarRecebimentoComDiferenca(
  saldoRestante: number,
  valorEntradaCaixa: unknown,
  valorDiferenca: unknown,
  opts?: { permitirParcial?: boolean }
): {
  valorEntradaCaixa: number;
  valorDiferenca: number;
  abateParcela: number;
  valorARegistrar: number;
} {
  const saldo = Math.round(parseMoney(saldoRestante) * 100) / 100;
  const entrada = parseMoney(valorEntradaCaixa);
  const diferenca = parseMoney(valorDiferenca);

  if (saldo <= 0) {
    throw new Error('Não há saldo em aberto nesta parcela');
  }
  if (entrada <= 0) {
    throw new Error('Informe o valor de entrada em caixa (líquido recebido)');
  }
  if (diferenca < 0) {
    throw new Error('A diferença não pode ser negativa');
  }
  if (diferenca <= 0 && !opts?.permitirParcial) {
    throw new Error('Informe o valor da diferença (retenção/imposto) ou use o recebimento normal');
  }

  const soma = Math.round((entrada + diferenca) * 100) / 100;
  if (Math.abs(soma - saldo) > TOLERANCIA_FINANCEIRA) {
    if (!opts?.permitirParcial || soma > saldo + TOLERANCIA_FINANCEIRA) {
      throw new Error(
        `Entrada em caixa (R$ ${entrada.toFixed(2)}) + diferença (R$ ${diferenca.toFixed(2)}) deve igualar o saldo da parcela (R$ ${saldo.toFixed(2)})`
      );
    }
  }

  const abateParcela = opts?.permitirParcial
    ? Math.min(saldo, soma)
    : saldo;

  return {
    valorEntradaCaixa: entrada,
    valorDiferenca: diferenca,
    abateParcela,
    valorARegistrar: entrada,
  };
}
