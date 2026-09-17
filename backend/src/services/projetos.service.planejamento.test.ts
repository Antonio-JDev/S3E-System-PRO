import { validarCamposPlanejamentoOs } from './projetos.service';

describe('validarCamposPlanejamentoOs', () => {
  const valido = {
    responsavelId: 'user-1',
    dataInicio: new Date('2026-01-01'),
    dataPrevisao: new Date('2026-01-10'),
    horasEngenhariaOrcadas: 8,
    diariasEquipeOrcadas: 0,
  };

  it('aceita planejamento completo válido', () => {
    expect(() => validarCamposPlanejamentoOs(valido)).not.toThrow();
  });

  it('exige responsável por padrão (create / update misto)', () => {
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, responsavelId: null }),
    ).toThrow(/Gerente do projeto/);
  });

  it('permite ausência de gerente no update só de estimativa', () => {
    expect(() =>
      validarCamposPlanejamentoOs(
        { ...valido, responsavelId: null },
        { exigirResponsavel: false },
      ),
    ).not.toThrow();
  });

  it('exige datas de planejamento', () => {
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, dataInicio: null }),
    ).toThrow(/início/);
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, dataPrevisao: null }),
    ).toThrow(/previsão/);
  });

  it('aceita horas e diárias zeradas (apontamento automático)', () => {
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, horasEngenhariaOrcadas: 0, diariasEquipeOrcadas: 0 }),
    ).not.toThrow();
  });
});
