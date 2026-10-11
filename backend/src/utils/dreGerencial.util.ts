export const REGIME_DRE =
    'Receita pela data da venda, CMV pela data da baixa do material, despesas e resultado financeiro pela data do pagamento. Sem depreciação e sem IR/CSLL.';

type ItemReceita = {
    tipo?: string | null;
    kitId?: string | null;
    quantidade?: number | null;
    subtotal?: number | null;
    itensDoKit?: unknown;
    vendaDiretaFornecedor?: boolean | null;
};

function valorComponenteKit(sub: { valorVenda?: number; quantidade?: number; subtotal?: number; precoUnit?: number }, qtdKit: number): number {
    const qtdSub = Number(sub.quantidade) ?? 0;
    const valorUnit = Number(sub.valorVenda) ?? Number(sub.precoUnit) ?? 0;
    const subtotalSub = Number(sub.subtotal);
    const valorItem = subtotalSub && !Number.isNaN(subtotalSub) ? subtotalSub : valorUnit * qtdSub;
    return valorItem * qtdKit;
}

function ehServico(tipo: string): boolean {
    const t = (tipo || '').toUpperCase();
    return t === 'SERVICO' || t === 'CUSTO_EXTRA';
}

/**
 * Separa a receita do orçamento entre materiais e serviços.
 * Kit vendido como produto pesa inteiro na parte de materiais (alíquota de material).
 * O serviço dentro do kit é custo interno e não vira receita de serviço.
 */
export function particionarReceitaItens(items: ItemReceita[]): { materiais: number; servicos: number } {
    let materiais = 0;
    let servicos = 0;
    const somar = (tipo: string, valor: number) => {
        if (ehServico(tipo)) servicos += valor;
        else materiais += valor;
    };

    for (const item of items) {
        if (item.vendaDiretaFornecedor) continue;
        const tipo = (item.tipo || '').toUpperCase();
        if (tipo === 'KIT') {
            const subtotalKit = Number(item.subtotal) || 0;
            if (subtotalKit > 0) {
                materiais += subtotalKit;
            } else if (Array.isArray(item.itensDoKit)) {
                const qtdKit = Number(item.quantidade) || 1;
                for (const sub of item.itensDoKit as Array<{ tipo?: string; valorVenda?: number; quantidade?: number; subtotal?: number; precoUnit?: number }>) {
                    materiais += valorComponenteKit(sub, qtdKit);
                }
            }
            continue;
        }
        somar(tipo, Number(item.subtotal) || 0);
    }

    return { materiais, servicos };
}

/**
 * Imposto da venda: percentual do orçamento sobre a receita daquela venda.
 * Com percentual zero, usa as alíquotas da empresa sobre a parte de material e de serviço.
 */
export function impostoDaVenda(params: {
    receitaMateriais: number;
    receitaServicos: number;
    impostoPercentual: number;
    aliquotaMaterial: number;
    aliquotaServico: number;
}): number {
    const receita = params.receitaMateriais + params.receitaServicos;
    if (params.impostoPercentual > 0) {
        return receita * (params.impostoPercentual / 100);
    }
    return (params.receitaMateriais * (params.aliquotaMaterial / 100))
        + (params.receitaServicos * (params.aliquotaServico / 100));
}

export function chaveDiaBrasil(data: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(data);
}

export function mesmoValor(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.009;
}

/** Vale da tabela Vale que já existe como conta a pagar RH/VALE no mesmo dia, funcionário e valor. */
export function valeEhDuplicado(
    vale: { funcionarioId: string; valor: number; data: Date },
    contasRhVale: Array<{ funcionarioId: string | null; valorParcela: number; dataPagamento: Date | null; subtipo: string | null }>,
): boolean {
    const diaVale = chaveDiaBrasil(vale.data);
    return contasRhVale.some((conta) => {
        if (conta.subtipo !== 'VALE') return false;
        if (!conta.funcionarioId || conta.funcionarioId !== vale.funcionarioId) return false;
        if (!conta.dataPagamento) return false;
        if (chaveDiaBrasil(conta.dataPagamento) !== diaVale) return false;
        return mesmoValor(Number(conta.valorParcela), Number(vale.valor));
    });
}

/**
 * Juros recebidos e descontos obtidos aumentam.
 * Juros pagos e descontos concedidos reduzem.
 */
export function resultadoFinanceiro(params: {
    receber: Array<{ valorJuros?: number | null; valorDesconto?: number | null }>;
    pagar: Array<{ valorJuros?: number | null; valorDesconto?: number | null }>;
}): number {
    let total = 0;
    for (const conta of params.receber) {
        total += (Number(conta.valorJuros) || 0) - (Number(conta.valorDesconto) || 0);
    }
    for (const conta of params.pagar) {
        total += (Number(conta.valorDesconto) || 0) - (Number(conta.valorJuros) || 0);
    }
    return Number(total.toFixed(2));
}
