import {
  extrairEntregaQuadro,
  validarEntregaQuadro,
} from './osEntregaQuadro.util';

describe('osEntregaQuadro.util', () => {
  it('valida campos obrigatórios da entrega', () => {
    expect(() => validarEntregaQuadro(null)).toThrow(/data de entrega/);
    expect(() =>
      validarEntregaQuadro({
        entregaQuadro: {
          dataEntrega: '2026-09-01',
          entregadorNome: 'João',
          recebedorNome: 'Maria',
          recebidoNoLocal: true,
          localRecebimento: 'Obra cliente',
        },
      }),
    ).not.toThrow();
  });

  it('extrai metadados de entrega', () => {
    const entrega = extrairEntregaQuadro({
      entregaQuadro: { recebedorNome: 'Ana' },
    });
    expect(entrega?.recebedorNome).toBe('Ana');
  });
});
