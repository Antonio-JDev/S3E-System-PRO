/**
 * Tokens visuais do WhatsApp Web.
 * Verde primary alinhado ao brand oficial (#25d366).
 */
export const WA_WEB = {
  app: '#0b141a',
  panel: '#111b21',
  panelHeader: '#202c33',
  panelHover: '#202c33',
  panelActive: '#2a3942',
  nav: '#1d282f',
  conversation: '#0b141a',
  incoming: '#202c33',
  outgoing: '#005c4b',
  composeBar: '#202c33',
  composeInput: '#2a3942',
  search: '#202c33',
  chip: '#202c33',
  chipActive: '#0a332c',
  primary: '#25d366',
  primaryStrong: '#25d366',
  primaryHover: '#1ebe57',
  unread: '#25d366',
  plus: '#25d366',
  icon: '#aebac1',
  iconActive: '#25d366',
  text: '#e9edef',
  textSecondary: '#8696a0',
  textMuted: '#667781',
  tickBlue: '#53bdeb',
  warning: '#ffd279',
  warningBg: '#3d3426',
  border: '#222d34',
  dropdown: '#233138',
  overlay: 'rgba(11, 20, 26, 0.82)',
  /** Tema claro */
  light: {
    app: '#f0f2f5',
    panel: '#ffffff',
    panelHeader: '#f0f2f5',
    conversation: '#efeae2',
    incoming: '#ffffff',
    outgoing: '#d9fdd3',
    text: '#111b21',
    textSecondary: '#667781',
    border: '#e9edef',
  },
  radiusRow: 8,
  radiusChip: 999,
  radiusBubble: 7.5,
  navWidth: 59,
  listWidth: 400,
  contactWidth: 400,
  avatarList: 49,
  font:
    '"Segoe UI", "Helvetica Neue", Helvetica, "Lucida Grande", Arial, Ubuntu, Cantarell, "Fira Sans", sans-serif',
} as const;

export type WaNavId = 'chats' | 'ai' | 'settings';

export type WaSettingsPage =
  | 'home'
  | 'profile'
  | 'account'
  | 'privacy'
  | 'chats'
  | 'notifications'
  | 'shortcuts';
