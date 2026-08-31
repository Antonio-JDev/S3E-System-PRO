import { StatusConsistenciaPonto } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  dataHoraEmBrasilia,
  dataReferenciaDiaCivilUtc,
  diaSemanaCivil,
  ehFimDeSemanaCivil,
  ehDomingoOuFeriado,
  ehFeriadoEfetivo,
  inicioFimMesCivilUtc,
  type FeriadoOverrideLookup,
} from '../utils/datetime-sp.util';
import { vincularFaltaJustificadaAoRegistro, vincularJustificativaParcialAoRegistro } from './rhJornada.service';
import { parsePresencaXlsBuffer } from './ponto-import.parser';
import { sincronizarExcessoCompetencia } from './bancoHorasExcesso.service';
import { sincronizarExtratoBancoHorasCompetencia } from './bancoHorasExtrato.service';
import { sincronizarExtratosAposImportXls } from './bancoHorasExtrato.service';
import { sincronizarDescontosDiariaFaltaAposImportPonto } from './autonomoDiariaDesconto.service';
import {
  metricasAvaliacaoDeRegistro,
  reaplicarBancoAvaliacaoAposMudancaMetricas,
  sincronizarBancoAvaliacoesCompetencia,
  type MetricasAvaliacaoDia,
} from './rhComentarioConferencia.service';
import {
  calculateTimeDifference,
  jornadaMinutosPorDia,
} from '../utils/workshift.util';
import {
  aplicaHorasExtras100NoPonto,
  usaJornadaEBanco,
} from '../utils/tipoContrato.util';

const ORIGEM = 'relogio_xls';

function metricasAvaliacaoDeCalc(
  calc: {
    minutosAtraso: number;
    minutosHorasDevidas: number;
    minutosExtra20: number;
    minutosExtra50: number;
    minutosExtra100: number;
  },
  opts: { ehFds: boolean; ehFer: boolean; aplicar100: boolean },
): MetricasAvaliacaoDia {
  const minutosExtra =
    Math.max(0, calc.minutosExtra20) +
    Math.max(0, calc.minutosExtra50) +
    (opts.aplicar100 ? Math.max(0, calc.minutosExtra100) : 0);
  return {
    minutosAtraso: !opts.ehFer && !opts.ehFds ? Math.max(0, Math.round(calc.minutosAtraso)) : 0,
    minutosHorasDevidas:
      !opts.ehFer && !opts.ehFds ? Math.max(0, Math.round(calc.minutosHorasDevidas)) : 0,
    minutosExtra: Math.max(0, Math.round(minutosExtra)),
    minutosFaltaIntegral: 0,
  };
}

async function reaplicarBancoDoDiaSeguro(params: {
  funcionarioId: string;
  ano: number;
  mes: number;
  dia: number;
  metricasAntes: MetricasAvaliacaoDia;
  metricasDepois: MetricasAvaliacaoDia;
}): Promise<void> {
  try {
    await reaplicarBancoAvaliacaoAposMudancaMetricas({
      funcionarioId: params.funcionarioId,
      referenciaAno: params.ano,
      referenciaMes: params.mes,
      dia: params.dia,
      metricasAntes: params.metricasAntes,
      metricasDepois: params.metricasDepois,
    });
  } catch (e) {
    console.error(
      `[ponto] Falha ao reaplicar banco A/B/P/D (${params.funcionarioId} ${params.ano}-${params.mes}-${params.dia}):`,
      e,
    );
  }
}

function parseHoraMinuto(hhmm: string): number {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) throw new Error(`Hora fora do intervalo: ${hhmm}`);
  return h * 60 + min;
}

function diffMinutos(inicio: string, fim: string): number {
  return parseHoraMinuto(fim) - parseHoraMinuto(inicio);
}

/**
 * Regras de cálculo de minutos líquidos:
 * - 0 batidas: 0 minutos, CONSISTENTE
 * - 1 batida: 0 minutos, INCONSISTENTE (não há como calcular intervalo)
 * - 2 batidas: intervalo (0,1), CONSISTENTE
 * - 3 batidas em horário não decrescente: soma (0→1)+(1→2) = primeira→última, CONSISTENTE (entrada / saída almoço / saída)
 * - 5+ batidas ímpares: fallback primeira→última, INCONSISTENTE (falta fechar par)
 * - 4+ batidas pares: soma de intervalos (0,1), (2,3), ..., CONSISTENTE
 * - Qualquer par com fim < início: INCONSISTENTE
 */
