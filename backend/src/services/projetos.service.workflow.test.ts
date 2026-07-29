jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    projeto: { findUnique: jest.fn(), update: jest.fn() },
    task: { findFirst: jest.fn(), createMany: jest.fn() },
    orcamento: { findUnique: jest.fn(), update: jest.fn() },
    contaReceber: { findFirst: jest.fn() },
  },
}));

jest.mock('./obra.service', () => ({
  __esModule: true,
  default: { deletarObraParaRollback: jest.fn() },
}));

jest.mock('./projetosEngenharia.service', () => ({
  validarConclusaoOsEngenharia: jest.fn().mockResolvedValue(null),
}));

jest.mock('./vistoriaCelesc.service', () => ({
  entrarNaFilaSeAplicavel: jest.fn().mockResolvedValue(null),
  validarConclusaoVistoriaCelesc: jest.fn().mockReturnValue(null),
}));

jest.mock('./contasReceber.service', () => ({
  ContasReceberService: {
    criarContaReceberManual: jest.fn().mockResolvedValue({ id: 'conta-1' }),
  },
}));

import { prisma } from '../lib/prisma';
import { ContasReceberService } from './contasReceber.service';
import { validarConclusaoOsEngenharia } from './projetosEngenharia.service';
import {
  OS_WORKFLOW_TEMPLATES,
  ProjetosService,
  dispararGatilhosTaskConcluida,
  gerarContaReceberCobrancaOs,
} from './projetos.service';

describe('ProjetosService — workflow OS', () => {
  const service = new ProjetosService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarProjeto', () => {
    it('cria projeto e scaffold de 8 tasks para PROJETOS_ELETRICOS', async () => {
      const createMany = jest.fn().mockResolvedValue({ count: 8 });
      const projetoCreate = jest.fn().mockResolvedValue({
        id: 'p1',
        tipo: 'PROJETOS_ELETRICOS',
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          projeto: { create: projetoCreate },
          task: { createMany },
        }),
      );

      const result = await service.criarProjeto({
        orcamentoId: 'orc-1',
        clienteId: 'cli-1',
        titulo: 'OS Teste',
        tipo: 'PROJETOS_ELETRICOS',
      });

      expect(result.id).toBe('p1');
      expect(createMany).toHaveBeenCalledWith({
        data: OS_WORKFLOW_TEMPLATES.PROJETOS_ELETRICOS.map((titulo, ordem) => ({
          projetoId: 'p1',
          titulo,
          status: 'ToDo',
          prioridade: 'Media',
          ordem,
          criadoPorId: null,
        })),
      });
    });

    it('cria projeto sem createMany para tipo legado Instalacao', async () => {
      const createMany = jest.fn();
      const projetoCreate = jest.fn().mockResolvedValue({ id: 'p2', tipo: 'Instalacao' });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          projeto: { create: projetoCreate },
          task: { createMany },
        }),
      );

      await service.criarProjeto({
        orcamentoId: 'orc-2',
        clienteId: 'cli-2',
        titulo: 'OS Legada',
        tipo: 'Instalacao',
      });

      expect(createMany).not.toHaveBeenCalled();
    });
  });

  describe('atualizarStatus CONCLUIDO', () => {
    const projetoBase = {
      id: 'p1',
      tipo: 'PROJETOS_ELETRICOS',
      status: 'EXECUCAO',
      descricao: '',
      orcamento: { items: [] },
    };

    it('bloqueia conclusão se Organização Final não estiver Done', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(projetoBase);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ status: 'ToDo' });

      await expect(service.atualizarStatus('p1', 'CONCLUIDO')).rejects.toThrow(
        /Organização Final/,
      );
      expect(prisma.projeto.update).not.toHaveBeenCalled();
    });

    it('permite conclusão quando Organização Final está Done', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(projetoBase);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ status: 'Done' });
      (prisma.projeto.update as jest.Mock).mockResolvedValue({
        ...projetoBase,
        status: 'CONCLUIDO',
      });

      const r = await service.atualizarStatus('p1', 'CONCLUIDO');

      expect(validarConclusaoOsEngenharia).toHaveBeenCalledWith('p1');
      expect(prisma.projeto.update).toHaveBeenCalled();
      expect(r.status).toBe('CONCLUIDO');
    });
  });

  describe('gerarContaReceberCobrancaOs', () => {
    const projetoMock = {
      id: 'p1',
      titulo: 'Projeto Teste',
      valorTotal: 15000,
      cliente: { nome: 'Cliente ABC' },
      orcamento: { numeroSequencial: 42, precoVenda: 15000 },
      vendas: [],
    };

    it('cria conta a receber manual ao concluir task Cobrança', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(projetoMock);
      (prisma.contaReceber.findFirst as jest.Mock).mockResolvedValue(null);

      await gerarContaReceberCobrancaOs('p1', 'task-1');

      expect(ContasReceberService.criarContaReceberManual).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'ENTRADA',
          pagadorNome: 'Cliente ABC',
          descricao: 'Cobrança — OS-42 — Projeto Teste',
          valorParcela: 15000,
          observacoes: expect.stringContaining('workflow-os:projeto:p1'),
        }),
      );
    });

    it('não cria conta se PV já possui parcelas', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        ...projetoMock,
        vendas: [{ contasReceber: [{ id: 'cr-1' }] }],
      });

      await gerarContaReceberCobrancaOs('p1', 'task-1');

      expect(ContasReceberService.criarContaReceberManual).not.toHaveBeenCalled();
    });

    it('não cria conta duplicada para a mesma OS', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(projetoMock);
      (prisma.contaReceber.findFirst as jest.Mock).mockResolvedValue({ id: 'cr-existente' });

      await gerarContaReceberCobrancaOs('p1', 'task-1');

      expect(ContasReceberService.criarContaReceberManual).not.toHaveBeenCalled();
    });
  });

  describe('dispararGatilhosTaskConcluida', () => {
    it('dispara cobrança apenas para task Cobrança', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        titulo: 'OS',
        valorTotal: 1000,
        cliente: { nome: 'X' },
        orcamento: { numeroSequencial: 1, precoVenda: 1000 },
        vendas: [],
      });
      (prisma.contaReceber.findFirst as jest.Mock).mockResolvedValue(null);

      await dispararGatilhosTaskConcluida('p1', 'Cobrança', 'task-1');
      expect(ContasReceberService.criarContaReceberManual).toHaveBeenCalled();

      jest.clearAllMocks();
      (prisma.projeto.findUnique as jest.Mock).mockClear();

      await dispararGatilhosTaskConcluida('p1', 'Levantamento', 'task-2');
      expect(ContasReceberService.criarContaReceberManual).not.toHaveBeenCalled();
      expect(prisma.projeto.findUnique).not.toHaveBeenCalled();
    });
  });
});
