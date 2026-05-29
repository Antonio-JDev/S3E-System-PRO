/** Filtros da sidebar do painel WhatsApp (persistidos em localStorage). */
export const WA_SIDEBAR_FILTER_STORAGE_KEY = 'wa-chat-sidebar-filter';

export function isValidSidebarFilterValue(v: string): boolean {
  return (
    v === 'all' ||
    v === 'unread' ||
    v === 'favorites' ||
    v === 'groups' ||
    v.startsWith('label:')
  );
}

export function readStoredSidebarFilter(): string {
  const storage =
    typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : null;
  if (!storage) return 'all';
  try {
    const v = storage.getItem(WA_SIDEBAR_FILTER_STORAGE_KEY);
    if (v && isValidSidebarFilterValue(v)) return v;
  } catch {
    // localStorage indisponível
  }
  return 'all';
}

export function isCrmAdminUser(user: { isAdmin?: boolean; role?: string } | null): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  return String(user.role || '').toLowerCase() === 'admin';
}

export function buildWhatsappReplyPrefix(msg: { content?: string | null } | null): string {
  if (!msg) return '';
  return `↩ Respondendo: ${(msg.content || '').trim().slice(0, 120)}\n\n`;
}
