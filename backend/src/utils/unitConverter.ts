/**
 * Utilitário para conversão de unidades de medida e cálculo de preços
 * Suporta materiais que são comprados em uma unidade mas vendidos em outra
 */

export enum UnidadeMedida {
    METRO = 'm',
    CENTIMETRO = 'cm',
    KG_POR_METRO = 'kg/m',
    UNIDADE = 'un',
    QUILOGRAMA = 'kg',
    LITRO = 'l'
}

export enum TipoMaterial {
    BARRAMENTO_COBRE = 'BARRAMENTO_COBRE',
    TRILHO_DIN = 'TRILHO_DIN',
    CABO = 'CABO',
    PADRAO = 'PADRAO'
}

/**
 * Identifica o tipo de material baseado no nome
 */
export function identificarTipoMaterial(nomeProduto: string): TipoMaterial {
    if (!nomeProduto) return TipoMaterial.PADRAO;
    
    const nomeLower = nomeProduto.toLowerCase();
    
    // Barramentos de cobre
    if (nomeLower.includes('barramento') && (nomeLower.includes('cobre') || nomeLower.includes('cu'))) {
        return TipoMaterial.BARRAMENTO_COBRE;
    }
    
    // Trilhos DIN
    if (nomeLower.includes('trilho') && nomeLower.includes('din')) {
        return TipoMaterial.TRILHO_DIN;
    }
    
    // Cabos
    if (nomeLower.includes('cabo') || nomeLower.includes('fio')) {
        return TipoMaterial.CABO;
    }
    
    return TipoMaterial.PADRAO;
}

/**
 * Retorna a unidade de estoque padrão para cada tipo de material
 */
export function getUnidadeEstoque(tipoMaterial: TipoMaterial): string {
    switch (tipoMaterial) {
        case TipoMaterial.BARRAMENTO_COBRE:
            return UnidadeMedida.KG_POR_METRO;
        case TipoMaterial.TRILHO_DIN:
            return UnidadeMedida.METRO;
        case TipoMaterial.CABO:
            return UnidadeMedida.METRO;
        default:
            return UnidadeMedida.UNIDADE;
    }
}

/**
 * Retorna as unidades de venda disponíveis para cada tipo de material
 */
export function getUnidadesVendaDisponiveis(tipoMaterial: TipoMaterial): string[] {
    switch (tipoMaterial) {
        case TipoMaterial.BARRAMENTO_COBRE:
            return [UnidadeMedida.METRO, UnidadeMedida.CENTIMETRO];
        case TipoMaterial.TRILHO_DIN:
            return [UnidadeMedida.METRO, UnidadeMedida.CENTIMETRO];
        case TipoMaterial.CABO:
            return [UnidadeMedida.METRO];
        default:
            return [UnidadeMedida.UNIDADE];
    }
}

/**
 * Converte quantidade de uma unidade para outra
 * @param quantidade Quantidade a ser convertida
 * @param unidadeOrigem Unidade de origem
 * @param unidadeDestino Unidade de destino
 * @returns Quantidade convertida
 */
export function converterUnidade(
    quantidade: number,
    unidadeOrigem: string,
    unidadeDestino: string
): number {
    // Se as unidades são iguais, não precisa converter
    if (unidadeOrigem === unidadeDestino) {
        return quantidade;
    }
    
    // Conversões de comprimento
    if (unidadeOrigem === UnidadeMedida.METRO && unidadeDestino === UnidadeMedida.CENTIMETRO) {
        return quantidade * 100;
    }
    if (unidadeOrigem === UnidadeMedida.CENTIMETRO && unidadeDestino === UnidadeMedida.METRO) {
        return quantidade / 100;
    }
    
    // Se não houver conversão conhecida, retornar a quantidade original
    console.warn(`⚠️ Conversão não suportada: ${unidadeOrigem} -> ${unidadeDestino}`);
    return quantidade;
}

/**
 * Calcula o preço unitário para venda baseado na unidade selecionada
 * @param precoBase Preço base do material (custo de compra)
 * @param tipoMaterial Tipo do material
 * @param unidadeVenda Unidade em que será vendido
 * @param margemLucro Margem de lucro (padrão 40%)
 * @returns Preço unitário para a unidade de venda
 */
export function calcularPrecoVenda(
    precoBase: number,
    tipoMaterial: TipoMaterial,
    unidadeVenda: string,
    margemLucro: number = 0.40
): number {
    // Aplicar margem de lucro ao preço base
    const precoComMargem = precoBase * (1 + margemLucro);
    
    // Para barramentos e trilhos, ajustar o preço conforme a unidade de venda
    if (tipoMaterial === TipoMaterial.BARRAMENTO_COBRE || tipoMaterial === TipoMaterial.TRILHO_DIN) {
        if (unidadeVenda === UnidadeMedida.CENTIMETRO) {
            // Se vender em cm, dividir o preço por metro por 100
            return precoComMargem / 100;
        }
        // Se vender em metros, usar o preço com margem direto
        return precoComMargem;
    }
    
    // Para cabos e outros materiais, usar o preço com margem direto
    return precoComMargem;
}

/**
 * Calcula o valor total de um item no orçamento
 * @param precoBase Preço base do material
 * @param quantidade Quantidade solicitada
 * @param tipoMaterial Tipo do material
 * @param unidadeVenda Unidade de venda
 * @param margemLucro Margem de lucro
 * @returns Valor total do item
 */
export function calcularValorTotalItem(
    precoBase: number,
    quantidade: number,
    tipoMaterial: TipoMaterial,
    unidadeVenda: string,
    margemLucro: number = 0.40
): number {
    const precoUnitarioVenda = calcularPrecoVenda(precoBase, tipoMaterial, unidadeVenda, margemLucro);
    return precoUnitarioVenda * quantidade;
}

/**
 * Formata a unidade de medida para exibição
 */
export function formatarUnidade(unidade: string): string {
    const mapeamento: Record<string, string> = {
        [UnidadeMedida.METRO]: 'Metro(s)',
        [UnidadeMedida.CENTIMETRO]: 'Centímetro(s)',
        [UnidadeMedida.KG_POR_METRO]: 'Kg/m',
        [UnidadeMedida.UNIDADE]: 'Unidade(s)',
        [UnidadeMedida.QUILOGRAMA]: 'Kg',
        [UnidadeMedida.LITRO]: 'Litro(s)'
    };
    
    return mapeamento[unidade] || unidade;
}

/**
 * Valida se a conversão de unidade é permitida para o tipo de material
 */
export function isConversaoPermitida(
    tipoMaterial: TipoMaterial,
    unidadeVenda: string
): boolean {
    const unidadesPermitidas = getUnidadesVendaDisponiveis(tipoMaterial);
    return unidadesPermitidas.includes(unidadeVenda);
}

