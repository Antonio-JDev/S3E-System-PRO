/** Normaliza termo de busca de OS: remove espaços, hífens e prefixo "os". */
export function normalizarTermoBuscaOs(termo: string): string {
  return termo
    .trim()
    .toLowerCase()
    .replace(/^os[-\s]*/i, '')
    .replace(/[\s-]/g, '');
}

export interface ProjetoBuscaInput {
  id: string;
  titulo?: string | null;
  descricao?: string | null;
  orcamentoId?: string | null;
  orcamento?: { numeroSequencial?: number | null } | null;
  cliente?: { nome?: string | null } | null;
}

export interface OrcamentoBuscaFallback {
  id: string;
  numeroSequencial?: number | null;
}

/** Resolve número sequencial da OS a partir do projeto ou lista de orçamentos. */
export function resolverNumeroSequencialOs(
  projeto: ProjetoBuscaInput,
  orcamentos?: OrcamentoBuscaFallback[],
): number | null {
  if (projeto.orcamento?.numeroSequencial != null) {
    return projeto.orcamento.numeroSequencial;
  }
  if (projeto.orcamentoId && orcamentos?.length) {
    const orc = orcamentos.find((o) => o.id === projeto.orcamentoId);
    if (orc?.numeroSequencial != null) return orc.numeroSequencial;
  }
  return null;
}

/** Verifica se o projeto corresponde ao termo de busca (número OS, título, cliente, etc.). */
export function projetoMatchesBusca(
  projeto: ProjetoBuscaInput,
  termo: string,
  orcamentos?: OrcamentoBuscaFallback[],
): boolean {
  const raw = termo.trim();
  if (!raw) return true;

  const lower = raw.toLowerCase();
  const digitos = normalizarTermoBuscaOs(raw);

  const titulo = (projeto.titulo ?? '').toLowerCase();
  const descricao = (projeto.descricao ?? '').toLowerCase();
  const cliente = (projeto.cliente?.nome ?? '').toLowerCase();
  const id = (projeto.id ?? '').toLowerCase();

  if (titulo.includes(lower)) return true;
  if (descricao.includes(lower)) return true;
  if (cliente.includes(lower)) return true;
  if (id.includes(lower)) return true;

  const numero = resolverNumeroSequencialOs(projeto, orcamentos);
  if (numero != null && digitos) {
    const numStr = String(numero);
    if (numStr.includes(digitos)) return true;
    const labelOs = `os${numStr}`;
    if (labelOs.includes(digitos) || digitos.includes(numStr)) return true;
  }

  return false;
}
