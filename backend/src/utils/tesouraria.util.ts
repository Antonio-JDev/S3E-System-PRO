/** Classificação de movimento entre contas da empresa. Não é receita nem despesa. */
export const CLASSIFICACAO_TRANSFERENCIA = 'TRANSFERENCIA';

export function ehTransferenciaTesouraria(classificacao?: string | null): boolean {
  return (classificacao || '').trim().toUpperCase() === CLASSIFICACAO_TRANSFERENCIA;
}

/** Recebimento de cliente (venda, entrada, outras receitas) entra. Transferência entre bancos não. */
export function entraComoReceita(classificacao?: string | null): boolean {
  return !ehTransferenciaTesouraria(classificacao);
}

type LancamentoCaixa = {
  tipo: string;
  valor: number;
  classificacao?: string | null;
};

export function somarReceitaOperacional(itens: LancamentoCaixa[]): number {
  return itens
    .filter((item) => item.tipo === 'ENTRADA' && entraComoReceita(item.classificacao))
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
}

export function somarDespesaOperacional(itens: LancamentoCaixa[]): number {
  return itens
    .filter((item) => item.tipo === 'SAIDA' && entraComoReceita(item.classificacao))
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
}

/** Receita operacional menos despesa operacional. O par da transferência soma zero. */
export function impactoNoResultado(itens: LancamentoCaixa[]): number {
  return somarReceitaOperacional(itens) - somarDespesaOperacional(itens);
}

export type MovimentoExtratoConta = {
  id: string;
  data: Date | string;
  tipo: string;
  valor: number;
  descricao: string;
  contraparte?: string | null;
};

export type LinhaExtratoConta = {
  id: string;
  data: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  descricao: string;
  contraparte: string | null;
  saldo: number;
};

function arredondar(valor: number): number {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function sinalMovimento(tipo: string): number {
  return String(tipo).toUpperCase() === 'SAIDA' ? -1 : 1;
}

/** Extrato de uma conta: saldo anterior ao período, lançamentos e saldo final. */
export function montarExtratoConta(params: {
  saldoInicial: number;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  movimentacoes: MovimentoExtratoConta[];
}): { saldoAnterior: number; saldoFinal: number; linhas: LinhaExtratoConta[] } {
  const inicio = params.dataInicio ? new Date(params.dataInicio).getTime() : null;
  const fim = params.dataFim ? new Date(params.dataFim).getTime() : null;
  const ordenadas = [...params.movimentacoes].sort((a, b) => {
    const delta = new Date(a.data).getTime() - new Date(b.data).getTime();
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });

  let saldo = arredondar(params.saldoInicial);
  const linhas: LinhaExtratoConta[] = [];
  for (const movimento of ordenadas) {
    const quando = new Date(movimento.data).getTime();
    if (fim !== null && quando > fim) continue;
    const tipo = String(movimento.tipo).toUpperCase() === 'SAIDA' ? 'SAIDA' : 'ENTRADA';
    const valor = arredondar(Math.abs(Number(movimento.valor) || 0));
    saldo = arredondar(saldo + sinalMovimento(tipo) * valor);
    if (inicio !== null && quando < inicio) continue;
    linhas.push({
      id: movimento.id,
      data: new Date(movimento.data).toISOString(),
      tipo,
      valor,
      descricao: movimento.descricao,
      contraparte: movimento.contraparte ?? null,
      saldo,
    });
  }

  const saldoAnterior = linhas.length
    ? arredondar(linhas[0].saldo - sinalMovimento(linhas[0].tipo) * linhas[0].valor)
    : saldo;

  return { saldoAnterior, saldoFinal: saldo, linhas };
}

export function saldoContaBancaria(params: {
  saldoInicial: number;
  movimentacoes: Array<{ tipo: string; valor: number }>;
}): number {
  const entradas = params.movimentacoes
    .filter((item) => item.tipo === 'ENTRADA')
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
  const saidas = params.movimentacoes
    .filter((item) => item.tipo === 'SAIDA')
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
  return (Number(params.saldoInicial) || 0) + entradas - saidas;
}
