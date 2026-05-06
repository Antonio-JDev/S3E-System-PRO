import type { Orcamento, OrcamentoItem } from '../services/orcamentosService';
import { roundMoney } from './currency';

function sumVendaDireta(items: OrcamentoItem[] | undefined | null): number {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    if (!item?.vendaDiretaFornecedor) return sum;
    return sum + (Number(item.subtotal) || 0);
  }, 0);
}

/**
 * Valor que efetivamente entra no PV/financeiro (contas a receber):
 * total do orçamento (precoVenda) menos a soma dos itens marcados como venda direta.
 */
export function calcularValorAReceberDoOrcamento(orcamento: Pick<Orcamento, 'precoVenda' | 'items'> | null | undefined): number {
  const totalCliente = Number(orcamento?.precoVenda) || 0;
  const vendaDireta = sumVendaDireta(orcamento?.items as any);
  return roundMoney(Math.max(0, totalCliente - vendaDireta));
}

export function calcularValorVendaDiretaDoOrcamento(orcamento: Pick<Orcamento, 'items'> | null | undefined): number {
  return roundMoney(sumVendaDireta(orcamento?.items as any));
}

