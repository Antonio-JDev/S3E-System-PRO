/**
 * Utilitários para manipulação de strings
 */

/**
 * Normaliza um nome de produto para comparação exata
 * Remove acentos, caracteres especiais, espaços duplos e converte para maiúsculo
 * 
 * Exemplos:
 * - 'ABRACADEIRA - PRETA' → 'ABRACADEIRA PRETA'
 * - 'abracadeira preta' → 'ABRACADEIRA PRETA'
 * - 'ABRACADEIRA NYLON 4,8 X 300MM PRETA - CENTO' → 'ABRACADEIRA NYLON 4 8 X 300MM PRETA CENTO'
 * - 'ABRACADEIRA NYLON 4,8 X 300MM PRETA - CENTO - SIBRATEC' → 'ABRACADEIRA NYLON 4 8 X 300MM PRETA CENTO SIBRATEC'
 * 
 * @param nome - Nome do produto a ser normalizado
 * @returns Nome normalizado (sem acentos, sem caracteres especiais, espaços normalizados, maiúsculo)
 */
export function normalizarNomeProduto(nome: string): string {
    if (!nome) return '';
    
    // Remover acentos
    let normalizado = nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    // Converter caracteres especiais (hífens, pontos, vírgulas, parênteses, etc.) em espaços
    normalizado = normalizado.replace(/[^\w\s]/g, ' ');
    
    // Remover espaços duplos ou múltiplos e normalizar para um único espaço
    normalizado = normalizado.replace(/\s+/g, ' ').trim();
    
    // Converter tudo para maiúsculo
    normalizado = normalizado.toUpperCase();
    
    return normalizado;
}

/**
 * Compara dois nomes de produtos usando normalização
 * Retorna true se os nomes normalizados forem exatamente iguais
 * 
 * @param nome1 - Primeiro nome a comparar
 * @param nome2 - Segundo nome a comparar
 * @returns true se os nomes normalizados forem iguais, false caso contrário
 */
export function compararNomesProdutos(nome1: string, nome2: string): boolean {
    const nome1Normalizado = normalizarNomeProduto(nome1);
    const nome2Normalizado = normalizarNomeProduto(nome2);
    return nome1Normalizado === nome2Normalizado;
}
