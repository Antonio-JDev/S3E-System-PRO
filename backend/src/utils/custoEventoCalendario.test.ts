/**
 * Testes — custo projetado de eventos de calendário (8h comerciais/dia)
 * Rodar: npm test -- custoEventoCalendario.test.ts
 */

import {
  calcularDiasCalendarioInclusivos,
  calcularHorasComerciais,
  resolverValorHora,
  calcularCustoEvento,
  HORAS_COMERCIAIS_POR_DIA,
} from './custoEventoCalendario';

describe('custoEventoCalendario', () => {
  describe('calcularDiasCalendarioInclusivos', () => {
    it('conta dias inclusivos no mesmo dia', () => {
      const d = new Date('2025-04-14T08:00:00');
      expect(calcularDiasCalendarioInclusivos(d, new Date('2025-04-14T22:00:00'))).toBe(1);
    });

    it('conta dois dias inclusivos', () => {
      const inicio = new Date('2025-04-14T08:00:00');
      const fim = new Date('2025-04-15T17:00:00');
      expect(calcularDiasCalendarioInclusivos(inicio, fim)).toBe(2);
    });
  });

  describe('calcularHorasComerciais', () => {
    it('multiplica dias por 8 horas', () => {
      const inicio = new Date('2025-04-14');
      const fim = new Date('2025-04-15');
      expect(calcularHorasComerciais(inicio, fim)).toBe(2 * HORAS_COMERCIAIS_POR_DIA);
    });
  });

  describe('resolverValorHora', () => {
    it('usa valorHora quando presente', () => {
      expect(resolverValorHora({ valorHora: 25, valorDiaria: 50 })).toBe(25);
    });

    it('fallback valorDiaria / 8', () => {
      expect(resolverValorHora({ valorDiaria: 50 })).toBe(6.25);
    });
  });

  describe('calcularCustoEvento', () => {
    it('exemplo: 2 eletricistas R$50/diária + 1 líder R$100/diária × 2 dias = R$400', () => {
      const inicio = new Date('2025-04-14');
      const fim = new Date('2025-04-15');
      const equipe = [
        { valorDiaria: 50 },
        { valorDiaria: 50 },
        { valorDiaria: 100 },
      ];
      const resultado = calcularCustoEvento(inicio, fim, equipe, 0);
      expect(resultado.horasComerciais).toBe(16);
      expect(resultado.custoEquipe).toBe(400);
      expect(resultado.custoProjetado).toBe(400);
    });

    it('soma custo do veículo', () => {
      const inicio = new Date('2025-04-14');
      const fim = new Date('2025-04-14');
      const resultado = calcularCustoEvento(inicio, fim, [{ valorDiaria: 80 }], 150);
      expect(resultado.custoEquipe).toBe(80);
      expect(resultado.custoProjetado).toBe(230);
    });
  });
});
