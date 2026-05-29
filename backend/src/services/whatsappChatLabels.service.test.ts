import { deleteLabel, updateLabel } from './whatsappChatLabels.service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    whatsappChatLabel: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const findUnique = prisma.whatsappChatLabel.findUnique as jest.Mock;
const update = prisma.whatsappChatLabel.update as jest.Mock;
const del = prisma.whatsappChatLabel.delete as jest.Mock;

const globalLabel = {
  id: 'label-global',
  userId: 'owner-user',
  isGlobal: true,
  nome: 'Comercial',
  cor: '#00a884',
  emoji: null,
  ordem: 0,
  memberships: [],
};

describe('whatsappChatLabels.service — permissões admin em listas globais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin pode apagar lista global de outro usuário', async () => {
    findUnique.mockResolvedValue(globalLabel);
    const ok = await deleteLabel('label-global', 'admin-user', { isAdmin: true });
    expect(ok).toBe(true);
    expect(del).toHaveBeenCalledWith({ where: { id: 'label-global' } });
  });

  it('usuário comum não apaga lista global de outro', async () => {
    findUnique.mockResolvedValue(globalLabel);
    const ok = await deleteLabel('label-global', 'other-user', { isAdmin: false });
    expect(ok).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it('admin pode editar lista global de outro usuário', async () => {
    findUnique.mockResolvedValue(globalLabel);
    update.mockResolvedValue({
      ...globalLabel,
      nome: 'Comercial BR',
      memberships: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });
    const dto = await updateLabel('label-global', 'admin-user', { nome: 'Comercial BR' }, { isAdmin: true });
    expect(dto?.nome).toBe('Comercial BR');
    expect(update).toHaveBeenCalled();
  });
});
