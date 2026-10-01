import { describe, expect, it } from 'vitest';
import {
  calcularFatiasHoras,
  diariasParaHoras,
  montarResumoFatiasOs,
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

  it('não soma de novo a hora já efetivada no mesmo dia e mantém a previsão confirmada', () => {
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
    expect(resumo.engenharia.previstas).toBe(7);
    expect(resumo.engenharia.restante).toBe(8);
    expect(resumo.engenharia.excedente).toBe(0);
    expect(resumo.execucao.orcadas).toBe(diariasParaHoras(2));
    expect(resumo.execucao.efetivadas).toBe(8);
    expect(resumo.diasPrevistos).toBe(2);
    expect(resumo.diasEfetivados).toBeGreaterThanOrEqual(2);
  });
});
