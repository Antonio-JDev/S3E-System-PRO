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
        create?: (args: any) => Promise<any>;
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

export type AliasCodigoResumo = {
    ean?: string | null;
    codigoFornecedor?: string | null;
    fornecedorId?: string | null;
};

/** Mesma regra do frontend: prioriza fornecedor do material, depois o mais recente com código. */
export function resolverEanCprod(
    aliases: AliasCodigoResumo[] | undefined | null,
    fornecedorId?: string | null
): { ean: string | null; codigoFornecedor: string | null } {
    const lista = Array.isArray(aliases) ? aliases : [];
    const comCodigo = lista.filter((a) => Boolean(a.ean?.trim()) || Boolean(a.codigoFornecedor?.trim()));
    const preferido =
        (fornecedorId && comCodigo.find((a) => a.fornecedorId === fornecedorId)) ||
        comCodigo[0] ||
        null;
    return {
        ean: preferido?.ean?.trim() || null,
        codigoFornecedor: preferido?.codigoFornecedor?.trim() || null,
    };
}

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

export type UpsertCodigosManuaisParams = {
    materialId: string;
    fornecedorId: string;
    nomeMaterial: string;
    /** `undefined` = não alterar; string vazia/null = limpar */
    ean?: string | null;
    codigoFornecedor?: string | null;
    ncm?: string | null;
    createdBy?: string | null;
};

export type UpsertCodigosManuaisResult =
    | { ok: true }
    | { ok: false; message: string };

export type AliasCodigoInput = {
    id?: string | null;
    fornecedorId: string;
    ean?: string | null;
    codigoFornecedor?: string | null;
    nomeOriginal?: string | null;
};

/**
 * Sincroniza lista de EAN/cProd do material (vários aliases).
 * Atualiza por id, cria novos e remove aliases de código que saíram da lista.
 * Aliases só de nome (sem EAN/cProd) são preservados.
 */
export async function sincronizarAliasesCodigosMaterial(
    db: AliasDb & {
        materialFornecedorAlias: {
            findMany: (args?: any) => Promise<any[]>;
            update: (args: any) => Promise<any>;
            create: (args: any) => Promise<any>;
            delete: (args: any) => Promise<any>;
        };
    },
    params: {
        materialId: string;
        nomeMaterial: string;
        ncm?: string | null;
        aliases: AliasCodigoInput[];
        createdBy?: string | null;
    }
): Promise<UpsertCodigosManuaisResult> {
    const materialId = params.materialId;
    if (!materialId) {
        return { ok: false, message: 'Material inválido.' };
    }

    const lista = Array.isArray(params.aliases) ? params.aliases : [];
    const normalizados: Array<{
        id?: string;
        fornecedorId: string;
        ean: string | null;
        codigoFornecedor: string | null;
        nomeOriginal: string;
    }> = [];

    for (const row of lista) {
        const fornecedorId = String(row.fornecedorId || '').trim();
        if (!fornecedorId) {
            return {
                ok: false,
                message: 'Cada EAN/cProd precisa de um fornecedor selecionado.',
            };
        }
        const eanBruto = row.ean == null ? '' : String(row.ean).trim();
        let ean: string | null = null;
        if (eanBruto) {
            if (!eanValido(eanBruto)) {
                return {
                    ok: false,
                    message:
                        'EAN inválido. Informe um GTIN com 8 a 14 dígitos, ou deixe vazio.',
                };
            }
            ean = normalizarEan(eanBruto);
        }
        const codigoFornecedor = normalizarCodigoFornecedor(row.codigoFornecedor);
        if (!ean && !codigoFornecedor) {
            continue;
        }
        const nomeOriginal =
            (row.nomeOriginal && String(row.nomeOriginal).trim()) ||
            params.nomeMaterial ||
            'Material';
        normalizados.push({
            id: row.id ? String(row.id) : undefined,
            fornecedorId,
            ean,
            codigoFornecedor,
            nomeOriginal,
        });
    }

    const existentes = await db.materialFornecedorAlias.findMany({
        where: { materialId },
    });
    const comCodigo = existentes.filter(
        (a: any) => Boolean(a.ean?.trim()) || Boolean(a.codigoFornecedor?.trim())
    );
    const idsMantidos = new Set(normalizados.map((n) => n.id).filter(Boolean) as string[]);

    for (const row of normalizados) {
        if (row.id) {
            const atual = existentes.find((a: any) => a.id === row.id);
            if (!atual || atual.materialId !== materialId) {
                return { ok: false, message: 'Alias inválido para este material.' };
            }
            await db.materialFornecedorAlias.update({
                where: { id: row.id },
                data: {
                    fornecedorId: row.fornecedorId,
                    ean: row.ean,
                    codigoFornecedor: row.codigoFornecedor,
                    nomeOriginal: row.nomeOriginal,
                    origem: 'MANUAL',
                },
            });
            continue;
        }

        const nomeNormBase =
            normalizarNomeProduto(row.nomeOriginal) ||
            row.nomeOriginal.toLowerCase();
        let nomeNormalizado = nomeNormBase;
        let tentativa = 0;
        while (
            existentes.some(
                (a: any) =>
                    a.fornecedorId === row.fornecedorId && a.nomeNormalizado === nomeNormalizado
            )
        ) {
            tentativa += 1;
            const sufixo = row.ean || row.codigoFornecedor || String(tentativa);
            nomeNormalizado = `${nomeNormBase}::${sufixo}`.slice(0, 200);
            if (tentativa > 20) break;
        }

        const criado = await db.materialFornecedorAlias.create({
            data: {
                materialId,
                fornecedorId: row.fornecedorId,
                ean: row.ean,
                codigoFornecedor: row.codigoFornecedor,
                nomeOriginal: row.nomeOriginal,
                nomeNormalizado,
                ncm: params.ncm ? String(params.ncm) : null,
                origem: 'MANUAL',
                createdBy: params.createdBy || null,
            },
        });
        existentes.push(criado);
        idsMantidos.add(criado.id);
    }

    for (const antigo of comCodigo) {
        if (!idsMantidos.has(antigo.id)) {
            await db.materialFornecedorAlias.delete({ where: { id: antigo.id } });
        }
    }

    return { ok: true };
}

