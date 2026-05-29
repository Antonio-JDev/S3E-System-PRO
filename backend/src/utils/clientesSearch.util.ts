/** Monta o `where` Prisma para listagem de clientes (GET /api/clientes). */
export function buildClientesWhereFromQuery(query: {
  ativo?: string;
  busca?: string;
  search?: string;
}): Record<string, unknown> {
  const buscaRaw = query.busca || query.search;
  const busca = typeof buscaRaw === 'string' ? buscaRaw.trim() : '';

  const where: Record<string, unknown> = {};
  if (query.ativo !== undefined) {
    where.ativo = query.ativo === 'true';
  }
  if (busca) {
    const or: Record<string, unknown>[] = [
      { nome: { contains: busca, mode: 'insensitive' } },
      { cpfCnpj: { contains: busca, mode: 'insensitive' } },
      { email: { contains: busca, mode: 'insensitive' } },
      { telefone: { contains: busca, mode: 'insensitive' } },
    ];
    const digits = busca.replace(/\D/g, '');
    if (digits.length >= 3) {
      or.push({ telefone: { contains: digits, mode: 'insensitive' } });
    }
    where.OR = or;
  }
  return where;
}
