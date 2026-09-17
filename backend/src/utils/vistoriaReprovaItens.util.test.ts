import {
  ITENS_PADRAO_VISTORIA_CELESC,
  montarChecklistComEstado,
  normalizarItensAvaliacao,
  validarItensAvaliacaoReprova,
} from './vistoriaReprovaItens.util';

describe('vistoriaReprovaItens.util', () => {
  describe('validarItensAvaliacaoReprova', () => {
    it('rejeita lista vazia', () => {
      const result = validarItensAvaliacaoReprova([]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/ao menos um item/i);
      }
    });

    it('rejeita quando todos passaram (sem reprova)', () => {
      const result = validarItensAvaliacaoReprova([
        { codigo: 'aterramento', label: 'Aterramento', passou: true, justificativa: '' },
        { codigo: 'quadro_medicao', label: 'Quadro de medição', passou: true },
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/não passou/i);
      }
    });

    it('rejeita item reprovado sem justificativa', () => {
      const result = validarItensAvaliacaoReprova([
        { codigo: 'aterramento', label: 'Aterramento', passou: false, justificativa: '  ' },
        { codigo: 'quadro_medicao', label: 'Quadro de medição', passou: true },
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/Justificativa obrigatória/);
        expect(result.message).toMatch(/Aterramento/);
      }
    });

    it('aceita mistos com justificativa nos reprovados', () => {
      const result = validarItensAvaliacaoReprova([
        {
          codigo: 'aterramento',
          label: 'Aterramento',
          passou: false,
          justificativa: 'Haste insuficiente',
        },
        {
          codigo: 'quadro_medicao',
          label: 'Quadro de medição',
          passou: true,
          justificativa: '',
        },
        {
          codigo: 'documentacao',
          label: 'Documentação / projeto aprovado',
          passou: false,
          justificativa: 'Falta ART',
        },
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.itensReprovados).toEqual([
          'Aterramento',
          'Documentação / projeto aprovado',
        ]);
        expect(result.motivosResumo).toContain('Haste insuficiente');
        expect(result.motivosResumo).toContain('Falta ART');
        expect(result.itens.filter((i) => i.passou)).toHaveLength(1);
        expect(result.itens.filter((i) => !i.passou)).toHaveLength(2);
      }
    });

    it('preenche label a partir do catálogo pelo codigo', () => {
      const result = validarItensAvaliacaoReprova([
        { codigo: 'aterramento', passou: false, justificativa: 'Sem continuidade' },
      ]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.itens[0].label).toBe('Aterramento');
      }
    });
  });

  describe('normalizarItensAvaliacao', () => {
    it('aceita aliases reprovado/aprovado', () => {
      const itens = normalizarItensAvaliacao([
        { codigo: 'x', label: 'X', reprovado: true, motivo: 'falhou' },
        { codigo: 'y', label: 'Y', aprovado: true },
      ]);
      expect(itens[0].passou).toBe(false);
      expect(itens[0].justificativa).toBe('falhou');
      expect(itens[1].passou).toBe(true);
    });
  });

  describe('montarChecklistComEstado', () => {
    it('mescla catálogo padrão com salvos', () => {
      const checklist = montarChecklistComEstado([
        {
          codigo: 'aterramento',
          label: 'Aterramento',
          passou: false,
          justificativa: 'Ok motivo',
        },
      ]);
      expect(checklist.length).toBeGreaterThanOrEqual(ITENS_PADRAO_VISTORIA_CELESC.length);
      const atr = checklist.find((i) => i.codigo === 'aterramento');
      expect(atr?.passou).toBe(false);
      expect(atr?.justificativa).toBe('Ok motivo');
      const quadro = checklist.find((i) => i.codigo === 'quadro_medicao');
      expect(quadro?.passou).toBe(true);
    });
  });
});
