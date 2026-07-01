export const HORAS_COMERCIAIS_POR_DIA = 8;

export interface MembroEquipeCusto {
  valorHora?: number | string | null;
  valorDiaria?: number | string | null;
}

export interface ResultadoCustoEvento {
  diasCalendario: number;
  horasComerciais: number;
  custoEquipe: number;
  custoVeiculo: number;
  custoProjetado: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calcularDiasCalendarioInclusivos(dataInicio: Date, dataFim: Date): number {
  const inicio = startOfDay(dataInicio);
  const fim = startOfDay(dataFim);
  const diffMs = fim.getTime() - inicio.getTime();
  const dias = Math.floor(diffMs / 86_400_000) + 1;
  return Math.max(1, dias);
}

export function calcularHorasComerciais(dataInicio: Date, dataFim: Date): number {
  return calcularDiasCalendarioInclusivos(dataInicio, dataFim) * HORAS_COMERCIAIS_POR_DIA;
}

export function resolverValorHora(membro: MembroEquipeCusto): number {
  const valorHora = membro.valorHora != null ? Number(membro.valorHora) : 0;
  if (valorHora > 0) return valorHora;

  const valorDiaria = membro.valorDiaria != null ? Number(membro.valorDiaria) : 0;
  if (valorDiaria > 0) return valorDiaria / HORAS_COMERCIAIS_POR_DIA;

  return 0;
}

export function calcularCustoEvento(
  dataInicio: Date,
  dataFim: Date,
  equipe: MembroEquipeCusto[],
  custoVeiculoInput?: number | string | null
): ResultadoCustoEvento {
  const diasCalendario = calcularDiasCalendarioInclusivos(dataInicio, dataFim);
  const horasComerciais = diasCalendario * HORAS_COMERCIAIS_POR_DIA;
  const custoEquipe = equipe.reduce(
    (acc, membro) => acc + resolverValorHora(membro) * horasComerciais,
    0
  );
  const custoVeiculo = custoVeiculoInput != null ? Number(custoVeiculoInput) : 0;
  const custoProjetado = custoEquipe + (Number.isFinite(custoVeiculo) ? custoVeiculo : 0);

  return {
    diasCalendario,
    horasComerciais,
    custoEquipe: Math.round(custoEquipe * 100) / 100,
    custoVeiculo: Math.round((Number.isFinite(custoVeiculo) ? custoVeiculo : 0) * 100) / 100,
    custoProjetado: Math.round(custoProjetado * 100) / 100,
  };
}
