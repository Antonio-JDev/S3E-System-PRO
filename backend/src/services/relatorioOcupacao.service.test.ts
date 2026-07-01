/**
 * Relatório de ocupação de equipes e eletricistas
 * Rodar: npm test -- relatorioOcupacao.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    equipe: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    alocacaoObra: { findMany: jest.fn() },
    projeto: { findMany: jest.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { gerarRelatorioOcupacao } from './relatorioOcupacao.service';

const HOJE = new Date(2026, 6, 1); // 1 jul 2026

function mkAlocacao(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aloc-1',
    equipeId: 'eq-1',
    eletricistaId: null,
    projetoId: 'proj-1',
    dataInicio: new Date(2026, 5, 15),
    dataFimPrevisto: new Date(2026, 6, 20),
    status: 'Planejada',
    projeto: {
      id: 'proj-1',
      titulo: 'OS Alpha',
      status: 'EXECUCAO',
      cliente: { nome: 'Cliente A' },
      orcamento: { numeroSequencial: 1 },
      obra: { status: 'ANDAMENTO' },
    },
    ...overrides,
  };
}

describe('gerarRelatorioOcupacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(HOJE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna resumo zerado quando não há recursos nem alocações', async () => {
    (prisma.equipe.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.alocacaoObra.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([]);

    const result = await gerarRelatorioOcupacao(HOJE);

    expect(result.resumo.totalRecursos).toBe(0);
    expect(result.resumo.osComAlocacaoAtiva).toBe(0);
    expect(result.resumo.horizonteOcupacaoGlobal).toBeNull();
    expect(result.porRecurso).toEqual([]);
  });

  it('calcula horizonte global e ocupação por equipe com várias OS', async () => {
    const equipes = [
      { id: 'eq-1', nome: 'Equipe 1' },
      { id: 'eq-2', nome: 'Equipe 2' },
      { id: 'eq-3', nome: 'Equipe 3' },
      { id: 'eq-4', nome: 'Equipe 4' },
      { id: 'eq-5', nome: 'Equipe 5' },
    ];

    (prisma.equipe.findMany as jest.Mock).mockResolvedValue(equipes);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'el-1', name: 'João Eletricista' },
    ]);

    const alocacoes = [
      mkAlocacao({
        id: 'a1',
        equipeId: 'eq-1',
        projetoId: 'proj-1',
        dataFimPrevisto: new Date(2026, 6, 10),
      }),
      mkAlocacao({
        id: 'a2',
        equipeId: 'eq-1',
        projetoId: 'proj-2',
        dataInicio: new Date(2026, 6, 5),
        dataFimPrevisto: new Date(2026, 7, 15),
        projeto: {
          id: 'proj-2',
          titulo: 'OS Beta',
          status: 'APROVADO',
          cliente: { nome: 'Cliente B' },
          orcamento: { numeroSequencial: 2 },
          obra: null,
        },
      }),
      mkAlocacao({
        id: 'a3',
        equipeId: 'eq-2',
        projetoId: 'proj-3',
        dataInicio: new Date(2026, 5, 1),
        dataFimPrevisto: new Date(2026, 6, 30),
        projeto: {
          id: 'proj-3',
          titulo: 'OS Gamma',
          status: 'EXECUCAO',
          cliente: { nome: 'Cliente C' },
          orcamento: { numeroSequencial: 3 },
          obra: { status: 'ANDAMENTO' },
        },
      }),
      mkAlocacao({
        id: 'a4',
        equipeId: null,
        eletricistaId: 'el-1',
        projetoId: 'proj-4',
        dataInicio: new Date(2026, 6, 1),
        dataFimPrevisto: new Date(2026, 6, 25),
        projeto: {
          id: 'proj-4',
          titulo: 'OS Delta',
          status: 'EXECUCAO',
          cliente: { nome: 'Cliente D' },
          orcamento: { numeroSequencial: 4 },
          obra: null,
        },
      }),
    ];

    (prisma.alocacaoObra.findMany as jest.Mock).mockResolvedValue(alocacoes);
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      { id: 'proj-1' },
      { id: 'proj-3' },
    ]);

    const result = await gerarRelatorioOcupacao(HOJE);

    expect(result.resumo.totalRecursos).toBe(6); // 5 equipes + 1 eletricista
    expect(result.resumo.osComAlocacaoAtiva).toBe(4);
    expect(result.resumo.recursosOcupadosHoje).toBeGreaterThanOrEqual(2);

    const horizonte = result.resumo.horizonteOcupacaoGlobal;
    expect(horizonte).not.toBeNull();
    expect(new Date(horizonte!).getMonth()).toBe(7); // ago — max fim previsto

    const eq1 = result.porRecurso.find((r) => r.id === 'eq-1');
    expect(eq1?.osVinculadas).toBe(2);
    expect(eq1?.alocacoes).toHaveLength(2);

    const eletricista = result.porRecurso.find((r) => r.tipo === 'eletricista');
    expect(eletricista?.nome).toBe('João Eletricista');
    expect(eletricista?.ocupadoHoje).toBe(true);

    const eq5 = result.porRecurso.find((r) => r.id === 'eq-5');
    expect(eq5?.ocupadoHoje).toBe(false);
    expect(eq5?.osVinculadas).toBe(0);
  });

  it('calcula proximaLiberacaoRecurso entre recursos ocupados hoje', async () => {
    (prisma.equipe.findMany as jest.Mock).mockResolvedValue([
      { id: 'eq-1', nome: 'Equipe 1' },
      { id: 'eq-2', nome: 'Equipe 2' },
    ]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    (prisma.alocacaoObra.findMany as jest.Mock).mockResolvedValue([
      mkAlocacao({
        equipeId: 'eq-1',
        dataInicio: new Date(2026, 5, 1),
        dataFimPrevisto: new Date(2026, 6, 5),
      }),
      mkAlocacao({
        id: 'a2',
        equipeId: 'eq-2',
        dataInicio: new Date(2026, 5, 20),
        dataFimPrevisto: new Date(2026, 6, 20),
        projeto: {
          id: 'proj-2',
          titulo: 'OS Longa',
          status: 'EXECUCAO',
          cliente: { nome: 'X' },
          orcamento: { numeroSequencial: 9 },
          obra: null,
        },
      }),
    ]);
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([{ id: 'proj-1' }]);

    const result = await gerarRelatorioOcupacao(HOJE);

    expect(result.resumo.proximaLiberacaoRecurso).not.toBeNull();
    const prox = new Date(result.resumo.proximaLiberacaoRecurso!);
    expect(prox.getDate()).toBe(5);
    expect(prox.getMonth()).toBe(6);
  });
});
