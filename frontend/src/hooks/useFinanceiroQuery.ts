import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financeiroService } from '../services/financeiroService';
import { vendasService } from '../services/vendasService';

export const FINANCEIRO_CONTAS_RECEBER_QUERY_KEY = ['financeiro', 'contas-a-receber'] as const;
export const FINANCEIRO_CONTAS_PAGAR_QUERY_KEY = ['financeiro', 'contas-a-pagar'] as const;
export const FINANCEIRO_RESUMO_QUERY_KEY = ['financeiro', 'resumo'] as const;
export const FINANCEIRO_MOVIMENTACOES_CAIXA_QUERY_KEY = ['financeiro', 'movimentacoes-caixa'] as const;
export const FINANCEIRO_CARTOES_QUERY_KEY = ['financeiro', 'cartoes'] as const;
export const VENDAS_LISTA_QUERY_KEY = ['vendas', 'lista'] as const;

export type ContaReceberListaItem = {
  id: string;
  vendaId?: string;
  contaManual: boolean;
  tipoManual: string;
  pagadorNome?: string;
  numeroParcela: number;
  isEntrada: boolean;
  numeroDuplicata: string;
  numeroVenda: string;
  numeroSequencialVenda: number | null;
  numeroOS: number | null;
  clienteNome: string;
  projetoTitulo: string;
  dataVencimento: string;
  valor: number;
  valorJuros: number;
  valorDesconto: number;
  valorRecebido?: number;
  dataPagamento?: string;
  status: string;
  observacoes?: string;
  venda?: unknown;
  totalParcelas: number;
};

export type ContaPagarListaItem = {
  id: string;
  compraId?: string;
  despesaFixaId?: string;
  fornecedorId?: string;
  fornecedorNome: string;
  numeroParcela: number;
  descricao: string;
  dataVencimento: string;
  dataAgendamento?: string;
  valor: number;
  valorJuros: number;
  valorDesconto: number;
  valorPago?: number;
  dataPagamento?: string;
  status: string;
  observacoes?: string;
  tipo: string;
  funcionario?: unknown;
  compra?: unknown;
  despesaFixa?: unknown;
  meioPagamento?: string | null;
  cartaoCreditoId?: string | null;
};

export async function fetchContasReceberLista(): Promise<ContaReceberListaItem[]> {
  const vendasRes = await vendasService.listarVendas({ limit: 1000 });
  const vendasList = (vendasRes.success && vendasRes.data?.vendas) ? vendasRes.data.vendas : [];
  const vendasOrdenadas = [...vendasList].sort((a: any, b: any) => {
    const dataA = new Date(a.dataVenda || a.createdAt || 0).getTime();
    const dataB = new Date(b.dataVenda || b.createdAt || 0).getTime();
    return dataA - dataB;
  });

  const response = await financeiroService.listarContasReceber();
  if (!response.success || !response.data) return [];

  return response.data.map((conta: any) => {
    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';
    const venda = conta.venda || {};
    const orcamento = venda.orcamento || {};
    const cliente = conta.clientePagador || conta.cliente || venda.cliente || orcamento.cliente || {};
    const clienteNome = cliente?.nome ?? conta.pagadorNome ?? 'Cliente não informado';
    const vendaId = conta.vendaId || venda.id;
    const numeroSequencialVenda =
      venda?.numeroSequencial != null
        ? venda.numeroSequencial
        : vendaId
          ? (() => {
              const indiceVenda = vendasOrdenadas.findIndex((v: any) => v.id === vendaId);
              return indiceVenda >= 0 ? indiceVenda + 1 : null;
            })()
          : null;
    const isEntrada =
      conta.tipo === 'ENTRADA' || conta.numeroParcela === 0 || conta.descricao?.includes('Entrada');
    const numeroParcela = conta.numeroParcela ?? 1;

    return {
      id: conta.id,
      vendaId: vendaId || undefined,
      contaManual: !vendaId,
      tipoManual: conta.tipo === 'OUTRAS_RECEITAS' ? 'OUTRAS_RECEITAS' : 'ENTRADA',
      pagadorNome: conta.pagadorNome || undefined,
      numeroParcela,
      isEntrada,
      numeroDuplicata: isEntrada ? 'ENTRADA' : `DUP-${numeroParcela.toString().padStart(3, '0')}`,
      numeroVenda: venda.numeroVenda || (conta.tipo !== 'VENDA' ? conta.tipo : 'N/A'),
      numeroSequencialVenda,
      numeroOS: orcamento.numeroSequencial || null,
      clienteNome,
      projetoTitulo: conta.descricao || orcamento.titulo || 'Projeto',
      dataVencimento: conta.dataVencimento,
      valor: conta.valorParcela || conta.valor || 0,
      valorJuros: conta.valorJuros ?? 0,
      valorDesconto: conta.valorDesconto ?? 0,
      valorRecebido: conta.valorRecebido ?? (conta.status === 'Pago' ? conta.valorParcela : undefined),
      dataPagamento: conta.dataPagamento,
      status: isAtrasada
        ? 'Atrasado'
        : conta.status === 'Pago'
          ? 'Recebido'
          : conta.status === 'Recebido Parcial'
            ? 'Recebido Parcial'
            : conta.status,
      observacoes: conta.observacoes,
      venda: conta.venda,
      totalParcelas: conta.totalParcelas || venda.parcelas || 1,
    };
  });
}

