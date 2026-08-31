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
    expect(resultado.custoApontamento).toBe(8000);
    expect(resultado.custoCalendario).toBe(0);
    expect(resultado.custoRealizado).toBe(8000);
    expect(resultado.resultado).toBe(2000);
  });

  it('soma custo do calendário (taxa do funcionário) no realizado', () => {
    const totais = calcularTotaisApropriacao([
      { tipoRecurso: 'DIARIA_EQUIPE', quantidade: 1 },
    ]);
    const resultado = calcularResultadoOs(
      {
        horasEngenhariaOrcadas: 0,
        diariasEquipeOrcadas: 5,
        valorHoraEngenharia: 0,
        valorDiariaEquipe: 400,
        valorTotal: 5000,
      },
      totais,
      {
        custoCalendario: 250,
        horasEngenharia: 0,
        diariasEquipe: 1,
        linhas: [
          {
            eventoId: 'e1',
            data: '2026-08-13',
            funcionarioId: 'f1',
            funcionarioNome: 'João',
            cargo: 'Eletricista',
            horasJornada: 8,
            horasExtras: 0,
            totalHoras: 8,
            modoCusto: 'DIARIA',
            valorUnitario: 250,
            custoDia: 250,
            status: 'VALIDO',
          },
        ],
      },
    );
    expect(resultado.custoApontamento).toBe(400);
    expect(resultado.custoCalendario).toBe(250);
    expect(resultado.custoCalendarioPrevisto).toBe(0);
    expect(resultado.custoRealizado).toBe(650);
    expect(resultado.custoProjetado).toBe(650);
    expect(resultado.diariasEquipeRealizadas).toBe(2);
    expect(resultado.resultado).toBe(4350);
    expect(resultado.calendarioLinhas).toHaveLength(1);
  });

  it('separa custo previsto do realizado no calendário', () => {
    const totais = calcularTotaisApropriacao([]);
    const resultado = calcularResultadoOs(
      {
        horasEngenhariaOrcadas: 0,
        diariasEquipeOrcadas: 5,
        valorHoraEngenharia: 0,
        valorDiariaEquipe: 400,
        valorTotal: 5000,
      },
      totais,
      {
        custoCalendario: 100,
        custoCalendarioPrevisto: 200,
        horasEngenharia: 0,
        diariasEquipe: 1,
        linhas: [],
      },
    );
    expect(resultado.custoCalendario).toBe(100);
    expect(resultado.custoCalendarioPrevisto).toBe(200);
    expect(resultado.custoRealizado).toBe(100);
    expect(resultado.custoProjetado).toBe(300);
  });
});
