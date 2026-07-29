jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn(), update: jest.fn() },
    obra: { findUnique: jest.fn() },
    material: { findUnique: jest.fn() },
    kit: { findUnique: jest.fn() },
    cotacao: { findUnique: jest.fn() },
    task: { findFirst: jest.fn() },
  },
}));

jest.mock('./obra.service', () => ({
  __esModule: true,
  default: {
    deletarObraParaRollback: jest.fn(),
  },
}));

jest.mock('./projetosEngenharia.service', () => ({
  validarConclusaoOsEngenharia: jest.fn().mockResolvedValue(null),
}));

jest.mock('./vistoriaCelesc.service', () => ({
  entrarNaFilaSeAplicavel: jest.fn().mockResolvedValue(null),
  validarConclusaoVistoriaCelesc: jest.fn().mockReturnValue(null),
}));

import { prisma } from '../lib/prisma';
import { ProjetosService } from './projetos.service';

describe('ProjetosService.atualizarStatus — sem bloqueio de estoque', () => {
  const service = new ProjetosService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aprova OS (APROVADO) mesmo com material sem estoque', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'PROPOSTA',
      tipo: 'Instalacao',
      orcamento: {
        items: [
          {
            tipo: 'MATERIAL',
            materialId: 'm1',
            kitId: null,
            cotacaoId: null,
            quantidade: 10,
            descricao: 'Cabo',
            material: { id: 'm1', nome: 'Cabo', estoque: 0 },
          },
        ],
      },
    });
    (prisma.projeto.update as jest.Mock).mockResolvedValue({ id: 'p1', status: 'APROVADO' });

    const r = await service.atualizarStatus('p1', 'APROVADO' as any);

    expect(r.status).toBe('APROVADO');
    expect(prisma.projeto.update).toHaveBeenCalled();
  });

  it('vai para EXECUCAO com faltantes e marca iniciadoSemEstoque', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'APROVADO',
      tipo: 'Instalacao',
      descricao: 'OS teste',
      orcamento: {
        items: [
          {
            tipo: 'MATERIAL',
            materialId: 'm1',
            kitId: null,
            cotacaoId: null,
            quantidade: 5,
            descricao: 'Cabo',
          },
        ],
      },
    });
    (prisma.material.findUnique as jest.Mock).mockResolvedValue({
      id: 'm1',
      nome: 'Cabo',
      estoque: 0,
    });
    (prisma.projeto.update as jest.Mock)
      .mockResolvedValueOnce({ id: 'p1', status: 'EXECUCAO', descricao: 'OS teste' })
      .mockResolvedValueOnce({ id: 'p1', status: 'EXECUCAO' });

    await service.atualizarStatus('p1', 'EXECUCAO' as any);

    expect(prisma.projeto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          status: 'EXECUCAO',
          iniciadoSemEstoque: true,
        }),
      })
    );
  });
});
