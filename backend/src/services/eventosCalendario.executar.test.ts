const prismaMock = {
  eventoCalendario: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  projeto: { findUnique: jest.fn() },
  user: { findMany: jest.fn() },
  apontamentoOsItem: { findMany: jest.fn() },
};

jest.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

const criarApontamento = jest.fn();

jest.mock('./apropriacaoOs.service', () => ({
  apropriacaoOsService: { criarApontamento },
}));

import { EventoStatus } from '@prisma/client';
import { dataHoraEmBrasilia } from '../utils/datetime-sp.util';
import { horasPorDiaAlocacao, ymdHojeBrasilia } from '../utils/horasAlocacaoCalendario';
import { eventosCalendarioService } from './eventosCalendario.service';

function deslocarYmd(ymd: string, dias: number): string {
  const [ano, mes, dia] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(ano, mes - 1, dia + dias));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function partesYmd(ymd: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = ymd.split('-').map(Number);
  return { ano, mes, dia };
}

const hoje = ymdHojeBrasilia();
const ontem = deslocarYmd(hoje, -1);
const futuro = deslocarYmd(hoje, 3);
const ontemPartes = partesYmd(ontem);
const hojePartes = partesYmd(hoje);

function eventoBase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    titulo: 'OS-2807',
    descricao: null,
    dataInicio: dataHoraEmBrasilia(ontemPartes.ano, ontemPartes.mes, ontemPartes.dia, '22:00'),
    dataFim: dataHoraEmBrasilia(hojePartes.ano, hojePartes.mes, hojePartes.dia, '10:00'),
    status: EventoStatus.PREVISAO,
    tipo: 'OBRA',
    orcamentoId: 'orc-1',
    projetoId: 'proj-1',
    custoVeiculo: 0,
    equipeEngenhariaIds: [] as string[],
    equipeExecucaoIds: ['f1'],
    valorHoraEngenharia: null,
    valorHoraExecucao: null,
    horariosPorDia: null,
    eventoOrigemId: null,
    equipe: [
      {
        id: 'f1',
        nome: 'João',
        cargo: 'Eletricista',
        email: 'joao@s3e.com',
        valorHora: 0,
        valorDiaria: 200,
        status: 'Ativo',
      },
    ],
    veiculos: [],
    ...overrides,
  };
}

