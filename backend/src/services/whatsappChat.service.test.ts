import { listMessagesForChat } from './whatsappChat.service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    chatMessage: {
      findMany: jest.fn(),
    },
  },
}));

const findMany = prisma.chatMessage.findMany as jest.MockedFunction<typeof prisma.chatMessage.findMany>;

describe('listMessagesForChat', () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it('busca as N mais recentes (desc + take) e devolve em ordem cronológica ascendente', async () => {
    const t1 = new Date('2024-01-01T10:00:00Z');
    const t2 = new Date('2024-01-02T10:00:00Z');
    const t3 = new Date('2024-01-03T10:00:00Z');
    findMany.mockResolvedValue([
      { id: 'c', timestamp: t3 } as any,
      { id: 'b', timestamp: t2 } as any,
      { id: 'a', timestamp: t1 } as any,
    ]);

    const rows = await listMessagesForChat('5511999999999@c.us', 3);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: 'desc' },
        take: 3,
      })
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(rows[0].timestamp.getTime()).toBeLessThan(rows[1].timestamp.getTime());
  });
});
