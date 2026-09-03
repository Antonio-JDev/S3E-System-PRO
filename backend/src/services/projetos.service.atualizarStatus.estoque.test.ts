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
import { EstoqueInsuficienteError, ProjetosService } from './projetos.service';

describe('ProjetosService.atualizarStatus — validação de estoque', () => {
  const service = new ProjetosService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia APROVADO quando material sem estoque', async () => {
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
          },
        ],
      },
    });
    (prisma.material.findUnique as jest.Mock).mockResolvedValue({
      id: 'm1',
      nome: 'Cabo',
      sku: 'CABO-1',
      estoque: 0,
    });

    await expect(service.atualizarStatus('p1', 'APROVADO' as any)).rejects.toThrow(/APROVAÇÃO BLOQUEADA/);
    expect(prisma.projeto.update).not.toHaveBeenCalled();
  });

  it('vai para EXECUCAO com ignorarEstoque e marca iniciadoSemEstoque', async () => {
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
    (prisma.projeto.update as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'EXECUCAO',
      descricao: 'OS teste',
    });

    await service.atualizarStatus('p1', 'EXECUCAO' as any, {
      ignorarEstoque: true,
      userId: 'user-1',
    });

    expect(prisma.projeto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          status: 'EXECUCAO',
          iniciadoSemEstoque: true,
          iniciadoSemEstoquePorId: 'user-1',
        }),
      }),
    );
  });

  it('lança EstoqueInsuficienteError ao ir para EXECUCAO sem ignorar estoque', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'APROVADO',
      tipo: 'Instalacao',
      orcamento: {
        items: [
          {
            tipo: 'MATERIAL',
            materialId: 'm1',
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

    await expect(service.atualizarStatus('p1', 'EXECUCAO' as any)).rejects.toBeInstanceOf(
      EstoqueInsuficienteError,
    );
  });
});
