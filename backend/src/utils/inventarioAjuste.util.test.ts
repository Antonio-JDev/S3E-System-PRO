import {
  calcularAjusteAbsoluto,
  montarObservacaoInventario,
  validarQuantidadeContada,
} from './inventarioAjuste.util';

describe('inventarioAjuste.util', () => {
  describe('calcularAjusteAbsoluto', () => {
    it('calcula delta positivo (contado > sistema)', () => {
      const r = calcularAjusteAbsoluto(10, 15);
      expect(r.estoqueAnterior).toBe(10);
      expect(r.quantidadeContada).toBe(15);
      expect(r.diferenca).toBe(5);
      expect(r.semAlteracao).toBe(false);
    });

    it('calcula delta negativo (contado < sistema)', () => {
      const r = calcularAjusteAbsoluto(20, 7);
      expect(r.diferenca).toBe(-13);
      expect(r.semAlteracao).toBe(false);
    });

    it('no-op quando contado === atual', () => {
      const r = calcularAjusteAbsoluto(12, 12);
      expect(r.diferenca).toBe(0);
      expect(r.semAlteracao).toBe(true);
    });

    it('aceita contagem zero (zerar estoque)', () => {
      const r = calcularAjusteAbsoluto(5, 0);
      expect(r.quantidadeContada).toBe(0);
      expect(r.diferenca).toBe(-5);
      expect(r.semAlteracao).toBe(false);
    });

    it('trata estoque nulo/NaN como 0', () => {
      const r = calcularAjusteAbsoluto(NaN as unknown as number, 3);
      expect(r.estoqueAnterior).toBe(0);
      expect(r.diferenca).toBe(3);
    });
  });

  describe('validarQuantidadeContada', () => {
    it('aceita 0 e números positivos', () => {
      expect(validarQuantidadeContada(0)).toEqual({ ok: true, valor: 0 });
      expect(validarQuantidadeContada(10.5)).toEqual({ ok: true, valor: 10.5 });
      expect(validarQuantidadeContada('3,25')).toEqual({ ok: true, valor: 3.25 });
    });

    it('rejeita negativo, vazio e inválido', () => {
      expect(validarQuantidadeContada(-1).ok).toBe(false);
      expect(validarQuantidadeContada(null).ok).toBe(false);
      expect(validarQuantidadeContada('abc').ok).toBe(false);
    });
  });

  describe('montarObservacaoInventario', () => {
    it('inclui de/para, usuário e observação', () => {
      const obs = montarObservacaoInventario({
        estoqueAnterior: 10,
        quantidadeContada: 8,
        usuarioNome: 'Admin',
        usuarioId: 'u1',
        observacaoUsuario: 'Prateleira A',
      });
      expect(obs).toContain('Contagem física: de 10 para 8');
      expect(obs).toContain('Admin');
      expect(obs).toContain('u1');
      expect(obs).toContain('Prateleira A');
    });
  });
});
