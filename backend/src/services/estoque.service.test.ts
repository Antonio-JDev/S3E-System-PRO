const mockPrisma: any = {
  $transaction: jest.fn(),
  orcamento: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  material: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  movimentacaoEstoque: {
    create: jest.fn()
  }
};

jest.mock('../lib/prisma', () => ({
  prisma: mockPrisma
}));

// Import tardio para garantir que o jest.mock do Prisma singleton já foi aplicado
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EstoqueService } = require('./estoque.service');

describe('EstoqueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processarBaixaOrcamento', () => {
    it('deve ignorar itens vendaDiretaFornecedor na validação e baixa de estoque', async () => {
      const orcamentoId = 'orc-1';
      const vendaId = 'venda-1';

      mockPrisma.orcamento.findUnique.mockResolvedValue({
        id: orcamentoId,
        baixaEstoqueRealizadaEm: null,
        items: [
          {
            id: 'oi-1',
            tipo: 'MATERIAL',
            materialId: 'm1',
            quantidade: 5,
            vendaDiretaFornecedor: true
          },
          {
            id: 'oi-2',
            tipo: 'MATERIAL',
            materialId: 'm2',
            quantidade: 2,
            vendaDiretaFornecedor: false
          }
        ]
      });

      // Só o material "m2" deve ser consultado para validação de estoque
      mockPrisma.material.findUnique.mockImplementation(async ({ where }: any) => {
        if (where?.id === 'm2') {
          return { id: 'm2', nome: 'Material 2', estoque: 10 };
        }
        if (where?.id === 'm1') {
          return { id: 'm1', nome: 'Material 1', estoque: 0 };
        }
        return null;
      });

      const darBaixaSpy = jest
        .spyOn(EstoqueService, 'darBaixaMaterial')
        .mockResolvedValue({ ok: true });

      mockPrisma.orcamento.update.mockResolvedValue({ id: orcamentoId });

      const resultado = await EstoqueService.processarBaixaOrcamento(orcamentoId, vendaId);

      expect(resultado.success).toBe(true);
      expect(resultado.materiaisProcessados).toBe(1);
      expect(resultado.totalItens).toBe(2);

      expect(mockPrisma.material.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.material.findUnique).toHaveBeenCalledWith({ where: { id: 'm2' } });

      expect(darBaixaSpy).toHaveBeenCalledTimes(1);
      expect(darBaixaSpy).toHaveBeenCalledWith(
        'm2',
        2,
        'VENDA',
        vendaId,
        expect.stringContaining(`Baixa automática - Venda baseada em orçamento ${orcamentoId}`)
      );

      expect(mockPrisma.orcamento.update).toHaveBeenCalledWith({
        where: { id: orcamentoId },
        data: { baixaEstoqueRealizadaEm: 'VENDA' }
      });
    });

    it('deve lançar erro quando faltar estoque para itens que NÃO são vendaDiretaFornecedor', async () => {
      const orcamentoId = 'orc-2';
      const vendaId = 'venda-2';

      mockPrisma.orcamento.findUnique.mockResolvedValue({
        id: orcamentoId,
        baixaEstoqueRealizadaEm: null,
        items: [
          {
            id: 'oi-1',
            tipo: 'MATERIAL',
            materialId: 'm3',
            quantidade: 5,
            vendaDiretaFornecedor: false
          }
        ]
      });

      mockPrisma.material.findUnique.mockResolvedValue({
        id: 'm3',
        nome: 'Material 3',
        estoque: 1
      });

      const darBaixaSpy = jest.spyOn(EstoqueService, 'darBaixaMaterial').mockResolvedValue({ ok: true });

      await expect(EstoqueService.processarBaixaOrcamento(orcamentoId, vendaId)).rejects.toThrow(
        'Estoque insuficiente'
      );

      expect(darBaixaSpy).not.toHaveBeenCalled();
    });
  });
});

