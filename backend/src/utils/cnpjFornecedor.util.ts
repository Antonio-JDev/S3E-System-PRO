/**
 * CNPJ/CPF de fornecedor: comparação e gravação só com dígitos.
 * CNPJ canônico tem 14 dígitos (zero à esquerda preservado). CPF permanece com 11.
 */

export type FornecedorCanonicoRef = {
  id: string;
  cnpj: string;
  createdAt: Date | string;
  /** Soma de compras, contas, materiais, cotações e aliases. */
  vinculos?: number;
};

export function somenteDigitos(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(Math.abs(value)).toString();
  }
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Chave de cadastro. CPF (11) não é completado. CNPJ com 12 ou 13 dígitos
 * (zero à esquerda perdido) é completado para 14.
 */
export function chaveDocumentoFornecedor(value: unknown): string {
  const digitos = somenteDigitos(value);
  if (!digitos) return '';
  if (digitos.length === 11 || digitos.length === 14) return digitos;
  if (digitos.length > 11 && digitos.length < 14) return digitos.padStart(14, '0');
  return digitos;
}

/**
 * CNPJ do emitente na NF-e. O parser numérico descarta zeros à esquerda;
 * o documento fiscal é sempre CNPJ de 14 dígitos.
 */
export function cnpjDeXml(value: unknown): string {
  const digitos = somenteDigitos(value);
  if (!digitos) return '';
  if (digitos.length > 14) return digitos.slice(-14);
  return digitos.padStart(14, '0');
}

export function mesmoCnpjFornecedor(a: unknown, b: unknown): boolean {
  const chaveA = chaveDocumentoFornecedor(a);
  const chaveB = chaveDocumentoFornecedor(b);
  return Boolean(chaveA) && chaveA === chaveB;
}

/** Gravado já na forma canônica (só dígitos, 11 ou 14). */
export function cnpjArmazenadoCanonico(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;
  return cnpj === chaveDocumentoFornecedor(cnpj) && (cnpj.length === 11 || cnpj.length === 14);
}

/**
 * Preferência: CNPJ já só com dígitos; depois quem tem mais vínculos;
 * empate no mais antigo (id estável como último critério).
 */
export function compararFornecedorCanonico(a: FornecedorCanonicoRef, b: FornecedorCanonicoRef): number {
  const aDigitos = cnpjArmazenadoCanonico(a.cnpj) ? 1 : 0;
  const bDigitos = cnpjArmazenadoCanonico(b.cnpj) ? 1 : 0;
  if (aDigitos !== bDigitos) return bDigitos - aDigitos;

  const aVinculos = a.vinculos ?? 0;
  const bVinculos = b.vinculos ?? 0;
  if (aVinculos !== bVinculos) return bVinculos - aVinculos;

  const aTempo = new Date(a.createdAt).getTime();
  const bTempo = new Date(b.createdAt).getTime();
  if (aTempo !== bTempo) return aTempo - bTempo;

  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

export function escolherFornecedorCanonico<T extends FornecedorCanonicoRef>(lista: T[]): T {
  if (lista.length === 0) {
    throw new Error('Nenhum fornecedor para escolher como canônico');
  }
  return [...lista].sort(compararFornecedorCanonico)[0];
}
