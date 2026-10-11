const mockPrisma: any = {
  orcamentoItem: { findMany: jest.fn() },
  orcamento: { findUnique: jest.fn(), update: jest.fn() },
  material: { findUnique: jest.fn() },
  notaFiscal: { findUnique: jest.fn() },
  venda: { findUnique: jest.fn() },
  projeto: { findUnique: jest.fn() },
  movimentacaoEstoque: { count: jest.fn(), findMany: jest.fn() },
};

jest.mock('../lib/prisma', () => ({ prisma: mockPrisma }));

jest.mock('./estoque.service', () => ({
  EstoqueService: {
    darBaixaMaterial: jest.fn(),
    incrementarEstoque: jest.fn(),
    expandirKit: jest.fn(),
    resolverMaterialIdParaItemCotacao: jest.fn(),
  },
}));

jest.mock('./reservaMaterialProjeto.service', () => ({
  ReservaMaterialProjetoService: {
    liberarReservas: jest.fn(),
    criarReserva: jest.fn(),
    listarPorProjeto: jest.fn(),
  },
}));

import { EstoqueService } from './estoque.service';
import { ReservaMaterialProjetoService } from './reservaMaterialProjeto.service';
import {
  agruparMateriaisDoOrcamento,
  baixarKitNaEmissaoNfe,
  estornarBaixaKitDaNota,
} from './baixaMaterialOrcamento.service';

describe('baixa de kit na NF-e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('separa material de obra da composição do kit', async () => {
    mockPrisma.orcamentoItem.findMany.mockResolvedValue([
      { tipo: 'MATERIAL', materialId: 'cabo', quantidade: 4, vendaDiretaFornecedor: false },
      {
        tipo: 'KIT',
        quantidade: 2,
        itensDoKit: [
          { tipo: 'MATERIAL', materialId: 'disjuntor', quantidade: 3 },
          { tipo: 'SERVICO', quantidade: 1 },
        ],
      },
      { tipo: 'MATERIAL', materialId: 'cabo', quantidade: 1, vendaDiretaFornecedor: true },
    ]);

    const obra = await agruparMateriaisDoOrcamento('orc-1', 'obra');
    const kit = await agruparMateriaisDoOrcamento('orc-1', 'kit');

    expect(obra.get('cabo')).toBe(4);
    expect(obra.has('disjuntor')).toBe(false);
    expect(kit.get('disjuntor')).toBe(6);
    expect(kit.has('cabo')).toBe(false);
  });

  it('baixa só os componentes do kit na NF-e e marca a trava', async () => {
    mockPrisma.notaFiscal.findUnique.mockResolvedValue({
      id: 'nf-1',
      status: 'Autorizada',
      tipo: 'PRODUTO',
      vendaId: 'venda-1',
      projetoId: null,
    });
    mockPrisma.venda.findUnique.mockResolvedValue({ orcamentoId: 'orc-1', projetoId: 'proj-1' });
    mockPrisma.orcamento.findUnique.mockResolvedValue({ baixaKitRealizadaEm: null });
    mockPrisma.movimentacaoEstoque.count.mockResolvedValue(0);
    mockPrisma.orcamentoItem.findMany.mockResolvedValue([
      { tipo: 'MATERIAL', materialId: 'cabo', quantidade: 4 },
      {
        tipo: 'KIT',
        quantidade: 1,
        itensDoKit: [{ tipo: 'MATERIAL', materialId: 'disjuntor', quantidade: 2 }],
      },
    ]);
    mockPrisma.material.findUnique.mockResolvedValue({
      id: 'disjuntor',
      nome: 'Disjuntor',
      estoque: 10,
      preco: 15,
    });
    mockPrisma.movimentacaoEstoque.findMany.mockResolvedValue([
      { materialId: 'disjuntor', quantidade: 2 },
    ]);
    (EstoqueService.darBaixaMaterial as jest.Mock).mockResolvedValue({});

    const resultado = await baixarKitNaEmissaoNfe('nf-1');

    expect(resultado.baixou).toBe(true);
    expect(EstoqueService.darBaixaMaterial).toHaveBeenCalledWith(
      'disjuntor',
      2,
      'VENDA',
      'nf-1',
      expect.stringContaining('NF-e'),
      { projetoId: 'proj-1', custoUnitario: 15 },
    );
    expect(ReservaMaterialProjetoService.liberarReservas).toHaveBeenCalledWith(
      'proj-1',
      new Map([['disjuntor', 2]]),
    );
    expect(mockPrisma.orcamento.update).toHaveBeenCalledWith({
      where: { id: 'orc-1' },
      data: { baixaKitRealizadaEm: 'NFE' },
    });
  });

  it('não baixa o kit de novo se a NF-e anterior já marcou', async () => {
    mockPrisma.notaFiscal.findUnique.mockResolvedValue({
      id: 'nf-2',
      status: 'Autorizada',
      tipo: 'PRODUTO',
      vendaId: 'venda-1',
      projetoId: null,
    });
    mockPrisma.venda.findUnique.mockResolvedValue({ orcamentoId: 'orc-1', projetoId: 'proj-1' });
    mockPrisma.orcamento.findUnique.mockResolvedValue({ baixaKitRealizadaEm: 'NFE' });

    const resultado = await baixarKitNaEmissaoNfe('nf-2');

    expect(resultado.baixou).toBe(false);
    expect(EstoqueService.darBaixaMaterial).not.toHaveBeenCalled();
  });

  it('estorna a baixa do kit com o mesmo valor de custo', async () => {
    mockPrisma.movimentacaoEstoque.findMany.mockResolvedValue([
      {
        materialId: 'disjuntor',
        quantidade: 2,
        custoUnitario: 15,
        valorCusto: 30,
        projetoId: 'proj-1',
      },
    ]);
    mockPrisma.notaFiscal.findUnique.mockResolvedValue({
      vendaId: 'venda-1',
      projetoId: 'proj-1',
    });
    mockPrisma.venda.findUnique.mockResolvedValue({ orcamentoId: 'orc-1', projetoId: 'proj-1' });
    (EstoqueService.incrementarEstoque as jest.Mock).mockResolvedValue({});

    const qtd = await estornarBaixaKitDaNota('nf-1');

    expect(qtd).toBe(1);
    expect(EstoqueService.incrementarEstoque).toHaveBeenCalledWith(
      'disjuntor',
      2,
      'DEVOLUCAO',
      'nf-1',
      expect.stringContaining('cancelamento'),
      { projetoId: 'proj-1', custoUnitario: 15, valorCusto: 30 },
    );
    expect(mockPrisma.orcamento.update).toHaveBeenCalledWith({
      where: { id: 'orc-1' },
      data: { baixaKitRealizadaEm: null },
    });
    expect(ReservaMaterialProjetoService.criarReserva).toHaveBeenCalledWith({
      projetoId: 'proj-1',
      materialId: 'disjuntor',
      quantidade: 2,
      observacoes: 'Reserva do kit restaurada no cancelamento da NF-e',
    });
  });
});
