/**
 * Relatório global de cumprimento de estimativa
 * Rodar: npm test -- relatorioCumprimentoEstimativa.service.test.ts
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findMany: jest.fn() },
    apontamentoOsItem: { findMany: jest.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { gerarRelatorioCumprimentoEstimativa } from './relatorioCumprimentoEstimativa.service';

describe('gerarRelatorioCumprimentoEstimativa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna lista vazia quando não há projetos', async () => {
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([]);
    const rows = await gerarRelatorioCumprimentoEstimativa();
    expect(rows).toEqual([]);
  });

  it('monta linha com número OS, custos e cumprimento de estimativa', async () => {
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-99',
        titulo: 'OS Teste Cockpit',
        status: 'EXECUCAO',
        horasEngenhariaOrcadas: 10,
        diariasEquipeOrcadas: 5,
        valorHoraEngenharia: 100,
        valorDiariaEquipe: 400,
        valorTotal: 15000,
        cliente: { nome: 'Cliente XYZ' },
        responsavel: { name: 'Eng. Silva' },
        orcamento: { precoVenda: 15000, numeroSequencial: 42 },
      },
    ]);

    (prisma.apontamentoOsItem.findMany as jest.Mock).mockResolvedValue([
      {
        tipoRecurso: 'HORA_ENGENHARIA',
        quantidade: 8,
        apontamento: { projetoId: 'proj-99' },
      },
      {
        tipoRecurso: 'DIARIA_EQUIPE',
        quantidade: 4,
        apontamento: { projetoId: 'proj-99' },
      },
    ]);

    const [linha] = await gerarRelatorioCumprimentoEstimativa();

    expect(linha).toMatchObject({
      projetoId: 'proj-99',
      numeroOS: 'OS-0042',
      titulo: 'OS Teste Cockpit',
      clienteNome: 'Cliente XYZ',
      engenheiroResponsavel: 'Eng. Silva',
      status: 'EXECUCAO',
      diasEstimados: 5,
      diasReais: 4,
      horasEstimadas: 10,
      horasReais: 8,
      custoOrcado: 3000,
      custoRealizado: 2400,
      cumpriuEstimativa: true,
    });
    expect(linha.lucroPerdaPrazo).toBe(600);
    expect(linha.resultadoOs).toBe(12600);
  });

  it('marca cumpriuEstimativa false quando há estouro', async () => {
    (prisma.projeto.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-estouro',
        titulo: 'OS Estourada',
        status: 'CONCLUIDO',
        horasEngenhariaOrcadas: 5,
        diariasEquipeOrcadas: 2,
        valorHoraEngenharia: 100,
        valorDiariaEquipe: 300,
        valorTotal: 5000,
        cliente: { nome: 'Cliente' },
        responsavel: null,
        orcamento: { precoVenda: 5000, numeroSequencial: null },
      },
    ]);

    (prisma.apontamentoOsItem.findMany as jest.Mock).mockResolvedValue([
      {
        tipoRecurso: 'DIARIA_EQUIPE',
        quantidade: 5,
        apontamento: { projetoId: 'proj-estouro' },
      },
    ]);

    const [linha] = await gerarRelatorioCumprimentoEstimativa({ status: ['CONCLUIDO'] });

    expect(linha.cumpriuEstimativa).toBe(false);
    expect(linha.numeroOS).toBe('OS-????');
    expect(linha.lucroPerdaPrazo).toBeLessThan(0);
  });
});
