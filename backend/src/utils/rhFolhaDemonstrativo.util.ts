type LancamentoFolha = {
  id: string;
  categoria: string;
  valor: number;
  descricao: string | null;
  quantidadeHoras: number | null;
};

type FolhaInput = {
  tipoContrato: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS' | string;
  valores: {
    salarioBase: number;
    valorHoraBase: number;
    valorHorasNormais: number;
    valorHorasExtras50: number;
    valorHorasExtras100: number;
    valorHorasAutonomo: number;
    valorHorasNoturnaAutonomo?: number;
    totalBeneficios: number;
  };
  horas: {
    normais: number;
    extras50: number;
    extras100: number;
    total: number;
  };
  jornada?: {
    entrada1: string | null;
    saida1: string | null;
    entrada2: string | null;
    saida2: string | null;
  };
  autonomo?: {
    modo?: 'legacy' | 'por_hora' | 'diaria_banco';
    horasNoturna?: number;
    horasExtra50?: number;
    horasSabado?: number;
    horasHoraNormal?: number;
    subtotalSabado?: number;
    valorHePagas?: number;
    valorDescontosD?: number;
  };
  conferenciaPonto: Array<{
    temRegistro: boolean;
    horasLiquidas: number;
    diaSemana: number;
    ehFimDeSemana?: boolean;
    ehFeriado: boolean;
    faltaJustificada?: boolean;
    minutosMetaDia?: number;
    tratamentoDebito?: 'A' | 'B' | 'D' | null;
    tratamentoCredito?: 'B' | 'P' | null;
    avaliacaoRh?: {
      minutosDescontarFolha?: number;
      minutosBancoDelta?: number;
      minutosBancoCredito?: number;
      minutosBancoDebito?: number;
      minutosPagarFolha?: number;
      minutosAbonados?: number;
    } | null;
    minutosAtraso?: number;
    minutosHorasDevidas?: number;
    minutosExtra20?: number;
    minutosExtraTotal?: number;
  }>;
  resumoPonto?: {
    diasFaltados?: number;
    horasTrabalhadas?: number;
  };
  lancamentos: LancamentoFolha[];
  totaisLancamentos: {
    subtracoes: number;
    acrescimos: number;
  };
  permitirHorasExtras100?: boolean;
};

export type FolhaDemonstrativoResumo = {
  horasNormais: { horas: number; valor: number };
  horasExtrasSegSex50: { horas: number; valor: number };
  horasExtrasSabado50: { horas: number; valor: number };
  horasExtras100: { horas: number; valor: number };
  horasNoturnas20: { horas: number; valor: number };
  totalHorasMes: { horas: number };
  descontoAtraso: { horas: number; valor: number };
  descontoSaidaAntecipada: { horas: number; valor: number };
  descontoFalta: { dias: number; horas: number; valor: number };
  totalDescontosRef: { horas: number; valor: number };
  lancamentosManuais: LancamentoFolha[];
  totalAPagar: number;
};

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return 0;
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function jornadaHorasDia(folha: FolhaInput): number {
  const j = folha.jornada;
  if (!j?.entrada1 || !j?.saida1 || !j?.entrada2 || !j?.saida2) return 8;
  const total =
    toMinutes(j.saida1) - toMinutes(j.entrada1) + (toMinutes(j.saida2) - toMinutes(j.entrada2));
  return Math.max(1, total / 60);
}

/** Padrão Situação = B (banco): null/undefined conta como B. */
function debitoEfetivo(td: 'A' | 'B' | 'D' | null | undefined): 'A' | 'B' | 'D' {
  return td === 'A' || td === 'D' ? td : 'B';
}

function creditoEfetivo(tc: 'B' | 'P' | null | undefined): 'B' | 'P' {
  return tc === 'P' ? 'P' : 'B';
}

/**
 * Demonstrativo alinhado à coluna Situação:
 * - HE seg–sex só entra no resumo de pagamento com P (padrão B → banco).
 * - Atraso/saída/falta só entram em desconto com D (padrão B → banco negativo).
 */