describe('executar OS no calendário', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.projeto.findUnique.mockResolvedValue({ id: 'proj-1', status: 'EXECUCAO' });
    prismaMock.apontamentoOsItem.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.eventoCalendario.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.eventoCalendario.update.mockImplementation(async ({ where, data }) => ({
      ...eventoBase(),
      id: where.id,
      status: data.status,
      eventoOrigemId: null,
    }));
    criarApontamento.mockResolvedValue({ apontamento: { id: 'ap-1' } });
  });

  it('promove a previsão para válido no mesmo evento, sem cópia', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        horariosPorDia: [{ dia: ontem, inicio: '08:00', fim: '12:00' }],
      }),
    );

    const resultado = await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(resultado?.evento.id).toBe('evt-1');
    expect(resultado?.evento.status).toBe(EventoStatus.VALIDO);
    expect(resultado?.evento.eventoOrigemId).toBeNull();
    expect(prismaMock.eventoCalendario.create).not.toHaveBeenCalled();
    expect(prismaMock.eventoCalendario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: { status: EventoStatus.VALIDO },
      }),
    );
    expect(criarApontamento).toHaveBeenCalledTimes(1);
  });

  it('não reconfirma quando o evento já está válido e só aponta o que falta', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        status: EventoStatus.VALIDO,
        horariosPorDia: [{ dia: ontem, inicio: '08:00', fim: '12:00' }],
      }),
    );

    const resultado = await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(resultado?.evento.status).toBe(EventoStatus.VALIDO);
    expect(prismaMock.eventoCalendario.update).not.toHaveBeenCalled();
    expect(prismaMock.eventoCalendario.create).not.toHaveBeenCalled();
    expect(criarApontamento).toHaveBeenCalledTimes(1);
  });

  it('recorta o ciclo 07:30–17:30 e não conta a madrugada', async () => {
    const horas = horasPorDiaAlocacao(
      dataHoraEmBrasilia(ontemPartes.ano, ontemPartes.mes, ontemPartes.dia, '22:00'),
      dataHoraEmBrasilia(hojePartes.ano, hojePartes.mes, hojePartes.dia, '10:00'),
      null,
    );
    expect(horas).toEqual([{ dia: hoje, horas: 2.5 }]);

    prismaMock.eventoCalendario.findUnique.mockResolvedValue(eventoBase());

    await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(criarApontamento).toHaveBeenCalledTimes(1);
    expect(criarApontamento).toHaveBeenCalledWith(
      'proj-1',
      'user-admin',
      expect.objectContaining({
        dataApontamento: hoje,
        observacoes: 'Apontamento gerado pelo calendário (evento evt-1).',
        itens: [
          {
            tipoRecurso: 'DIARIA_EQUIPE',
            quantidade: 0.3125,
            funcionarioId: 'f1',
          },
        ],
      }),
    );
  });

  it('usa o horário manual do dia, inclusive depois das 17:30', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        equipeEngenhariaIds: ['f-eng'],
        equipeExecucaoIds: ['f1'],
        equipe: [
          {
            id: 'f-eng',
            nome: 'Ana',
            cargo: 'Engenheira',
            email: 'ana@s3e.com',
            valorHora: 80,
            valorDiaria: null,
            status: 'Ativo',
          },
          {
            id: 'f1',
            nome: 'João',
            cargo: 'Eletricista',
            email: 'joao@s3e.com',
            valorHora: 0,
            valorDiaria: 200,
            status: 'Ativo',
          },
        ],
        horariosPorDia: [{ dia: ontem, inicio: '18:00', fim: '20:00' }],
      }),
    );
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-ana', email: 'ana@s3e.com', name: 'Ana' },
    ]);

    await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(criarApontamento).toHaveBeenCalledWith(
      'proj-1',
      'user-admin',
      expect.objectContaining({
        dataApontamento: ontem,
        itens: [
          { tipoRecurso: 'HORA_ENGENHARIA', quantidade: 2, userId: 'u-ana' },
          { tipoRecurso: 'DIARIA_EQUIPE', quantidade: 0.25, funcionarioId: 'f1' },
        ],
      }),
    );
  });

  it('não grava de novo a mesma pessoa e o mesmo tipo na data', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        equipeExecucaoIds: ['f1', 'f2'],
        equipe: [
          {
            id: 'f1',
            nome: 'João',
            cargo: 'Eletricista',
            email: 'joao@s3e.com',
            valorHora: 0,
            valorDiaria: 200,
            status: 'Ativo',
          },
          {
            id: 'f2',
            nome: 'Maria',
            cargo: 'Ajudante',
            email: 'maria@s3e.com',
            valorHora: 0,
            valorDiaria: 160,
            status: 'Ativo',
          },
        ],
        horariosPorDia: [{ dia: ontem, inicio: '08:00', fim: '16:00' }],
      }),
    );
    prismaMock.apontamentoOsItem.findMany.mockResolvedValue([
      {
        tipoRecurso: 'DIARIA_EQUIPE',
        userId: null,
        funcionarioId: 'f1',
        apontamento: { dataApontamento: new Date(`${ontem}T12:00:00.000Z`) },
      },
    ]);

    const resultado = await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(resultado?.pulados).toEqual([
      { dia: ontem, pessoa: 'João', tipo: 'execução' },
    ]);
    expect(criarApontamento).toHaveBeenCalledWith(
      'proj-1',
      'user-admin',
      expect.objectContaining({
        itens: [{ tipoRecurso: 'DIARIA_EQUIPE', quantidade: 1, funcionarioId: 'f2' }],
      }),
    );
  });

  it('aponta só os dias até hoje e avisa os futuros', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        horariosPorDia: [
          { dia: ontem, inicio: '08:00', fim: '12:00' },
          { dia: futuro, inicio: '08:00', fim: '12:00' },
        ],
      }),
    );

    const resultado = await eventosCalendarioService.executar('evt-1', 'user-admin');

    expect(criarApontamento).toHaveBeenCalledTimes(1);
    expect(criarApontamento.mock.calls[0][2].dataApontamento).toBe(ontem);
    expect(resultado?.diasIgnoradosFuturos).toEqual([futuro]);
    expect(resultado?.diasApontados).toEqual([ontem]);
    expect(resultado?.evento.status).toBe(EventoStatus.VALIDO);
  });

  it('não executa OS cancelada', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(eventoBase());
    prismaMock.projeto.findUnique.mockResolvedValue({ id: 'proj-1', status: 'CANCELADO' });

    await expect(eventosCalendarioService.executar('evt-1', 'user-admin')).rejects.toThrow(/cancelada/);
    expect(criarApontamento).not.toHaveBeenCalled();
    expect(prismaMock.eventoCalendario.update).not.toHaveBeenCalled();
  });

  it('falha o membro de engenharia sem usuário e não grava item inválido', async () => {
    prismaMock.eventoCalendario.findUnique.mockResolvedValue(
      eventoBase({
        equipeEngenhariaIds: ['f-eng'],
        equipeExecucaoIds: [],
        equipe: [
          {
            id: 'f-eng',
            nome: 'Ana',
            cargo: 'Engenheira',
            email: 'ana@s3e.com',
            valorHora: 80,
            valorDiaria: null,
            status: 'Ativo',
          },
        ],
        horariosPorDia: [{ dia: ontem, inicio: '08:00', fim: '12:00' }],
      }),
    );
    prismaMock.user.findMany.mockResolvedValue([]);

    await expect(eventosCalendarioService.executar('evt-1', 'user-admin')).rejects.toThrow(/Ana/);
    expect(criarApontamento).not.toHaveBeenCalled();
    expect(prismaMock.eventoCalendario.update).not.toHaveBeenCalled();
  });
});
