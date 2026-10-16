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
type OrcamentoValorRef = Pick<Orcamento, 'precoVenda' | 'items' | 'valorVendaDireta'> | null | undefined;

function vendaDiretaDoOrcamento(orcamento: OrcamentoValorRef): number {
  if (orcamento?.items && orcamento.items.length > 0) {
    return sumVendaDireta(orcamento.items as OrcamentoItem[]);
  }
  return Number(orcamento?.valorVendaDireta) || 0;
}

export function calcularValorAReceberDoOrcamento(orcamento: OrcamentoValorRef): number {
  const totalCliente = Number(orcamento?.precoVenda) || 0;
  return roundMoney(Math.max(0, totalCliente - vendaDiretaDoOrcamento(orcamento)));
}

export function calcularValorVendaDiretaDoOrcamento(orcamento: OrcamentoValorRef): number {
  return roundMoney(vendaDiretaDoOrcamento(orcamento));
}

