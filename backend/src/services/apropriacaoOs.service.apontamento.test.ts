const prismaMock = {
  projeto: { findUnique: jest.fn() },
  apontamentoOs: { findFirst: jest.fn(), update: jest.fn() },
  apontamentoOsItem: { deleteMany: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../services/horasCustoContabil.service', () => ({
  calcularMaoDeObraCalendarioOs: jest.fn().mockResolvedValue({
    custoTotal: 0,
    horasEngenharia: 0,
    diariasEquipe: 0,
    linhas: [],
  }),
}));

import { apropriacaoOsService } from './apropriacaoOs.service';

describe('apropriacaoOsService.atualizarApontamento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualiza apontamento e substitui itens', async () => {
    prismaMock.projeto.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'EXECUCAO',
      horasEngenhariaOrcadas: 0,
      diariasEquipeOrcadas: 0,
      valorHoraEngenharia: 0,
      valorDiariaEquipe: 0,
      valorTotal: 0,
      orcamento: null,
    });
    prismaMock.apontamentoOsItem.findMany.mockResolvedValue([]);
    prismaMock.apontamentoOs.findFirst.mockResolvedValue({ id: 'a1', projetoId: 'p1' });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock)
    );
    prismaMock.apontamentoOs.update.mockResolvedValue({
      id: 'a1',
      projetoId: 'p1',
      dataApontamento: new Date('2026-01-15'),
      itens: [
        {
          id: 'i1',
          tipoRecurso: 'DIARIA_EQUIPE',
          quantidade: 1.5,
          funcionario: { id: 'f1', nome: 'João', cargo: 'Eletricista' },
        },
      ],
      criadoPor: { id: 'u1', name: 'Admin' },
    });

    const result = await apropriacaoOsService.atualizarApontamento('p1', 'a1', {
      dataApontamento: '2026-01-15',
      itens: [
        {
          tipoRecurso: 'DIARIA_EQUIPE',
          quantidade: 1.5,
          funcionarioId: 'f1',
        },
      ],
    });

    expect(prismaMock.apontamentoOsItem.deleteMany).toHaveBeenCalledWith({
      where: { apontamentoId: 'a1' },
    });
    expect(prismaMock.apontamentoOs.update).toHaveBeenCalled();
    expect(result.apontamento.id).toBe('a1');
    expect(result.resumoAtualizado).toBeDefined();
  });

  it('rejeita apontamento inexistente', async () => {
    prismaMock.projeto.findUnique.mockResolvedValue({ id: 'p1', status: 'EXECUCAO' });
    prismaMock.apontamentoOs.findFirst.mockResolvedValue(null);

    await expect(
      apropriacaoOsService.atualizarApontamento('p1', 'missing', {
        dataApontamento: '2026-01-15',
        itens: [
          {
            tipoRecurso: 'HORA_ENGENHARIA',
            quantidade: 4,
            userId: 'u1',
          },
        ],
      })
    ).rejects.toThrow(/não encontrado/);
  });
});
