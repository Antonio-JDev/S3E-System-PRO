import { calcularDemonstrativoFolha } from './rhFolhaDemonstrativo.util';

describe('rhFolhaDemonstrativo Autônomo+banco', () => {
  it('base diárias + HE P − D no total', () => {
    const diaria = 100;
    const dias = 22;
    const vh = diaria / 8;
    const hePagas = 5 * vh; // 5h com P
    const descontosD = 0;
    const subtotalDiarias = dias * diaria;
    const valorHorasAutonomo = subtotalDiarias + hePagas - descontosD;

    const dem = calcularDemonstrativoFolha({
      tipoContrato: 'AUTONOMO_BANCO_HORAS',
      horas: { normais: 176, extras50: 5, extras100: 0, fimDeSemana: 0, total: 181 },
      valores: {
        salarioBase: 0,
        valorHoraBase: vh,
        valorHorasNormais: subtotalDiarias,
        valorHorasExtras50: hePagas,
        valorHorasExtras100: 0,
        valorHorasAutonomo,
        totalBeneficios: 0,
        totalAPagar: valorHorasAutonomo,
        totalSemBonusDescontos: valorHorasAutonomo,
      },
      totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
      autonomo: {
        modo: 'diaria_banco',
        diasUteisComRegistro: dias,
        valorDiaria: diaria,
        valorHoraFimDeSemana: vh,
        subtotalDiarias,
        subtotalFimDeSemana: 0,
        valorHoraParaPd: vh,
        valorHePagas: hePagas,
        valorDescontosD: descontosD,
      },
      conferenciaPonto: [
        {
          dia: 1,
          diaSemana: 1,
          ehFimDeSemana: false,
          ehFeriado: false,
          temRegistro: true,
          horasLiquidas: 9,
          minutosAtraso: 0,
          minutosHorasDevidas: 0,
          minutosExtra20: 0,
          minutosExtraTotal: 60,
          faltaJustificada: false,
          tratamentoCredito: 'P',
          avaliacaoRh: {
            minutosAbonados: 0,
            minutosBancoDelta: 0,
            minutosPagarFolha: 60,
            minutosDescontarFolha: 0,
          },
        },
        {
          dia: 2,
          diaSemana: 2,
          ehFimDeSemana: false,
          ehFeriado: false,
          temRegistro: true,
          horasLiquidas: 9,
          minutosAtraso: 0,
          minutosHorasDevidas: 0,
          minutosExtra20: 0,
          minutosExtraTotal: 240,
          faltaJustificada: false,
          tratamentoCredito: 'P',
          avaliacaoRh: {
            minutosAbonados: 0,
            minutosBancoDelta: 0,
            minutosPagarFolha: 240,
            minutosDescontarFolha: 0,
          },
        },
      ],
    } as any);

    expect(dem.horasNormais.valor).toBe(2200);
    expect(dem.horasExtrasSegSex50.horas).toBeCloseTo(5, 5);
    expect(dem.horasExtrasSegSex50.valor).toBeCloseTo(hePagas, 5);
    expect(dem.totalAPagar).toBeCloseTo(2200 + hePagas, 5);
  });
});
