/** Mesmas margens do PrintRenderer (descrição técnica / preview de impressão). */
export const PRINT_MARGIN_TOP_PX = 90;
export const PRINT_MARGIN_BOTTOM_PX = 100;
export const PRINT_MARGIN_LEFT_PX = 20;
export const PRINT_MARGIN_RIGHT_PX = 20;

/** Opacidade mínima da folha timbrada em relatórios (extrato etc.) — mais visível que o padrão do modal. */
export const LETTERHEAD_OPACITY_REPORT_MIN = 0.22;

export function effectiveLetterheadOpacity(
  configured: number,
  min = LETTERHEAD_OPACITY_REPORT_MIN
): number {
  if (!Number.isFinite(configured)) return min;
  return Math.min(1, Math.max(min, configured));
}
