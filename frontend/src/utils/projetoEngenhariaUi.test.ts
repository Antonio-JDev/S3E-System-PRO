import { getProjetoEngenhariaActionLabel } from './projetoEngenhariaUi';

describe('getProjetoEngenhariaActionLabel', () => {
  it('retorna Atribuir à Engenharia quando ainda não atribuído', () => {
    expect(getProjetoEngenhariaActionLabel(false)).toBe('Atribuir à Engenharia');
  });

  it('retorna Alterar projetista quando já atribuído', () => {
    expect(getProjetoEngenhariaActionLabel(true)).toBe('Alterar projetista');
  });
});
