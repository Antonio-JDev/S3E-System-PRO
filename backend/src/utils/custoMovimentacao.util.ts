/** Motivos de saída que compõem o CMV de materiais. */
export const MOTIVOS_CMV_SAIDA = ['OBRA', 'VENDA', 'Alocação para obra'] as const;

export function valorizarSaida(preco: number | null | undefined, quantidade: number): {
    custoUnitario: number;
    valorCusto: number;
} {
    const custoUnitario = Number(preco) || 0;
    const qtd = Number(quantidade) || 0;
    const valorCusto = Number((custoUnitario * qtd).toFixed(2));
    return { custoUnitario, valorCusto };
}

export function camposCustoMovimento(params: {
    preco?: number | null;
    quantidade: number;
    projetoId?: string | null;
    custoUnitario?: number | null;
    valorCusto?: number | null;
    custoRetroativo?: boolean;
}): {
    custoUnitario: number;
    valorCusto: number;
    custoRetroativo: boolean;
    projetoId?: string;
} {
    const base = params.valorCusto != null && params.custoUnitario != null
        ? { custoUnitario: Number(params.custoUnitario) || 0, valorCusto: Number(params.valorCusto) || 0 }
        : valorizarSaida(
            params.custoUnitario != null ? params.custoUnitario : params.preco,
            params.quantidade,
        );
    return {
        ...base,
        custoRetroativo: params.custoRetroativo ?? false,
        ...(params.projetoId ? { projetoId: params.projetoId } : {}),
    };
}
