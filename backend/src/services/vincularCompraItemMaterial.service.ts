import {
    eanValido,
    upsertAlias,
    upsertCodigosManuaisMaterial,
    type AliasDb,
} from './materialFornecedorAlias.service';
import {
    montarUpdateCompraItemVinculo,
    resolverIdentificadoresVinculo,
} from '../utils/vincularCompraItemMaterial.util';

export type VincularCompraItemDb = AliasDb & {
    compraItem: {
        findUnique: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
    };
    material: {
        findUnique: (args: any) => Promise<any>;
        findMany: (args?: any) => Promise<any[]>;
    };
};

export type VincularCompraItemParams = {
    compraId: string;
    compraItemId: string;
    materialId: string;
    /** Se o item não tiver EAN, pode informar aqui */
    ean?: string | null;
    /** Se o item não tiver cProd, pode informar aqui */
    codigoFornecedor?: string | null;
    createdBy?: string | null;
};

export type VincularCompraItemResult =
    | {
          ok: true;
          item: any;
          alias: { ean: string | null; codigoFornecedor: string | null };
      }
    | { ok: false; status: number; message: string };

/**
 * Vincula CompraItem a um Material do estoque e grava EAN/cProd no alias do fornecedor,
 * para matching automático em compras futuras do mesmo fornecedor.
 */
export async function vincularCompraItemAoMaterial(
    db: VincularCompraItemDb,
    params: VincularCompraItemParams
): Promise<VincularCompraItemResult> {
    const { compraId, compraItemId, materialId } = params;

    if (!compraId || !compraItemId || !materialId) {
        return {
            ok: false,
            status: 400,
            message: 'Informe compraId, compraItemId e materialId.',
        };
    }

    const item = await db.compraItem.findUnique({
        where: { id: compraItemId },
        include: {
            compra: { select: { id: true, fornecedorId: true, status: true } },
        },
    });

    if (!item) {
        return { ok: false, status: 404, message: 'Item da compra não encontrado.' };
    }

    if (item.compraId !== compraId) {
        return { ok: false, status: 400, message: 'Item não pertence a esta compra.' };
    }

    const fornecedorId = item.compra?.fornecedorId;
    if (!fornecedorId) {
        return {
            ok: false,
            status: 400,
            message: 'Compra sem fornecedor; não é possível gravar o alias.',
        };
    }

    const material = await db.material.findUnique({
        where: { id: materialId },
        select: { id: true, nome: true, ativo: true },
    });

    if (!material) {
        return { ok: false, status: 404, message: 'Material do estoque não encontrado.' };
    }

    if (material.ativo === false) {
        return {
            ok: false,
            status: 400,
            message: 'Material inativo. Ative-o no estoque antes de vincular.',
        };
    }

    if (params.ean !== undefined && params.ean != null && String(params.ean).trim()) {
        if (!eanValido(params.ean)) {
            return {
                ok: false,
                status: 400,
                message:
                    'EAN inválido. Informe um GTIN/código de barras com 8 a 14 dígitos, ou deixe vazio.',
            };
        }
    }

    const override: { ean?: string | null; codigoFornecedor?: string | null } = {};
    if (params.ean !== undefined) override.ean = params.ean;
    if (params.codigoFornecedor !== undefined) override.codigoFornecedor = params.codigoFornecedor;

    const resolvidos = resolverIdentificadoresVinculo(
        { ean: item.ean, codigoFornecedor: item.codigoFornecedor },
        Object.keys(override).length ? override : undefined
    );

    const updateData = montarUpdateCompraItemVinculo(
        { ean: item.ean, codigoFornecedor: item.codigoFornecedor },
        materialId,
        resolvidos
    );

    // Se a request informou códigos, persiste no item mesmo quando já havia valor
    if (params.ean !== undefined) {
        updateData.ean = resolvidos.ean;
    }
    if (params.codigoFornecedor !== undefined) {
        updateData.codigoFornecedor = resolvidos.codigoFornecedor;
    }

    const itemAtualizado = await db.compraItem.update({
        where: { id: compraItemId },
        data: updateData,
        include: {
            material: {
                select: {
                    id: true,
                    nome: true,
                    sku: true,
                    ncm: true,
                    unidadeMedida: true,
                    preco: true,
                    valorVenda: true,
                    estoque: true,
                    imagemUrl: true,
                },
            },
        },
    });

    const nomeOriginal = item.nomeProduto || material.nome || 'Material';

    await upsertAlias(db, {
        materialId,
        fornecedorId,
        nomeOriginal,
        codigoFornecedor: resolvidos.codigoFornecedor,
        ean: resolvidos.ean,
        ncm: item.ncm,
        origem: 'MANUAL',
        createdBy: params.createdBy || null,
    });

    // Garante EAN/cProd no alias do par material+fornecedor (mesmo se nome divergir)
    if (resolvidos.ean || resolvidos.codigoFornecedor) {
        const codigos = await upsertCodigosManuaisMaterial(db, {
            materialId,
            fornecedorId,
            nomeMaterial: nomeOriginal,
            ean: resolvidos.ean,
            codigoFornecedor: resolvidos.codigoFornecedor,
            ncm: item.ncm,
            createdBy: params.createdBy || null,
        });
        if (!codigos.ok) {
            return { ok: false, status: 400, message: codigos.message };
        }
    }

    return {
        ok: true,
        item: itemAtualizado,
        alias: {
            ean: resolvidos.ean,
            codigoFornecedor: resolvidos.codigoFornecedor,
        },
    };
}
