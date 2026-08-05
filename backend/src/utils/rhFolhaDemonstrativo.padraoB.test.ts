import { calcularDemonstrativoFolha } from './rhFolhaDemonstrativo.util';

describe('rhFolhaDemonstrativo padrão B (CLT / jornada+banco)', () => {
  const baseValores = {
    salarioBase: 2077,
    valorHoraBase: 11.3,
    valorHorasNormais: 2077,
    valorHorasExtras50: 45.47,
    valorHorasExtras100: 0,
    valorHorasAutonomo: 0,
    totalBeneficios: 0,
  };

  it('HE seg–sex com tratamento null (padrão B) não entra no resumo de pagamento', () => {
    const dem = calcularDemonstrativoFolha({
      tipoContrato: 'REGISTRADO',
      horas: { normais: 180, extras50: 4.8, extras100: 0, total: 184.8 },
      valores: baseValores,
      totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
      lancamentos: [],
      resumoPonto: { horasTrabalhadas: 184.8, diasFaltados: 0 },
      conferenciaPonto: [
        {
          temRegistro: true,
          horasLiquidas: 8.4,
          diaSemana: 1,
          ehFeriado: false,
          minutosAtraso: 0,
          minutosHorasDevidas: 0,
          minutosExtraTotal: 24,
          tratamentoDebito: null,
          tratamentoCredito: null,
          avaliacaoRh: {
            minutosPagarFolha: 0,
            minutosDescontarFolha: 0,
            minutosBancoCredito: 24,
            minutosBancoDebito: 0,
          },
        },
      ],
    });

    expect(dem.horasExtrasSegSex50.horas).toBe(0);
    expect(dem.horasExtrasSegSex50.valor).toBe(0);
  });

  it('HE seg–sex só entra no resumo com P', () => {
    const dem = calcularDemonstrativoFolha({
      tipoContrato: 'REGISTRADO',
      horas: { normais: 180, extras50: 0.4, extras100: 0, total: 180.4 },
      valores: baseValores,
      totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
      lancamentos: [],
      resumoPonto: { horasTrabalhadas: 180.4, diasFaltados: 0 },
      conferenciaPonto: [
        {
          temRegistro: true,
          horasLiquidas: 8.4,
          diaSemana: 3,
          ehFeriado: false,
          minutosExtraTotal: 24,
          tratamentoCredito: 'P',
          avaliacaoRh: { minutosPagarFolha: 24, minutosDescontarFolha: 0 },
        },
      ],
    });

    expect(dem.horasExtrasSegSex50.horas).toBeCloseTo(0.4, 5);
    expect(dem.horasExtrasSegSex50.valor).toBeCloseTo(0.4 * 11.3, 5);
  });

  it('atraso/falta com padrão B (null) não entram em desconto — só com D', () => {
    const demB = calcularDemonstrativoFolha({
      tipoContrato: 'REGISTRADO',
      horas: { normais: 160, extras50: 0, extras100: 0, total: 160 },
      valores: baseValores,
      totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
      lancamentos: [],
      jornada: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:00' },
      resumoPonto: { horasTrabalhadas: 160, diasFaltados: 1 },
      conferenciaPonto: [
        {
          temRegistro: true,
          horasLiquidas: 7.5,
          diaSemana: 1,
          ehFeriado: false,
          minutosAtraso: 40,
          minutosHorasDevidas: 0,
          tratamentoDebito: null,
          avaliacaoRh: {
            minutosDescontarFolha: 0,
            minutosBancoDebito: 40,
            minutosPagarFolha: 0,
          },
        },
        {
          temRegistro: false,
          horasLiquidas: 0,
          diaSemana: 2,
          ehFimDeSemana: false,
          ehFeriado: false,
          faltaJustificada: false,
          minutosMetaDia: 480,
          tratamentoDebito: null,
          avaliacaoRh: {
            minutosDescontarFolha: 0,
            minutosBancoDebito: 480,
            minutosPagarFolha: 0,
          },
        },
      ],
    });

    expect(demB.descontoAtraso.horas).toBe(0);
    expect(demB.descontoFalta.dias).toBe(0);
    expect(demB.totalDescontosRef.horas).toBe(0);

    const demD = calcularDemonstrativoFolha({
      tipoContrato: 'REGISTRADO',
      horas: { normais: 160, extras50: 0, extras100: 0, total: 160 },
      valores: baseValores,
      totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
      lancamentos: [],
      jornada: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:00' },
      resumoPonto: { horasTrabalhadas: 160, diasFaltados: 1 },
      conferenciaPonto: [
        {
          temRegistro: true,
          horasLiquidas: 7.5,
          diaSemana: 1,
          ehFeriado: false,
          minutosAtraso: 40,
          minutosHorasDevidas: 0,
          tratamentoDebito: 'D',
          avaliacaoRh: { minutosDescontarFolha: 40, minutosPagarFolha: 0 },
        },
        {
          temRegistro: false,
          horasLiquidas: 0,
          diaSemana: 2,
          ehFimDeSemana: false,
          ehFeriado: false,
          faltaJustificada: false,
          minutosMetaDia: 480,
          tratamentoDebito: 'D',
          avaliacaoRh: { minutosDescontarFolha: 480, minutosPagarFolha: 0 },
        },
      ],
    });

    expect(demD.descontoAtraso.horas).toBeCloseTo(40 / 60, 5);
    expect(demD.descontoFalta.dias).toBe(1);
    expect(demD.descontoFalta.horas).toBeCloseTo(8, 5);
  });
});
