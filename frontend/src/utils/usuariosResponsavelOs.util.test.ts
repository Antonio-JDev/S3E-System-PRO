import { describe, expect, it } from 'vitest';
import { listarUsuariosResponsavelOs } from './usuariosResponsavelOs.util';

describe('listarUsuariosResponsavelOs', () => {
  const usuarios = [
    { id: 'u1', nome: 'Ana' },
    { id: 'u2', nome: 'Bruno' },
  ];

  it('retorna lista base quando responsável já está nas opções', () => {
    const result = listarUsuariosResponsavelOs(usuarios, {
      responsavelId: 'u1',
      responsavel: { id: 'u1', nome: 'Ana' },
    });
    expect(result).toHaveLength(2);
  });

  it('inclui responsável atual quando ausente da lista filtrada', () => {
    const result = listarUsuariosResponsavelOs(usuarios, {
      responsavelId: 'u9',
      responsavel: { id: 'u9', nome: 'Carlos' },
    });
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual(expect.objectContaining({ id: 'u9', nome: 'Carlos' }));
  });

  it('não duplica quando projeto não tem responsável', () => {
    expect(listarUsuariosResponsavelOs(usuarios, {})).toEqual(usuarios);
  });
});
