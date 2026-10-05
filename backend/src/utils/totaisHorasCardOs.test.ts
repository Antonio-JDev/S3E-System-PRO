/**
 * Totais de horas do card da listagem (mesma regra de montarResumoFatiasOs).
 * Rodar: npm test -- totaisHorasCardOs.test.ts
 */

import { totaisHorasCardOs } from './totaisHorasCardOs';

const eng = (id: string) => ({ id, cargo: 'Engenheiro', valorHora: 80, valorDiaria: null });

describe('totaisHorasCardOs', () => {
  it('soma engenharia e execução: 5 h apontadas e 6 h só na agenda', () => {
    const totais = totaisHorasCardOs({
      itens: [
        {
          dataApontamento: '2026-09-01',
          tipoRecurso: 'HORA_ENGENHARIA',
          quantidade: 5,
        },
      ],
      eventos: [
        {
          id: 'agenda-6h',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date('2026-09-02T11:00:00.000Z'),
          dataFim: new Date('2026-09-02T17:00:00.000Z'),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
          equipeExecucaoIds: [],
        },
      ],
    });

    expect(totais.horasExecutadas).toBe(5);
    expect(totais.horasPrevistas).toBe(6);
  });

  it('mantém a previsão gravada depois do apontamento e ignora o clone de confirmação', () => {
    const totais = totaisHorasCardOs({
      itens: [
        {
          dataApontamento: new Date('2026-09-01T00:00:00.000Z'),
          tipoRecurso: 'HORA_ENGENHARIA',
          quantidade: 5,
        },
        {
          dataApontamento: '2026-09-03',
          tipoRecurso: 'DIARIA_EQUIPE',
          quantidade: 1,
        },
      ],
      eventos: [
        {
          id: 'prev-6h',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date('2026-09-02T11:00:00.000Z'),
          dataFim: new Date('2026-09-02T17:00:00.000Z'),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
        {
          id: 'mesmo-dia',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date('2026-09-01T11:00:00.000Z'),
          dataFim: new Date('2026-09-01T17:00:00.000Z'),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
        {
          id: 'valido-clone',
          status: 'VALIDO',
          tipo: 'OBRA',
          eventoOrigemId: 'prev-6h',
          dataInicio: new Date('2026-09-02T11:00:00.000Z'),
          dataFim: new Date('2026-09-02T17:00:00.000Z'),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
      ],
    });

    expect(totais.horasExecutadas).toBe(13);
    expect(totais.horasPrevistas).toBe(12);
  });

  it('ignora evento que não é obra e item sem data', () => {
    const totais = totaisHorasCardOs({
      itens: [{ tipoRecurso: 'HORA_ENGENHARIA', quantidade: 4 }],
      eventos: [
        {
          id: 'reuniao',
          status: 'PREVISAO',
          tipo: 'REUNIAO',
          dataInicio: new Date('2026-09-02T11:00:00.000Z'),
          dataFim: new Date('2026-09-02T17:00:00.000Z'),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
      ],
    });

    expect(totais).toEqual({ horasPrevistas: 0, horasExecutadas: 0 });
  });
});
