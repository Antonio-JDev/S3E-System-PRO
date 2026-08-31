/**
 * Calendário IPVA cota única — Santa Catarina (SC).
 * Finais da placa (último dígito numérico):
 * 1-2 → Janeiro, 3-4 → Fevereiro, 5-6 → Março, 7-8 → Abril, 9-0 → Maio
 */

export function extrairFinalNumericoPlaca(placa: string): number | null {
  const normalized = (placa || '').replace(/[^0-9]/g, '');
  if (!normalized.length) return null;
  const last = normalized.charAt(normalized.length - 1);
  const digit = parseInt(last, 10);
  return Number.isNaN(digit) ? null : digit;
}

/** Mês de vencimento da cota única (1-12) conforme final da placa em SC. */
export function mesVencimentoIpvaCotaUnica(final: number): number | null {
  if (final < 0 || final > 9) return null;
  if (final === 1 || final === 2) return 1;
  if (final === 3 || final === 4) return 2;
  if (final === 5 || final === 6) return 3;
  if (final === 7 || final === 8) return 4;
  return 5; // 9 e 0
}

export function ipvaVenceNoMes(placa: string, mes: number, _ano?: number): boolean {
  const final = extrairFinalNumericoPlaca(placa);
  if (final == null) return false;
  const mesVenc = mesVencimentoIpvaCotaUnica(final);
  return mesVenc === mes;
}

export function nomeMesIpva(mes: number): string {
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return nomes[mes - 1] ?? String(mes);
}

export interface GastoIpvaInput {
  tipo: string;
  data: Date | string;
}

export function ipvaJaPagoNoAno(gastos: GastoIpvaInput[], ano: number): boolean {
  return gastos.some((g) => {
    if (g.tipo !== 'IPVA') return false;
    const d = typeof g.data === 'string' ? new Date(g.data) : g.data;
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === ano;
  });
}