function nomeColaboradorContaRh(conta: {
  funcionario?: { nome?: string } | null;
  descricao?: string;
}): string | null {
  const n = conta.funcionario?.nome?.trim();
  if (n) return n;
  const d = (conta.descricao || '').trim();
  const m = d.match(/^Salário\s+(.+?)\s*-\s*\d{4}-\d{2}/i);
  return m ? m[1].trim() : null;
}

export async function fetchContasPagarLista(): Promise<ContaPagarListaItem[]> {
  const response = await financeiroService.listarContasPagar();
  if (!response.success || !response.data) return [];

  return response.data.map((conta: any) => {
    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';
    const tipoConta = (conta.tipo || 'FORNECEDOR') as string;
    const rawCredor = (conta.fornecedorNome || conta.fornecedor?.nome || conta.credorNome || '').trim();
    const nomeColabRh = tipoConta === 'RH' ? nomeColaboradorContaRh(conta) : null;
    const fornecedorNome =
      tipoConta === 'RH'
        ? nomeColabRh
          ? `Pagamento Colaborador ${nomeColabRh}`
          : 'Pagamento Colaborador'
        : tipoConta === 'FROTA'
          ? rawCredor || 'Veículo'
          : rawCredor || 'Fornecedor não informado';

    return {
      id: conta.id,
      compraId: conta.compraId,
      despesaFixaId: conta.despesaFixaId,
      fornecedorId: conta.fornecedorId,
      fornecedorNome,
      numeroParcela: conta.numeroParcela || 1,
      descricao: conta.descricao || `Parcela ${conta.numeroParcela || 1}`,
      dataVencimento: conta.dataVencimento,
      dataAgendamento: conta.dataAgendamento,
      valor: conta.valorParcela || conta.valor || 0,
      valorJuros: conta.valorJuros ?? 0,
      valorDesconto: conta.valorDesconto ?? 0,
      valorPago: conta.valorPago,
      dataPagamento: conta.dataPagamento,
      status: isAtrasada ? 'Atrasado' : conta.status,
      observacoes: conta.observacoes,
      tipo: tipoConta,
      funcionario: conta.funcionario ?? null,
      compra: conta.compra,
      despesaFixa: conta.despesaFixa,
      meioPagamento: conta.meioPagamento || null,
      cartaoCreditoId: conta.cartaoCreditoId || null,
    };
  });
}

export function useContasReceberLista() {
  return useQuery({
    queryKey: FINANCEIRO_CONTAS_RECEBER_QUERY_KEY,
    queryFn: fetchContasReceberLista,
  });
}

export function useContasPagarLista() {
  return useQuery({
    queryKey: FINANCEIRO_CONTAS_PAGAR_QUERY_KEY,
    queryFn: fetchContasPagarLista,
  });
}

export function useInvalidateContasReceberLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FINANCEIRO_CONTAS_RECEBER_QUERY_KEY });
}

export function useInvalidateContasPagarLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FINANCEIRO_CONTAS_PAGAR_QUERY_KEY });
}

export async function fetchFinanceiroResumo() {
  const res = await financeiroService.getResumo();
  if (!res.success) throw new Error(res.error || 'Erro ao carregar resumo financeiro');
  return res.data;
}

export function useFinanceiroResumo() {
  return useQuery({
    queryKey: FINANCEIRO_RESUMO_QUERY_KEY,
    queryFn: fetchFinanceiroResumo,
  });
}

export async function fetchMovimentacoesCaixa(filtros?: {
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
  busca?: string;
}) {
  const res = await financeiroService.listarMovimentacoesCaixa(filtros);
  if (!res.success || !res.data) {
    return { movimentacoes: [], resumo: null as null };
  }
  return {
    movimentacoes: res.data.movimentacoes ?? [],
    resumo: res.data.resumo ?? null,
  };
}

export function useMovimentacoesCaixa(filtros?: {
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
  busca?: string;
}) {
  return useQuery({
    queryKey: [...FINANCEIRO_MOVIMENTACOES_CAIXA_QUERY_KEY, filtros ?? {}] as const,
    queryFn: () => fetchMovimentacoesCaixa(filtros),
  });
}

export async function fetchCartoesCredito(ativo?: boolean) {
  const res = await financeiroService.listarCartoes(ativo);
  if (!res.success) return [];
  return Array.isArray(res.data) ? res.data : [];
}

export function useCartoesCredito(ativo?: boolean) {
  return useQuery({
    queryKey: [...FINANCEIRO_CARTOES_QUERY_KEY, ativo ?? 'all'] as const,
    queryFn: () => fetchCartoesCredito(ativo),
  });
}

export async function fetchVendasLista(params?: Parameters<typeof vendasService.listarVendas>[0]) {
  const res = await vendasService.listarVendas(params);
  if (!res.success || !res.data) return [];
  const data = res.data as { vendas?: unknown[] } | unknown[];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.vendas) ? data.vendas : [];
}

export function useVendasLista(params?: Parameters<typeof vendasService.listarVendas>[0]) {
  return useQuery({
    queryKey: [...VENDAS_LISTA_QUERY_KEY, params ?? {}] as const,
    queryFn: () => fetchVendasLista(params),
  });
}

export function useInvalidateVendasLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: VENDAS_LISTA_QUERY_KEY });
}

export function useInvalidateFinanceiroExtra() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: FINANCEIRO_RESUMO_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: FINANCEIRO_MOVIMENTACOES_CAIXA_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: FINANCEIRO_CARTOES_QUERY_KEY });
  };
}
