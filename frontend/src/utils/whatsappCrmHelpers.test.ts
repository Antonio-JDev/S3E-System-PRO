import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  WA_SIDEBAR_FILTER_STORAGE_KEY,
  buildWhatsappReplyPrefix,
  isCrmAdminUser,
  isValidSidebarFilterValue,
  readStoredSidebarFilter,
} from './whatsappCrmHelpers';

describe('whatsappCrmHelpers — filtro da sidebar', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.mocked(localStorage.getItem).mockImplementation((key) => store.get(String(key)) ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      store.set(String(key), String(value));
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key) => {
      store.delete(String(key));
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      store.clear();
    });
  });

  it('valida filtros built-in e customizados', () => {
    expect(isValidSidebarFilterValue('all')).toBe(true);
    expect(isValidSidebarFilterValue('unread')).toBe(true);
    expect(isValidSidebarFilterValue('label:abc-123')).toBe(true);
    expect(isValidSidebarFilterValue('invalid')).toBe(false);
  });

  it('restaura filtro salvo no localStorage', () => {
    localStorage.setItem(WA_SIDEBAR_FILTER_STORAGE_KEY, 'unread');
    expect(readStoredSidebarFilter()).toBe('unread');
  });

  it('volta para all quando valor salvo é inválido', () => {
    localStorage.setItem(WA_SIDEBAR_FILTER_STORAGE_KEY, 'foo');
    expect(readStoredSidebarFilter()).toBe('all');
  });
});

describe('whatsappCrmHelpers — admin CRM', () => {
  it('reconhece admin por isAdmin ou role', () => {
    expect(isCrmAdminUser({ isAdmin: true, role: 'comercial' })).toBe(true);
    expect(isCrmAdminUser({ isAdmin: false, role: 'admin' })).toBe(true);
    expect(isCrmAdminUser({ isAdmin: false, role: 'comercial' })).toBe(false);
    expect(isCrmAdminUser(null)).toBe(false);
  });
});

describe('whatsappCrmHelpers — prefixo de resposta', () => {
  it('monta prefixo de citação truncado', () => {
    const prefix = buildWhatsappReplyPrefix({ content: 'x'.repeat(200) });
    expect(prefix.startsWith('↩ Respondendo:')).toBe(true);
    expect(prefix.length).toBeLessThan(160);
  });

  it('retorna vazio sem mensagem citada', () => {
    expect(buildWhatsappReplyPrefix(null)).toBe('');
  });
});
