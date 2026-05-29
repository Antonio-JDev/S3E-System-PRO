import {
  linkWhatsappChatToCliente,
  listMessagesForChat,
  parseOrcamentoNumeroFromPdfFilename,
  unlinkWhatsappChatFromCliente,
} from './whatsappChat.service';
import { prisma } from '../lib/prisma';
import { resolvePhoneDigitKeysForChat } from './whatsappIdentity.service';

jest.mock('./whatsappIdentity.service', () => ({
  resolvePhoneDigitKeysForChat: jest.fn(),
  loadWhatsappChatIdentities: jest.fn().mockResolvedValue([]),
  expandedStorageChatIdVariants: jest.fn((id: string) => [id]),
  mergeKeyForChatPreviewRow: jest.fn(),
  normalizePhoneDigitsKey: jest.fn((d: string) => d),
  recordWhatsappChatIdentity: jest.fn(),
  resolvePreferredChatIdForOutbound: jest.fn(async (id: string) => id),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    chatMessage: { findMany: jest.fn() },
    cliente: { findUnique: jest.fn(), update: jest.fn() },
    contatoLead: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    whatsappContactCache: { findUnique: jest.fn() },
  },
}));

const mockResolvePhoneKeys = resolvePhoneDigitKeysForChat as jest.MockedFunction<
  typeof resolvePhoneDigitKeysForChat
>;
const findManyMessages = prisma.chatMessage.findMany as jest.Mock;
const findCliente = prisma.cliente.findUnique as jest.Mock;
const updateCliente = prisma.cliente.update as jest.Mock;
const findManyLeads = prisma.contatoLead.findMany as jest.Mock;
const updateLead = prisma.contatoLead.update as jest.Mock;
const createLead = prisma.contatoLead.create as jest.Mock;
const findCache = prisma.whatsappContactCache.findUnique as jest.Mock;

const CHAT = '556399494139@c.us';
const CLIENTE_ID = 'cliente-uuid-1';

describe('parseOrcamentoNumeroFromPdfFilename', () => {
  it('extrai número de Orcamento-42.pdf', () => {
    expect(parseOrcamentoNumeroFromPdfFilename('Orcamento-42.pdf')).toBe(42);
    expect(parseOrcamentoNumeroFromPdfFilename('orcamento-7.pdf')).toBe(7);
    expect(parseOrcamentoNumeroFromPdfFilename('C:\\tmp\\Orcamento-99.pdf')).toBe(99);
  });

  it('retorna null para nomes que não são de orçamento', () => {
    expect(parseOrcamentoNumeroFromPdfFilename('proposta.pdf')).toBeNull();
    expect(parseOrcamentoNumeroFromPdfFilename('')).toBeNull();
  });
});

describe('listMessagesForChat', () => {
  beforeEach(() => {
    findManyMessages.mockReset();
  });

  it('busca as N mais recentes (desc + take) e devolve em ordem cronológica ascendente', async () => {
    const t1 = new Date('2024-01-01T10:00:00Z');
    const t2 = new Date('2024-01-02T10:00:00Z');
    const t3 = new Date('2024-01-03T10:00:00Z');
    findManyMessages.mockResolvedValue([
      { id: 'c', timestamp: t3 },
      { id: 'b', timestamp: t2 },
      { id: 'a', timestamp: t1 },
    ]);

    const rows = await listMessagesForChat('5511999999999@c.us', 3);

    expect(findManyMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: 'desc' },
        take: 3,
      })
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('linkWhatsappChatToCliente — WhatsApp direto e funil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolvePhoneKeys.mockResolvedValue(['556399494139']);
    findCliente.mockResolvedValue({
      id: CLIENTE_ID,
      nome: 'Jorge Silva',
      telefone: null,
    });
    findCache.mockResolvedValue({ displayName: 'Jorge' });
  });

  it('atualiza lead existente encontrado pelo telefone do chat', async () => {
    findManyLeads.mockResolvedValue([
      {
        id: 'lead-1',
        nome: 'Jorge',
        whatsapp: '556399494139',
        status: 'PRONTO_PARA_ORCAR',
        etapa: 2,
        clienteId: null,
        cliente: null,
      },
    ]);

    await linkWhatsappChatToCliente(CHAT, CLIENTE_ID);

    expect(updateLead).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { clienteId: CLIENTE_ID },
    });
    expect(createLead).not.toHaveBeenCalled();
  });

  it('cria lead quando conversa aberta só pelo WhatsApp (sem lead prévio)', async () => {
    findManyLeads.mockResolvedValue([]);

    await linkWhatsappChatToCliente(CHAT, CLIENTE_ID);

    expect(createLead).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nome: 'Jorge',
        whatsapp: '556399494139',
        clienteId: CLIENTE_ID,
        status: 'CONVERTIDO',
        etapa: 3,
      }),
    });
    expect(updateLead).not.toHaveBeenCalled();
  });

  it('preenche telefone do cliente quando cadastro está vazio', async () => {
    findManyLeads.mockResolvedValue([
      {
        id: 'lead-1',
        nome: 'Jorge',
        whatsapp: '556399494139',
        status: 'CONVERTIDO',
        etapa: 3,
        clienteId: null,
        cliente: null,
      },
    ]);

    await linkWhatsappChatToCliente(CHAT, CLIENTE_ID);

    expect(updateCliente).toHaveBeenCalledWith({
      where: { id: CLIENTE_ID },
      data: { telefone: '556399494139' },
    });
  });
});

describe('unlinkWhatsappChatFromCliente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('remove clienteId do lead vinculado', async () => {
    findManyLeads.mockResolvedValue([
      {
        id: 'lead-1',
        nome: 'Jorge',
        whatsapp: '556399494139',
        status: 'CONVERTIDO',
        etapa: 3,
        clienteId: CLIENTE_ID,
        cliente: { id: CLIENTE_ID, nome: 'Jorge Silva', telefone: '556399494139', cpfCnpj: '123' },
      },
    ]);

    await unlinkWhatsappChatFromCliente(CHAT);

    expect(updateLead).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { clienteId: null },
    });
  });

  it('falha com mensagem clara quando não há vínculo ativo no funil', async () => {
    findManyLeads.mockResolvedValue([
      {
        id: 'lead-1',
        nome: 'Jorge',
        whatsapp: '556399494139',
        status: 'PRONTO_PARA_ORCAR',
        etapa: 2,
        clienteId: null,
        cliente: null,
      },
    ]);

    await expect(unlinkWhatsappChatFromCliente(CHAT)).rejects.toThrow(/vínculo ativo/i);
    expect(updateLead).not.toHaveBeenCalled();
  });
});
