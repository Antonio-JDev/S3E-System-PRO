import { calcValorARegistrar } from './financeiroValor';

export type ContaReceberAuditoria = {
  id?: string;
  numeroParcela?: number | null;
  descricao?: string | null;
  valorParcela?: number;
  valor?: number;
  valorRecebido?: number | null;
  valorJuros?: number | null;
  valorDesconto?: number | null;
  dataVencimento?: string | Date;
  dataPagamento?: string | Date | null;
  status?: string;
  recebimentosParciais?: Array<{
    id?: string;
    valorPago?: number;
    valorJuros?: number | null;
    valorDesconto?: number | null;
    dataPagamento?: string | Date;
    meioPagamento?: string | null;
    observacoes?: string | null;
  }>;
};

export function totalCaixaConta(conta: ContaReceberAuditoria): number {
  const principal = Number(conta.valorRecebido ?? 0);
  if (principal <= 0) return 0;
  return calcValorARegistrar(principal, conta.valorJuros ?? 0, conta.valorDesconto ?? 0);
}

export function totalJurosVenda(contas: ContaReceberAuditoria[]): number {
  return contas.reduce((s, c) => s + Number(c.valorJuros ?? 0), 0);
}
