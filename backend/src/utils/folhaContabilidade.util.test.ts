import {
  calcularDsrFaltasSemana,
  competenciaParaSerialExcel,
  formatarHorasDecimal,
  minutosNoturnosBatidas,
  montarLinhaContabil,
  round2,
} from './folhaContabilidade.util';

describe('folhaContabilidade.util', () => {
  it('competenciaParaSerialExcel: ago/2026 ≈ 46235', () => {
    expect(competenciaParaSerialExcel(2026, 8)).toBe(46235);
  });

  it('formatarHorasDecimal: 90 min → 1,50', () => {
    expect(formatarHorasDecimal(90 / 60)).toBe(1.5);
  });

  it('minutosNoturnosBatidas após 18:00', () => {
    expect(minutosNoturnosBatidas(['07:30', '12:00', '13:00', '19:00'], '18:00')).toBe(60);
  });

  it('calcularDsrFaltasSemana: 1 falta D na semana → 1 DSR', () => {
    const conferencia = [
      { dia: 5, diaSemana: 2, ehFeriado: false, temRegistro: false, tratamentoDebito: 'D' as const },
      { dia: 6, diaSemana: 3, ehFeriado: false, temRegistro: true, tratamentoDebito: 'B' as const },
    ];
    expect(calcularDsrFaltasSemana(conferencia, 2026, 8)).toBe(1);
  });

  it('calcularDsrFaltasSemana: falta com B não conta DSR', () => {
    const conferencia = [
      { dia: 5, diaSemana: 2, ehFeriado: false, temRegistro: false, tratamentoDebito: 'B' as const },
    ];
    expect(calcularDsrFaltasSemana(conferencia, 2026, 8)).toBe(0);
  });

  it('montarLinhaContabil: matrícula vazia sem codigoRelogio', () => {
    const folha = {
      nome: 'Teste',
      referencia: { ano: 2026, mes: 8 },
      horasExtrasSegSex50: { horas: 1, valor: 0 },
      horasExtrasSabado50: { horas: 0, valor: 0 },
      horasExtras100: { horas: 2, valor: 0 },
      descontoFalta: { dias: 0, horas: 0, valor: 0 },
      descontoAtraso: { horas: 0, valor: 0 },
      descontoSaidaAntecipada: { horas: 0, valor: 0 },
      lancamentos: [],
      conferenciaPonto: [],
    } as unknown as Parameters<typeof montarLinhaContabil>[0];

    const linha = montarLinhaContabil(folha, { codigoRelogio: null });
    expect(linha.matricula).toBe('');
    expect(linha.heConfiguravel).toBe(1);
    expect(linha.he100).toBe(2);
  });

  it('montarLinhaContabil: inclui horas PAGAMENTO_BANCO_HORAS', () => {
    const folha = {
      nome: 'João',
      referencia: { ano: 2026, mes: 8 },
      horasExtrasSegSex50: { horas: 0, valor: 0 },
      horasExtrasSabado50: { horas: 0, valor: 0 },
      horasExtras100: { horas: 0, valor: 0 },
      descontoFalta: { dias: 0, horas: 0, valor: 0 },
      descontoAtraso: { horas: 0, valor: 0 },
      descontoSaidaAntecipada: { horas: 0, valor: 0 },
      lancamentos: [
        {
          categoria: 'PAGAMENTO_BANCO_HORAS',
          valor: 100,
          horasComponenteNormais: 1.5,
          horasComponenteExtras100: 0.5,
        },
      ],
      conferenciaPonto: [],
    } as unknown as Parameters<typeof montarLinhaContabil>[0];

    const linha = montarLinhaContabil(folha, { codigoRelogio: 13 });
    expect(linha.matricula).toBe(13);
    expect(linha.heConfiguravel).toBe(1.5);
    expect(linha.he100).toBe(0.5);
  });

  it('round2', () => {
    expect(round2(1.556)).toBe(1.56);
  });
});
