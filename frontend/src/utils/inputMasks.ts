/** Formata CNPJ: 00.000.000/0000-00 */
export function formatCNPJ(value: string): string {
    const n = value.replace(/\D/g, '').slice(0, 14);
    if (n.length <= 2) return n;
    if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
    if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
    if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
    return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

export function onlyDigits(s: string): string {
    return (s || '').replace(/\D/g, '');
}

/** Telefone BR: (00) 00000-0000 ou (00) 0000-0000 */
export function formatTelefoneBR(value: string): string {
    const numeros = value.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 2) {
        return numeros.length > 0 ? `(${numeros}` : '';
    }
    if (numeros.length <= 6) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }
    if (numeros.length <= 10) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}
