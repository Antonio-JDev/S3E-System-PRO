/**
 * Máscaras para CPF e CNPJ.
 * Aceita apenas dígitos; formata conforme o tamanho (11 = CPF, 14 = CNPJ).
 */

export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Máscara apenas CPF (000.000.000-00), máx. 11 dígitos */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Telefone BR: (AA) NNNN-NNNN (fixo) ou (AA) NNNNN-NNNN (celular) */
export function maskTelefoneBr(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 8) {
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Aplica máscara CPF (000.000.000-00) ou CNPJ (00.000.000/0001-00) conforme quantidade de dígitos */
export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

/** Máscara CEP (00000-000) */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Máscara WhatsApp/telefone (00) 00000-0000 ou (00) 0000-0000 */
export function maskWhatsApp(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
