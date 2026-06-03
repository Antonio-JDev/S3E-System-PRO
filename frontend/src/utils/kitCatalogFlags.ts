/** Indica se o kit possui itens de cotação (banco frio), excluindo serviços em itensFaltantes. */
export function kitTemCotacaoBancoFrio(kit: {
  temItensCotacao?: boolean;
  itensFaltantes?: unknown;
}): boolean {
  const extras = parseItensFaltantesKit(kit.itensFaltantes);
  if (extras.some((i) => String(i?.tipo || 'COTACAO').toUpperCase() === 'COTACAO')) {
    return true;
  }
  return false;
}

export function parseItensFaltantesKit(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}
