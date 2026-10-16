export interface VeiculoContaFrota {
    modelo: string;
    placa: string;
}

export interface GastoContaFrota {
    id: string;
    tipo: string;
    descricao?: string | null;
    valor: number | string;
    data: Date;
}

export interface ContaPagarVinculadaGasto {
    status: string;
    dataPagamento?: Date | null;
}

export function credorNomeGastoFrota(veiculo: VeiculoContaFrota): string {
    return `${veiculo.modelo} (${veiculo.placa})`;
}

export function descricaoContaGastoFrota(gasto: { tipo: string }, veiculo: VeiculoContaFrota): string {
    return `Frota - ${gasto.tipo} | ${credorNomeGastoFrota(veiculo)}`;
}

export function classificacaoGastoFrota(tipo: string): string {
    const normalizado = tipo.trim().toLowerCase();
    if (normalizado.includes('combust') || normalizado.includes('pedag') || normalizado.includes('pedág')) {
        return 'Combustíveis e pedagios';
    }
    if (normalizado === 'ipva' || normalizado.includes('imposto')) {
        return 'Impostos';
    }
    return 'Outras Despesas';
}

export function contaGastoEstaPaga(conta: ContaPagarVinculadaGasto): boolean {
    return conta.status === 'Pago' || conta.dataPagamento != null;
}

export function dadosContaPagarDeGasto(gasto: GastoContaFrota, veiculo: VeiculoContaFrota) {
    return {
        tipo: 'FROTA' as const,
        origemCadastro: 'FROTA',
        gastoVeiculoId: gasto.id,
        descricao: descricaoContaGastoFrota(gasto, veiculo),
        credorNome: credorNomeGastoFrota(veiculo),
        valorParcela: Number(gasto.valor),
        dataVencimento: gasto.data,
        observacoes: gasto.descricao?.trim() || null,
        classificacao: classificacaoGastoFrota(gasto.tipo),
        status: 'Pendente' as const,
    };
}

/** Campos sincronizados na conta. Conta já paga volta a pendente, sem data nem meio de pagamento. */
export function patchContaPagarAposEdicaoGasto(
    conta: ContaPagarVinculadaGasto,
    gasto: GastoContaFrota,
    veiculo: VeiculoContaFrota,
) {
    const dados = dadosContaPagarDeGasto(gasto, veiculo);
    const { gastoVeiculoId: _vinculo, ...campos } = dados;
    if (!contaGastoEstaPaga(conta)) {
        return {
            ...campos,
            status: conta.status === 'Cancelado' || conta.status === 'Atrasado' ? 'Pendente' : conta.status,
        };
    }
    return {
        ...campos,
        status: 'Pendente' as const,
        dataPagamento: null,
        meioPagamento: null,
        valorJuros: null,
        valorDesconto: null,
        dataAgendamento: null,
    };
}
