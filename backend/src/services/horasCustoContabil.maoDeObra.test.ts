jest.mock('../lib/prisma', () => ({
  prisma: {
    eventoCalendario: { findMany: jest.fn() },
    registroPonto: { findMany: jest.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { calcularMaoDeObraCalendarioOs } from './horasCustoContabil.service';

describe('calcularMaoDeObraCalendarioOs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.registroPonto.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('custa o dia do João com valorDiaria do RH em evento VALIDO', async () => {
    (prisma.eventoCalendario.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ev-1',
        status: 'VALIDO',
        dataInicio: new Date('2026-08-13T10:30:00.000Z'),
        dataFim: new Date('2026-08-13T20:30:00.000Z'),
        equipe: [
          {
            id: 'func-joao',
            nome: 'João',
            cargo: 'Eletricista',
            valorHora: 25,
            valorDiaria: 280,
            configuracaoPonto: {
              workShift: {
                entrada1: '07:30',
                saida1: '12:00',
                entrada2: '13:00',
                saida2: '17:30',
              },
            },
          },
        ],
      },
    ]);

    const r = await calcularMaoDeObraCalendarioOs('os-42', { apenasStatus: 'VALIDO' });

    expect(r.diariasEquipe).toBe(1);
    expect(r.horasEngenharia).toBe(0);
    expect(r.custoTotal).toBe(280);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0]).toMatchObject({
      funcionarioNome: 'João',
      modoCusto: 'DIARIA',
      custoDia: 280,
      data: '2026-08-13',
    });
  });

  it('conta horas de engenharia quando só há valorHora', async () => {
    (prisma.eventoCalendario.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ev-2',
        status: 'VALIDO',
        dataInicio: new Date('2026-08-14T10:30:00.000Z'),
        dataFim: new Date('2026-08-14T20:30:00.000Z'),
        equipe: [
          {
            id: 'func-eng',
            nome: 'Maria',
            cargo: 'Engenheira',
            valorHora: 50,
            valorDiaria: null,
            configuracaoPonto: null,
          },
        ],
      },
    ]);

    const r = await calcularMaoDeObraCalendarioOs('os-42');

    expect(r.diariasEquipe).toBe(0);
    expect(r.horasEngenharia).toBe(8);
    expect(r.custoTotal).toBe(400);
    expect(r.linhas[0].modoCusto).toBe('HORA');
  });
});
