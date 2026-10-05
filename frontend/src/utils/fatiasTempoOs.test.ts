import { describe, expect, it } from 'vitest';
import {
  calcularFatiasHoras,
  diariasParaHoras,
  horasPorDiaLocal,
  montarResumoFatiasOs,
  seriesComparativoTempo,
} from './fatiasTempoOs';

const eng = (id: string) => ({ id, cargo: 'Engenheiro', valorHora: 80, valorDiaria: null });

describe('calcularFatiasHoras', () => {
  it('20 orçadas, 5 efetivadas e 6 previstas deixam 9 de restante', () => {
    const fatias = calcularFatiasHoras(20, 5, 6);
    expect(fatias.efetivadas).toBe(5);
    expect(fatias.previstas).toBe(6);
    expect(fatias.restante).toBe(9);
    expect(fatias.excedente).toBe(0);
    expect(fatias.semOrcamento).toBe(false);
  });

  it('mostra estouro quando efetivadas + previstas passam do orçado', () => {
    const fatias = calcularFatiasHoras(20, 15, 10);
    expect(fatias.restante).toBe(0);
    expect(fatias.excedente).toBe(5);
    expect(fatias.efetivadas + fatias.previstas).toBe(25);
  });

  it('orçado zero não gera restante negativo', () => {
    const fatias = calcularFatiasHoras(0, 0, 0);
    expect(fatias.semOrcamento).toBe(true);
    expect(fatias.restante).toBe(0);
    expect(fatias.excedente).toBe(0);
  });
});

describe('seriesComparativoTempo', () => {
  it('expõe orçadas, previstas, executadas e faltantes', () => {
    const series = seriesComparativoTempo(calcularFatiasHoras(20, 5, 6));
    expect(series.map((s) => s.nome)).toEqual(['Orçadas', 'Previstas', 'Executadas', 'Faltantes']);
    expect(series.map((s) => s.horas)).toEqual([20, 6, 5, 9]);
    expect(series.find((s) => s.chave === 'faltantes')?.horas).toBe(9);
  });

  it('inclui a barra de excedente quando executadas + previstas passam do orçado', () => {
    const series = seriesComparativoTempo(calcularFatiasHoras(20, 15, 10));
    expect(series.find((s) => s.chave === 'faltantes')?.horas).toBe(0);
    expect(series.find((s) => s.chave === 'excedente')?.horas).toBe(5);
    expect(series.some((s) => s.chave === 'excedente')).toBe(true);
  });
});

