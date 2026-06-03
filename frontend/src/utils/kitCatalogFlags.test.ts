import { describe, expect, it } from 'vitest';
import { kitTemCotacaoBancoFrio } from './kitCatalogFlags';

describe('kitTemCotacaoBancoFrio', () => {
  it('retorna false quando só há serviços em itensFaltantes', () => {
    expect(
      kitTemCotacaoBancoFrio({
        temItensCotacao: true,
        itensFaltantes: [{ tipo: 'SERVICO', nome: 'Instalação', quantidade: 1 }],
      }),
    ).toBe(false);
  });

  it('retorna true quando há cotação em itensFaltantes', () => {
    expect(
      kitTemCotacaoBancoFrio({
        itensFaltantes: [{ tipo: 'COTACAO', nome: 'Medidor', quantidade: 1 }],
      }),
    ).toBe(true);
  });

  it('retorna false sem itens extras', () => {
    expect(kitTemCotacaoBancoFrio({ temItensCotacao: true, itensFaltantes: [] })).toBe(false);
  });
});
