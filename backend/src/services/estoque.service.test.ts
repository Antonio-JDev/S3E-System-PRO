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
  },
  projeto: {
    findUnique: jest.fn().mockResolvedValue(null)
  },
  venda: {
    findUnique: jest.fn().mockResolvedValue(null)
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
    it('não baixa estoque nem marca a venda', async () => {
      const resultado = await EstoqueService.processarBaixaOrcamento('orc-1', 'venda-1');

      expect(resultado.success).toBe(true);
      expect(resultado.skipped).toBe(true);
      expect(resultado.materiaisProcessados).toBe(0);
      expect(mockPrisma.orcamento.update).not.toHaveBeenCalled();
      expect(mockPrisma.material.findUnique).not.toHaveBeenCalled();
    });
  });
});

