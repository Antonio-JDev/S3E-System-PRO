import { compararNomesProdutos, normalizarNomeProduto } from '../utils/stringUtils';

export const MATERIAL_MATCH_SELECT = {
    id: true,
    nome: true,
    sku: true,
    unidadeMedida: true,
    preco: true,
    valorVenda: true,
    estoque: true,
    categoria: true,
    ncm: true,
    descricao: true,
    imagemUrl: true,
} as const;

export type MaterialMatch = {
    id: string;
    nome: string;
    sku: string;
    unidadeMedida: string;
    preco: number | null;
    valorVenda: number | null;
    estoque: number;
    categoria: string;
    ncm: string | null;
    descricao: string | null;
    imagemUrl: string | null;
};

export type MatchTipo =
    | 'EAN'
    | 'CODIGO_FORNECEDOR'
    | 'ALIAS_NOME'
    | 'HISTORICO_COMPRA'
    | 'NOME_MATERIAL'
    | 'MANUAL';

export type MatchResult = {
    material: MaterialMatch;
    tipo: MatchTipo;
};

export type AliasDb = {
    materialFornecedorAlias: {
        findFirst: (args?: any) => Promise<any>;
        findMany: (args?: any) => Promise<any[]>;
        upsert: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
        count?: (args?: any) => Promise<number>;
    };
    material: {
        findMany: (args?: any) => Promise<any[]>;
        findUnique?: (args?: any) => Promise<any>;
    };
    compraItem: {
        findMany: (args?: any) => Promise<any[]>;
    };
};

export function eanValido(ean?: string | null): boolean {
    if (!ean) return false;
    const bruto = String(ean).trim().toUpperCase().replace(/\s+/g, '');
    if (!bruto || bruto === 'SEMGTIN' || bruto === 'SEM-GTIN' || bruto === 'N/A' || bruto === '-') {
        return false;
    }
    const digits = bruto.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 14;
}

export function normalizarEan(ean?: string | null): string | null {
    if (!eanValido(ean)) return null;
    return String(ean).replace(/\D/g, '');
}

/** cProd sequencial (1, 2, 01) não identifica o produto; códigos maiores ou alfanuméricos sim. */
export function codigoFornecedorEstavel(codigo?: string | null): boolean {
    if (!codigo) return false;
    const c = String(codigo).trim();
    if (!c) return false;
    if (/[A-Za-z]/.test(c)) return true;
    const digits = c.replace(/\D/g, '');
    return digits.length >= 4;
}

export function normalizarCodigoFornecedor(codigo?: string | null): string | null {
    if (!codigo) return null;
    const c = String(codigo).trim();
    return c || null;
}

export type DadosItemMatch = {
    fornecedorId?: string | null;
    nomeProduto: string;
    codigoFornecedor?: string | null;
    ean?: string | null;
};

export async function matchMaterial(db: AliasDb, dados: DadosItemMatch): Promise<MatchResult | null> {
    const ean = normalizarEan(dados.ean);
    const codigo = normalizarCodigoFornecedor(dados.codigoFornecedor);
    const nomeProduto = dados.nomeProduto || '';
    const nomeNorm = normalizarNomeProduto(nomeProduto);
    const fornecedorId = dados.fornecedorId || null;

    if (ean) {
        const byEan = await db.materialFornecedorAlias.findFirst({
            where: {
                ean,
                material: { ativo: true },
            },
            include: { material: { select: MATERIAL_MATCH_SELECT } },
        });
        if (byEan?.material) {
            return { material: byEan.material, tipo: 'EAN' };
        }
    }

    if (fornecedorId && codigo && codigoFornecedorEstavel(codigo)) {
        const byCodigo = await db.materialFornecedorAlias.findFirst({
            where: {
                fornecedorId,
                codigoFornecedor: codigo,
                material: { ativo: true },
            },
            include: { material: { select: MATERIAL_MATCH_SELECT } },
        });
        if (byCodigo?.material) {
            return { material: byCodigo.material, tipo: 'CODIGO_FORNECEDOR' };
        }
    }

    if (fornecedorId && nomeNorm) {
        const byNome = await db.materialFornecedorAlias.findFirst({
            where: {
                fornecedorId,
                nomeNormalizado: nomeNorm,
                material: { ativo: true },
            },
            include: { material: { select: MATERIAL_MATCH_SELECT } },
        });
        if (byNome?.material) {
            return { material: byNome.material, tipo: 'ALIAS_NOME' };
        }
    }

    if (fornecedorId && nomeProduto) {
        const historicos = await db.compraItem.findMany({
            where: {
                materialId: { not: null },
                compra: { fornecedorId },
            },
            select: {
                nomeProduto: true,
                material: { select: MATERIAL_MATCH_SELECT },
            },
            orderBy: { id: 'desc' },
            take: 400,
        });
        const hit = historicos.find(
            (h) => h.material && compararNomesProdutos(h.nomeProduto, nomeProduto)
        );
        if (hit?.material) {
            return { material: hit.material, tipo: 'HISTORICO_COMPRA' };
        }
    }

    if (nomeProduto) {
        const todos = await db.material.findMany({
            where: { ativo: true },
            select: MATERIAL_MATCH_SELECT,
        });
        const materiaisMatch = todos.filter((m) => compararNomesProdutos(m.nome, nomeProduto));
        if (materiaisMatch.length === 1) {
            return { material: materiaisMatch[0], tipo: 'NOME_MATERIAL' };
        }
    }

    return null;
}

