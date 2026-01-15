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
    
    // Excluir blocos de distribuição modular - eles NÃO são barramentos
    if (nomeLower.includes('bloco de distribuicao modular')) {
        return TipoMaterial.PADRAO;
    }
    
    // Barramentos DIN (1, 2 ou 3 polos) - devem ter opção de metros/cm
    // Exemplos: "BARRAMENTO DIN 3 POLOS", "BARRAMENTO DIN 1 POLO", "BARRAMENTO DIN 2 POLOS"
    if (nomeLower.includes('barramento') && nomeLower.includes('din')) {
        // Verificar se é realmente um barramento DIN (não um bloco)
        const temPolos = nomeLower.includes('polo') || nomeLower.includes('polos');
        if (temPolos) {
            return TipoMaterial.TRILHO_DIN;
        }
    }
    
    // Barramentos de cobre (que contêm "BARRAMENTO COBRE" ou similar)
    if (nomeLower.includes('barramento') && (nomeLower.includes('cobre') || nomeLower.includes('cu'))) {
        return TipoMaterial.BARRAMENTO_COBRE;
    }
    
    // Barramentos genéricos (qualquer item com "barramento" no nome)
    // Isso inclui "barramento" e "barramento cobre" conforme solicitado pelo usuário
    if (nomeLower.includes('barramento')) {
        return TipoMaterial.BARRAMENTO_COBRE;
    }
    
    // Trilhos DIN (sem a palavra "barramento")
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
 * Verifica se um material pode ser vendido em metros ou centímetros
 * Baseado na unidade de medida cadastrada no estoque (M ou KG/M)
 * ATUALIZADO: Agora verifica pela unidade de cálculo cadastrada no produto
 */
export function podeVenderEmMetroOuCm(unidadeMedida: string | undefined | null): boolean {
    if (!unidadeMedida) return false;
    const unidadeUpper = unidadeMedida.toUpperCase().trim();
    // Permite venda em M/cm apenas se a unidade de medida for M, KG/M, M/KG, METRO ou METROS
    // Se for unidade (un), não permite venda em M/cm
    return (unidadeUpper === 'M' || 
            unidadeUpper === 'KG/M' || 
            unidadeUpper === 'M/KG' || 
            unidadeUpper === 'METRO' || 
            unidadeUpper === 'METROS') &&
           unidadeUpper !== 'UN' && 
           unidadeUpper !== 'UNIDADE' && 
           unidadeUpper !== 'UNIDADES';
}

/**
 * Retorna as unidades de venda disponíveis para cada tipo de material
 * ATUALIZADO: Agora verifica a unidade de medida do estoque (unidade de cálculo) em vez de apenas o nome
 */
export function getUnidadesVendaDisponiveis(tipoMaterial: TipoMaterial, unidadeMedidaEstoque?: string | null): Array<{value: string, label: string}> {
    // Se a unidade de medida do estoque for M ou M/Kg, permitir venda em M/cm
    if (podeVenderEmMetroOuCm(unidadeMedidaEstoque)) {
        return [
            { value: UnidadeMedida.METRO, label: 'Metro(s)' },
            { value: UnidadeMedida.CENTIMETRO, label: 'Centímetro(s)' }
        ];
    }
    
    // Se a unidade for unidade (un), retornar apenas unidade
    if (unidadeMedidaEstoque) {
        const unidadeUpper = unidadeMedidaEstoque.toUpperCase().trim();
        if (unidadeUpper === 'UN' || unidadeUpper === 'UNIDADE' || unidadeUpper === 'UNIDADES') {
            return [
                { value: UnidadeMedida.UNIDADE, label: 'Unidade(s)' }
            ];
        }
    }
    
    // Para manter compatibilidade com a lógica antiga (baseada em nome) por enquanto
    switch (tipoMaterial) {
        case TipoMaterial.CABO:
            return [
                { value: UnidadeMedida.METRO, label: 'Metro(s)' }
            ];
        default:
            return [
                { value: UnidadeMedida.UNIDADE, label: 'Unidade(s)' }
            ];
    }
}

/**
 * Converte quantidade de uma unidade para outra
 */
export function converterUnidade(
    quantidade: number,
    unidadeOrigem: string,
    unidadeDestino: string
): number {
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
    
    console.warn(`⚠️ Conversão não suportada: ${unidadeOrigem} -> ${unidadeDestino}`);
    return quantidade;
}

/**
 * Calcula o preço unitário para venda baseado na unidade selecionada
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
        [UnidadeMedida.METRO]: 'm',
        [UnidadeMedida.CENTIMETRO]: 'cm',
        [UnidadeMedida.KG_POR_METRO]: 'kg/m',
        [UnidadeMedida.UNIDADE]: 'un',
        [UnidadeMedida.QUILOGRAMA]: 'kg',
        [UnidadeMedida.LITRO]: 'l'
    };
    
    return mapeamento[unidade] || unidade;
}

/**
 * Formata a unidade de medida para exibição no orçamento
 * Mostra "metros" quando for 'm' e "CM" quando for 'cm' para informação coesa
 */
export function formatarUnidadeOrcamento(unidade: string | undefined | null): string {
    if (!unidade) return 'un';
    
    const unidadeLower = unidade.toLowerCase().trim();
    
    // Para metros, mostrar "metros"
    if (unidadeLower === 'm' || unidadeLower === 'metro' || unidadeLower === 'metros') {
        return 'metros';
    }
    
    // Para centímetros, mostrar "CM"
    if (unidadeLower === 'cm' || unidadeLower === 'centimetro' || unidadeLower === 'centimetros') {
        return 'CM';
    }
    
    // Para outras unidades, usar formatação padrão
    return formatarUnidade(unidade);
}

/**
 * Valida se a conversão de unidade é permitida para o tipo de material
 */
export function isConversaoPermitida(
    tipoMaterial: TipoMaterial,
    unidadeVenda: string
): boolean {
    const unidadesPermitidas = getUnidadesVendaDisponiveis(tipoMaterial);
    return unidadesPermitidas.some(u => u.value === unidadeVenda);
}

/**
 * Retorna se o material suporta seleção de unidade de venda
 * ATUALIZADO: Agora verifica pela unidade de medida cadastrada no produto
 */
export function suportaSelecaoUnidade(tipoMaterial: TipoMaterial, unidadeMedidaEstoque?: string | null): boolean {
    // Se a unidade de medida for M ou M/Kg, suporta seleção M/cm
    if (podeVenderEmMetroOuCm(unidadeMedidaEstoque)) {
        return true;
    }
    
    // Para manter compatibilidade com a lógica antiga (baseada em nome) por enquanto
    return tipoMaterial === TipoMaterial.BARRAMENTO_COBRE || 
           tipoMaterial === TipoMaterial.TRILHO_DIN ||
           tipoMaterial === TipoMaterial.CABO;
}

