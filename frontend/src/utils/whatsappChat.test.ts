import { describe, expect, it } from 'vitest';
import {
  findWhatsappContactInRows,
  displayNameForChatHeader,
  sanitizeWhatsappContactMetaForChat,
  resolveChatPreviewLabels,
  repairUtf8Mojibake,
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

  it('prioriza agendaS3eName sobre cachedProviderName', () => {
    const { primary } = displayNameForChatHeader({
      chatId: '5511999999999@c.us',
      agendaS3eName: 'Cliente CSV',
      cachedProviderName: 'Nome WhatsApp',
      providerContactName: 'Nome Provedor',
    });
    expect(primary).toBe('Cliente CSV');
  });

  it('prioriza cachedProviderName sobre providerContactName e CRM', () => {
    const { primary } = displayNameForChatHeader({
      chatId: '5511999999999@c.us',
      cachedProviderName: 'Nome WhatsApp',
      providerContactName: 'Nome Provedor',
      crmName: 'Nome CRM',
    });
    expect(primary).toBe('Nome WhatsApp');
  });

  it('@lid: subtítulo usa telefone do contato do provedor (campo number)', () => {
    const { primary, secondary } = displayNameForChatHeader({
      chatId: '13774060826850@lid',
      cachedProviderName: 'Luciana Von Muhlen',
      providerContact: { id: '5547974086825@c.us', number: '47974086825', name: 'Luciana' },
    });
    expect(primary).toBe('Luciana Von Muhlen');
    expect(secondary).toBe('(47) 97408-6825');
  });

  it('@lid: subtítulo usa JID @c.us do contato quando number ausente', () => {
    const { secondary } = displayNameForChatHeader({
      chatId: '999@lid',
      cachedProviderName: 'Fulano',
      providerContact: { id: '5511987654321@c.us', name: 'Fulano' },
    });
    expect(secondary).toBe('(11) 98765-4321');
  });

  it('@lid: sem telefone no JID nem no contato — mensagem de privacidade (sem ID longo)', () => {
    const { secondary } = displayNameForChatHeader({
      chatId: '13774060826850@lid',
      cachedProviderName: 'Luciana',
    });
    expect(secondary).toBe('WhatsApp · número não disponível neste ID (privacidade)');
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

describe('repairUtf8Mojibake', () => {
  it('corrige nome de arquivo quando UTF-8 foi lido como Latin-1', () => {
    expect(repairUtf8Mojibake('01 - Croqui de LocalizaÃ§Ã£o.pdf')).toBe('01 - Croqui de Localização.pdf');
  });

  it('não altera português já em Unicode correto', () => {
    expect(repairUtf8Mojibake('Localização e ação')).toBe('Localização e ação');
  });

  it('não altera ASCII', () => {
    expect(repairUtf8Mojibake('report.pdf')).toBe('report.pdf');
  });

  it('corrige mojibake após emoji e travessão (legenda de arquivo)', () => {
    expect(repairUtf8Mojibake('📎 Arquivo — 01 - Croqui de LocalizaÃ§Ã£o.pdf')).toBe(
      '📎 Arquivo — 01 - Croqui de Localização.pdf'
    );
  });
});

describe('resolveChatPreviewLabels', () => {
  it('usa providerCachedName na lista mesmo sem CRM', () => {
    const out = resolveChatPreviewLabels(
      { chatId: '5511999999999@c.us', contactName: null, providerCachedName: 'Maria Silva' },
      { id: '5511999999999@c.us', name: '' },
      undefined
    );
    expect(out.listTitle).toBe('Maria');
    expect(out.showPhoneSub).toBe(false);
  });
});
