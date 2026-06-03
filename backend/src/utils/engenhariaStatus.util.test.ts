import { isStatusEngenhariaConcluido, STATUS_ENGENHARIA_OPCOES } from './engenhariaStatus.util';

describe('engenhariaStatus.util', () => {
  it('expõe os cinco status da aba Projetos', () => {
    expect(STATUS_ENGENHARIA_OPCOES).toEqual([
      'A fazer',
      'Andamento',
      'Parado',
      'Protocolado',
      'Concluído',
    ]);
  });

  describe('isStatusEngenhariaConcluido', () => {
    it('aceita Concluído com ou sem acento', () => {
      expect(isStatusEngenhariaConcluido('Concluído')).toBe(true);
      expect(isStatusEngenhariaConcluido('concluido')).toBe(true);
    });

    it('rejeita outros status', () => {
      expect(isStatusEngenhariaConcluido('Andamento')).toBe(false);
      expect(isStatusEngenhariaConcluido('A fazer')).toBe(false);
    });
  });
});
