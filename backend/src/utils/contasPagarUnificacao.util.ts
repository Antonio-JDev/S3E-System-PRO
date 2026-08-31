/**
 * Regras e helpers puros para unificação de contas a pagar.
 */

export type ContaParaUnificacao = {
  id: string;
  status: string;
  tipo?: string | null;
  fornecedorId?: string | null;
  credorNome?: string | null;
  compraId?: string | null;
  descricao?: string | null;
  valorParcela: number;
  dataVencimento: Date | string;
  meioPagamento?: string | null;
  cartaoCreditoId?: string | null;
  faturaCartaoId?: string | null;
  despesaFixaId?: string | null;
  funcionarioId?: string | null;
  compra?: { id?: string; numeroNF?: string | null } | null;
  fornecedor?: { id?: string; nome?: string | null } | null;
};

export type MotivoSugestao = 'MESMA_NOTA' | 'MESMO_FORNECEDOR' | 'VENCIMENTO_PROXIMO';

export type SugestaoUnificacao = {
  contaId: string;
  motivos: MotivoSugestao[];
  score: number;
  detalhe: string;
};

const STATUS_ELEGIVEIS = new Set(['Pendente', 'Atrasado']);

export function diasEntreDatas(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function parseDataConta(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(valor);
}

export function isContaElegivelParaUnificacao(conta: ContaParaUnificacao): { ok: boolean; motivo?: string } {
  if (!STATUS_ELEGIVEIS.has(conta.status)) {
    return { ok: false, motivo: `Conta ${conta.id} não está em aberto (status: ${conta.status})` };
  }
  if (conta.faturaCartaoId) {
    return { ok: false, motivo: `Conta ${conta.id} já está vinculada a fatura de cartão` };
  }
  if (conta.meioPagamento === 'CARTAO_CREDITO' || conta.cartaoCreditoId) {
    return { ok: false, motivo: `Conta ${conta.id} é lançamento de cartão de crédito` };
  }
  if ((conta.tipo || 'FORNECEDOR') !== 'FORNECEDOR') {
    return { ok: false, motivo: `Conta ${conta.id} não é do tipo FORNECEDOR (unificação disponível apenas para fornecedor)` };
  }
  if (conta.despesaFixaId || conta.funcionarioId) {
    return { ok: false, motivo: `Conta ${conta.id} possui origem RH/despesa fixa e não pode ser unificada` };
  }
  if (!(Number(conta.valorParcela) > 0)) {
    return { ok: false, motivo: `Conta ${conta.id} possui valor inválido` };
  }
  return { ok: true };
}

export function validarSelecaoUnificacao(contas: ContaParaUnificacao[]): {
  ok: boolean;
  motivo?: string;
  valorTotal: number;
  fornecedorId: string | null;
  credorNome: string | null;
  compraId: string | null;
  compraIds: string[];
  numerosNF: string[];
} {
  const valorTotalZerado = {
    ok: false as const,
    valorTotal: 0,
    fornecedorId: null,
    credorNome: null,
    compraId: null,
    compraIds: [] as string[],
    numerosNF: [] as string[],
  };

  if (!contas || contas.length < 2) {
    return { ...valorTotalZerado, motivo: 'Selecione ao menos 2 contas para unificar' };
  }

  const ids = new Set(contas.map((c) => c.id));
  if (ids.size !== contas.length) {
    return { ...valorTotalZerado, motivo: 'Há contas duplicadas na seleção' };
  }

  for (const conta of contas) {
    const eleg = isContaElegivelParaUnificacao(conta);
    if (!eleg.ok) {
      return { ...valorTotalZerado, motivo: eleg.motivo };
    }
  }

  const fornecedorIds = Array.from(
    new Set(contas.map((c) => c.fornecedorId).filter((id): id is string => Boolean(id)))
  );
  if (fornecedorIds.length > 1) {
    return { ...valorTotalZerado, motivo: 'As contas selecionadas devem ser do mesmo fornecedor' };
  }

  const credores = Array.from(
    new Set(
      contas
        .map((c) => (c.credorNome || c.fornecedor?.nome || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (!fornecedorIds.length && credores.length > 1) {
    return { ...valorTotalZerado, motivo: 'As contas selecionadas devem ser do mesmo credor/fornecedor' };
  }

  const compraIds = Array.from(
    new Set(contas.map((c) => c.compraId).filter((id): id is string => Boolean(id)))
  );
  const numerosNF = Array.from(
    new Set(
      contas
        .map((c) => (c.compra?.numeroNF || '').trim())
        .filter(Boolean)
    )
  );

  const valorTotal = Math.round(
    contas.reduce((acc, c) => acc + Number(c.valorParcela || 0), 0) * 100
  ) / 100;

  const credorNome =
    contas.find((c) => c.credorNome?.trim())?.credorNome?.trim() ||
    contas.find((c) => c.fornecedor?.nome?.trim())?.fornecedor?.nome?.trim() ||
    null;

  return {
    ok: true,
    valorTotal,
    fornecedorId: fornecedorIds[0] || null,
    credorNome,
    compraId: compraIds.length === 1 ? compraIds[0] : null,
    compraIds,
    numerosNF,
  };
}

export function calcularValoresParcelas(valorTotal: number, parcelas: number): number[] {
  if (parcelas < 1) throw new Error('Número de parcelas deve ser pelo menos 1');
  if (!(valorTotal > 0)) throw new Error('Valor total deve ser maior que zero');

  const centavos = Math.round(valorTotal * 100);
  const base = Math.floor(centavos / parcelas);
  const resto = centavos - base * parcelas;
  const valores: number[] = [];
  for (let i = 0; i < parcelas; i++) {
    const extra = i === parcelas - 1 ? resto : 0;
    valores.push((base + extra) / 100);
  }
  return valores;
}

/**
 * Sugere contas relacionadas às já selecionadas (mesma NF/compra, mesmo fornecedor, vencimento próximo).
 */
export function sugerirContasRelacionadas(
  selecionadas: ContaParaUnificacao[],
  candidatas: ContaParaUnificacao[],
  janelaDiasVencimento: number = 15
): SugestaoUnificacao[] {
  if (!selecionadas.length) return [];

  const idsSelecionados = new Set(selecionadas.map((c) => c.id));
  const compraIds = new Set(selecionadas.map((c) => c.compraId).filter(Boolean) as string[]);
  const nfs = new Set(
    selecionadas.map((c) => (c.compra?.numeroNF || '').trim()).filter(Boolean)
  );
  const fornecedorIds = new Set(
    selecionadas.map((c) => c.fornecedorId).filter(Boolean) as string[]
  );
  const vencimentos = selecionadas.map((c) => parseDataConta(c.dataVencimento));

  const porConta = new Map<string, SugestaoUnificacao>();

  for (const cand of candidatas) {
    if (idsSelecionados.has(cand.id)) continue;
    const eleg = isContaElegivelParaUnificacao(cand);
    if (!eleg.ok) continue;

    const motivos: MotivoSugestao[] = [];
    let score = 0;
    const detalhes: string[] = [];

    if (cand.compraId && compraIds.has(cand.compraId)) {
      motivos.push('MESMA_NOTA');
      score += 100;
      detalhes.push('mesma compra/NF');
    } else if (cand.compra?.numeroNF && nfs.has(cand.compra.numeroNF.trim())) {
      motivos.push('MESMA_NOTA');
      score += 90;
      detalhes.push(`mesma NF ${cand.compra.numeroNF}`);
    }

    if (cand.fornecedorId && fornecedorIds.has(cand.fornecedorId)) {
      motivos.push('MESMO_FORNECEDOR');
      score += 40;
      detalhes.push('mesmo fornecedor');
    }

    const vencCand = parseDataConta(cand.dataVencimento);
    const menorDist = Math.min(...vencimentos.map((v) => diasEntreDatas(v, vencCand)));
    if (menorDist <= janelaDiasVencimento) {
      motivos.push('VENCIMENTO_PROXIMO');
      score += Math.max(5, 30 - menorDist);
      detalhes.push(`vencimento a ${menorDist} dia(s)`);
    }

    // Exige ao menos um vínculo relevante com a seleção
    if (!motivos.length) continue;
    // Evita sugerir só por vencimento sem fornecedor/NF em comum quando a seleção tem fornecedor
    if (
      motivos.length === 1 &&
      motivos[0] === 'VENCIMENTO_PROXIMO' &&
      fornecedorIds.size > 0 &&
      (!cand.fornecedorId || !fornecedorIds.has(cand.fornecedorId))
    ) {
      continue;
    }

    porConta.set(cand.id, {
      contaId: cand.id,
      motivos,
      score,
      detalhe: detalhes.join('; '),
    });
  }

  return Array.from(porConta.values()).sort((a, b) => b.score - a.score);
}

export function montarDescricaoUnificada(
  numerosNF: string[],
  qtdOrigens: number,
  descricaoCustom?: string
): string {
  if (descricaoCustom?.trim()) return descricaoCustom.trim();
  if (numerosNF.length === 1) {
    return `Unificação NF ${numerosNF[0]} (${qtdOrigens} contas)`;
  }
  if (numerosNF.length > 1) {
    return `Unificação NFs ${numerosNF.slice(0, 3).join(', ')}${numerosNF.length > 3 ? '…' : ''} (${qtdOrigens} contas)`;
  }
  return `Unificação de ${qtdOrigens} contas a pagar`;
}