export function calcularMinutosLiquidos(batidas: string[]): {
  minutos: number;
  status: StatusConsistenciaPonto;
} {
  const b = batidas.map((s) => s.trim()).filter((s) => s.length > 0);
  if (b.length === 0) {
    return { minutos: 0, status: StatusConsistenciaPonto.CONSISTENTE };
  }

  if (b.length === 1) {
    return { minutos: 0, status: StatusConsistenciaPonto.INCONSISTENTE };
  }

  /** Três batidas em sequência crescente: período manhã + tarde sem 4ª marcação (comum no relógio). */
  if (b.length === 3) {
    try {
      const m0 = parseHoraMinuto(b[0]);
      const m1 = parseHoraMinuto(b[1]);
      const m2 = parseHoraMinuto(b[2]);
      if (m0 <= m1 && m1 <= m2) {
        const total = m2 - m0;
        return {
          minutos: Math.max(0, total),
          status: StatusConsistenciaPonto.CONSISTENTE,
        };
      }
    } catch {
      /* fall through */
    }
    const total = diffMinutos(b[0], b[2]);
    return {
      minutos: Math.max(0, total),
      status: StatusConsistenciaPonto.INCONSISTENTE,
    };
  }

  const impar = b.length % 2 === 1;

  if (impar) {
    const total = diffMinutos(b[0], b[b.length - 1]);
    return {
      minutos: Math.max(0, total),
      status: StatusConsistenciaPonto.INCONSISTENTE,
    };
  }

  // Pares: soma intervalos (0,1), (2,3), ...
  let sum = 0;
  let algumNegativo = false;
  for (let i = 0; i < b.length; i += 2) {
    const d = diffMinutos(b[i], b[i + 1]);
    if (d < 0) algumNegativo = true;
    sum += Math.max(0, d);
  }

  return {
    minutos: sum,
    status: algumNegativo ? StatusConsistenciaPonto.INCONSISTENTE : StatusConsistenciaPonto.CONSISTENTE,
  };
}

export type ImportarPresencaResultado = {
  importados: number;
  atualizados: number;
  ignorados: number;
  inconsistentes: number;
  naoEncontrados: Array<{ codigoRelogio: number; nomeRelogio: string }>;
  errosParse: string[];
  avisos: string[];
  ano: number;
  mes: number;
  /** Autônomos com opção ativa: lançamentos FALTA recriados pela importação */
  descontosDiariaAutonomo?: { funcionariosProcessados: number; lancamentosCriados: number };
  /** Extratos mensais de banco gerados/atualizados após o XLS */
  extratosBancoGerados?: number;
};

