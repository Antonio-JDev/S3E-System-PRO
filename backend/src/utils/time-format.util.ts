/**
 * Utilitários de formatação sexagesimal (HH:mm) para exibição.
 *
 * IMPORTANTE: estes helpers são apenas para exibição (UI / PDF). Toda
 * persistência e cálculo continuam em centesimal/minutos, evitando o erro
 * clássico de somar floats no formato HH:mm (ex.: 1.37 + 1.37 ≠ 2.74).
 */

/**
 * Converte uma quantidade de minutos (inteiro) para o formato "HH:mm".
 * Aceita valores negativos (prefixa com "-").
 */
export function minutesToHHmm(minutos: number): string {
  if (!Number.isFinite(minutos)) return '00:00';
  const total = Math.round(minutos);
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Converte horas em formato decimal/centesimal para "HH:mm" arredondando
 * para o minuto mais próximo.
 *
 * Exemplo: 8.88 → "08:53" (8h + 0.88*60 = 52.8min → 53min).
 *          1.616666 → "01:37".
 */
export function decimalHoursToHHmm(horasDecimais: number): string {
  if (!Number.isFinite(horasDecimais)) return '00:00';
  const totalMin = Math.round(horasDecimais * 60);
  return minutesToHHmm(totalMin);
}

/**
 * Igual a {@link minutesToHHmm}, mas força sinal explícito (+HH:mm / -HH:mm)
 * para saldos / banco de horas / descontos onde o sinal é informação útil.
 */
export function formatHHmmSigned(minutos: number): string {
  if (!Number.isFinite(minutos)) return '+00:00';
  const total = Math.round(minutos);
  if (total === 0) return '00:00';
  const sign = total < 0 ? '-' : '+';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
