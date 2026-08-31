import { calcularCustoDiaFuncionario } from './custoDiaFuncionario';

describe('calcularCustoDiaFuncionario', () => {
  it('usa diária quando valorDiaria > 0', () => {
    const r = calcularCustoDiaFuncionario({
      valorDiaria: 200,
      valorHora: 25,
      horasJornada: 8,
    });
    expect(r.modoCusto).toBe('DIARIA');
    expect(r.valorUnitario).toBe(200);
    expect(r.custoDia).toBe(200);
  });

  it('soma extras 50/100 sobre a hora quando há diária', () => {
    const r = calcularCustoDiaFuncionario({
      valorDiaria: 200,
      valorHora: 20,
      horasJornada: 8,
      horasExtras50: 2,
      horasExtras100: 1,
    });
    expect(r.custoDia).toBe(200 + 20 * 1.5 * 2 + 20 * 2 * 1);
  });

  it('usa hora × jornada quando não há diária', () => {
    const r = calcularCustoDiaFuncionario({
      valorHora: 30,
      horasJornada: 8,
    });
    expect(r.modoCusto).toBe('HORA');
    expect(r.custoDia).toBe(240);
  });

  it('marca SEM_TAXA sem valorHora nem valorDiaria', () => {
    const r = calcularCustoDiaFuncionario({ horasJornada: 8 });
    expect(r.modoCusto).toBe('SEM_TAXA');
    expect(r.custoDia).toBe(0);
  });
});
