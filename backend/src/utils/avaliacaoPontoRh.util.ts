/** Tratamento RH rápido na coluna Situação (débito: atraso / saída antecipada / falta). */
export type TratamentoDebitoRh = 'A' | 'B' | 'D';

/** Tratamento RH rápido para crédito (hora extra além da workshift). */
export type TratamentoCreditoRh = 'B' | 'P';

export type AvaliacaoRhDiaInput = {
  /** Minutos de atraso na entrada. */
  minutosAtraso?: number;
  /** Minutos de saída antecipada / horas devidas. */
  minutosHorasDevidas?: number;
  /** Soma de HE (50% + 100% + 20% etc.) em minutos. */
  minutosExtra?: number;
  /** Dia sem batidas (falta integral) — minutos a descontar (ex.: jornada do dia). */
  minutosFaltaIntegral?: number;
  tratamentoDebito?: TratamentoDebitoRh | null;
  tratamentoCredito?: TratamentoCreditoRh | null;
};

export type AvaliacaoRhDiaResultado = {
  minutosAbonados: number;
  minutosBancoDelta: number;
  minutosPagarFolha: number;
  minutosDescontarFolha: number;
  temDebito: boolean;
  temCredito: boolean;
};

export function parseTratamentoDebito(raw: string | null | undefined): TratamentoDebitoRh | null {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'A' || v === 'B' || v === 'D') return v;
  return null;
}

export function parseTratamentoCredito(raw: string | null | undefined): TratamentoCreditoRh | null {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'B' || v === 'P') return v;
  return null;
}

function n(v: number | undefined): number {
  return Math.max(0, Math.floor(Number(v ?? 0) || 0));
}

/**
 * Aplica avaliação rápida A/B/P/D sobre métricas brutas do dia.
 * - A: zera impacto financeiro/banco de débitos (atraso, saída antecipada, falta).
 * - B (débito): lança déficit como saldo NEGATIVO no banco.
 * - B (crédito): lança HE como saldo POSITIVO no banco.
 * - P: HE para pagamento em folha (não vai ao banco).
 * - D: déficit/falta para desconto em folha (não vai ao banco).
 */
export function aplicarAvaliacaoRhDia(input: AvaliacaoRhDiaInput): AvaliacaoRhDiaResultado {
  const minutosAtraso = n(input.minutosAtraso);
  const minutosHorasDevidas = n(input.minutosHorasDevidas);
  const minutosExtra = n(input.minutosExtra);
  const minutosFaltaIntegral = n(input.minutosFaltaIntegral);

  const debitoBruto = minutosAtraso + minutosHorasDevidas + minutosFaltaIntegral;
  const creditoBruto = minutosExtra;

  const temDebito = debitoBruto > 0;
  const temCredito = creditoBruto > 0;

  let minutosAbonados = 0;
  let minutosBancoDelta = 0;
  let minutosPagarFolha = 0;
  let minutosDescontarFolha = 0;

  const td = input.tratamentoDebito ?? null;
  const tc = input.tratamentoCredito ?? null;

  if (temDebito && td) {
    if (td === 'A') {
      minutosAbonados = debitoBruto;
    } else if (td === 'B') {
      minutosBancoDelta -= debitoBruto;
    } else if (td === 'D') {
      minutosDescontarFolha = debitoBruto;
    }
  }

  if (temCredito && tc) {
    if (tc === 'B') {
      minutosBancoDelta += creditoBruto;
    } else if (tc === 'P') {
      minutosPagarFolha = creditoBruto;
    }
  }

  return {
    minutosAbonados,
    minutosBancoDelta,
    minutosPagarFolha,
    minutosDescontarFolha,
    temDebito,
    temCredito,
  };
}

/**
 * Resolve tratamentos a partir de um clique único A|B|P|D no espelho.
 * - A/D: só débito
 * - P: só crédito
 * - B: débito e/ou crédito conforme o que existir no dia
 */
export function resolverTratamentosDoBotao(
  botao: 'A' | 'B' | 'P' | 'D',
  opts: { temDebito: boolean; temCredito: boolean },
): { tratamentoDebito: TratamentoDebitoRh | null; tratamentoCredito: TratamentoCreditoRh | null } {
  if (botao === 'A') {
    return { tratamentoDebito: opts.temDebito ? 'A' : null, tratamentoCredito: null };
  }
  if (botao === 'D') {
    return { tratamentoDebito: opts.temDebito ? 'D' : null, tratamentoCredito: null };
  }
  if (botao === 'P') {
    return { tratamentoDebito: null, tratamentoCredito: opts.temCredito ? 'P' : null };
  }
  // B
  return {
    tratamentoDebito: opts.temDebito ? 'B' : null,
    tratamentoCredito: opts.temCredito ? 'B' : null,
  };
}
