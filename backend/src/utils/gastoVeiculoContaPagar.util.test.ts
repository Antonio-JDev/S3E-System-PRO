import {
    classificacaoGastoFrota,
    contaGastoEstaPaga,
    dadosContaPagarDeGasto,
    descricaoContaGastoFrota,
    patchContaPagarAposEdicaoGasto,
} from './gastoVeiculoContaPagar.util';

const veiculo = { modelo: 'Gol', placa: 'ABC1D23' };
const gasto = {
    id: 'gasto-1',
    tipo: 'Combustível',
    descricao: 'Posto da BR',
    valor: '180.50',
    data: new Date('2026-10-16T12:00:00.000Z'),
};

describe('conta a pagar do gasto de frota', () => {
    it('monta conta pendente com veículo, valor e data do lançamento', () => {
        const conta = dadosContaPagarDeGasto(gasto, veiculo);
        expect(conta).toMatchObject({
            tipo: 'FROTA',
            gastoVeiculoId: 'gasto-1',
            credorNome: 'Gol (ABC1D23)',
            descricao: 'Frota - Combustível | Gol (ABC1D23)',
            valorParcela: 180.5,
            dataVencimento: gasto.data,
            observacoes: 'Posto da BR',
            classificacao: 'Combustíveis e pedagios',
            status: 'Pendente',
        });
    });

    it('classifica IPVA como imposto e manutenção como outras despesas', () => {
        expect(classificacaoGastoFrota('IPVA')).toBe('Impostos');
        expect(classificacaoGastoFrota('Pedágio')).toBe('Combustíveis e pedagios');
        expect(classificacaoGastoFrota('Manutenção')).toBe('Outras Despesas');
        expect(descricaoContaGastoFrota({ tipo: 'Manutenção' }, veiculo)).toBe(
            'Frota - Manutenção | Gol (ABC1D23)',
        );
    });

    it('atualiza valor e descrição da conta pendente sem mexer na baixa', () => {
        const patch = patchContaPagarAposEdicaoGasto(
            { status: 'Pendente', dataPagamento: null },
            { ...gasto, valor: 200, descricao: 'Nota nova' },
            veiculo,
        );
        expect(patch.valorParcela).toBe(200);
        expect(patch.observacoes).toBe('Nota nova');
        expect(patch.status).toBe('Pendente');
        expect(patch).not.toHaveProperty('dataPagamento');
    });

    it('remove a baixa, atualiza o valor e deixa pendente quando a conta já foi paga', () => {
        expect(contaGastoEstaPaga({ status: 'Pago', dataPagamento: new Date() })).toBe(true);
        const patch = patchContaPagarAposEdicaoGasto(
            { status: 'Pago', dataPagamento: new Date('2026-10-10T12:00:00.000Z') },
            { ...gasto, valor: 90 },
            veiculo,
        );
        expect(patch).toMatchObject({
            valorParcela: 90,
            status: 'Pendente',
            dataPagamento: null,
            meioPagamento: null,
            valorJuros: null,
            valorDesconto: null,
            dataAgendamento: null,
        });
    });
});
