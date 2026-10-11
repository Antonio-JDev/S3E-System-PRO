import { camposCustoMovimento, valorizarSaida } from './custoMovimentacao.util';

describe('custoMovimentacao', () => {
    it('congela custo unitário vezes quantidade', () => {
        expect(valorizarSaida(12.5, 4)).toEqual({ custoUnitario: 12.5, valorCusto: 50 });
    });

    it('trata preço ausente como zero e grava o projeto', () => {
        expect(camposCustoMovimento({ preco: null, quantidade: 3, projetoId: 'os-1' })).toEqual({
            custoUnitario: 0,
            valorCusto: 0,
            custoRetroativo: false,
            projetoId: 'os-1',
        });
    });
});
