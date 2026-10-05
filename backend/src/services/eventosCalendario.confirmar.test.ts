const prismaMock = {
  eventoCalendario: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

import { EventoStatus } from '@prisma/client';
import {
  eventosCalendarioService,
  semPrevisaoSubstituida,
} from './eventosCalendario.service';

describe('confirmação de alocação', () => {
  const previsao = {
    id: 'evt-1',
    titulo: 'OS-2807',
    descricao: null,
    dataInicio: new Date('2026-09-23T10:30:00.000Z'),
    dataFim: new Date('2026-09-25T21:30:00.000Z'),
    status: EventoStatus.PREVISAO,
    tipo: 'OBRA',
    orcamentoId: 'orc-1',
    projetoId: 'proj-1',
    custoVeiculo: 0,
    equipeEngenhariaIds: [],
    equipeExecucaoIds: ['f1', 'f2'],
    valorHoraEngenharia: null,
    valorHoraExecucao: null,
    horariosPorDia: null,
    eventoOrigemId: null,
    equipe: [{ id: 'f1' }, { id: 'f2' }],
    veiculos: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualiza o evento original para confirmado e não cria cópia', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(previsao);
    prismaMock.eventoCalendario.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.eventoCalendario.update.mockImplementation(async ({ where, data }) => ({
      ...previsao,
      id: where.id,
      status: data.status,
      eventoOrigemId: null,
    }));

    const evento = await eventosCalendarioService.confirmar('evt-1');

    expect(evento?.id).toBe('evt-1');
    expect(evento?.status).toBe(EventoStatus.VALIDO);
    expect(evento?.eventoOrigemId).toBeNull();
    expect(prismaMock.eventoCalendario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: { status: EventoStatus.VALIDO },
      }),
    );
    expect(prismaMock.eventoCalendario.deleteMany).toHaveBeenCalledWith({
      where: { eventoOrigemId: 'evt-1' },
    });
    expect(prismaMock.eventoCalendario.create).not.toHaveBeenCalled();
  });

  it('na grade fica um card só quando ainda existe a cópia legada', () => {
    const visiveis = semPrevisaoSubstituida([
      { id: 'prev', status: 'PREVISAO', eventoOrigemId: null },
      { id: 'conf', status: 'VALIDO', eventoOrigemId: 'prev' },
    ]);
    expect(visiveis).toEqual([{ id: 'conf', status: 'VALIDO', eventoOrigemId: 'prev' }]);
  });
});