export function calcularMetricasRegistro(params: {
  batidas: string[];
  ano: number;
  mes: number;
  dia: number;
  tipoContrato: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS' | string;
  toleranciaMinutos: number;
  workShift?: {
    entrada1: string;
    saida1: string;
    entrada2: string;
    saida2: string;
  } | null;
  /** Overrides manuais de feriado (calendário empresa). */
  feriadoOverrides?: Map<string, FeriadoOverrideLookup> | null;
}) {
  const { batidas, ano, mes, dia, tipoContrato, workShift, feriadoOverrides } = params;
  const tolerancia = Math.max(0, params.toleranciaMinutos ?? 5);
  const { minutos, status } = calcularMinutosLiquidos(batidas);
  const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
  const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);
  const dow = diaSemanaCivil(ano, mes, dia);
  const ehSabado = dow === 6;

  const primeira = batidas[0];
  const ultima = batidas[batidas.length - 1];
  const entrada = dataHoraEmBrasilia(ano, mes, dia, primeira);
  const saida = dataHoraEmBrasilia(ano, mes, dia, ultima);

  let minutosAtraso = 0;
  let minutosHorasDevidas = 0;
  let minutosExtra20 = 0;
  let minutosExtra50 = 0;
  let minutosExtra100 = 0;
  const minutosTrabalhados = Math.max(0, minutos);

  if (
    usaJornadaEBanco(tipoContrato) &&
    workShift &&
    batidas.length >= 2 &&
    !ehFer &&
    !ehSabado &&
    dow >= 1 &&
    dow <= 5
  ) {
    const diff = calculateTimeDifference({
      batidaEntrada: entrada,
      batidaSaida: saida,
      shiftEntrada: workShift.entrada1,
      shiftSaida: workShift.saida2,
      toleranceMin: tolerancia,
    });
    // Compensação diária: minutos extras (chegada antes/saída depois) abatem atraso/saída antecipada no mesmo dia.
    let atrasoEntrada = diff.minutosAtrasoEntrada;
    let saidaAntecipada = diff.minutosSaidaAntecipada;
    let compensacao = Math.max(0, diff.minutosExtraTotal);

    const abatEntrada = Math.min(atrasoEntrada, compensacao);
    atrasoEntrada -= abatEntrada;
    compensacao -= abatEntrada;

    const abatSaida = Math.min(saidaAntecipada, compensacao);
    saidaAntecipada -= abatSaida;
    compensacao -= abatSaida;

    minutosAtraso = atrasoEntrada;
    minutosHorasDevidas = saidaAntecipada;

    const minutosJornada = jornadaMinutosPorDia(workShift);
    const extraLiquidaJornada = Math.max(0, minutosTrabalhados - minutosJornada);
    // Ex.: jornada até 17:18 e saída 17:30 → 12 min viram HE normal (pool de extra após compensar atrasos).
    minutosExtra20 = Math.max(extraLiquidaJornada, compensacao);
  } else if (ehFer && batidas.length >= 2) {
    minutosAtraso = 0;
    minutosHorasDevidas = 0;
  }

  let horasNormais = minutosTrabalhados / 60;
  let horasExtras50 = 0;
  let horasExtras100 = 0;

  if (eh100) {
    minutosExtra100 = minutosTrabalhados;
    horasNormais = 0;
    horasExtras100 = minutosTrabalhados / 60;
  } else if (ehSabado && usaJornadaEBanco(tipoContrato)) {
    minutosExtra50 = minutosTrabalhados;
    horasNormais = 0;
    horasExtras50 = minutosTrabalhados / 60;
  }

  return {
    entrada,
    saida,
    horasNormais,
    horasExtras50,
    horasExtras100,
    minutosTrabalhados,
    minutosAtraso,
    minutosHorasDevidas,
    minutosExtra20,
    minutosExtra50,
    minutosExtra100,
    status,
  };
}

/**
 * Importação: um dia com qualquer batida gera RegistroPonto (mesmo inconsistente / 0h líquidas),
 * permitindo contar diária de autônomo (RhService conta dias úteis com registro).
 */
