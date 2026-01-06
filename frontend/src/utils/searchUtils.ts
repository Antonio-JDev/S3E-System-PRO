/**
 * Função para realizar pesquisa cruzada usando separadores * ou %
 * 
 * Permite buscar itens que contenham múltiplos termos separados por * ou %.
 * Retorna true se TODOS os termos estiverem presentes no texto pesquisado.
 * 
 * @param searchTerm - Termo de busca que pode conter * ou % como separadores
 * @param text - Texto no qual buscar
 * @returns true se todos os termos estiverem presentes no texto (case-insensitive)
 * 
 * @example
 * matchCrossSearch("parafuso * 5 cm", "Parafuso Aço Inox 5 cm") // true
 * matchCrossSearch("abraçadeira % 4,6", "Abraçadeira Nylon 4,6") // true
 * matchCrossSearch("parafuso", "Parafuso") // true (busca normal)
 */
export function matchCrossSearch(searchTerm: string, text: string): boolean {
    if (!searchTerm || !text) {
        return false;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const textLower = text.toLowerCase();

    // Verifica se há separadores (* ou %)
    const hasSeparator = searchLower.includes('*') || searchLower.includes('%');

    if (!hasSeparator) {
        // Busca normal sem separadores
        return textLower.includes(searchLower);
    }

    // Divide pelos separadores (* ou %)
    // Usa regex para dividir por ambos os separadores
    const terms = searchLower.split(/[*%]/)
        .map(term => term.trim())
        .filter(term => term.length > 0); // Remove termos vazios

    if (terms.length === 0) {
        return false;
    }

    // Verifica se TODOS os termos estão presentes no texto
    return terms.every(term => textLower.includes(term));
}
