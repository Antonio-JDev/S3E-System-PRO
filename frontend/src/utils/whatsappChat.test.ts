import { describe, expect, it } from 'vitest';
import {
  findWhatsappContactInRows,
  displayNameForChatHeader,
  sanitizeWhatsappContactMetaForChat,
} from './whatsappChat';

describe('findWhatsappContactInRows', () => {
  it('não confunde dois JIDs que compartilham os mesmos 10 últimos dígitos', () => {
    const rows = [
      { id: '5511999991234@c.us', number: '11999991234', name: 'Alice' },
      { id: '5547999991234@c.us', number: '47999991234', name: 'Bob' },
    ];
    const hit = findWhatsappContactInRows(rows, '5547999991234@c.us');
    expect(hit?.name).toBe('Bob');
    expect(findWhatsappContactInRows(rows, '5511999991234@c.us')?.name).toBe('Alice');
  });

  it('faz match estrito pelo number normalizado BR (55)', () => {
    const rows = [{ id: '5511987654321@c.us', number: '11987654321', name: 'Carlos' }];
    expect(findWhatsappContactInRows(rows, '5511987654321@c.us')?.name).toBe('Carlos');
    expect(findWhatsappContactInRows(rows, '5521987654321@c.us')).toBeUndefined();
  });
});

describe('displayNameForChatHeader', () => {
  it('ignora fallbackTitle com dígitos de outro telefone', () => {
    const { primary } = displayNameForChatHeader({
      chatId: '5511111111111@c.us',
      fallbackTitle: '5511999999999',
    });
    expect(primary).not.toContain('5511999999999');
  });
});

describe('sanitizeWhatsappContactMetaForChat', () => {
  it('remove contact quando o id não corresponde ao chatId', () => {
    const out = sanitizeWhatsappContactMetaForChat('5511111111111@c.us', {
      contact: { id: '5522222222222@c.us', name: 'Outro' },
      profilePictureUrl: 'https://x/y.jpg',
    });
    expect(out?.contact).toBeNull();
    expect(out?.profilePictureUrl).toBeNull();
  });
});