export async function importarPresencaXls(
  buffer: Buffer,
  options?: { ano?: number; mes?: number },
): Promise<ImportarPresencaResultado> {
  const parsed = parsePresencaXlsBuffer(buffer, options);
  const { ano, mes, colaboradores, errosParse, avisos } = parsed;

  let importados = 0;
  let atualizados = 0;
  let ignorados = 0;
  let inconsistentes = 0;
  const naoEncontrados: Array<{ codigoRelogio: number; nomeRelogio: string }> = [];

  const maxDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const funcionarioIdsAfetados = new Set<string>();
  /** Colaboradores que aparecem no arquivo (para desconto diária autônomo, mesmo sem nenhuma batida). */
  const funcionariosPresentesNoArquivo = new Set<string>();
  const feriadoOverrides = await carregarFeriadoOverridesMes(ano, mes);

  for (const colab of colaboradores) {
    const func = await prisma.funcionario.findFirst({
      where: { codigoRelogio: colab.codigoRelogio },
    });

    if (!func) {
      naoEncontrados.push({ codigoRelogio: colab.codigoRelogio, nomeRelogio: colab.nomeRelogio });
      continue;
    }

    funcionariosPresentesNoArquivo.add(func.id);
    const cfg = await prisma.configuracaoPonto.findUnique({
      where: { funcionarioId: func.id },
      include: { workShift: true },
    });

    for (const { dia, batidas } of colab.dias) {
      if (dia < 1 || dia > maxDia) {
        ignorados++;
        continue;
      }
      if (batidas.length === 0) {
        ignorados++;
        continue;
      }

      const calc = calcularMetricasRegistro({
        batidas,
        ano,
        mes,
        dia,
        tipoContrato: func.tipoContrato,
        toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
        workShift: cfg?.workShift ?? null,
        feriadoOverrides,
      });
      const { status } = calc;
      if (status === StatusConsistenciaPonto.INCONSISTENTE) {
        inconsistentes++;
      }

      const dataRef = dataReferenciaDiaCivilUtc(ano, mes, dia);
      const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
      const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);

      // Autônomo sempre recebe HE 100% em domingos/feriados
      // CLT só recebe se permitirHorasExtras100 = true, caso contrário vai para banco de horas (horasNormais)
      const permitirHE100 = (func as { permitirHorasExtras100?: boolean }).permitirHorasExtras100;
      const aplicar100 =
        eh100 && aplicaHorasExtras100NoPonto(func.tipoContrato, permitirHE100 === true);

      const existente = await prisma.registroPonto.findUnique({
        where: {
          funcionarioId_dataReferencia: {
            funcionarioId: func.id,
            dataReferencia: dataRef,
          },
        },
      });

      const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
      const minutosPrevistosDia = cfg?.workShift
        ? jornadaMinutosPorDia(cfg.workShift)
        : Math.round(((Number(func.cargaHorariaMensal ?? 220) || 220) * 60) / 22);
      const metricasAntes = metricasAvaliacaoDeRegistro({
        reg: existente,
        ehFds: ehFimDeSemana,
        ehFer,
        faltaJustificada: false,
        minutosPrevistosDia,
      });

      const payload = {
        entrada: calc.entrada,
        saida: calc.saida,
        horasNormais: aplicar100 ? 0 : eh100 ? calc.minutosTrabalhados / 60 : calc.horasNormais,
        horasExtras50: calc.horasExtras50,
        horasExtras100: aplicar100 ? calc.horasExtras100 : 0,
        ehFimDeSemana,
        batidasBrutas: batidas,
        statusConsistencia: status,
        origemImportacao: ORIGEM,
        minutosTrabalhados: calc.minutosTrabalhados,
        minutosAtraso: calc.minutosAtraso,
        minutosHorasDevidas: calc.minutosHorasDevidas,
        minutosExtra50: calc.minutosExtra50,
        minutosExtra100: aplicar100 ? calc.minutosExtra100 : 0,
        minutosExtra20: calc.minutosExtra20,
      };

      if (existente) {
        await prisma.registroPonto.update({
          where: { id: existente.id },
          data: payload,
        });
        await vincularFaltaJustificadaAoRegistro(func.id, dataRef, existente.id);
        await vincularJustificativaParcialAoRegistro(func.id, dataRef, existente.id);
        atualizados++;
      } else {
        const criado = await prisma.registroPonto.create({
          data: {
            funcionarioId: func.id,
            dataReferencia: dataRef,
            ...payload,
          },
        });
        await vincularFaltaJustificadaAoRegistro(func.id, dataRef, criado.id);
        await vincularJustificativaParcialAoRegistro(func.id, dataRef, criado.id);
        importados++;
      }

      await reaplicarBancoDoDiaSeguro({
        funcionarioId: func.id,
        ano,
        mes,
        dia,
        metricasAntes,
        metricasDepois: metricasAvaliacaoDeCalc(calc, {
          ehFds: ehFimDeSemana,
          ehFer,
          aplicar100,
        }),
      });
      funcionarioIdsAfetados.add(func.id);
    }
  }

  for (const fid of funcionarioIdsAfetados) {
    await sincronizarExcessoCompetencia(fid, ano, mes);
  }

  // Extrato mensal do banco (saldo inicial → movimentos → saldo final) após o XLS.
  const idsExtrato = new Set([...funcionarioIdsAfetados, ...funcionariosPresentesNoArquivo]);
  const extratosBancoGerados = await sincronizarExtratosAposImportXls(ano, mes, idsExtrato, 'IMPORT_XLS');

  const descontosDiariaAutonomo = await sincronizarDescontosDiariaFaltaAposImportPonto(
    ano,
    mes,
    funcionariosPresentesNoArquivo,
  );

  return {
    importados,
    atualizados,
    ignorados,
    inconsistentes,
    naoEncontrados,
    errosParse,
    avisos,
    ano,
    mes,
    descontosDiariaAutonomo,
    extratosBancoGerados,
  };
}

const ORIGEM_MANUAL = 'manual_rh';

/**
 * Atualiza batidas de um registro existente e recalcula horas (mesma regra da importação).
 */
