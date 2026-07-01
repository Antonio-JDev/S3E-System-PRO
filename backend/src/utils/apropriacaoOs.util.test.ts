import {
  calcularHomemHoraTotal,
  calcularResultadoOs,
  calcularTotaisApropriacao,
} from './apropriacaoOs.util';

describe('apropriacaoOs.util', () => {
  it('soma horas de engenharia e diárias de equipe', () => {
    const totais = calcularTotaisApropriacao([
      { tipoRecurso: 'HORA_ENGENHARIA', quantidade: 5 },
      { tipoRecurso: 'HORA_ENGENHARIA', quantidade: 3 },
      { tipoRecurso: 'DIARIA_EQUIPE', quantidade: 1 },
      { tipoRecurso: 'DIARIA_EQUIPE', quantidade: 0.5 },
    ]);
    expect(totais.horasEngenhariaRealizadas).toBe(8);
    expect(totais.diariasEquipeRealizadas).toBe(1.5);
  });

  it('calcula homem-hora com 8h por diária', () => {
    expect(calcularHomemHoraTotal(10, 5)).toBe(50);
  });

  it('detecta estouro e resultado financeiro', () => {
    const totais = calcularTotaisApropriacao([
      { tipoRecurso: 'HORA_ENGENHARIA', quantidade: 20 },
      { tipoRecurso: 'DIARIA_EQUIPE', quantidade: 15 },
    ]);
    const resultado = calcularResultadoOs(
      {
        horasEngenhariaOrcadas: 10,
        diariasEquipeOrcadas: 10,
        valorHoraEngenharia: 100,
        valorDiariaEquipe: 400,
        valorTotal: 10000,
      },
      totais
    );
    expect(resultado.estouroHorasEngenharia).toBe(true);
    expect(resultado.estouroDiariasEquipe).toBe(true);
    expect(resultado.custoOrcado).toBe(5000);
    expect(resultado.custoRealizado).toBe(8000);
    expect(resultado.resultado).toBe(2000);
  });
});
