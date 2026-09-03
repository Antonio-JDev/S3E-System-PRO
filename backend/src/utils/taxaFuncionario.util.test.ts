import {
  calcularCustoItemApontamento,
  resolverTaxaFuncionario,
} from './taxaFuncionario.util';

describe('taxaFuncionario.util', () => {
  it('CLT: deriva valor hora de salário ÷ carga mensal', () => {
    const taxa = resolverTaxaFuncionario({
      tipoContrato: 'REGISTRADO',
      salarioBase: 4400,
      cargaHorariaMensal: 220,
    });
    expect(taxa.valorHora).toBe(20);
    expect(taxa.origem).toBe('SALARIO_CARGA');
  });

  it('autônomo: usa diária e hora normal', () => {
    const taxa = resolverTaxaFuncionario({
      tipoContrato: 'AUTONOMO',
      valorDiaria: 400,
      valorHoraNormalAutonomo: 55,
    });
    expect(taxa.valorHora).toBe(55);
    expect(taxa.valorDiaria).toBe(400);
  });

  it('custo execução: 1h equivale a 0,125 diária × valor diária', () => {
    const taxa = resolverTaxaFuncionario({
      tipoContrato: 'AUTONOMO',
      valorDiaria: 400,
    });
    expect(calcularCustoItemApontamento('DIARIA_EQUIPE', 0.125, taxa)).toBe(50);
  });

  it('custo engenharia: horas × valor hora do engenheiro', () => {
    const taxa = resolverTaxaFuncionario({
      tipoContrato: 'REGISTRADO',
      salarioBase: 8800,
      cargaHorariaMensal: 220,
    });
    expect(calcularCustoItemApontamento('HORA_ENGENHARIA', 3, taxa)).toBe(120);
  });
});