/**
 * Persiste EAN / cProd no alias do fornecedor do material (criação ou atualização).
 * Exige fornecedorId (schema MaterialFornecedorAlias).
 */
export async function upsertCodigosManuaisMaterial(
    db: AliasDb,
    params: UpsertCodigosManuaisParams
): Promise<UpsertCodigosManuaisResult> {
    if (!params.materialId || !params.fornecedorId) {
        return {
            ok: false,
            message: 'Para gravar EAN/cProd é necessário informar o fornecedor do material.',
        };
    }

    const eanInformado = params.ean !== undefined;
    const cprodInformado = params.codigoFornecedor !== undefined;
    if (!eanInformado && !cprodInformado) {
        return { ok: true };
    }

    let eanFinal: string | null | undefined = undefined;
    if (eanInformado) {
        const bruto = params.ean == null ? '' : String(params.ean).trim();
        if (!bruto) {
            eanFinal = null;
        } else if (!eanValido(bruto)) {
            return {
                ok: false,
                message: 'EAN inválido. Informe um GTIN/código de barras com 8 a 14 dígitos, ou deixe vazio.',
            };
        } else {
            eanFinal = normalizarEan(bruto);
        }
    }

    let cprodFinal: string | null | undefined = undefined;
    if (cprodInformado) {
        const bruto = params.codigoFornecedor == null ? '' : String(params.codigoFornecedor).trim();
        cprodFinal = bruto || null;
    }

    const existente = await db.materialFornecedorAlias.findFirst({
        where: {
            materialId: params.materialId,
            fornecedorId: params.fornecedorId,
        },
        orderBy: { updatedAt: 'desc' },
    });

    if (existente) {
        await db.materialFornecedorAlias.update({
            where: { id: existente.id },
            data: {
                ...(eanInformado ? { ean: eanFinal } : {}),
                ...(cprodInformado ? { codigoFornecedor: cprodFinal } : {}),
                origem: 'MANUAL',
            },
        });
        return { ok: true };
    }

    const nomeOriginal = (params.nomeMaterial || '').trim() || 'Material';
    const nomeNormalizado = normalizarNomeProduto(nomeOriginal) || nomeOriginal.toLowerCase();

    if (typeof db.materialFornecedorAlias.create === 'function') {
        try {
            await db.materialFornecedorAlias.create({
                data: {
                    materialId: params.materialId,
                    fornecedorId: params.fornecedorId,
                    ean: eanInformado ? eanFinal : null,
                    codigoFornecedor: cprodInformado ? cprodFinal : null,
                    nomeOriginal,
                    nomeNormalizado,
                    ncm: params.ncm ? String(params.ncm) : null,
                    origem: 'MANUAL',
                    createdBy: params.createdBy || null,
                },
            });
            return { ok: true };
        } catch {
            // Conflito de unique (fornecedor + nome): faz upsert
        }
    }

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
            ean: eanInformado ? eanFinal : null,
            codigoFornecedor: cprodInformado ? cprodFinal : null,
            nomeOriginal,
            nomeNormalizado,
            ncm: params.ncm ? String(params.ncm) : null,
            origem: 'MANUAL',
            createdBy: params.createdBy || null,
        },
        update: {
            materialId: params.materialId,
            ...(eanInformado ? { ean: eanFinal } : {}),
            ...(cprodInformado ? { codigoFornecedor: cprodFinal } : {}),
            nomeOriginal,
            origem: 'MANUAL',
        },
    });

    return { ok: true };
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