describe('montarResumoFatiasOs', () => {
  it('20 h orçadas, 5 efetivadas e 6 só na agenda deixam 9', () => {
    const resumo = montarResumoFatiasOs({
      horasEngenhariaOrcadas: 20,
      diariasEquipeOrcadas: 0,
      apontamentos: [
        {
          dataApontamento: '2026-09-01',
          itens: [{ tipoRecurso: 'HORA_ENGENHARIA', quantidade: 5 }],
        },
      ],
      eventos: [
        {
          id: 'agenda-6h',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date(2026, 8, 2, 8, 0, 0),
          dataFim: new Date(2026, 8, 2, 14, 0, 0),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
          equipeExecucaoIds: [],
        },
      ],
    });
    expect(resumo.engenharia.efetivadas).toBe(5);
    expect(resumo.engenharia.previstas).toBe(6);
    expect(resumo.engenharia.restante).toBe(9);
    expect(resumo.engenharia.excedente).toBe(0);
  });

  it('mantém a previsão gravada no mesmo dia do apontamento e ignora o clone', () => {
    const resumo = montarResumoFatiasOs({
      horasEngenhariaOrcadas: 20,
      diariasEquipeOrcadas: 2,
      apontamentos: [
        {
          dataApontamento: '2026-09-01',
          itens: [{ tipoRecurso: 'HORA_ENGENHARIA', quantidade: 5 }],
        },
        {
          dataApontamento: '2026-09-03',
          itens: [{ tipoRecurso: 'DIARIA_EQUIPE', quantidade: 1 }],
        },
      ],
      eventos: [
        {
          id: 'prev-6h',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date(2026, 8, 2, 8, 0, 0),
          dataFim: new Date(2026, 8, 2, 14, 0, 0),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
          equipeExecucaoIds: [],
        },
        {
          id: 'mesmo-dia',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date(2026, 8, 1, 8, 0, 0),
          dataFim: new Date(2026, 8, 1, 14, 0, 0),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
        {
          id: 'valido-clone',
          status: 'VALIDO',
          tipo: 'OBRA',
          eventoOrigemId: 'prev-6h',
          dataInicio: new Date(2026, 8, 2, 8, 0, 0),
          dataFim: new Date(2026, 8, 2, 14, 0, 0),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
        },
      ],
    });

    expect(resumo.engenharia.efetivadas).toBe(5);
    expect(resumo.engenharia.previstas).toBe(12);
    expect(resumo.engenharia.restante).toBe(8);
    expect(resumo.engenharia.excedente).toBe(0);
    expect(resumo.execucao.orcadas).toBe(diariasParaHoras(2));
    expect(resumo.execucao.efetivadas).toBe(8);
    expect(resumo.diasPrevistos).toBe(2);
    expect(resumo.diasEfetivados).toBeGreaterThanOrEqual(2);
  });

  it('guarda a previsão de uma alocação que já foi executada', () => {
    const resumo = montarResumoFatiasOs({
      horasEngenhariaOrcadas: 6,
      diariasEquipeOrcadas: 0,
      apontamentos: [
        {
          dataApontamento: '2026-09-01',
          itens: [{ tipoRecurso: 'HORA_ENGENHARIA', quantidade: 3 }],
        },
      ],
      eventos: [
        {
          id: 'ja-executado',
          status: 'VALIDO',
          tipo: 'OBRA',
          dataInicio: new Date(2026, 8, 1, 8, 0, 0),
          dataFim: new Date(2026, 8, 1, 14, 0, 0),
          equipe: [eng('e1')],
          equipeEngenhariaIds: ['e1'],
          equipeExecucaoIds: [],
        },
      ],
    });
    expect(resumo.engenharia.previstas).toBe(6);
    expect(resumo.engenharia.efetivadas).toBe(3);
    expect(resumo.engenharia.restante).toBe(0);
    expect(resumo.diasPrevistos).toBe(1);
  });

  it('arraste de vários dias conta só o ciclo 07:30–17:30, sem a madrugada', () => {
    const fatias = horasPorDiaLocal(
      new Date(2026, 8, 23, 7, 30, 0),
      new Date(2026, 8, 27, 15, 30, 0),
    );
    const total = fatias.reduce((acc, slice) => acc + slice.horas, 0);
    expect(fatias.map((s) => s.dia)).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    expect(fatias.slice(0, 4).every((s) => s.horas === 10)).toBe(true);
    expect(fatias[4]?.horas).toBe(8);
    expect(total).toBe(48);
  });

  it('horário manual até 20:00 entra na soma e duas pessoas multiplicam só essas horas', () => {
    const resumo = montarResumoFatiasOs({
      horasEngenhariaOrcadas: 5,
      diariasEquipeOrcadas: 2,
      apontamentos: [],
      eventos: [
        {
          id: 'obra-manual',
          status: 'PREVISAO',
          tipo: 'OBRA',
          dataInicio: new Date(2026, 8, 23, 7, 30, 0),
          dataFim: new Date(2026, 8, 24, 17, 30, 0),
          horariosPorDia: [
            { dia: '2026-09-23', inicio: '07:30', fim: '20:00' },
            { dia: '2026-09-24', inicio: '07:30', fim: '17:30' },
          ],
          equipe: [
            { id: 'a', cargo: 'Eletricista', valorHora: 0, valorDiaria: 200 },
            { id: 'b', cargo: 'Eletricista', valorHora: 0, valorDiaria: 200 },
          ],
          equipeEngenhariaIds: [],
          equipeExecucaoIds: ['a', 'b'],
        },
      ],
    });

    expect(resumo.execucao.previstas).toBe(45);
    expect(resumo.execucao.previstas).toBeLessThan(68);
  });
});
