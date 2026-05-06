/**
 * Arredonda valor monetário para 2 casas decimais (evita 3+ decimais em exibição e persistência).
 */
export function roundMoney(value: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
}
