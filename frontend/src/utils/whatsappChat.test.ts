import { describe, expect, it } from 'vitest';
import {
  findWhatsappContactInRows,
  displayNameForChatHeader,
  sanitizeWhatsappContactMetaForChat,
  resolveChatPreviewLabels,
  repairUtf8Mojibake,
  chatPreviewMergeKey,
  dedupeChatPreviews,
  upsertChatPreviewInList,
  resolveChatPreviewUpdateContext,
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
    expect(secondary).toBe('WhatsApp');
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
    expect(out.listTitle).toBe('Maria Silva');
    expect(out.showPhoneSub).toBe(false);
  });
});

describe('chatPreviewMergeKey', () => {
  it('unifica @c.us com e sem prefixo 55', () => {
    const a = chatPreviewMergeKey('554797304499@c.us');
    const b = chatPreviewMergeKey('4797304499@c.us');
    expect(a).toBe(b);
    expect(a).toBe('phone:554797304499');
  });

  it('não mistura grupos', () => {
    expect(chatPreviewMergeKey('120363123@g.us')).toBe('120363123@g.us');
  });
});

describe('dedupeChatPreviews / upsertChatPreviewInList', () => {
  const base = {
    lastContent: 'oi',
    lastFromMe: true,
    lastAck: 1 as number | null,
    unreadCount: 0,
  };

  it('dedupe mescla duas linhas do mesmo telefone', () => {
    const list = dedupeChatPreviews([
      {
        ...base,
        chatId: '554797304499@c.us',
        lastAt: '2026-05-28T15:58:00.000Z',
        lastContent: 'msg antiga',
      },
      {
        ...base,
        chatId: '13774060826850@lid',
        phoneNumberFromS3e: '4797304499',
        lastAt: '2026-05-28T15:59:00.000Z',
        lastContent: 'msg nova',
      },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.lastContent).toBe('msg nova');
    expect(list[0]?.chatId).toBe('554797304499@c.us');
  });

  it('não associa ao chat ativo mensagem fromMe de OUTRO telefone (vazamento entre operadores)', () => {
    // Funcionário B está com o Cliente 2 aberto; chega echo fromMe de mensagem
    // que o Funcionário A mandou para o Cliente 1 (fora da lista local de B).
    const existing = [
      {
        ...base,
        chatId: '5511911112222@c.us', // Cliente 2 (chat ativo de B)
        lastAt: '2026-05-28T15:58:00.000Z',
        lastContent: 'conversa do cliente 2',
      },
    ];
    const ctx = resolveChatPreviewUpdateContext(
      existing,
      '5547933334444@c.us', // Cliente 1 (mensagem do Funcionário A)
      '5511911112222@c.us',
      true
    );
    // Não pode herdar a chave do chat ativo — é outra conversa.
    expect(ctx.mergeKey).toBe('phone:5547933334444');
    expect(ctx.messageCacheChatId).toBe('5547933334444@c.us');
  });

  it('upsert não duplica ao enviar rápido com JIDs diferentes', () => {
    const existing = [
      {
        ...base,
        chatId: '554797304499@c.us',
        lastAt: '2026-05-28T15:58:00.000Z',
        lastContent: 'primeira',
      },
    ];
    const ctx = resolveChatPreviewUpdateContext(
      existing,
      '13774060826850@lid',
      '554797304499@c.us',
      true
    );
    expect(ctx.mergeKey).toBe('phone:554797304499');
    const next = upsertChatPreviewInList(
      existing,
      {
        ...base,
        chatId: ctx.preferredChatId,
        lastAt: '2026-05-28T15:59:00.000Z',
        lastContent: 'segunda',
      },
      { activeChatId: '554797304499@c.us', mergeKey: ctx.mergeKey }
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.lastContent).toBe('segunda');
  });
});
