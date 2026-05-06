/**
 * Testes para a página/fluxo de Orçamentos (Vitest).
 * Cobre utilitários usados nas páginas (matchCrossSearch, roundMoney).
 *
 * Para rodar: npm test -- Orcamentos.test
 * Ou: npm run test:run -- Orcamentos.test
 */

import { describe, it, expect } from 'vitest';
import { matchCrossSearch } from '../../utils/searchUtils';
import { roundMoney } from '../../utils/currency';

// ========== Testes de utilitários usados nas páginas de orçamento ==========

describe('Orçamentos – matchCrossSearch (busca cruzada)', () => {
  it('deve retornar true quando o texto contém o termo (busca simples)', () => {
    expect(matchCrossSearch('cabo', 'CABO COBRE FLEX 1KV')).toBe(true);
    expect(matchCrossSearch('parafuso', 'Parafuso Aço Inox')).toBe(true);
  });

  it('deve retornar false quando o texto não contém o termo', () => {
    expect(matchCrossSearch('quadro', 'CABO COBRE FLEX')).toBe(false);
  });

  it('deve aceitar múltiplos termos separados por * (AND)', () => {
    expect(matchCrossSearch('cabo * 70 * ver', 'CABO COBRE 70MM VERDE')).toBe(true);
    expect(matchCrossSearch('cabo * 70', 'CABO COBRE 70MM')).toBe(true);
    expect(matchCrossSearch('cabo * 70 * azul', 'CABO COBRE 70MM VERDE')).toBe(false);
  });

  it('deve aceitar múltiplos termos separados por % (AND)', () => {
    expect(matchCrossSearch('abraçadeira % 4,6', 'Abraçadeira Nylon 4,6')).toBe(true);
  });

  it('deve retornar false para termo ou texto vazio', () => {
    expect(matchCrossSearch('', 'Qualquer texto')).toBe(false);
    expect(matchCrossSearch('cabo', '')).toBe(false);
  });
});

describe('Orçamentos – roundMoney', () => {
  it('deve arredondar para 2 casas decimais', () => {
    expect(roundMoney(10.456)).toBe(10.46);
    expect(roundMoney(10.454)).toBe(10.45);
  });

  it('deve retornar 0 para NaN ou não-número', () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(undefined as any)).toBe(0);
  });
});

