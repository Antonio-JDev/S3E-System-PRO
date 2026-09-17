import { vincularCompraItemAoMaterial } from './vincularCompraItemMaterial.service';

function criarDbMock(overrides?: Partial<any>) {
    const aliasStore: any[] = [];
    return {
        compraItem: {
            findUnique: jest.fn(),
            update: jest.fn(async ({ data, include }: any) => ({
                id: 'item-1',
                ...data,
                nomeProduto: 'Cabo Flex 2,5mm',
                material: include?.material
                    ? { id: data.materialId, nome: 'Cabo Flex', sku: 'SKU-1' }
                    : undefined,
            })),
        },
        material: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        materialFornecedorAlias: {
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            upsert: jest.fn(async ({ create }: any) => {
                aliasStore.push(create);
                return create;
            }),
            update: jest.fn(),
            create: jest.fn(async ({ data }: any) => {
                aliasStore.push(data);
                return data;
            }),
        },
        ...overrides,
        _aliasStore: aliasStore,
    };
}

describe('vincularCompraItemAoMaterial', () => {
    it('atualiza CompraItem e grava alias com EAN/cProd', async () => {
        const db = criarDbMock();
        (db.compraItem.findUnique as jest.Mock).mockResolvedValue({
            id: 'item-1',
            compraId: 'compra-1',
            nomeProduto: 'Cabo Flex 2,5mm',
            ean: '7891234567895',
            codigoFornecedor: 'CAB-25',
            ncm: '85444900',
            compra: { id: 'compra-1', fornecedorId: 'forn-a', status: 'Pendente' },
        });
        (db.material.findUnique as jest.Mock).mockResolvedValue({
            id: 'mat-cabo',
            nome: 'Cabo Flex',
            ativo: true,
        });

        const result = await vincularCompraItemAoMaterial(db as any, {
            compraId: 'compra-1',
            compraItemId: 'item-1',
            materialId: 'mat-cabo',
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(db.compraItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'item-1' },
                data: expect.objectContaining({ materialId: 'mat-cabo' }),
            })
        );
        expect(db.materialFornecedorAlias.upsert).toHaveBeenCalled();
        expect(result.alias).toEqual({
            ean: '7891234567895',
            codigoFornecedor: 'CAB-25',
        });
    });

    it('aceita EAN/cProd na request quando o item está vazio', async () => {
        const db = criarDbMock();
        (db.compraItem.findUnique as jest.Mock).mockResolvedValue({
            id: 'item-1',
            compraId: 'compra-1',
            nomeProduto: 'Disjuntor',
            ean: null,
            codigoFornecedor: null,
            ncm: null,
            compra: { id: 'compra-1', fornecedorId: 'forn-a', status: 'Recebido' },
        });
        (db.material.findUnique as jest.Mock).mockResolvedValue({
            id: 'mat-dj',
            nome: 'Disjuntor 20A',
            ativo: true,
        });

        const result = await vincularCompraItemAoMaterial(db as any, {
            compraId: 'compra-1',
            compraItemId: 'item-1',
            materialId: 'mat-dj',
            ean: '7891234567895',
            codigoFornecedor: 'DJ-20',
        });

        expect(result.ok).toBe(true);
        expect(db.compraItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    materialId: 'mat-dj',
                    ean: '7891234567895',
                    codigoFornecedor: 'DJ-20',
                }),
            })
        );
    });

    it('rejeita item de outra compra', async () => {
        const db = criarDbMock();
        (db.compraItem.findUnique as jest.Mock).mockResolvedValue({
            id: 'item-1',
            compraId: 'outra',
            nomeProduto: 'X',
            compra: { id: 'outra', fornecedorId: 'forn-a' },
        });

        const result = await vincularCompraItemAoMaterial(db as any, {
            compraId: 'compra-1',
            compraItemId: 'item-1',
            materialId: 'mat-1',
        });

        expect(result).toEqual({
            ok: false,
            status: 400,
            message: 'Item não pertence a esta compra.',
        });
    });

    it('rejeita material inexistente', async () => {
        const db = criarDbMock();
        (db.compraItem.findUnique as jest.Mock).mockResolvedValue({
            id: 'item-1',
            compraId: 'compra-1',
            nomeProduto: 'X',
            ean: null,
            codigoFornecedor: null,
            compra: { id: 'compra-1', fornecedorId: 'forn-a' },
        });
        (db.material.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await vincularCompraItemAoMaterial(db as any, {
            compraId: 'compra-1',
            compraItemId: 'item-1',
            materialId: 'mat-x',
        });

        expect(result).toEqual({
            ok: false,
            status: 404,
            message: 'Material do estoque não encontrado.',
        });
    });
});
