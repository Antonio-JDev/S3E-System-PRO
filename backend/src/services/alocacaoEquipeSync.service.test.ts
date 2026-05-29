import { syncAlocacaoEquipeFromTarefa, removerAlocacoesPorTarefa } from './alocacaoEquipeSync.service';

const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDeleteMany = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    alocacaoEquipe: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args)
    }
  }
}));

describe('alocacaoEquipeSync.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('remove alocações quando tarefa deixa de ter equipe', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1' }]);
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await syncAlocacaoEquipeFromTarefa({
      id: 't1',
      obraId: 'obra1',
      equipeId: null,
      dataPrevista: new Date('2026-06-01'),
      dataPrevistaFim: new Date('2026-06-10')
    });

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { tarefaId: 't1' } });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('atualiza alocação existente quando equipe/datas mudam', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1' }]);
    mockUpdate.mockResolvedValue({});

    const inicio = new Date('2026-06-01');
    const fim = new Date('2026-06-15');

    await syncAlocacaoEquipeFromTarefa({
      id: 't1',
      obraId: 'obra1',
      equipeId: 'eq1',
      dataPrevista: inicio,
      dataPrevistaFim: fim,
      observacoes: 'teste'
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: {
        obraId: 'obra1',
        equipeId: 'eq1',
        dataInicio: inicio,
        dataFim: fim,
        observacoes: 'teste'
      }
    });
  });

  it('cria alocação quando não existe', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCreate.mockResolvedValue({});

    await syncAlocacaoEquipeFromTarefa({
      id: 't2',
      obraId: 'obra1',
      equipeId: 'eq2',
      dataPrevista: new Date('2026-07-01'),
      dataPrevistaFim: new Date('2026-07-05')
    });

    expect(mockCreate).toHaveBeenCalled();
  });

  it('removerAlocacoesPorTarefa exclui por tarefaId', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await removerAlocacoesPorTarefa('t99');
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { tarefaId: 't99' } });
  });

  it('remove alocações duplicadas mantendo apenas a principal', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'a1', createdAt: new Date('2026-01-01') },
      { id: 'a2', createdAt: new Date('2026-01-02') }
    ]);
    mockUpdate.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await syncAlocacaoEquipeFromTarefa({
      id: 't1',
      obraId: 'obra1',
      equipeId: 'eq1',
      dataPrevista: new Date('2026-06-01'),
      dataPrevistaFim: new Date('2026-06-10')
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } })
    );
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { tarefaId: 't1', id: { not: 'a1' } }
    });
  });

  it('não chama deleteMany quando não há alocação e tarefa sem equipe', async () => {
    mockFindMany.mockResolvedValue([]);

    await syncAlocacaoEquipeFromTarefa({
      id: 't3',
      obraId: 'obra1',
      equipeId: null,
      dataPrevista: null,
      dataPrevistaFim: null
    });

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
