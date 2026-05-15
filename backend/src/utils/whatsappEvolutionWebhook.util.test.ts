import {
  evolutionExtractReactionFromReactionEvent,
  evolutionExtractReactionFromUpsert,
  evolutionUpsertMessageToProviderRaw
} from './whatsappEvolutionWebhook.util';

describe('evolutionUpsertMessageToProviderRaw', () => {
  it('extrai vCard de contactMessage e não marca como mídia', () => {
    const raw = {
      key: { remoteJid: '5511999999999@c.us', fromMe: false, id: 'ABC123' },
      message: {
        contactMessage: {
          displayName: 'João Silva',
          vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:João Silva\nTEL;TYPE=CELL:+55 11 98888-7777\nEND:VCARD\n'
        }
      },
      messageTimestamp: 1_700_000_000
    };

    const out = evolutionUpsertMessageToProviderRaw(raw as Record<string, unknown>);
    expect(out).not.toBeNull();
    expect(out!.body).toContain('BEGIN:VCARD');
    expect(out!.body).toContain('João Silva');
    expect(out!.hasMedia).toBe(false);
    expect((out!.type as string) || '').toBe('contact');
  });

  it('contactsArrayMessage usa primeiro vcard', () => {
    const raw = {
      key: { remoteJid: '5511888888888@c.us', fromMe: false, id: 'XYZ' },
      message: {
        contactsArrayMessage: {
          displayName: 'Lista',
          contacts: [
            {
              displayName: 'Maria',
              vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Maria\nEND:VCARD\n'
            }
          ]
        }
      },
      messageTimestamp: 1_700_000_001
    };

    const out = evolutionUpsertMessageToProviderRaw(raw as Record<string, unknown>);
    expect(out).not.toBeNull();
    expect(out!.body).toContain('BEGIN:VCARD');
    expect(out!.body).toContain('Maria');
    expect(out!.hasMedia).toBe(false);
  });
});

describe('evolutionExtractReactionFromUpsert', () => {
  it('extrai emoji e id da mensagem alvo de um messages.upsert (reactionMessage)', () => {
    const raw = {
      key: { remoteJid: '5547999999999@s.whatsapp.net', fromMe: false, id: 'REACT_EVT_1' },
      message: {
        reactionMessage: {
          key: { remoteJid: '5547999999999@s.whatsapp.net', fromMe: true, id: 'TARGET_MSG_ABC' },
          text: '👍',
          senderTimestampMs: 1_700_000_500
        }
      },
      messageTimestamp: 1_700_000_500
    };
    const out = evolutionExtractReactionFromUpsert(raw as Record<string, unknown>);
    expect(out).not.toBeNull();
    expect(out!.targetProviderMessageId).toBe('TARGET_MSG_ABC');
    expect(out!.reaction).toBe('👍');
    expect(out!.targetFromMe).toBe(true);
    expect(out!.targetChatId).toBe('5547999999999@s.whatsapp.net');
  });

  it('reconhece remoção de reação (text vazio)', () => {
    const raw = {
      key: { remoteJid: '5547999999999@s.whatsapp.net', fromMe: false, id: 'REACT_EVT_2' },
      message: {
        reactionMessage: {
          key: { remoteJid: '5547999999999@s.whatsapp.net', fromMe: true, id: 'TARGET_MSG_XYZ' },
          text: ''
        }
      }
    };
    const out = evolutionExtractReactionFromUpsert(raw as Record<string, unknown>);
    expect(out).not.toBeNull();
    expect(out!.reaction).toBe('');
    expect(out!.targetProviderMessageId).toBe('TARGET_MSG_XYZ');
  });

  it('retorna null quando não há reactionMessage', () => {
    const raw = {
      key: { remoteJid: '5547@c.us', fromMe: false, id: 'M1' },
      message: { conversation: 'olá' }
    };
    expect(evolutionExtractReactionFromUpsert(raw as Record<string, unknown>)).toBeNull();
  });
});

describe('evolutionExtractReactionFromReactionEvent', () => {
  it('extrai do formato achatado { messageId, reaction, remoteJid }', () => {
    const data = {
      messageId: 'TARGET_FLAT_1',
      remoteJid: '5547999999999@s.whatsapp.net',
      reaction: '❤️',
      fromMe: true
    };
    const out = evolutionExtractReactionFromReactionEvent(data);
    expect(out).not.toBeNull();
    expect(out!.targetProviderMessageId).toBe('TARGET_FLAT_1');
    expect(out!.reaction).toBe('❤️');
    expect(out!.targetChatId).toBe('5547999999999@s.whatsapp.net');
  });

  it('faz fallback para o formato Baileys aninhado quando vier assim', () => {
    const data = {
      key: { remoteJid: '5547@c.us', fromMe: false, id: 'REACT_FALLBACK' },
      message: {
        reactionMessage: {
          key: { remoteJid: '5547@c.us', fromMe: true, id: 'TARGET_NESTED' },
          text: '🙏'
        }
      }
    };
    const out = evolutionExtractReactionFromReactionEvent(data);
    expect(out).not.toBeNull();
    expect(out!.targetProviderMessageId).toBe('TARGET_NESTED');
    expect(out!.reaction).toBe('🙏');
  });

  it('retorna null sem id alvo', () => {
    expect(evolutionExtractReactionFromReactionEvent({ reaction: '👍' })).toBeNull();
    expect(evolutionExtractReactionFromReactionEvent(null)).toBeNull();
  });
});
