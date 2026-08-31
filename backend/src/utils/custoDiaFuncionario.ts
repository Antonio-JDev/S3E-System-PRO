export type ModoCustoContabil = 'DIARIA' | 'HORA' | 'SEM_TAXA';

export interface CustoDiaFuncionarioInput {
  valorDiaria?: number | string | null;
  valorHora?: number | string | null;
  horasJornada: number;
  horasExtras50?: number;
  horasExtras100?: number;
}

export interface CustoDiaFuncionarioResultado {
  modoCusto: ModoCustoContabil;
  valorUnitario: number;
  custoDia: number;
}

function n(v: number | string | null | undefined): number {
  const x = v != null ? Number(v) : 0;
  return Number.isFinite(x) ? x : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Custo do dia para CSV contábil (taxas do Funcionario, não da OS).
 * Diária se > 0; senão hora × jornada; extras 50%/100% sobre a hora-base.
 */
export function calcularCustoDiaFuncionario(
  input: CustoDiaFuncionarioInput,
): CustoDiaFuncionarioResultado {
  const diaria = n(input.valorDiaria);
  const hora = n(input.valorHora);
  const jornada = Math.max(0, n(input.horasJornada));
  const he50 = Math.max(0, n(input.horasExtras50));
  const he100 = Math.max(0, n(input.horasExtras100));

  if (diaria > 0) {
    const horaBase = hora > 0 ? hora : jornada > 0 ? diaria / jornada : 0;
    const extras = horaBase * 1.5 * he50 + horaBase * 2 * he100;
    return { modoCusto: 'DIARIA', valorUnitario: round2(diaria), custoDia: round2(diaria + extras) };
  }

  if (hora > 0) {
    return {
      modoCusto: 'HORA',
      valorUnitario: round2(hora),
      custoDia: round2(hora * jornada + hora * 1.5 * he50 + hora * 2 * he100),
    };
  }

  return { modoCusto: 'SEM_TAXA', valorUnitario: 0, custoDia: 0 };
}
