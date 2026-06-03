import {
  extractSequentialNumber,
  gerarProximoCodigoFromList,
  getCodigoPrefix,
} from './serviceCodeGenerator.service';

jest.mock('../lib/prisma', () => ({
  prisma: { servico: { findMany: jest.fn() } },
}));

describe('ServiceCodeGenerator', () => {
  describe('getCodigoPrefix', () => {
    it('mapeia PROJETOS para ENG-PRO', () => {
      expect(getCodigoPrefix('PROJETOS')).toBe('ENG-PRO');
    });
  });

  describe('extractSequentialNumber', () => {
    it('extrai 75 de ENG-PRO-075', () => {
      expect(extractSequentialNumber('ENG-PRO-075', 'ENG-PRO')).toBe(75);
    });

    it('extrai 1 de MOB-001', () => {
      expect(extractSequentialNumber('MOB-001', 'MOB')).toBe(1);
    });
  });

  describe('gerarProximoCodigoFromList', () => {
    it('retorna ENG-PRO-076 quando existem 001, 018 e 075', () => {
      const codigo = gerarProximoCodigoFromList(
        ['ENG-PRO-001', 'ENG-PRO-018', 'ENG-PRO-075'],
        'PROJETOS',
      );
      expect(codigo).toBe('ENG-PRO-076');
    });

    it('retorna MOB-001 quando não há códigos', () => {
      expect(gerarProximoCodigoFromList([], 'MAO_DE_OBRA')).toBe('MOB-001');
    });

    it('retorna MONT-004 após MONT-003', () => {
      expect(gerarProximoCodigoFromList(['MONT-003'], 'MONTAGEM')).toBe('MONT-004');
    });

    it('retorna ADM-002 após ADM-001', () => {
      expect(gerarProximoCodigoFromList(['ADM-001'], 'ADMINISTRATIVO')).toBe('ADM-002');
    });
  });
});
