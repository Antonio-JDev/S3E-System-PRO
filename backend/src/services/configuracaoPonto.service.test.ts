import { prisma } from '../lib/prisma';
import { buscarPorFuncionario, upsertPorFuncionario } from './configuracaoPonto.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    configuracaoPonto: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const p = prisma as unknown as {
  configuracaoPonto: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
};

describe('configuracaoPonto.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buscarPorFuncionario delega ao Prisma', async () => {
    p.configuracaoPonto.findUnique.mockResolvedValue({
      id: 'cfg-1',
      funcionarioId: 'f1',
      trabalhaFimDeSemana: true,
      valorHoraFimDeSemana: 35,
    });

    const row = await buscarPorFuncionario('f1');

    expect(p.configuracaoPonto.findUnique).toHaveBeenCalledWith({
      where: { funcionarioId: 'f1' },
      include: { workShift: true },
    });
    expect(row?.funcionarioId).toBe('f1');
  });

  it('upsertPorFuncionario envia create com defaults', async () => {
    p.configuracaoPonto.upsert.mockResolvedValue({ id: 'x' });

    await upsertPorFuncionario('f1', {
      trabalhaFimDeSemana: false,
      valorHoraFimDeSemana: null,
    });

    expect(p.configuracaoPonto.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { funcionarioId: 'f1' },
        create: expect.objectContaining({
          funcionarioId: 'f1',
          trabalhaFimDeSemana: false,
          valorHoraFimDeSemana: null,
        }),
      }),
    );
  });

  it('upsertPorFuncionario update só inclui campos definidos', async () => {
    p.configuracaoPonto.upsert.mockResolvedValue({ id: 'x' });

    await upsertPorFuncionario('f1', {
      trabalhaFimDeSemana: true,
      valorHoraFimDeSemana: 42.5,
    });

    const call = p.configuracaoPonto.upsert.mock.calls[0][0];
    expect(call.update).toEqual(
      expect.objectContaining({
        trabalhaFimDeSemana: true,
        valorHoraFimDeSemana: 42.5,
      }),
    );
  });
});
