import {
    eanValido,
    normalizarEan,
    codigoFornecedorEstavel,
    matchMaterial,
    upsertAlias,
    AliasDb,
} from './materialFornecedorAlias.service';

const materialCabo = {
    id: 'mat-cabo',
    nome: 'Cabo Flex 2,5mm Vermelho',
    sku: 'S3E-001',
    unidadeMedida: 'm',
    preco: 2.5,
    valorVenda: 4,
    estoque: 10,
    categoria: 'MaterialEletrico',
    ncm: '85444900',
    descricao: 'Cabo',
    imagemUrl: null,
};

function criarDbMock(overrides: Partial<AliasDb> = {}): AliasDb {
    return {
        materialFornecedorAlias: {
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            upsert: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        },
        material: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        compraItem: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        ...overrides,
    };
}

describe('materialFornecedorAlias helpers', () => {
    it('rejeita EAN vazio ou SEM GTIN', () => {
        expect(eanValido(null)).toBe(false);
        expect(eanValido('SEM GTIN')).toBe(false);
        expect(eanValido('sem gtin')).toBe(false);
        expect(normalizarEan('SEM GTIN')).toBeNull();
    });

    it('aceita GTIN numérico', () => {
        expect(eanValido('7891234567895')).toBe(true);
        expect(normalizarEan('789.1234.56789-5')).toBe('7891234567895');
    });

    it('considera cProd sequencial instável', () => {
        expect(codigoFornecedorEstavel('1')).toBe(false);
        expect(codigoFornecedorEstavel('12')).toBe(false);
        expect(codigoFornecedorEstavel('001')).toBe(false);
        expect(codigoFornecedorEstavel('8821')).toBe(true);
        expect(codigoFornecedorEstavel('CAB-25')).toBe(true);
    });
});

describe('matchMaterial', () => {
    it('prioriza EAN sobre nome', async () => {
        const db = criarDbMock();
        (db.materialFornecedorAlias.findFirst as jest.Mock).mockImplementation(async (args: any) => {
            if (args?.where?.ean === '7891234567895') {
                return { material: materialCabo };
            }
            return null;
        });

        const result = await matchMaterial(db, {
            fornecedorId: 'forn-a',
            nomeProduto: 'Outro nome qualquer',
            ean: '7891234567895',
            codigoFornecedor: '1',
        });

        expect(result?.tipo).toBe('EAN');
        expect(result?.material.id).toBe('mat-cabo');
    });

    it('casa por código estável do fornecedor', async () => {
        const db = criarDbMock();
        (db.materialFornecedorAlias.findFirst as jest.Mock).mockImplementation(async (args: any) => {
            if (args?.where?.codigoFornecedor === '8821') {
                return { material: materialCabo };
            }
            return null;
        });

        const result = await matchMaterial(db, {
            fornecedorId: 'forn-a',
            nomeProduto: 'CABO FLEXIVEL 2,5MM VM XYZ',
            codigoFornecedor: '8821',
        });

        expect(result?.tipo).toBe('CODIGO_FORNECEDOR');
    });

    it('casa por alias de nome do fornecedor', async () => {
        const db = criarDbMock();
        (db.materialFornecedorAlias.findFirst as jest.Mock).mockImplementation(async (args: any) => {
            if (args?.where?.nomeNormalizado === 'CABO FLEXIVEL 2 5MM VM XYZ') {
                return { material: materialCabo };
            }
            return null;
        });

        const result = await matchMaterial(db, {
            fornecedorId: 'forn-a',
            nomeProduto: 'CABO FLEXIVEL 2,5MM VM XYZ',
            codigoFornecedor: '1',
        });

        expect(result?.tipo).toBe('ALIAS_NOME');
    });

    it('usa histórico de compra do mesmo fornecedor', async () => {
        const db = criarDbMock();
        (db.compraItem.findMany as jest.Mock).mockResolvedValue([
            { nomeProduto: 'CABO FLEXIVEL 2,5MM VM XYZ', material: materialCabo },
        ]);

        const result = await matchMaterial(db, {
            fornecedorId: 'forn-a',
            nomeProduto: 'Cabo Flexivel 2,5mm VM XYZ',
        });

        expect(result?.tipo).toBe('HISTORICO_COMPRA');
    });

    it('não casa automaticamente quando há vários materiais com o mesmo nome', async () => {
        const db = criarDbMock();
        (db.material.findMany as jest.Mock).mockResolvedValue([
            { ...materialCabo, id: 'a' },
            { ...materialCabo, id: 'b' },
        ]);

        const result = await matchMaterial(db, {
            nomeProduto: 'Cabo Flex 2,5mm Vermelho',
        });

        expect(result).toBeNull();
    });
});

describe('upsertAlias', () => {
    it('grava chave fornecedor + nome normalizado', async () => {
        const db = criarDbMock();

        await upsertAlias(db, {
            materialId: 'mat-cabo',
            fornecedorId: 'forn-a',
            nomeOriginal: 'CABO FLEXIVEL 2,5MM VM XYZ',
            codigoFornecedor: '8821',
            ean: '7891234567895',
            origem: 'MANUAL',
        });

        expect(db.materialFornecedorAlias.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    fornecedorId_nomeNormalizado: {
                        fornecedorId: 'forn-a',
                        nomeNormalizado: 'CABO FLEXIVEL 2 5MM VM XYZ',
                    },
                },
                create: expect.objectContaining({
                    materialId: 'mat-cabo',
                    codigoFornecedor: '8821',
                    ean: '7891234567895',
                }),
            })
        );
    });

    it('não grava cProd sequencial como código estável', async () => {
        const db = criarDbMock();

        await upsertAlias(db, {
            materialId: 'mat-cabo',
            fornecedorId: 'forn-a',
            nomeOriginal: 'Disjuntor 20A',
            codigoFornecedor: '1',
        });

        const call = (db.materialFornecedorAlias.upsert as jest.Mock).mock.calls[0][0];
        expect(call.create.codigoFornecedor).toBeNull();
    });
});
