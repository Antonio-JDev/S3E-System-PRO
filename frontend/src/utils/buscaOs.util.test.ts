import { describe, expect, it } from 'vitest';
import {
  normalizarTermoBuscaOs,
  projetoMatchesBusca,
  resolverNumeroSequencialOs,
} from './buscaOs.util';

describe('normalizarTermoBuscaOs', () => {
  it('remove prefixo OS e hífens', () => {
    expect(normalizarTermoBuscaOs('OS-2553')).toBe('2553');
    expect(normalizarTermoBuscaOs('os 2553')).toBe('2553');
    expect(normalizarTermoBuscaOs('2553')).toBe('2553');
  });
});

describe('projetoMatchesBusca', () => {
  const base = {
    id: 'uuid-1',
    titulo: 'Instalação elétrica',
    descricao: null as string | null,
    orcamentoId: 'orc-1',
    orcamento: { numeroSequencial: 2553 },
    cliente: { nome: 'Cliente ABC' },
  };

  it('encontra por número OS sem prefixo', () => {
    expect(projetoMatchesBusca(base, '2553')).toBe(true);
  });

  it('encontra por OS-2553', () => {
    expect(projetoMatchesBusca(base, 'OS-2553')).toBe(true);
  });

  it('encontra por título e cliente', () => {
    expect(projetoMatchesBusca(base, 'instalação')).toBe(true);
    expect(projetoMatchesBusca(base, 'Cliente ABC')).toBe(true);
  });

  it('não lança erro com descricao null', () => {
    expect(() => projetoMatchesBusca(base, 'xyz')).not.toThrow();
    expect(projetoMatchesBusca(base, 'xyz')).toBe(false);
  });

  it('usa fallback de orçamentos', () => {
    const semOrcamento = { ...base, orcamento: null };
    const orcamentos = [{ id: 'orc-1', numeroSequencial: 42 }];
    expect(resolverNumeroSequencialOs(semOrcamento, orcamentos)).toBe(42);
    expect(projetoMatchesBusca(semOrcamento, '42', orcamentos)).toBe(true);
  });
});
