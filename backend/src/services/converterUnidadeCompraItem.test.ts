/**
 * Rodar: npm test -- converterUnidadeCompraItem.test.ts
 */

const prismaMock: any = {
  compraItem: { findUnique: jest.fn(), update: jest.fn() },
  material: { findUnique: jest.fn(), update: jest.fn() },
  movimentacaoEstoque: { findFirst: jest.fn(), create: jest.fn() },
  reservaMaterialProjeto: { findFirst: jest.fn(), update: jest.fn() },
  obra: { findUnique: jest.fn() },
  compra: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(prismaMock)),
};

jest.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

import {
  converterUnidadeCompraItem,
  ConverterUnidadeError,
  sugerirConversoesCompra,
} from './converterUnidadeCompraItem.service';

const CABO = 'CABO FLEXIVEL 750V 2,5MM PRETO';

function itemBase(overrides: Record<string, unknown> = {}, compra: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    compraId: 'compra-1',
    materialId: 'mat-1',
    nomeProduto: CABO,
    quantidade: 0.2,
    valorUnit: 9716.1,
    valorTotal: 1943.22,
    quantidadeFracionada: null,
    conversaoUnidadeEm: null,
    destinoEstoque: true,
    compra: {
      id: 'compra-1',
      status: 'Pendente',
      numeroNF: '123',
      obraId: null,
      projetoId: null,
      destinoTipo: null,
      ...compra,
    },
    ...overrides,
  };
}

const entrada = () => prismaMock.movimentacaoEstoque.findFirst.mockResolvedValue({ id: 'mov-1' });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.material.findUnique.mockResolvedValue({ preco: 9716.1, unidadeMedida: 'un' });
  prismaMock.movimentacaoEstoque.findFirst.mockResolvedValue(null);
});

describe('converterUnidadeCompraItem', () => {
  it('compra pendente: converte o item e corrige o preço do material sem mexer no estoque', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValue(itemBase());

    const r = await converterUnidadeCompraItem({
      compraId: 'compra-1',
      itemId: 'item-1',
      de: 'km',
      para: 'm',
      usuario: { id: 'u1', nome: 'Admin' },
    });

    expect(r).toMatchObject({ quantidade: 200, valorUnit: 9.7161, valorTotal: 1943.22, precoMaterialCorrigido: true, estoqueAjustado: 0 });
    expect(prismaMock.compraItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidade: 200,
          valorUnit: 9.7161,
          unidadeMedida: 'm',
          unidadeOriginal: 'km',
          quantidadeOriginal: 0.2,
          valorUnitOriginal: 9716.1,
          conversaoUnidadePorId: 'u1',
          conversaoUnidadeOrigem: 'MANUAL',
        }),
      }),
    );
    expect(prismaMock.material.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.material.update).toHaveBeenCalledWith({ where: { id: 'mat-1' }, data: { preco: 9.7161 } });
    expect(prismaMock.movimentacaoEstoque.create).not.toHaveBeenCalled();
  });

  it('não corrige o preço do material se ele já foi alterado por outra compra', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValue(itemBase());
    prismaMock.material.findUnique.mockResolvedValue({ preco: 8.5, unidadeMedida: 'm' });

    const r = await converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' });

    expect(r.precoMaterialCorrigido).toBe(false);
    expect(prismaMock.material.update).not.toHaveBeenCalled();
  });

  it('compra recebida para estoque: aplica a diferença e registra movimentação de ajuste', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValue(itemBase({}, { status: 'Recebido' }));
    entrada();

    const r = await converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' });

    expect(r.estoqueAjustado).toBeCloseTo(199.8);
    expect(r.destinoAjustado).toBeNull();
    expect(prismaMock.material.update).toHaveBeenCalledWith({
      where: { id: 'mat-1' },
      data: { estoque: { increment: 199.8 } },
    });
    expect(prismaMock.movimentacaoEstoque.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'ENTRADA',
        quantidade: 199.8,
        motivo: 'AJUSTE_CONVERSAO_UNIDADE',
        referencia: 'compra-1',
      }),
    });
  });

  it('compra recebida para obra: ajusta também a saída para a obra', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValue(
      itemBase({ destinoEstoque: false }, { status: 'Recebido', obraId: 'obra-1', destinoTipo: 'OBRA' }),
    );
    entrada();

    const r = await converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' });

    expect(r.destinoAjustado).toBe('OBRA');
    expect(prismaMock.material.update).toHaveBeenCalledWith({
      where: { id: 'mat-1' },
      data: { estoque: { decrement: 199.8 } },
    });
    expect(prismaMock.movimentacaoEstoque.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipo: 'SAIDA', motivo: 'OBRA', referencia: 'obra-1', quantidade: 199.8 }),
    });
  });

  it('compra recebida com reserva de OS: multiplica a reserva pelo fator', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValue(
      itemBase({ destinoEstoque: false }, { status: 'Recebido', projetoId: 'os-1', destinoTipo: 'PROJETO' }),
    );
    entrada();
    prismaMock.reservaMaterialProjeto.findFirst.mockResolvedValue({ id: 'res-1', quantidade: 0.2 });

    const r = await converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' });

    expect(r.destinoAjustado).toBe('RESERVA_OS');
    expect(prismaMock.reservaMaterialProjeto.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { quantidade: 200 },
    });
  });

  it('bloqueia compra cancelada, item já convertido e item de outra compra', async () => {
    prismaMock.compraItem.findUnique.mockResolvedValueOnce(itemBase({}, { status: 'Cancelado' }));
    await expect(
      converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' }),
    ).rejects.toThrow('cancelada');

    prismaMock.compraItem.findUnique.mockResolvedValueOnce(itemBase({ conversaoUnidadeEm: new Date() }));
    await expect(
      converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' }),
    ).rejects.toThrow('já teve a unidade convertida');

    prismaMock.compraItem.findUnique.mockResolvedValueOnce(itemBase({ compraId: 'outra' }));
    await expect(
      converterUnidadeCompraItem({ compraId: 'compra-1', itemId: 'item-1', de: 'km', para: 'm' }),
    ).rejects.toBeInstanceOf(ConverterUnidadeError);

    expect(prismaMock.compraItem.update).not.toHaveBeenCalled();
  });
});

describe('sugerirConversoesCompra', () => {
  it('sugere o cabo com preço por km e ignora itens comuns', async () => {
    prismaMock.compra.findUnique.mockResolvedValue({
      status: 'Pendente',
      items: [
        {
          id: 'item-1',
          nomeProduto: CABO,
          quantidade: 0.2,
          valorUnit: 9716.1,
          valorTotal: 1943.22,
          unidadeMedida: null,
          quantidadeFracionada: null,
          conversaoUnidadeEm: null,
          material: { preco: 9716.1 },
        },
        {
          id: 'item-2',
          nomeProduto: 'DISJUNTOR 32A',
          quantidade: 2,
          valorUnit: 30,
          valorTotal: 60,
          unidadeMedida: null,
          quantidadeFracionada: null,
          conversaoUnidadeEm: null,
          material: null,
        },
      ],
    });

    const sugestoes = await sugerirConversoesCompra('compra-1');

    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0]).toMatchObject({
      itemId: 'item-1',
      motivo: 'PRECO_ACIMA_LIMITE_METRO',
      convertido: { quantidade: 200, valorUnit: 9.7161, valorTotal: 1943.22, unidade: 'm' },
    });
  });
});
