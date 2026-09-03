/** Arredonda valor monetário para 2 casas decimais. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

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

/** Principal abatido quando o desconto já está embutido no título (base − desconto). */
export function calcAbateParcelaFromBase(
  valorBase: unknown,
  valorDesconto: unknown = 0
): number {
  const base = parseMoney(valorBase);
  const desconto = parseMoney(valorDesconto);
  return Math.round(Math.max(0, base - desconto) * 100) / 100;
}

const TOLERANCIA_FINANCEIRA = 0.01;

/**
 * Quitação da parcela no pagamento:
 * - desconto negociado na hora: valor base = saldo (desconto reduz só o caixa);
 * - desconto já previsto no título: base − desconto = saldo.
 */
export function parcelaQuitadaPorPagamento(
  saldoParcela: unknown,
  valorBase: unknown,
  valorDesconto: unknown = 0,
  opts?: { valorDescontoExistente?: unknown; valorJurosExistente?: unknown }
): boolean {
  const saldo = roundMoney(parseMoney(saldoParcela));
  const base = parseMoney(valorBase);
  const desconto = parseMoney(valorDesconto);
  const abateFromBase = calcAbateParcelaFromBase(base, desconto);

  if (Math.abs(abateFromBase - saldo) <= TOLERANCIA_FINANCEIRA) {
    return true;
  }
  if (Math.abs(base - saldo) <= TOLERANCIA_FINANCEIRA) {
    if (desconto <= TOLERANCIA_FINANCEIRA) {
      return true;
    }
    const descontoExistente = parseMoney(opts?.valorDescontoExistente);
    if (descontoExistente <= TOLERANCIA_FINANCEIRA) {
      return true;
    }
    const baseEsperada = calcValorBaseFromEfetivo(
      saldo,
      parseMoney(opts?.valorJurosExistente),
      descontoExistente
    );
    return Math.abs(base - baseEsperada) <= TOLERANCIA_FINANCEIRA;
  }
  return false;
}

/** Entrada em caixa quando há diferença (retenção): saldo do título − diferença */
export function calcEntradaCaixaComDiferenca(saldoTitulo: number, valorDiferenca: number): number {
  const saldo = parseMoney(saldoTitulo);
  const dif = parseMoney(valorDiferenca);
  return Math.round(Math.max(0, saldo - dif) * 100) / 100;
}
