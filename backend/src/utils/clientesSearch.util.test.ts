import { buildClientesWhereFromQuery } from './clientesSearch.util';

describe('buildClientesWhereFromQuery', () => {
  it('aceita alias search igual a busca', () => {
    const where = buildClientesWhereFromQuery({ search: 'jorge' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { nome: { contains: 'jorge', mode: 'insensitive' } },
        { telefone: { contains: 'jorge', mode: 'insensitive' } },
      ])
    );
  });

  it('inclui filtro por dígitos do telefone quando busca tem 3+ números', () => {
    const where = buildClientesWhereFromQuery({ busca: '+55 63 9949-4139' });
    const or = where.OR as Record<string, unknown>[];
    expect(or).toEqual(
      expect.arrayContaining([{ telefone: { contains: '556399494139', mode: 'insensitive' } }])
    );
  });

  it('respeita filtro ativo', () => {
    const where = buildClientesWhereFromQuery({ ativo: 'true' });
    expect(where.ativo).toBe(true);
  });

  it('retorna where vazio sem termo de busca', () => {
    expect(buildClientesWhereFromQuery({})).toEqual({});
  });
});
