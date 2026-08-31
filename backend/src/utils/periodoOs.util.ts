/** Período orçado de uma OS para alocação no calendário. */

/** Só aloca período da OS no calendário quando o usuário marcar explicitamente. */
export function deveAlocarPeriodoOs(data: {
  alocarPeriodoOs?: boolean;
  projetoId?: string | null;
}): boolean {
  return Boolean(data.projetoId) && data.alocarPeriodoOs === true;
}

export interface PeriodoOs {
  inicio: Date;
  fim: Date;
  diasCorridos: number;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
}

function diasCorridosInclusive(inicio: Date, fim: Date): number {
  const a = startOfUtcDay(inicio).getTime();
  const b = startOfUtcDay(fim).getTime();
  return Math.max(1, Math.floor((b - a) / 86_400_000) + 1);
}

/**
 * Resolve início/fim da OS:
 * Projeto.dataInicio → dataPrevisao (fallback dataFim → orçamento.previsaoInicio/previsaoTermino).
 */
export function resolverPeriodoOsDeDatas(input: {
  dataInicio?: Date | null;
  dataPrevisao?: Date | null;
  dataFim?: Date | null;
  previsaoInicioOrcamento?: Date | null;
  previsaoTerminoOrcamento?: Date | null;
}): PeriodoOs {
  const inicioRaw =
    input.dataInicio ??
    input.previsaoInicioOrcamento ??
    null;
  const fimRaw =
    input.dataPrevisao ??
    input.dataFim ??
    input.previsaoTerminoOrcamento ??
    null;

  if (!inicioRaw || !fimRaw) {
    throw new Error(
      'Esta OS não tem período válido (data de início e previsão/prazo). Defina as datas na ordem de serviço antes de alocar.',
    );
  }

  const inicio = new Date(inicioRaw);
  const fim = new Date(fimRaw);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw new Error('Datas do período da OS são inválidas');
  }
  if (fim < inicio) {
    throw new Error('O prazo/previsão da OS é anterior à data de início');
  }

  return {
    inicio,
    fim,
    diasCorridos: diasCorridosInclusive(inicio, fim),
  };
}
