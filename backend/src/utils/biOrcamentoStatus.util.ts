/** Status finais que contam como aprovados/vendidos no BI (alinhado ao módulo Orçamentos). */
export const ORCAMENTO_STATUS_APROVADOS = new Set(['Aprovado', 'Concretizado']);

/** Status que vão para a aba Declinados no frontend. */
export const ORCAMENTO_STATUS_DECLINADOS = new Set(['Recusado', 'Declinado', 'Cancelado']);

export type BucketOrcamentoBI = 'aprovados' | 'pendentes' | 'expirados' | 'declinados';

export function isOrcamentoAprovadoBI(status: string | null | undefined): boolean {
  return ORCAMENTO_STATUS_APROVADOS.has(status || '');
}

export function isOrcamentoDeclinadoBI(status: string | null | undefined): boolean {
  return ORCAMENTO_STATUS_DECLINADOS.has(status || '');
}

/**
 * Classifica orçamento para gráficos do BI — mesma lógica de Orcamentos.tsx.
 */
export function classificarOrcamentoBI(
  status: string | null | undefined,
  validade: Date | null | undefined,
  referencia: Date = new Date()
): BucketOrcamentoBI {
  const s = status || 'Pendente';

  if (isOrcamentoDeclinadoBI(s)) return 'declinados';
  if (isOrcamentoAprovadoBI(s)) return 'aprovados';

  if (validade) {
    const fimValidade = new Date(validade);
    fimValidade.setHours(23, 59, 59, 999);
    const hoje = new Date(referencia);
    hoje.setHours(23, 59, 59, 999);
    if (fimValidade < hoje) return 'expirados';
  }

  return 'pendentes';
}

/** Filtro padrão de vendas contábeis no BI (alinhado a resumo administrativo / DRE). */
export function whereVendasBI(dataInicio: Date, dataFim: Date) {
  return {
    dataVenda: { gte: dataInicio, lte: dataFim },
    status: { not: 'Cancelada' as const },
  };
}

/** CPV de uma linha de orçamento (exclui serviço/custo extra; MO 15% em quadros). */
export function calcularCpvLinhaItem(
  item: {
    tipo: string;
    quantidade?: number | null;
    custoUnit?: number | null;
    vendaDiretaFornecedor?: boolean | null;
  },
  maoObraPercentual = 0.15
): number {
  if (item.vendaDiretaFornecedor) return 0;
  if (item.tipo === 'SERVICO' || item.tipo === 'CUSTO_EXTRA') return 0;

  const qtd = item.quantidade || 0;
  let custo = qtd * (item.custoUnit || 0);
  if (item.tipo === 'QUADRO_PRONTO' && custo > 0) {
    custo += custo * maoObraPercentual;
  }
  return custo;
}
