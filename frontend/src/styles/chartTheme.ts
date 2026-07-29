/**
 * Tema de gráficos Recharts — Obsidian Slate
 */

import { themeTokens } from './themeTokens';

export const CHART_ACCENT = themeTokens.accentLight;

export const chartDark = {
  grid: themeTokens.borderSubtle,
  axis: themeTokens.muted,
  tooltipBg: themeTokens.surface,
  tooltipBorder: themeTokens.border,
  tooltipText: themeTokens.text,
  tooltipLabel: themeTokens.textSecondary,
  areaFrom: themeTokens.accentLight,
  areaTo: themeTokens.bg,
  legend: themeTokens.textSecondary,
  cardBg: themeTokens.surface,
} as const;

export const chartLight = {
  grid: '#e5e7eb',
  axis: '#6b7280',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipText: '#111827',
  tooltipLabel: '#6b7280',
  areaFrom: '#3B82F6',
  areaTo: 'transparent',
  legend: '#6b7280',
  cardBg: '#ffffff',
} as const;

export const CHART_SERIES_COLORS = [
  CHART_ACCENT,
  themeTokens.success,
  themeTokens.warning,
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  themeTokens.error,
] as const;

export function getChartTheme(isDark: boolean) {
  return isDark ? chartDark : chartLight;
}

export function chartTooltipStyle(isDark: boolean): Record<string, string | number> {
  const t = getChartTheme(isDark);
  return {
    backgroundColor: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: 8,
    color: t.tooltipText,
  };
}
