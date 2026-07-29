/**
 * Classes Tailwind padrão para Dark Mode — Obsidian Slate
 * Tokens: src/styles/themeTokens.ts + tailwind.config.js → colors.dark
 */

export const darkModeClasses = {
  // Backgrounds
  page: 'bg-gray-50 dark:bg-dark-bg',
  card: 'bg-white dark:bg-dark-card',
  cardElevated: 'bg-white dark:bg-dark-elevated',
  cardHeader: 'bg-white dark:bg-dark-card',
  section: 'bg-gray-50 dark:bg-dark-bg',
  sidebar: 'bg-white dark:bg-dark-sidebar',
  nav: 'bg-gray-100 dark:bg-dark-nav',

  // Borders
  border: 'border-gray-200 dark:border-dark-border',
  borderLight: 'border-gray-100 dark:border-dark-border-subtle',
  borderHover: 'hover:border-dark-accent/40',

  // Text
  title: 'text-gray-900 dark:text-dark-text',
  subtitle: 'text-gray-600 dark:text-dark-text-secondary',
  text: 'text-gray-700 dark:text-dark-text',
  textMuted: 'text-gray-500 dark:text-dark-muted',

  // Inputs
  input:
    'bg-white dark:bg-dark-input border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-muted',
  inputFocus:
    'focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-accent/30 focus:border-blue-500 dark:focus:border-dark-accent',

  // Buttons
  btnPrimary: 'bg-dark-accent hover:bg-[#3B82F6] text-white',
  btnSecondary:
    'bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover',
  btnDanger: 'bg-red-600 hover:bg-red-700 text-white',
  btnGhost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text',

  // Tabs
  tabActive: 'bg-dark-accent-soft text-dark-text',
  tabInactive: 'bg-transparent text-dark-text-secondary hover:bg-dark-elevated',

  // Modals
  modalOverlay: 'bg-black/70 dark:bg-black/80',
  modalContent: 'bg-white dark:bg-dark-card',
  modalHeader: 'bg-dark-accent',

  // Tables
  tableHeader: 'bg-gray-50 dark:bg-dark-table',
  tableRow: 'bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-dark-surface',

  // Badges
  badgeGreen: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-[#4ADE80]',
  badgeYellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-[#FBBF24]',
  badgeRed: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-[#F87171]',
  badgeBlue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-[#93C5FD]',
  badgeGray: 'bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-dark-text-secondary',
};

export const dm = (...classes: string[]) => classes.join(' ');