export type UpsertAliasParams = {
    materialId: string;
    fornecedorId: string;
    nomeOriginal: string;
    codigoFornecedor?: string | null;
    ean?: string | null;
    ncm?: string | null;
    origem?: string;
    createdBy?: string | null;
};

export async function upsertAlias(db: AliasDb, params: UpsertAliasParams): Promise<void> {
    const nomeNormalizado = normalizarNomeProduto(params.nomeOriginal);
    if (!params.materialId || !params.fornecedorId || !nomeNormalizado) return;

    const codigo = codigoFornecedorEstavel(params.codigoFornecedor)
        ? normalizarCodigoFornecedor(params.codigoFornecedor)
        : null;
    const ean = normalizarEan(params.ean);
    const origem = params.origem || 'MANUAL';

    await db.materialFornecedorAlias.upsert({
        where: {
            fornecedorId_nomeNormalizado: {
                fornecedorId: params.fornecedorId,
                nomeNormalizado,
            },
        },
        create: {
            materialId: params.materialId,
            fornecedorId: params.fornecedorId,
            codigoFornecedor: codigo,
            ean,
            nomeOriginal: params.nomeOriginal,
            nomeNormalizado,
            ncm: params.ncm ? String(params.ncm) : null,
            origem,
            createdBy: params.createdBy || null,
        },
        update: {
            materialId: params.materialId,
            codigoFornecedor: codigo ?? undefined,
            ean: ean ?? undefined,
            nomeOriginal: params.nomeOriginal,
            ncm: params.ncm ? String(params.ncm) : undefined,
            origem,
        },
    });

    if (codigo) {
        const outros = await db.materialFornecedorAlias.findMany({
            where: {
                fornecedorId: params.fornecedorId,
                codigoFornecedor: codigo,
                NOT: { nomeNormalizado },
            },
        });
        for (const row of outros) {
            if (row.materialId !== params.materialId) {
                await db.materialFornecedorAlias.update({
                    where: { id: row.id },
                    data: { materialId: params.materialId },
                });
            }
        }
    }
}

export async function backfillAliasesFromCompras(db: AliasDb & { compraItem: { findMany: Function } }): Promise<number> {
    const itens = await db.compraItem.findMany({
        where: { materialId: { not: null } },
        select: {
            nomeProduto: true,
            materialId: true,
            ncm: true,
            codigoFornecedor: true,
            ean: true,
            compra: { select: { fornecedorId: true } },
        },
    });

    const vencedor = new Map<string, { materialId: string; count: number; sample: any }>();
    for (const item of itens) {
        const fornecedorId = item.compra?.fornecedorId;
        const nomeNorm = normalizarNomeProduto(item.nomeProduto);
        if (!fornecedorId || !item.materialId || !nomeNorm) continue;
        const key = `${fornecedorId}::${nomeNorm}`;
        const atual = vencedor.get(key);
        if (!atual) {
            vencedor.set(key, { materialId: item.materialId, count: 1, sample: item });
        } else if (atual.materialId === item.materialId) {
            atual.count += 1;
        } else {
            atual.count -= 1;
            if (atual.count <= 0) {
                vencedor.set(key, { materialId: item.materialId, count: 1, sample: item });
            }
        }
    }

    let gravados = 0;
    for (const [key, info] of vencedor) {
        const [fornecedorId, nomeNormalizado] = key.split('::');
        const item = info.sample;
        try {
            await upsertAlias(db, {
                materialId: info.materialId,
                fornecedorId,
                nomeOriginal: item.nomeProduto || nomeNormalizado,
                codigoFornecedor: item.codigoFornecedor,
                ean: item.ean,
                ncm: item.ncm,
                origem: 'HISTORICO',
            });
            gravados += 1;
        } catch {
            // ignora conflito pontual no backfill
        }
    }
    return gravados;
}
