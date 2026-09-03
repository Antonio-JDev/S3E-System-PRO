import { describe, expect, it } from 'vitest';
import { usuarioApontamentoEngenharia } from './apontamentoEngenharia.util';

describe('usuarioApontamentoEngenharia', () => {
  it('inclui engenheiro legado (Engenheiro Elétrico) do setor Engenharia', () => {
    expect(
      usuarioApontamentoEngenharia({
        role: 'engenheiro',
        setor: 'Engenharia',
        active: true,
      }),
    ).toBe(true);
  });

  it('inclui engenheiro_eletricista do setor Engenharia', () => {
    expect(
      usuarioApontamentoEngenharia({
        role: 'engenheiro_eletricista',
        setor: 'Engenharia',
        active: true,
      }),
    ).toBe(true);
  });

  it('exclui eletricista do setor Execução', () => {
    expect(
      usuarioApontamentoEngenharia({
        role: 'eletricista',
        setor: 'Execução',
        active: true,
      }),
    ).toBe(false);
  });

  it('exclui desenvolvedor mesmo com setor TI', () => {
    expect(
      usuarioApontamentoEngenharia({
        role: 'desenvolvedor',
        setor: 'Dept. TI',
        active: true,
      }),
    ).toBe(false);
  });

  it('inclui usuários-chave do sistema por e-mail', () => {
    expect(
      usuarioApontamentoEngenharia({
        email: 'alois@s3eengenharia.com.br',
        role: 'admin',
        setor: 'Dept. TI',
        active: true,
      }),
    ).toBe(true);
    expect(
      usuarioApontamentoEngenharia({
        email: 'tiago@s3eengenharia.com.br',
        role: 'gerente',
        setor: 'Gestão',
        active: true,
      }),
    ).toBe(true);
  });
});
