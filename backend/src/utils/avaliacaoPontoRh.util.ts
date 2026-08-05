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
  /** Líquido (crédito − débito) — compat / exibição. */
  minutosBancoDelta: number;
  /** HE enviada ao banco (positivo). */
  minutosBancoCredito: number;
  /** Déficit enviado ao banco (positivo = dívida). */
  minutosBancoDebito: number;
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
 * Padrão: sem tratamento explícito → B (tudo vai ao banco), dia a dia.
 * - A: zera impacto financeiro/banco de débitos (atraso, saída antecipada, falta).
 * - B (débito): lança déficit como horas NEGATIVAS no banco (separado do crédito).
 * - B (crédito): lança HE como horas POSITIVAS no banco (separado do débito).
 * - P: HE para pagamento em folha (estorna do banco se estava em B).
 * - D só débito: desconto em folha.
 * - D com débito + HE no mesmo dia: compensa HE × atraso; o resto (pos/neg) vai ao banco.
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
  let minutosBancoCredito = 0;
  let minutosBancoDebito = 0;
  let minutosPagarFolha = 0;
  let minutosDescontarFolha = 0;

  // Padrão B: sem apontamento na Situação, atraso/HE vão ao banco.
  const td: TratamentoDebitoRh | null =
    input.tratamentoDebito ?? (temDebito ? 'B' : null);
  const tc: TratamentoCreditoRh | null =
    input.tratamentoCredito ?? (temCredito ? 'B' : null);

  // D com atraso/saída/falta E HE no mesmo dia: compensa e manda o resto ao banco.
  const dComCompensacao = td === 'D' && temDebito && temCredito;

  if (dComCompensacao) {
    const liquido = creditoBruto - debitoBruto;
    if (liquido > 0) {
      minutosBancoCredito = liquido;
    } else if (liquido < 0) {
      minutosBancoDebito = -liquido;
    }
    // HE consumida na compensação — não paga em folha; sem desconto salarial do bruto.
  } else {
    if (temDebito && td) {
      if (td === 'A') {
        minutosAbonados = debitoBruto;
      } else if (td === 'B') {
        minutosBancoDebito = debitoBruto;
      } else if (td === 'D') {
        minutosDescontarFolha = debitoBruto;
      }
    }

    if (temCredito && tc) {
      if (tc === 'B') {
        minutosBancoCredito = creditoBruto;
      } else if (tc === 'P') {
        minutosPagarFolha = creditoBruto;
      }
    }
  }

  return {
    minutosAbonados,
    minutosBancoDelta: minutosBancoCredito - minutosBancoDebito,
    minutosBancoCredito,
    minutosBancoDebito,
    minutosPagarFolha,
    minutosDescontarFolha,
    temDebito,
    temCredito,
  };
}

/**
 * Resolve tratamentos a partir de um clique único A|B|P|D no espelho.
 * - A/D: só débito (crédito limpo — D com HE usa compensação via métricas brutas)
 * - P: só crédito (débito permanece — quem chama deve preservar o lado débito)
 * - B: débito e/ou crédito conforme o que existir no dia
 */
export function resolverTratamentosDoBotao(
  botao: 'A' | 'B' | 'P' | 'D',
  opts: { temDebito: boolean; temCredito: boolean },
): {
  tratamentoDebito: TratamentoDebitoRh | null | undefined;
  tratamentoCredito: TratamentoCreditoRh | null | undefined;
} {
  if (botao === 'A') {
    return { tratamentoDebito: opts.temDebito ? 'A' : null, tratamentoCredito: null };
  }
  if (botao === 'D') {
    return { tratamentoDebito: opts.temDebito ? 'D' : null, tratamentoCredito: null };
  }
  if (botao === 'P') {
    // Não zera o débito já gravado (ex.: B no atraso) — só redireciona a HE para pagar.
    return {
      tratamentoDebito: undefined,
      tratamentoCredito: opts.temCredito ? 'P' : null,
    };
  }
  // B
  return {
    tratamentoDebito: opts.temDebito ? 'B' : null,
    tratamentoCredito: opts.temCredito ? 'B' : null,
  };
}
