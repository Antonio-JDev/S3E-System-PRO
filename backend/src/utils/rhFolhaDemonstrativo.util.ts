type LancamentoFolha = {
  id: string;
  categoria: string;
  valor: number;
  descricao: string | null;
  quantidadeHoras: number | null;
};

type FolhaInput = {
  tipoContrato: 'REGISTRADO' | 'AUTONOMO';
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
    horasNoturna?: number;
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
      minutosPagarFolha?: number;
      minutosAbonados?: number;
    } | null;
    minutosAtraso?: number;
    minutosHorasDevidas?: number;
    minutosExtra20?: number;
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
  const total = (toMinutes(j.saida1) - toMinutes(j.entrada1)) + (toMinutes(j.saida2) - toMinutes(j.entrada2));
  return Math.max(1, total / 60);
}

export function calcularDemonstrativoFolha(folha: FolhaInput): FolhaDemonstrativoResumo {
  const valorHoraBase = Number(folha.valores.valorHoraBase ?? 0);
  const valorMinuto = valorHoraBase / 60;

  const horasTrabalhadas = Number(
    folha.resumoPonto?.horasTrabalhadas ?? folha.horas.total ?? 0,
  );
  const horasNoturnas = Number(folha.autonomo?.horasNoturna ?? 0);

  let horasUteis = 0;
  let horasSabado = 0;
  let horasDomingoFeriado = 0;
  let minutosExtraUteis = 0;
  let somaAtrasoMin = 0;
  let somaSaidaAntMin = 0;

  let diasFaltaComDesconto = 0;
  let minutosFaltaComDesconto = 0;

  for (const row of folha.conferenciaPonto || []) {
    const minAtrasoBruto = row.ehFeriado ? 0 : Number(row.minutosAtraso ?? 0);
    const minSaidaBruto = row.ehFeriado ? 0 : Number(row.minutosHorasDevidas ?? 0);
    const td = row.tratamentoDebito ?? null;
    const descontoForcadoDia = Math.max(0, Number(row.avaliacaoRh?.minutosDescontarFolha ?? 0));

    const minAtraso =
      td === 'A' || td === 'B'
        ? 0
        : minAtrasoBruto;
    const minSaida =
      td === 'A' || td === 'B'
        ? 0
        : minSaidaBruto;
    somaAtrasoMin += Math.max(0, minAtraso);
    somaSaidaAntMin += Math.max(0, minSaida);

    const ehDiaUtilSemRegistro =
      !row.temRegistro && !row.ehFeriado && !row.ehFimDeSemana && !row.faltaJustificada;
    if (ehDiaUtilSemRegistro) {
      const minFaltaDia = Math.max(0, Number(row.minutosMetaDia ?? Math.round(jornadaHorasDia(folha) * 60)));
      if (td === 'D') {
        const minDescontoDia = descontoForcadoDia > 0 ? descontoForcadoDia : minFaltaDia;
        if (minDescontoDia > 0) {
          diasFaltaComDesconto += 1;
          minutosFaltaComDesconto += minDescontoDia;
        }
      } else if (td !== 'A' && td !== 'B') {
        diasFaltaComDesconto += 1;
        minutosFaltaComDesconto += minFaltaDia;
      }
    }

    if (!row.temRegistro) continue;
    const h = Number(row.horasLiquidas || 0);

    if (row.ehFeriado || row.diaSemana === 0) {
      horasDomingoFeriado += h;
    } else if (row.diaSemana === 6) {
      horasSabado += h;
    } else {
      horasUteis += h;
      const tc = row.tratamentoCredito ?? null;
      const extraDia = Math.max(0, Number(row.minutosExtra20 ?? 0));
      if (tc !== 'B') {
        minutosExtraUteis += extraDia;
      }
    }
  }

  const horasExtraUteis = minutosExtraUteis / 60;
  const valorHorasExtraUteis = horasExtraUteis * valorHoraBase;
  const valorAtraso = somaAtrasoMin * valorMinuto;
  const valorSaidaAnt = somaSaidaAntMin * valorMinuto;
  const faltaHoras = minutosFaltaComDesconto / 60;
  const valorFalta = minutosFaltaComDesconto * valorMinuto;
  const totalDescontosRef = valorAtraso + valorSaidaAnt + valorFalta;
  const totalMinDescontos = somaAtrasoMin + somaSaidaAntMin + Math.round(faltaHoras * 60);

  const creditosHoras =
    folha.tipoContrato === 'AUTONOMO'
      ? Number(folha.valores.valorHorasAutonomo ?? 0)
      : Number(folha.valores.salarioBase ?? 0) +
        (folha.permitirHorasExtras100
          ? Number(folha.valores.valorHorasExtras50 ?? 0) +
            Number(folha.valores.valorHorasExtras100 ?? 0) +
            Number(folha.valores.valorHorasNoturnaAutonomo ?? 0)
          : 0);

  const totalAPagar =
    creditosHoras +
    Number(folha.valores.totalBeneficios ?? 0) +
    Number(folha.totaisLancamentos?.acrescimos ?? 0) -
    Number(folha.totaisLancamentos?.subtracoes ?? 0) -
    totalDescontosRef;

  return {
    horasNormais: {
      horas: horasUteis,
      valor:
        folha.tipoContrato === 'AUTONOMO'
          ? Number(folha.valores.valorHorasNormais ?? 0)
          : Number(folha.valores.salarioBase ?? 0),
    },
    horasExtrasSegSex50: {
      horas: horasExtraUteis,
      valor: valorHorasExtraUteis,
    },
    horasExtrasSabado50: {
      horas: horasSabado > 0 ? horasSabado : Number(folha.horas.extras50 ?? 0),
      valor: Number(folha.valores.valorHorasExtras50 ?? 0),
    },
    horasExtras100: {
      horas: horasDomingoFeriado > 0 ? horasDomingoFeriado : Number(folha.horas.extras100 ?? 0),
      valor: Number(folha.valores.valorHorasExtras100 ?? 0),
    },
    horasNoturnas20: {
      horas: horasNoturnas,
      valor: Number(folha.valores.valorHorasNoturnaAutonomo ?? 0),
    },
    totalHorasMes: { horas: horasTrabalhadas },
    descontoAtraso: { horas: somaAtrasoMin / 60, valor: valorAtraso },
    descontoSaidaAntecipada: { horas: somaSaidaAntMin / 60, valor: valorSaidaAnt },
    descontoFalta: {
      dias: diasFaltaComDesconto,
      horas: faltaHoras,
      valor: valorFalta,
    },
    totalDescontosRef: {
      horas: totalMinDescontos / 60,
      valor: totalDescontosRef,
    },
    lancamentosManuais: folha.lancamentos ?? [],
    totalAPagar,
  };
}
