export type OrcamentoCopyItem = {
    tipo: string;
    materialId?: string;
    kitId?: string;
    cotacaoId?: string;
    servicoNome?: string;

    nome: string;
    descricao?: string;
    ncm?: string;

    unidadeMedida: string;
    unidadeVenda?: string;
    tipoMaterial?: string;

    dataAtualizacaoCotacao?: string;

    quantidade: number;
    custoUnit: number;
    precoBase?: number;
    precoUnit: number;
    subtotal: number;

    itensDoKit?: any[];
    custoAgregadoUnit?: number;
    vendaDiretaFornecedor?: boolean;
    precoEditadoManual?: boolean;
};

/**
 * Normaliza os itens retornados pelo backend para o formato esperado pela `NovoOrcamentoPage`
 * quando o usuário usa "Copiar Orçamento".
 *
 * Observação: não inclui/propaga cliente (intencional).
 */
export function mapItensOrcamentoParaCopia(items: any[] | null | undefined): OrcamentoCopyItem[] {
    return (items || []).map((item: any) => ({
        tipo: item.tipo,
        materialId: item.materialId ?? undefined,
        kitId: item.kitId ?? undefined,
        cotacaoId: item.cotacaoId ?? undefined,
        servicoNome: item.servicoNome ?? undefined,

        // OrcamentoItem no banco não possui campo `nome`; muitas rotas retornam apenas `descricao`.
        // Por isso, priorizamos `descricao` antes dos relacionamentos para manter cópias estáveis.
        nome: item.nome ||
            item.descricao ||
            item.material?.nome ||
            item.kit?.nome ||
            item.cotacao?.nome ||
            item.servicoNome ||
            'Item sem nome',

        descricao: item.descricao ??
            item.material?.nome ??
            item.kit?.nome ??
            item.cotacao?.nome ??
            item.servicoNome ??
            item.nome ??
            '',

        // Inputs fiscais (NFe) na tela dependem de `ncm`.
        ncm: item.ncm ?? item.material?.ncm ?? item.cotacao?.ncm ?? undefined,

        // Algumas rotas do backend retornam `unidadeVenda` mas a UI trabalha com `unidadeMedida`.
        unidadeVenda: item.unidadeVenda ?? undefined,
        unidadeMedida: item.unidadeMedida ?? item.unidadeVenda ?? 'un',

        tipoMaterial: item.tipoMaterial ?? undefined,

        dataAtualizacaoCotacao: item.dataAtualizacaoCotacao ||
            item.cotacao?.dataAtualizacao ||
            item.cotacao?.updatedAt ||
            item.cotacao?.createdAt,

        quantidade: Number(item.quantidade) || 0,
        custoUnit: Number(item.custoUnit) || 0,
        precoBase: item.precoBase ?? undefined,
        precoUnit: Number(item.precoUnit) || 0,
        subtotal: Number(item.subtotal) || 0,

        // Kit unificado (sem kitId) salva composição em `itensDoKit`.
        itensDoKit: item.itensDoKit ?? undefined,
        custoAgregadoUnit: item.custoAgregadoUnit ?? undefined,

        // Compatibilidade para itens que entram/saem de regras financeiras/estoque.
        vendaDiretaFornecedor: item.vendaDiretaFornecedor ?? undefined,

        precoEditadoManual: item.precoEditadoManual ?? undefined,
    }));
}

