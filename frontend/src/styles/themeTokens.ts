/**
 * S3E Obsidian Slate — tokens canônicos do Dark Mode
 * Fonte única para CSS, charts e documentação.
 */

export const themeTokens = {
  bg: '#0F0F0F',
  secondary: '#111318',
  surface: '#151922',
  elevated: '#181C24',
  input: '#0D1016',
  sidebar: '#0B0E13',
  nav: '#101522',
  table: '#101318',
  blueSupport: '#070A2F',
  blueDeep: '#111A3A',
  accent: '#2563EB',
  accentHover: '#3B82F6',
  accentLight: '#60A5FA',
  accentSoft: '#1B2A4A',
  border: '#252A33',
  borderSubtle: '#1B2028',
  hover: '#1B2028',
  text: '#F1F5F9',
  textSecondary: '#A1A1AA',
  muted: '#71717A',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#60A5FA',
  scrollbarThumb: '#252A33',
  scrollbarThumbHover: '#343B48',
} as const;

export type ThemeTokenKey = keyof typeof themeTokens;