export async function atualizarRegistroBatidas(registroId: string, batidasInput: string[]) {
  const batidas = batidasInput.map((s) => String(s).trim()).filter((s) => s.length > 0);
  if (batidas.length === 0) {
    throw new Error('Informe ao menos uma batida');
  }

  const reg = await prisma.registroPonto.findUnique({
    where: { id: registroId },
    include: { funcionario: true },
  });
  if (!reg) {
    throw new Error('Registro de ponto não encontrado');
  }

  const func = reg.funcionario;
  const cfg = await prisma.configuracaoPonto.findUnique({
    where: { funcionarioId: func.id },
    include: { workShift: true },
  });
  const dr = reg.dataReferencia;
  const ano = dr.getUTCFullYear();
  const mes = dr.getUTCMonth() + 1;
  const dia = dr.getUTCDate();

  const feriadoOverrides = await carregarFeriadoOverridesMes(ano, mes);
  const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
  const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
  const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);
  const permitirHE100 = func.permitirHorasExtras100 === true;
  const aplicar100 =
    eh100 && aplicaHorasExtras100NoPonto(func.tipoContrato, permitirHE100);

  const metricasAntes = metricasAvaliacaoDeRegistro({
    reg,
    ehFds: ehFimDeSemana,
    ehFer,
    faltaJustificada: false,
    minutosPrevistosDia: cfg?.workShift ? jornadaMinutosPorDia(cfg.workShift) : 480,
  });

  const calc = calcularMetricasRegistro({
    batidas,
    ano,
    mes,
    dia,
    tipoContrato: func.tipoContrato,
    toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
    workShift: cfg?.workShift ?? null,
    feriadoOverrides,
  });
  const status = calc.status;

  const updated = await prisma.registroPonto.update({
    where: { id: registroId },
    data: {
      entrada: calc.entrada,
      saida: calc.saida,
      horasNormais: aplicar100 ? 0 : eh100 ? calc.minutosTrabalhados / 60 : calc.horasNormais,
      horasExtras50: calc.horasExtras50,
      horasExtras100: aplicar100 ? calc.horasExtras100 : 0,
      ehFimDeSemana,
      batidasBrutas: batidas as any,
      statusConsistencia: status,
      origemImportacao: ORIGEM_MANUAL,
      minutosTrabalhados: calc.minutosTrabalhados,
      minutosAtraso: calc.minutosAtraso,
      minutosHorasDevidas: calc.minutosHorasDevidas,
      minutosExtra50: calc.minutosExtra50,
      minutosExtra100: aplicar100 ? calc.minutosExtra100 : 0,
      minutosExtra20: calc.minutosExtra20,
    },
  });

  await vincularFaltaJustificadaAoRegistro(func.id, dr, registroId);
  await vincularJustificativaParcialAoRegistro(func.id, dr, registroId);
  await sincronizarExcessoCompetencia(func.id, ano, mes);

  const metricasDepois = metricasAvaliacaoDeCalc(calc, {
    ehFds: ehFimDeSemana,
    ehFer,
    aplicar100,
  });
  await reaplicarBancoDoDiaSeguro({
    funcionarioId: func.id,
    ano,
    mes,
    dia,
    metricasAntes,
    metricasDepois,
  });

  return updated;
}

/**
 * Cria registro de ponto manual (RH) em dia sem marcação no relógio.
 */