export function calcularDemonstrativoFolha(folha: FolhaInput): FolhaDemonstrativoResumo {
  const valorHoraBase = Number(folha.valores.valorHoraBase ?? 0);
  const valorMinuto = valorHoraBase / 60;

  const horasTrabalhadas = Number(
    folha.resumoPonto?.horasTrabalhadas ?? folha.horas.total ?? 0,
  );
  const horasNoturnas = Number(folha.autonomo?.horasNoturna ?? 0);

  const usaJornadaBanco =
    folha.tipoContrato === 'REGISTRADO' || folha.tipoContrato === 'AUTONOMO_BANCO_HORAS';

  let horasUteis = 0;
  let horasSabado = 0;
  let horasDomingoFeriado = 0;
  let minutosExtraUteisPagar = 0;
  let minutosSabadoPagar = 0;
  let minutos100Pagar = 0;
  let somaAtrasoMin = 0;
  let somaSaidaAntMin = 0;

  let diasFaltaComDesconto = 0;
  let minutosFaltaComDesconto = 0;
  let minutosDescontarAval = 0;

  for (const row of folha.conferenciaPonto || []) {
    const td = debitoEfetivo(row.tratamentoDebito);
    const tc = creditoEfetivo(row.tratamentoCredito);
    const minAtrasoBruto = row.ehFeriado ? 0 : Math.max(0, Number(row.minutosAtraso ?? 0));
    const minSaidaBruto = row.ehFeriado ? 0 : Math.max(0, Number(row.minutosHorasDevidas ?? 0));
    const minutosPagar = Math.max(0, Number(row.avaliacaoRh?.minutosPagarFolha ?? 0));
    const minutosDescontar = Math.max(0, Number(row.avaliacaoRh?.minutosDescontarFolha ?? 0));

    minutosDescontarAval += minutosDescontar;

    // Descontos em folha: somente D (nunca A/B / padrão B)
    if (td === 'D') {
      const ehDiaUtilSemRegistro =
        !row.temRegistro && !row.ehFeriado && !row.ehFimDeSemana && !row.faltaJustificada;
      if (ehDiaUtilSemRegistro) {
        const minFaltaDia = Math.max(
          0,
          minutosDescontar > 0
            ? minutosDescontar
            : Number(row.minutosMetaDia ?? Math.round(jornadaHorasDia(folha) * 60)),
        );
        if (minFaltaDia > 0) {
          diasFaltaComDesconto += 1;
          minutosFaltaComDesconto += minFaltaDia;
        }
      } else if (minutosDescontar > 0) {
        const bruto = minAtrasoBruto + minSaidaBruto;
        if (bruto > 0) {
          somaAtrasoMin += Math.round((minutosDescontar * minAtrasoBruto) / bruto);
          somaSaidaAntMin += Math.round((minutosDescontar * minSaidaBruto) / bruto);
        } else {
          somaAtrasoMin += minutosDescontar;
        }
      } else {
        somaAtrasoMin += minAtrasoBruto;
        somaSaidaAntMin += minSaidaBruto;
      }
    }

    if (!row.temRegistro) continue;
    const h = Number(row.horasLiquidas || 0);

    if (row.ehFeriado || row.diaSemana === 0) {
      horasDomingoFeriado += h;
      // HE 100% no demonstrativo de pagamento só com P (ou flag legada sem jornada/banco)
      if (usaJornadaBanco) {
        if (tc === 'P') {
          minutos100Pagar += minutosPagar > 0 ? minutosPagar : Math.round(h * 60);
        }
      } else {
        minutos100Pagar += Math.round(h * 60);
      }
    } else if (row.diaSemana === 6) {
      horasSabado += h;
      if (usaJornadaBanco) {
        if (tc === 'P') {
          minutosSabadoPagar += minutosPagar > 0 ? minutosPagar : Math.round(h * 60);
        }
      } else {
        minutosSabadoPagar += Math.round(h * 60);
      }
    } else {
      horasUteis += h;
      // Seg–sex: HE só no resumo de pagamento com P (padrão B → banco)
      if (usaJornadaBanco) {
        if (tc === 'P') {
          const extraFallback = Math.max(
            0,
            Number(row.minutosExtraTotal ?? row.minutosExtra20 ?? 0),
          );
          minutosExtraUteisPagar += minutosPagar > 0 ? minutosPagar : extraFallback;
        }
      } else {
        // Autônomo clássico: mantém lógica de tarifas (não usa B padrão de jornada)
        minutosExtraUteisPagar += Math.max(0, Number(row.minutosExtra20 ?? 0));
      }
    }
  }

  const horasExtraUteis = minutosExtraUteisPagar / 60;
  const valorHorasExtraUteis = horasExtraUteis * valorHoraBase;
  const valorAtraso = somaAtrasoMin * valorMinuto;
  const valorSaidaAnt = somaSaidaAntMin * valorMinuto;
  const faltaHoras = minutosFaltaComDesconto / 60;
  const valorFalta = minutosFaltaComDesconto * valorMinuto;
  const totalDescontosRef = valorAtraso + valorSaidaAnt + valorFalta;
  const totalMinDescontos = somaAtrasoMin + somaSaidaAntMin + Math.round(faltaHoras * 60);

  const autonomoPorHora = folha.tipoContrato === 'AUTONOMO' && folha.autonomo?.modo === 'por_hora';
  const autonomoDiariaBanco =
    folha.tipoContrato === 'AUTONOMO_BANCO_HORAS' && folha.autonomo?.modo === 'diaria_banco';
  const horasHe50Autonomo = Number(folha.autonomo?.horasExtra50 ?? 0);
  const horasSabadoAutonomo = Number(folha.autonomo?.horasSabado ?? horasSabado);
  const valorSabadoAutonomo = Number(folha.autonomo?.subtotalSabado ?? 0);

  const creditosHoras =
    folha.tipoContrato === 'AUTONOMO' || folha.tipoContrato === 'AUTONOMO_BANCO_HORAS'
      ? Number(folha.valores.valorHorasAutonomo ?? 0)
      : Number(folha.valores.salarioBase ?? 0) +
        // CLT: HE só entra no total se houver minutos com P (já refletidos abaixo no demonstrativo;
        // o total a pagar CLT permanece salário ± lançamentos − descontos D).
        0;

  // Autônomo+banco: descontos D já entraram em valorHorasAutonomo; não reaplicar totalDescontosRef
  // CLT: só desconta o que for D (B/A não geram desconto automático)
  const totalAPagar = autonomoDiariaBanco
    ? creditosHoras +
      Number(folha.valores.totalBeneficios ?? 0) +
      Number(folha.totaisLancamentos?.acrescimos ?? 0) -
      Number(folha.totaisLancamentos?.subtracoes ?? 0)
    : folha.tipoContrato === 'REGISTRADO'
      ? Number(folha.valores.salarioBase ?? 0) +
        Number(folha.valores.totalBeneficios ?? 0) +
        Number(folha.totaisLancamentos?.acrescimos ?? 0) -
        Number(folha.totaisLancamentos?.subtracoes ?? 0) -
        totalDescontosRef +
        // HE pagas (P) no CLT — valor hora × 1 (referência; 50% visual no card)
        valorHorasExtraUteis +
        (minutosSabadoPagar / 60) * valorHoraBase * 1.5 +
        (minutos100Pagar / 60) * valorHoraBase * 2
      : creditosHoras +
        Number(folha.valores.totalBeneficios ?? 0) +
        Number(folha.totaisLancamentos?.acrescimos ?? 0) -
        Number(folha.totaisLancamentos?.subtracoes ?? 0) -
        totalDescontosRef;

  return {
    horasNormais: {
      horas: autonomoPorHora
        ? Number(folha.autonomo?.horasHoraNormal ?? horasUteis + horasSabadoAutonomo)
        : autonomoDiariaBanco
          ? horasUteis
          : horasUteis,
      valor:
        folha.tipoContrato === 'AUTONOMO' || folha.tipoContrato === 'AUTONOMO_BANCO_HORAS'
          ? Number(folha.valores.valorHorasNormais ?? 0)
          : Number(folha.valores.salarioBase ?? 0),
    },
    horasExtrasSegSex50: {
      // Padrão B: só minutos com P (minutosExtraUteisPagar). diaria_banco usa o mesmo critério.
      horas: autonomoPorHora ? horasHe50Autonomo : horasExtraUteis,
      valor: autonomoPorHora
        ? Number(folha.valores.valorHorasExtras50 ?? 0)
        : autonomoDiariaBanco
          ? Number(folha.autonomo?.valorHePagas ?? valorHorasExtraUteis)
          : valorHorasExtraUteis,
    },
    horasExtrasSabado50: {
      horas: autonomoPorHora
        ? horasSabadoAutonomo
        : usaJornadaBanco
          ? minutosSabadoPagar / 60
          : horasSabado > 0
            ? horasSabado
            : Number(folha.horas.extras50 ?? 0),
      valor: autonomoPorHora
        ? valorSabadoAutonomo
        : autonomoDiariaBanco
          ? 0
          : usaJornadaBanco
            ? (minutosSabadoPagar / 60) * valorHoraBase * 1.5
            : Number(folha.valores.valorHorasExtras50 ?? 0),
    },
    horasExtras100: {
      horas: usaJornadaBanco
        ? minutos100Pagar / 60
        : horasDomingoFeriado > 0
          ? horasDomingoFeriado
          : Number(folha.horas.extras100 ?? 0),
      valor: usaJornadaBanco
        ? (minutos100Pagar / 60) * valorHoraBase * 2
        : Number(folha.valores.valorHorasExtras100 ?? 0),
    },
    horasNoturnas20: {
      horas: horasNoturnas,
      valor: Number(folha.valores.valorHorasNoturnaAutonomo ?? 0),
    },
    totalHorasMes: {
      horas: autonomoPorHora
        ? Number(folha.horas.total ?? horasTrabalhadas)
        : horasTrabalhadas,
    },
    descontoAtraso: { horas: somaAtrasoMin / 60, valor: valorAtraso },
    descontoSaidaAntecipada: { horas: somaSaidaAntMin / 60, valor: valorSaidaAnt },
    descontoFalta: {
      dias: diasFaltaComDesconto,
      horas: faltaHoras,
      valor: autonomoDiariaBanco
        ? Number(folha.autonomo?.valorDescontosD ?? valorFalta)
        : valorFalta,
    },
    totalDescontosRef: {
      horas: autonomoDiariaBanco ? minutosDescontarAval / 60 : totalMinDescontos / 60,
      valor: autonomoDiariaBanco
        ? Number(folha.autonomo?.valorDescontosD ?? 0)
        : totalDescontosRef,
    },
    lancamentosManuais: folha.lancamentos ?? [],
    totalAPagar,
  };
}
