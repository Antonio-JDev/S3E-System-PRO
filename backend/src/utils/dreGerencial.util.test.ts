import {
    impostoDaVenda,
    particionarReceitaItens,
    resultadoFinanceiro,
    valeEhDuplicado,
} from './dreGerencial.util';

describe('dreGerencial', () => {
    it('separa material e serviço e ignora venda direta', () => {
        const partes = particionarReceitaItens([
            { tipo: 'MATERIAL', subtotal: 100 },
            { tipo: 'SERVICO', subtotal: 40 },
            { tipo: 'CUSTO_EXTRA', subtotal: 10 },
            { tipo: 'MATERIAL', subtotal: 999, vendaDiretaFornecedor: true },
            {
                tipo: 'KIT',
                kitId: null,
                quantidade: 2,
                itensDoKit: [
                    { tipo: 'MATERIAL', subtotal: 15 },
                    { tipo: 'SERVICO', subtotal: 5 },
                ],
            },
        ]);
        expect(partes.materiais).toBe(100 + 40);
        expect(partes.servicos).toBe(40 + 10);
    });

    it('trata o kit faturado como produto na parte de materiais', () => {
        const partes = particionarReceitaItens([
            {
                tipo: 'KIT',
                subtotal: 200,
                quantidade: 1,
                itensDoKit: [
                    { tipo: 'MATERIAL', subtotal: 50 },
                    { tipo: 'SERVICO', subtotal: 150 },
                ],
            },
        ]);
        expect(partes.materiais).toBe(200);
        expect(partes.servicos).toBe(0);
    });

    it('usa o percentual do orçamento quando ele é maior que zero', () => {
        const imposto = impostoDaVenda({
            receitaMateriais: 80,
            receitaServicos: 20,
            impostoPercentual: 10,
            aliquotaMaterial: 8,
            aliquotaServico: 15,
        });
        expect(imposto).toBeCloseTo(10);
    });

    it('usa as alíquotas da empresa quando o orçamento está zerado', () => {
        const imposto = impostoDaVenda({
            receitaMateriais: 100,
            receitaServicos: 50,
            impostoPercentual: 0,
            aliquotaMaterial: 8,
            aliquotaServico: 15,
        });
        expect(imposto).toBeCloseTo(8 + 7.5);
    });

    it('não soma vale que já está na conta de RH do mesmo dia, funcionário e valor', () => {
        const data = new Date('2026-03-10T15:00:00.000Z');
        const duplicado = valeEhDuplicado(
            { funcionarioId: 'f1', valor: 150, data },
            [{
                funcionarioId: 'f1',
                valorParcela: 150,
                dataPagamento: new Date('2026-03-10T18:00:00.000Z'),
                subtipo: 'VALE',
            }],
        );
        const outro = valeEhDuplicado(
            { funcionarioId: 'f1', valor: 80, data },
            [{
                funcionarioId: 'f1',
                valorParcela: 150,
                dataPagamento: data,
                subtipo: 'VALE',
            }],
        );
        expect(duplicado).toBe(true);
        expect(outro).toBe(false);
    });

    it('soma juros recebidos e descontos obtidos e reduz juros pagos e descontos concedidos', () => {
        const total = resultadoFinanceiro({
            receber: [{ valorJuros: 20, valorDesconto: 5 }],
            pagar: [{ valorJuros: 8, valorDesconto: 3 }],
        });
        expect(total).toBeCloseTo(20 - 5 - 8 + 3);
    });
});