export async function criarRegistroBatidasManual(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  dia: number;
  batidasInput: string[];
}) {
  const batidas = params.batidasInput.map((s) => String(s).trim()).filter((s) => s.length > 0);
  if (batidas.length === 0) {
    throw new Error('Informe ao menos uma batida');
  }

  const func = await prisma.funcionario.findUnique({ where: { id: params.funcionarioId } });
  if (!func) throw new Error('Funcionário não encontrado');

  const { referenciaAno: ano, referenciaMes: mes, dia } = params;
  const dataRef = dataReferenciaDiaCivilUtc(ano, mes, dia);

  const existente = await prisma.registroPonto.findUnique({
    where: {
      funcionarioId_dataReferencia: {
        funcionarioId: params.funcionarioId,
        dataReferencia: dataRef,
      },
    },
  });
  if (existente) {
    return atualizarRegistroBatidas(existente.id, batidas);
  }

  const cfg = await prisma.configuracaoPonto.findUnique({
    where: { funcionarioId: func.id },
    include: { workShift: true },
  });

  const feriadoOverrides = await carregarFeriadoOverridesMes(ano, mes);
  const calc = calcularMetricasRegistro({
    batidas,
    ano,
    mes,
    dia,
    tipoContrato: func.tipoContrato,
    toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
    workShift: cfg?.workShift ?? null,
    feriadoOverrides,
  });

  const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
  const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
  const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);
  const permitirHE100 = func.permitirHorasExtras100 === true;
  const aplicar100 = eh100 && aplicaHorasExtras100NoPonto(func.tipoContrato, permitirHE100);

  const minutosPrevistosDia = cfg?.workShift
    ? jornadaMinutosPorDia(cfg.workShift)
    : Math.round(((Number(func.cargaHorariaMensal ?? 220) || 220) * 60) / 22);
  const metricasAntes = metricasAvaliacaoDeRegistro({
    reg: null,
    ehFds: ehFimDeSemana,
    ehFer,
    faltaJustificada: false,
    minutosPrevistosDia,
  });

  const criado = await prisma.registroPonto.create({
    data: {
      funcionarioId: func.id,
      dataReferencia: dataRef,
      entrada: calc.entrada,
      saida: calc.saida,
      horasNormais: aplicar100 ? 0 : eh100 ? calc.minutosTrabalhados / 60 : calc.horasNormais,
      horasExtras50: calc.horasExtras50,
      horasExtras100: aplicar100 ? calc.horasExtras100 : 0,
      ehFimDeSemana,
      batidasBrutas: batidas as any,
      statusConsistencia: calc.status,
      origemImportacao: ORIGEM_MANUAL,
      minutosTrabalhados: calc.minutosTrabalhados,
      minutosAtraso: calc.minutosAtraso,
      minutosHorasDevidas: calc.minutosHorasDevidas,
      minutosExtra50: calc.minutosExtra50,
      minutosExtra100: aplicar100 ? calc.minutosExtra100 : 0,
      minutosExtra20: calc.minutosExtra20,
    },
  });

  await vincularFaltaJustificadaAoRegistro(func.id, dataRef, criado.id);
  await vincularJustificativaParcialAoRegistro(func.id, dataRef, criado.id);
  await sincronizarExcessoCompetencia(func.id, ano, mes);

  const metricasDepois = metricasAvaliacaoDeCalc(calc, {
    ehFds: ehFimDeSemana,
    ehFer,
    aplicar100,
  });
  await reaplicarBancoDoDiaSeguro({
    funcionarioId: func.id,
    ano,
    mes,
    dia,
    metricasAntes,
    metricasDepois,
  });

  return criado;
}

function normalizarBatidasBrutas(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
}

async function carregarFeriadoOverridesMes(
  ano: number,
  mes: number,
): Promise<Map<string, FeriadoOverrideLookup>> {
  const inicio = dataReferenciaDiaCivilUtc(ano, mes, 1);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = dataReferenciaDiaCivilUtc(ano, mes, ultimoDia);
  const rows = await prisma.feriadoCalendarioOverride.findMany({
    where: { dataReferencia: { gte: inicio, lte: fim } },
  });
  const map = new Map<string, FeriadoOverrideLookup>();
  for (const r of rows) {
    const d = r.dataReferencia;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    map.set(key, { ehFeriado: r.ehFeriado, nome: r.nome });
  }
  return map;
}

/**
 * Recalcula métricas de jornada APENAS do funcionário informado, a partir de `batidasBrutas`
 * e da workshift/config atuais. Nunca exclui registros nem toca overrides de RH (A/B/P/D, comentários, ocorrências).
 * Se `ano`/`mes` forem informados, restringe ao mês civil (UTC).
 */
