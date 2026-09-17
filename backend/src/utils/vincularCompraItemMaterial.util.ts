import {
    normalizarCodigoFornecedor,
    normalizarEan,
} from '../services/materialFornecedorAlias.service';

export type IdentificadoresItemCompra = {
    ean?: string | null;
    codigoFornecedor?: string | null;
};

/**
 * Resolve EAN/cProd para vínculo: valores da request têm prioridade quando informados;
 * caso contrário usa os já gravados no CompraItem.
 */
export function resolverIdentificadoresVinculo(
    item: IdentificadoresItemCompra,
    override?: IdentificadoresItemCompra
): { ean: string | null; codigoFornecedor: string | null } {
    const eanFonte =
        override && Object.prototype.hasOwnProperty.call(override, 'ean')
            ? override.ean
            : item.ean;
    const cprodFonte =
        override && Object.prototype.hasOwnProperty.call(override, 'codigoFornecedor')
            ? override.codigoFornecedor
            : item.codigoFornecedor;

    return {
        ean: normalizarEan(eanFonte),
        codigoFornecedor: normalizarCodigoFornecedor(cprodFonte),
    };
}

/**
 * Campos a atualizar no CompraItem ao vincular (além de materialId).
 * Preenche EAN/cProd vazios no item quando a resolução trouxe valor.
 */
export function montarUpdateCompraItemVinculo(
    item: IdentificadoresItemCompra,
    materialId: string,
    resolvidos: { ean: string | null; codigoFornecedor: string | null }
): {
    materialId: string;
    ean?: string | null;
    codigoFornecedor?: string | null;
} {
    const data: {
        materialId: string;
        ean?: string | null;
        codigoFornecedor?: string | null;
    } = { materialId };

    const itemEan = normalizarEan(item.ean);
    const itemCprod = normalizarCodigoFornecedor(item.codigoFornecedor);

    if (!itemEan && resolvidos.ean) {
        data.ean = resolvidos.ean;
    }
    if (!itemCprod && resolvidos.codigoFornecedor) {
        data.codigoFornecedor = resolvidos.codigoFornecedor;
    }

    return data;
}
