import { contaEhSalarioDaCompetencia } from './contaSalarioRh.util';

describe('contaEhSalarioDaCompetencia', () => {
    const vencOutubro = new Date(2026, 9, 5);

    it('reconhece o salário gerado pela folha', () => {
        expect(
            contaEhSalarioDaCompetencia(
                {
                    subtipo: null,
                    descricao: 'Salário Maria - 2026-10 (folha)',
                    dataVencimento: vencOutubro,
                },
                2026,
                10,
            ),
        ).toBe(true);
    });

    it('ignora vale e adiantamento do mesmo mês', () => {
        expect(
            contaEhSalarioDaCompetencia(
                {
                    subtipo: 'VALE',
                    descricao: 'Vale Maria - 2026-10',
                    dataVencimento: vencOutubro,
                },
                2026,
                10,
            ),
        ).toBe(false);
        expect(
            contaEhSalarioDaCompetencia(
                {
                    subtipo: null,
                    descricao: 'Adiantamento - Maria - 2026-10',
                    dataVencimento: vencOutubro,
                },
                2026,
                10,
            ),
        ).toBe(false);
    });

    it('não usa o salário de outro mês', () => {
        expect(
            contaEhSalarioDaCompetencia(
                {
                    subtipo: 'SALARIO',
                    descricao: 'Salário Maria - 2026-09 (folha)',
                    dataVencimento: new Date(2026, 8, 5),
                },
                2026,
                10,
            ),
        ).toBe(false);
    });
});
