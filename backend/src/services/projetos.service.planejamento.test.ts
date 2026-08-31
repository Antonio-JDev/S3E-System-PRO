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

  it('exige responsável', () => {
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, responsavelId: null }),
    ).toThrow(/Gerente do projeto/);
  });

  it('exige datas e horas/diárias', () => {
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, dataInicio: null }),
    ).toThrow(/início/);
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, dataPrevisao: null }),
    ).toThrow(/previsão/);
    expect(() =>
      validarCamposPlanejamentoOs({ ...valido, horasEngenhariaOrcadas: 0, diariasEquipeOrcadas: 0 }),
    ).toThrow(/horas de engenharia ou diárias/);
  });
});
