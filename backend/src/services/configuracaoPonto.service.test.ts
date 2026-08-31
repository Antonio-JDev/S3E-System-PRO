import { prisma } from '../lib/prisma';
import { buscarPorFuncionario, upsertPorFuncionario } from './configuracaoPonto.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    configuracaoPonto: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    funcionario: {
      findUnique: jest.fn(),
    },
    registroPonto: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    comentarioConferenciaPontoRh: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('./bancoHorasExcesso.service', () => ({
  sincronizarExcessoCompetencia: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./bancoHorasExtrato.service', () => ({
  sincronizarExtratoBancoHorasCompetencia: jest.fn().mockResolvedValue(null),
  sincronizarExtratosAposImportXls: jest.fn().mockResolvedValue(0),
}));

jest.mock('./rhComentarioConferencia.service', () => ({
  metricasAvaliacaoDeRegistro: jest.fn().mockReturnValue({
    minutosAtraso: 0,
    minutosHorasDevidas: 0,
    minutosExtra: 0,
    minutosFaltaIntegral: 0,
  }),
  reaplicarBancoAvaliacaoAposMudancaMetricas: jest.fn().mockResolvedValue(undefined),
  sincronizarBancoAvaliacoesCompetencia: jest.fn().mockResolvedValue(undefined),
}));

const p = prisma as unknown as {
  configuracaoPonto: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  funcionario: { findUnique: jest.Mock };
  registroPonto: { findMany: jest.Mock; update: jest.Mock };
  comentarioConferenciaPontoRh: { findMany: jest.Mock };
};

describe('configuracaoPonto.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    p.configuracaoPonto.findUnique.mockResolvedValue({
      workShiftId: null,
      toleranciaMinutos: 5,
    });
    p.funcionario.findUnique.mockResolvedValue({
      id: 'f1',
      tipoContrato: 'REGISTRADO',
      permitirHorasExtras100: false,
    });
    p.registroPonto.findMany.mockResolvedValue([]);
    p.comentarioConferenciaPontoRh.findMany.mockResolvedValue([]);
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

  it('upsert com workShiftId diferente dispara recalc só do funcionário', async () => {
    p.configuracaoPonto.findUnique
      .mockResolvedValueOnce({ workShiftId: 'ws-old', toleranciaMinutos: 5 })
      .mockResolvedValueOnce({
        toleranciaMinutos: 5,
        workShift: {
          entrada1: '08:00',
          saida1: '12:00',
          entrada2: '13:00',
          saida2: '17:00',
        },
      });
    p.configuracaoPonto.upsert.mockResolvedValue({ id: 'x', workShiftId: 'ws-new' });
    p.registroPonto.findMany.mockResolvedValue([]);

    await upsertPorFuncionario('f1', { workShiftId: 'ws-new' });

    expect(p.registroPonto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { funcionarioId: 'f1' } }),
    );
  });
});
