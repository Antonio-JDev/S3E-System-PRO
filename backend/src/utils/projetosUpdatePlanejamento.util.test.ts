import { alterouCamposPlanejamentoOs } from './projetosUpdatePlanejamento.util';

describe('alterouCamposPlanejamentoOs', () => {
  it('retorna false quando só responsavelId é enviado', () => {
    expect(alterouCamposPlanejamentoOs({ responsavelId: 'user-1' })).toBe(false);
  });

  it('retorna true quando qualquer campo de planejamento é enviado', () => {
    expect(alterouCamposPlanejamentoOs({ dataInicio: '2026-01-01' })).toBe(true);
    expect(alterouCamposPlanejamentoOs({ dataPrevisao: '2026-01-10' })).toBe(true);
    expect(alterouCamposPlanejamentoOs({ horasEngenhariaOrcadas: 8 })).toBe(true);
    expect(alterouCamposPlanejamentoOs({ diariasEquipeOrcadas: 2 })).toBe(true);
  });

  it('retorna true no update completo do modal de edição', () => {
    expect(
      alterouCamposPlanejamentoOs({
        responsavelId: 'user-1',
        dataInicio: '2026-01-01',
        dataPrevisao: '2026-01-10',
        horasEngenhariaOrcadas: 4,
        diariasEquipeOrcadas: 1,
      }),
    ).toBe(true);
  });
});
