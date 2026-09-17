import {
    montarUpdateCompraItemVinculo,
    resolverIdentificadoresVinculo,
} from './vincularCompraItemMaterial.util';

describe('resolverIdentificadoresVinculo', () => {
    it('usa EAN/cProd do item quando não há override', () => {
        expect(
            resolverIdentificadoresVinculo({
                ean: '7891234567895',
                codigoFornecedor: 'CAB-25',
            })
        ).toEqual({ ean: '7891234567895', codigoFornecedor: 'CAB-25' });
    });

    it('override da request tem prioridade', () => {
        expect(
            resolverIdentificadoresVinculo(
                { ean: '7891234567895', codigoFornecedor: 'OLD' },
                { ean: '7890000000009', codigoFornecedor: 'NEW-99' }
            )
        ).toEqual({ ean: '7890000000009', codigoFornecedor: 'NEW-99' });
    });

    it('permite informar só o que faltava no item', () => {
        expect(
            resolverIdentificadoresVinculo(
                { ean: null, codigoFornecedor: null },
                { ean: '7891234567895', codigoFornecedor: '8821' }
            )
        ).toEqual({ ean: '7891234567895', codigoFornecedor: '8821' });
    });

    it('normaliza EAN inválido para null', () => {
        expect(
            resolverIdentificadoresVinculo({ ean: '123', codigoFornecedor: 'AB' })
        ).toEqual({ ean: null, codigoFornecedor: 'AB' });
    });
});

describe('montarUpdateCompraItemVinculo', () => {
    it('preenche EAN/cProd vazios do item com os resolvidos', () => {
        expect(
            montarUpdateCompraItemVinculo(
                { ean: null, codigoFornecedor: null },
                'mat-1',
                { ean: '7891234567895', codigoFornecedor: 'CAB-25' }
            )
        ).toEqual({
            materialId: 'mat-1',
            ean: '7891234567895',
            codigoFornecedor: 'CAB-25',
        });
    });

    it('não sobrescreve EAN/cProd já existentes no item', () => {
        expect(
            montarUpdateCompraItemVinculo(
                { ean: '7891234567895', codigoFornecedor: 'OLD' },
                'mat-2',
                { ean: '1111111111111', codigoFornecedor: 'NEW' }
            )
        ).toEqual({ materialId: 'mat-2' });
    });
});
