import { prisma } from '../lib/prisma';
import { loadWhatsappChatIdentities, resolvePhoneDigitKeysForChat } from './whatsappIdentity.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    whatsappChatIdentity: { findMany: jest.fn() },
    whatsappContactCache: { findMany: jest.fn() },
    contatoS3e: { findMany: jest.fn() },
  },
}));

const findIdentities = prisma.whatsappChatIdentity.findMany as jest.Mock;
const findCaches = prisma.whatsappContactCache.findMany as jest.Mock;
const findS3e = prisma.contatoS3e.findMany as jest.Mock;

describe('resolvePhoneDigitKeysForChat', () => {
  beforeEach(() => {
    findIdentities.mockReset();
    findCaches.mockReset();
    findS3e.mockReset();
    findCaches.mockResolvedValue([]);
    findS3e.mockResolvedValue([]);
  });

  it('resolve telefone real para chat @lid via whatsapp_chat_identities', async () => {
    const lid = '214787053113450@lid';
    findIdentities.mockResolvedValue([
      {
        phoneDigits: '5547998862471',
        primaryChatId: lid,
        aliases: ['5547998862471@c.us'],
      },
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

describe('loadWhatsappChatIdentities', () => {
  it('re-export smoke', () => {
    expect(typeof loadWhatsappChatIdentities).toBe('function');
  });
});
