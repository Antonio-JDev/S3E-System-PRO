/**
 * Cockpit OS — resumo em lote (obterCockpitResumoBatch)
 * Rodar: npm test -- apropriacaoOs.cockpitResumo.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findMany: jest.fn() },
    apontamentoOsItem: { findMany: jest.fn() },
    eventoCalendario: { findMany: jest.fn() },
    registroPonto: { findMany: jest.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { apropriacaoOsService } from './apropriacaoOs.service';

describe('apropriacaoOsService.obterCockpitResumoBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    (prisma.eventoCalendario.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.registroPonto.findMany as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna mapa vazio quando ids vazio', async () => {
    const result = await apropriacaoOsService.obterCockpitResumoBatch([]);
    expect(result).toEqual({});
    expect(prisma.projeto.findMany).not.toHaveBeenCalled();
  });

  it('agrega custo orçado, diárias realizadas e estouro de dias corridos', async () => {
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-1',
        status: 'EXECUCAO',
        dataInicio: new Date('2026-06-01T00:00:00.000Z'),
        dataPrevisao: new Date('2026-06-30T00:00:00.000Z'),
        horasEngenhariaOrcadas: 10,
        diariasEquipeOrcadas: 5,
        valorHoraEngenharia: 100,
        valorDiariaEquipe: 400,
        valorTotal: 10000,
        orcamento: { precoVenda: 10000 },
      },
    ]);

    (prisma.apontamentoOsItem.findMany as jest.Mock).mockResolvedValue([
      {
        tipoRecurso: 'DIARIA_EQUIPE',
        quantidade: 2,
        apontamento: { projetoId: 'proj-1' },
      },
    ]);

    const result = await apropriacaoOsService.obterCockpitResumoBatch(['proj-1']);

    expect(result['proj-1']).toMatchObject({
      diariasEquipeOrcadas: 5,
      diariasEquipeRealizadas: 2,
      custoTempoOrcado: 3000,
      estouroDiarias: false,
      estouroDiasCorridos: true,
    });
    expect(result['proj-1'].dataPrevisao).toContain('2026-06-30');
    // 1/jun → 15/jun (inclusive floor em TZ local)
    expect(result['proj-1'].diasCorridos).toBeGreaterThanOrEqual(14);
    expect(result['proj-1'].diasCorridos).toBeLessThanOrEqual(15);
  });

  it('marca estouroDiarias quando realizadas ultrapassam orçadas', async () => {
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-2',
        status: 'EXECUCAO',
        dataInicio: new Date('2026-06-13T12:00:00.000Z'),
        dataPrevisao: null,
        horasEngenhariaOrcadas: 0,
        diariasEquipeOrcadas: 3,
        valorHoraEngenharia: 0,
        valorDiariaEquipe: 500,
        valorTotal: 0,
        orcamento: null,
      },
    ]);

    (prisma.apontamentoOsItem.findMany as jest.Mock).mockResolvedValue([
      {
        tipoRecurso: 'DIARIA_EQUIPE',
        quantidade: 4,
        apontamento: { projetoId: 'proj-2' },
      },
    ]);

    const result = await apropriacaoOsService.obterCockpitResumoBatch(['proj-2']);

    expect(result['proj-2'].estouroDiarias).toBe(true);
    expect(result['proj-2'].estouroDiasCorridos).toBe(false);
  });
});
