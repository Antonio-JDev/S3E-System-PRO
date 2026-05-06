import { StatusConsistenciaPonto } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  dataHoraEmBrasilia,
  dataReferenciaDiaCivilUtc,
  diaSemanaCivil,
  ehFimDeSemanaCivil,
  ehDomingoOuFeriado,
} from '../utils/datetime-sp.util';
import { parsePresencaXlsBuffer } from './ponto-import.parser';
import { sincronizarExcessoCompetencia } from './bancoHorasExcesso.service';
import { sincronizarDescontosDiariaFaltaAposImportPonto } from './autonomoDiariaDesconto.service';
import {
  calculateTimeDifference,
  jornadaMinutosPorDia,
} from '../utils/workshift.util';

const ORIGEM = 'relogio_xls';

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
};

function calcularMetricasRegistro(params: {
  batidas: string[];
  ano: number;
  mes: number;
  dia: number;
  tipoContrato: 'REGISTRADO' | 'AUTONOMO';
  toleranciaMinutos: number;
  workShift?: {
    entrada1: string;
    saida1: string;
    entrada2: string;
    saida2: string;
  } | null;
}) {
  const { batidas, ano, mes, dia, tipoContrato, workShift } = params;
  const tolerancia = Math.max(0, params.toleranciaMinutos ?? 5);
  const { minutos, status } = calcularMinutosLiquidos(batidas);
  const eh100 = ehDomingoOuFeriado(ano, mes, dia);
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

  if (tipoContrato === 'REGISTRADO' && workShift && batidas.length >= 2) {
    const diff = calculateTimeDifference({
      batidaEntrada: entrada,
      batidaSaida: saida,
      shiftEntrada: workShift.entrada1,
      shiftSaida: workShift.saida2,
      toleranceMin: tolerancia,
    });
    minutosAtraso = diff.minutosAtrasoEntrada;
    minutosHorasDevidas = diff.minutosSaidaAntecipada;

    const minutosJornada = jornadaMinutosPorDia(workShift);
    minutosExtra20 = Math.max(0, minutosTrabalhados - minutosJornada);
  }

  let horasNormais = minutosTrabalhados / 60;
  let horasExtras50 = 0;
  let horasExtras100 = 0;

  if (eh100) {
    minutosExtra100 = minutosTrabalhados;
    horasNormais = 0;
    horasExtras100 = minutosTrabalhados / 60;
  } else if (ehSabado && tipoContrato === 'REGISTRADO') {
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
      });
      const { status } = calc;
      if (status === StatusConsistenciaPonto.INCONSISTENTE) {
        inconsistentes++;
      }

      const dataRef = dataReferenciaDiaCivilUtc(ano, mes, dia);
      const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
      const eh100 = ehDomingoOuFeriado(ano, mes, dia);

      // Autônomo sempre recebe HE 100% em domingos/feriados
      // CLT só recebe se permitirHorasExtras100 = true, caso contrário vai para banco de horas (horasNormais)
      const permitirHE100 = (func as { permitirHorasExtras100?: boolean }).permitirHorasExtras100;
      const aplicar100 =
        eh100 && (func.tipoContrato === 'AUTONOMO' || permitirHE100 === true);

      const existente = await prisma.registroPonto.findUnique({
        where: {
          funcionarioId_dataReferencia: {
            funcionarioId: func.id,
            dataReferencia: dataRef,
          },
        },
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
        atualizados++;
      } else {
        await prisma.registroPonto.create({
          data: {
            funcionarioId: func.id,
            dataReferencia: dataRef,
            ...payload,
          },
        });
        importados++;
      }
      funcionarioIdsAfetados.add(func.id);
    }
  }

  for (const fid of funcionarioIdsAfetados) {
    await sincronizarExcessoCompetencia(fid, ano, mes);
  }

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

  const calc = calcularMetricasRegistro({
    batidas,
    ano,
    mes,
    dia,
    tipoContrato: func.tipoContrato,
    toleranciaMinutos: cfg?.toleranciaMinutos ?? 5,
    workShift: cfg?.workShift ?? null,
  });
  const status = calc.status;

  const ehFimDeSemana = ehFimDeSemanaCivil(ano, mes, dia);
  const eh100 = ehDomingoOuFeriado(ano, mes, dia);
  const permitirHE100 = func.permitirHorasExtras100 === true;
  const aplicar100 =
    eh100 && (func.tipoContrato === 'AUTONOMO' || permitirHE100);

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

  await sincronizarExcessoCompetencia(func.id, ano, mes);

  return updated;
}