export async function recalcularMetricasFuncionario(
  funcionarioId: string,
  opts?: { ano?: number; mes?: number },
): Promise<{
  funcionarioId: string;
  registrosAtualizados: number;
  registrosIgnoradosSemBatidas: number;
}> {
  const func = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!func) {
    throw new Error('Funcionário não encontrado');
  }

  const cfg = await prisma.configuracaoPonto.findUnique({
    where: { funcionarioId },
    include: { workShift: true },
  });

  const whereReg: { funcionarioId: string; dataReferencia?: { gte: Date; lte: Date } } = {
    funcionarioId,
  };
  if (
    opts?.ano != null &&
    opts?.mes != null &&
    Number.isFinite(opts.ano) &&
    Number.isFinite(opts.mes) &&
    opts.mes >= 1 &&
    opts.mes <= 12
  ) {
    const { inicio, fim } = inicioFimMesCivilUtc(opts.ano, opts.mes);
    whereReg.dataReferencia = { gte: inicio, lte: fim };
  }

  const registros = await prisma.registroPonto.findMany({
    where: whereReg,
    select: {
      id: true,
      dataReferencia: true,
      batidasBrutas: true,
      minutosAtraso: true,
      minutosHorasDevidas: true,
      minutosExtra20: true,
      minutosExtra50: true,
      minutosExtra100: true,
      horasExtras50: true,
      horasExtras100: true,
    },
  });

  let registrosAtualizados = 0;
  let registrosIgnoradosSemBatidas = 0;
  const competencias = new Set<string>();
  const overridesPorMes = new Map<string, Map<string, FeriadoOverrideLookup>>();

  for (const reg of registros) {
    const batidas = normalizarBatidasBrutas(reg.batidasBrutas);
    if (batidas.length === 0) {
      registrosIgnoradosSemBatidas += 1;
      continue;
    }

    const dr = reg.dataReferencia;
    const ano = dr.getUTCFullYear();
    const mes = dr.getUTCMonth() + 1;
    const dia = dr.getUTCDate();
    const mesKey = `${ano}-${mes}`;
    if (!overridesPorMes.has(mesKey)) {
      overridesPorMes.set(mesKey, await carregarFeriadoOverridesMes(ano, mes));
    }
    const feriadoOverrides = overridesPorMes.get(mesKey)!;

    const calc = calcularMetricasRegistro({
      batidas,
      ano,
      mes,
      dia,
      tipoContrato: func.tipoContrato,
      toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
      workShift: cfg?.workShift ?? null,
      feriadoOverrides,
    });

    const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
    const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
    const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);
    const permitirHE100 = func.permitirHorasExtras100 === true;
    const aplicar100 =
      eh100 && aplicaHorasExtras100NoPonto(func.tipoContrato, permitirHE100);

    const metricasAntes = metricasAvaliacaoDeRegistro({
      reg,
      ehFds: ehFimDeSemana,
      ehFer,
      faltaJustificada: false,
      minutosPrevistosDia: cfg?.workShift ? jornadaMinutosPorDia(cfg.workShift) : 480,
    });

    await prisma.registroPonto.update({
      where: { id: reg.id },
      data: {
        entrada: calc.entrada,
        saida: calc.saida,
        horasNormais: aplicar100 ? 0 : eh100 ? calc.minutosTrabalhados / 60 : calc.horasNormais,
        horasExtras50: calc.horasExtras50,
        horasExtras100: aplicar100 ? calc.horasExtras100 : 0,
        ehFimDeSemana,
        statusConsistencia: calc.status,
        minutosTrabalhados: calc.minutosTrabalhados,
        minutosAtraso: calc.minutosAtraso,
        minutosHorasDevidas: calc.minutosHorasDevidas,
        minutosExtra50: calc.minutosExtra50,
        minutosExtra100: aplicar100 ? calc.minutosExtra100 : 0,
        minutosExtra20: calc.minutosExtra20,
      },
    });

    await reaplicarBancoDoDiaSeguro({
      funcionarioId,
      ano,
      mes,
      dia,
      metricasAntes,
      metricasDepois: metricasAvaliacaoDeCalc(calc, {
        ehFds: ehFimDeSemana,
        ehFer,
        aplicar100,
      }),
    });

    registrosAtualizados += 1;
    competencias.add(`${ano}-${mes}`);
  }

  for (const key of competencias) {
    const [anoStr, mesStr] = key.split('-');
    await sincronizarExcessoCompetencia(funcionarioId, parseInt(anoStr, 10), parseInt(mesStr, 10));
  }

  const mesesBanco = new Set(competencias);
  if (
    opts?.ano != null &&
    opts?.mes != null &&
    Number.isFinite(opts.ano) &&
    Number.isFinite(opts.mes)
  ) {
    mesesBanco.add(`${opts.ano}-${opts.mes}`);
  } else {
    const comentarios = await prisma.comentarioConferenciaPontoRh.findMany({
      where: { funcionarioId },
      select: { dataReferencia: true },
    });
    for (const c of comentarios) {
      const dr = c.dataReferencia;
      if (!(dr instanceof Date) || Number.isNaN(dr.getTime())) continue;
      mesesBanco.add(`${dr.getUTCFullYear()}-${dr.getUTCMonth() + 1}`);
    }
  }
  for (const key of mesesBanco) {
    const [anoStr, mesStr] = key.split('-');
    const a = parseInt(anoStr, 10);
    const m = parseInt(mesStr, 10);
    if (!Number.isFinite(a) || !Number.isFinite(m)) continue;
    await sincronizarBancoAvaliacoesCompetencia(funcionarioId, a, m);
    try {
      await sincronizarExtratoBancoHorasCompetencia({
        funcionarioId,
        referenciaAno: a,
        referenciaMes: m,
        origem: 'RECALC',
      });
    } catch (e) {
      console.error(`[ponto] Falha ao sincronizar extrato banco (${funcionarioId} ${a}-${m}):`, e);
    }
  }

  return {
    funcionarioId,
    registrosAtualizados,
    registrosIgnoradosSemBatidas,
  };
}

