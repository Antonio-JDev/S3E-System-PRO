import { describe, expect, it } from 'vitest';
import {
  aliasesCodigosDistintos,
  listarCprodsDistintos,
  listarEansDistintos,
  resolverEanCprod,
  textoOuNaoInformado,
} from './materialAliasCodigos.util';

describe('materialAliasCodigos.util', () => {
  const aliases = [
    {
      id: '1',
      fornecedorId: 'f1',
      ean: '789123',
      codigoFornecedor: 'C1',
      fornecedor: { id: 'f1', nome: 'Forn A' },
    },
    {
      id: '2',
      fornecedorId: 'f2',
      ean: '111',
      codigoFornecedor: 'C2',
      fornecedor: { id: 'f2', nome: 'Forn B' },
    },
    {
      id: '3',
      fornecedorId: 'f1',
      ean: null,
      codigoFornecedor: null,
    },
  ];

  it('prioriza alias do fornecedor do material', () => {
    expect(resolverEanCprod(aliases, 'f2')).toEqual({ ean: '111', codigoFornecedor: 'C2' });
  });

  it('usa o primeiro com código quando não há match de fornecedor', () => {
    expect(resolverEanCprod(aliases, 'f-x')).toEqual({ ean: '789123', codigoFornecedor: 'C1' });
  });

  it('retorna null quando não há aliases com código', () => {
    expect(resolverEanCprod([{ id: 'x', ean: '  ', codigoFornecedor: null }], 'f1')).toEqual({
      ean: null,
      codigoFornecedor: null,
    });
  });

  it('lista apenas pares distintos do principal', () => {
    const outros = aliasesCodigosDistintos(aliases, '789123', 'C1');
    expect(outros).toHaveLength(1);
    expect(outros[0].id).toBe('2');
  });

  it('textoOuNaoInformado', () => {
    expect(textoOuNaoInformado(null)).toBe('Não informado');
    expect(textoOuNaoInformado('  ABC  ')).toBe('ABC');
  });

  it('lista EANs e cProds distintos', () => {
    expect(listarEansDistintos(aliases)).toEqual(['789123', '111']);
    expect(listarCprodsDistintos(aliases)).toEqual(['C1', 'C2']);
  });
});
