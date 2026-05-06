/**
 * Utilidades para manipulação de datas
 * Corrige problemas de timezone do JavaScript
 */

/**
 * Converte string de data em Date local (sem problema de timezone)
 * 
 * Problema: new Date('2025-10-23') interpreta como UTC 00:00
 * No Brasil (UTC-3), vira 2025-10-22 21:00 (1 dia antes!)
 * 
 * Solução: Criar data no timezone local
 * 
 * @param dateString - String no formato YYYY-MM-DD ou ISO
 * @returns Date object no timezone local
 */
export function parseLocalDate(dateString: string | Date): Date {
    // Se já é Date, retornar
    if (dateString instanceof Date) {
        return dateString;
    }

    // Se a string já tem hora (formato ISO completo), usar Date normal
    if (dateString.includes('T') || dateString.includes(' ')) {
        return new Date(dateString);
    }

    // Para strings no formato YYYY-MM-DD, criar data local
    const [ano, mes, dia] = dateString.split('-').map(Number);
    
    // Criar data local (sem conversão de timezone)
    // Mês é 0-indexed no JavaScript (0 = Janeiro)
    // Usar meio-dia para evitar problemas de DST
    const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    
    return data;
}

/**
 * Formata data para exibição no formato brasileiro (DD/MM/YYYY)
 * Corrige o problema de timezone
 * 
 * @param dateString - String ou Date
 * @returns String formatada DD/MM/YYYY
 */
export function formatDateBR(dateString: string | Date): string {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('pt-BR');
}

/**
 * Formata data para input type="date" (YYYY-MM-DD)
 * 
 * @param date - Date object
 * @returns String no formato YYYY-MM-DD
 */
export function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data é válida
 * 
 * @param dateString - String de data
 * @returns true se válida, false caso contrário
 */
export function isValidDate(dateString: string): boolean {
    const date = parseLocalDate(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}
