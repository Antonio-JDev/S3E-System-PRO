const mockSync = jest.fn();
const mockRemover = jest.fn();

jest.mock('../services/alocacaoEquipeSync.service', () => ({
  syncAlocacaoEquipeFromTarefa: (...args: unknown[]) => mockSync(...args),
  removerAlocacoesPorTarefa: (...args: unknown[]) => mockRemover(...args)
}));

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    tarefaObra: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args)
    }
  }
}));

jest.mock('../services/auditoria.service', () => ({
  AuditoriaService: { registrarEvento: jest.fn().mockResolvedValue(undefined) }
}));

import { atualizarTarefa, deletarTarefa } from './tarefasObraController';

describe('tarefasObraController — sync alocação calendário', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualizarTarefa sincroniza alocação após salvar', async () => {
    mockFindUnique.mockResolvedValue({ id: 't1', obraId: 'obra1' });
    mockUpdate.mockResolvedValue({
      id: 't1',
      obraId: 'obra1',
      equipeId: 'eq1',
      dataPrevista: new Date('2026-06-01'),
      dataPrevistaFim: new Date('2026-06-10'),
      observacoes: null,
      obra: {},
      registrosAtividade: []
    });

    const req = {
      params: { id: 't1' },
      body: { progresso: 50 },
      user: { userId: 'u1' }
    } as any;
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json } as any;

    await atualizarTarefa(req, res);

    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 't1',
        obraId: 'obra1',
        equipeId: 'eq1'
      })
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deletarTarefa remove alocações vinculadas antes de excluir', async () => {
    mockFindUnique.mockResolvedValue({ id: 't1', obraId: 'obra1' });
    mockDelete.mockResolvedValue({});

    const req = { params: { id: 't1' }, user: { userId: 'u1' } } as any;
    const json = jest.fn();
    const res = { json } as any;

    await deletarTarefa(req, res);

    expect(mockRemover).toHaveBeenCalledWith('t1');
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
