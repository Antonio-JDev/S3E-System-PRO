import { prisma } from '../lib/prisma';
import {
  assertOutboundDestinationReady,
  isLidJid,
  isPhoneKeyDerivedFromLidLocal,
  loadWhatsappChatIdentities,
  resolvePhoneDigitKeysForChat,
  resolvePreferredChatIdForOutbound,
  resolveRealPhoneKeyForLidChat,
  WhatsappOutboundDestinationError
} from './whatsappIdentity.service';
import * as EvoChat from './whatsappEvolutionChat.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    whatsappChatIdentity: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    whatsappContactCache: { findMany: jest.fn() },
    contatoS3e: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() }
  }
}));

jest.mock('./whatsappEvolutionChat.service', () => ({
  evolutionCheckPhoneExists: jest.fn(),
  evolutionFetchProfile: jest.fn()
}));

const findIdentities = prisma.whatsappChatIdentity.findMany as jest.Mock;
const findCaches = prisma.whatsappContactCache.findMany as jest.Mock;
const findS3eMany = prisma.contatoS3e.findMany as jest.Mock;
const findS3eFirst = prisma.contatoS3e.findFirst as jest.Mock;
const evolutionCheckPhoneExists = EvoChat.evolutionCheckPhoneExists as jest.Mock;

describe('isPhoneKeyDerivedFromLidLocal', () => {
  const lid = '7065925869751@lid';

  it('detecta dígitos do LID com e sem prefixo 55', () => {
    expect(isPhoneKeyDerivedFromLidLocal('7065925869751', lid)).toBe(true);
    expect(isPhoneKeyDerivedFromLidLocal('557065925869751', lid)).toBe(true);
  });

  it('não confunde telefone BR real', () => {
    expect(isPhoneKeyDerivedFromLidLocal('5547998862471', lid)).toBe(false);
  });
});

describe('resolvePhoneDigitKeysForChat', () => {
  beforeEach(() => {
    findIdentities.mockReset();
    findCaches.mockReset();
    findS3eMany.mockReset();
    findCaches.mockResolvedValue([]);
    findS3eMany.mockResolvedValue([]);
  });

  it('resolve telefone real para chat @lid via whatsapp_chat_identities', async () => {
    const lid = '214787053113450@lid';
    findIdentities.mockResolvedValue([
      {
        phoneDigits: '5547998862471',
        primaryChatId: lid,
        aliases: ['5547998862471@c.us']
      }
    ]);

    const keys = await resolvePhoneDigitKeysForChat(lid);

    expect(keys).toContain('5547998862471');
    expect(keys.some((k) => k.includes('214787053113450'))).toBe(false);
  });

  it('usa dígitos do PN quando não é @lid', async () => {
    findIdentities.mockResolvedValue([]);
    const keys = await resolvePhoneDigitKeysForChat('5547998862471@c.us');
    expect(keys).toContain('5547998862471');
  });
});

describe('resolvePreferredChatIdForOutbound (@lid)', () => {
  beforeEach(() => {
    findIdentities.mockReset();
    findS3eFirst.mockReset();
    evolutionCheckPhoneExists.mockReset();
    findS3eFirst.mockResolvedValue(null);
  });

  it('não chama whatsappNumbers com dígitos do LID quando não há identity', async () => {
    const lid = '7065925869751@lid';
    findIdentities.mockResolvedValue([]);

    const out = await resolvePreferredChatIdForOutbound(lid);

    expect(out).toBe(lid);
    expect(evolutionCheckPhoneExists).not.toHaveBeenCalled();
  });

  it('resolve via contatos_s3e.numero quando jid é @lid', async () => {
    const lid = '7065925869751@lid';
    findIdentities.mockResolvedValue([]);
    findS3eFirst.mockResolvedValue({ numero: '5547998862471' });
    evolutionCheckPhoneExists.mockResolvedValue({
      numberExists: true,
      chatId: '5547998862471@s.whatsapp.net',
      pushName: null
    });
    (prisma.whatsappChatIdentity.upsert as jest.Mock).mockResolvedValue({});

    const out = await resolvePreferredChatIdForOutbound(lid);

    expect(evolutionCheckPhoneExists).toHaveBeenCalledWith('5547998862471');
    expect(out).toBe(lid);
  });
});

describe('assertOutboundDestinationReady', () => {
  beforeEach(() => {
    findIdentities.mockReset();
    findCaches.mockReset();
    findS3eMany.mockReset();
    findS3eFirst.mockReset();
    evolutionCheckPhoneExists.mockReset();
    findCaches.mockResolvedValue([]);
    findS3eMany.mockResolvedValue([]);
    findS3eFirst.mockResolvedValue(null);
  });

  it('ignora chats PN (@c.us)', async () => {
    await expect(assertOutboundDestinationReady('5547998862471@c.us')).resolves.toBeUndefined();
  });

  it('permite @lid quando há identity com telefone real', async () => {
    const lid = '214787053113450@lid';
    findIdentities.mockResolvedValue([
      {
        phoneDigits: '5547998862471',
        primaryChatId: lid,
        aliases: []
      }
    ]);

    await expect(assertOutboundDestinationReady(lid)).resolves.toBeUndefined();
  });

  it('bloqueia @lid sem telefone mapeado', async () => {
    const lid = '7065925869751@lid';
    findIdentities.mockResolvedValue([]);

    await expect(assertOutboundDestinationReady(lid)).rejects.toBeInstanceOf(
      WhatsappOutboundDestinationError
    );
  });
});

describe('loadWhatsappChatIdentities', () => {
  it('re-export smoke', () => {
    expect(typeof loadWhatsappChatIdentities).toBe('function');
    expect(isLidJid('x@lid')).toBe(true);
    expect(isLidJid('5547@c.us')).toBe(false);
  });
});

describe('resolveRealPhoneKeyForLidChat', () => {
  beforeEach(() => {
    findS3eFirst.mockReset();
  });

  it('lê telefone de contatos_s3e por jid', async () => {
    const lid = '7065925869751@lid';
    findS3eFirst.mockResolvedValue({ numero: '5547123456789' });
    const key = await resolveRealPhoneKeyForLidChat(lid, []);
    expect(key).toBe('5547123456789');
  });
});