/**
 * Recalcula todos os registros de ponto de um dia civil (todos os funcionários).
 * Usado após override de feriado — preserva batidas; só atualiza métricas.
 */
export async function recalcularMetricasDoDiaCivil(
  ano: number,
  mes: number,
  dia: number,
): Promise<{ registrosAtualizados: number }> {
  const dataRef = dataReferenciaDiaCivilUtc(ano, mes, dia);
  const feriadoOverrides = await carregarFeriadoOverridesMes(ano, mes);

  const registros = await prisma.registroPonto.findMany({
    where: { dataReferencia: dataRef },
    include: { funcionario: true },
  });

  let registrosAtualizados = 0;
  const funcionariosCompetencia = new Set<string>();

  for (const reg of registros) {
    const batidas = normalizarBatidasBrutas(reg.batidasBrutas);
    if (batidas.length === 0) continue;

    const func = reg.funcionario;
    const cfg = await prisma.configuracaoPonto.findUnique({
      where: { funcionarioId: func.id },
      include: { workShift: true },
    });

    const calc = calcularMetricasRegistro({
      batidas,
      ano,
      mes,
      dia,
      tipoContrato: func.tipoContrato,
      toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
      workShift: cfg?.workShift ?? null,
      feriadoOverrides,
    });

    const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
    const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
    const eh100 = ehDomingoOuFeriado(ano, mes, dia, feriadoOverrides);
    const permitirHE100 = func.permitirHorasExtras100 === true;
    const aplicar100 =
      eh100 && aplicaHorasExtras100NoPonto(func.tipoContrato, permitirHE100);

    const metricasAntes = metricasAvaliacaoDeRegistro({
      reg,
      ehFds: ehFimDeSemana,
      ehFer,
      faltaJustificada: false,
      minutosPrevistosDia: cfg?.workShift ? jornadaMinutosPorDia(cfg.workShift) : 480,
    });

    await prisma.registroPonto.update({
      where: { id: reg.id },
      data: {
        entrada: calc.entrada,
        saida: calc.saida,
        horasNormais: aplicar100 ? 0 : eh100 ? calc.minutosTrabalhados / 60 : calc.horasNormais,
        horasExtras50: calc.horasExtras50,
        horasExtras100: aplicar100 ? calc.horasExtras100 : 0,
        ehFimDeSemana,
        statusConsistencia: calc.status,
        minutosTrabalhados: calc.minutosTrabalhados,
        minutosAtraso: calc.minutosAtraso,
        minutosHorasDevidas: calc.minutosHorasDevidas,
        minutosExtra50: calc.minutosExtra50,
        minutosExtra100: aplicar100 ? calc.minutosExtra100 : 0,
        minutosExtra20: calc.minutosExtra20,
      },
    });

    await reaplicarBancoDoDiaSeguro({
      funcionarioId: func.id,
      ano,
      mes,
      dia,
      metricasAntes,
      metricasDepois: metricasAvaliacaoDeCalc(calc, {
        ehFds: ehFimDeSemana,
        ehFer,
        aplicar100,
      }),
    });

    registrosAtualizados += 1;
    funcionariosCompetencia.add(func.id);
  }

  for (const funcionarioId of funcionariosCompetencia) {
    await sincronizarExcessoCompetencia(funcionarioId, ano, mes);
  }

  return { registrosAtualizados };
}
