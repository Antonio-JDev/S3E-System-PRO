/**
 * Folha de pagamento: AUTÔNOMO (diária × dias com ponto; modo tarifas: acréscimos HE50/noturno/dom-fer)
 * e REGISTRADO (salário + banco de horas).
 */
import { prisma } from '../lib/prisma';
import {
  LancamentoFolhaCategoria,
  ModoQuitacaoHorasNegativas,
  PeriodoCompensacaoHoras,
  StatusConsistenciaPonto,
  TipoContratoFuncionario,
} from '@prisma/client';
import {
  inicioFimMesCivilUtc,
  diasNoMes,
  chaveDiaUtc,
  diaSemanaCivil,
  labelDiaSemana,
  formatHoraBrasilia,
  ehDomingoOuFeriado,
  ehFeriado,
  nomeFeriado,
} from '../utils/datetime-sp.util';
import { minutosMeiaNoiteBrasilia, splitMinutosJornadaSegSex } from '../utils/autonomo-folha.util';
import { sincronizarExcessoCompetencia } from './bancoHorasExcesso.service';
import { decomporExcessoBancoHoras } from '../utils/banco-horas-excesso.util';
import { calculateMonthlyTotal } from '../utils/workshift.util';

interface CalcularFolhaMesParams {
  funcionarioId: string;
  dataReferencia: Date | string;
}

export type SituacaoPontoDia = 'OK' | 'OK_PARCIAL' | 'Sem registro' | 'Inconsistente';

export interface ConferenciaPontoDia {
  dia: number;
  diaSemana: number;
  diaSemanaLabel: string;
  ehFimDeSemana: boolean;
  /** Feriado nacional/municipal (calendário do sistema — mesmo usado na folha autônomo) */
  ehFeriado: boolean;
  /** Nome do feriado quando aplicável */
  nomeFeriado: string | null;
  temRegistro: boolean;
  horasLiquidas: number;
  entrada: string | null;
  saida: string | null;
  /** Todas as batidas do dia (como na planilha do relógio) */
  batidas: string[];
  registroPontoId: string | null;
  statusConsistencia: StatusConsistenciaPonto | null;
  situacao: SituacaoPontoDia;
  minutosAtraso: number;
  minutosHorasDevidas: number;
  minutosExtra20: number;
  faltaJustificada: boolean;
  faltaJustificadaOcorrenciaId?: string | null;
  faltaJustificadaDescricao?: string | null;
  faltaJustificadaDocumentoUrl?: string | null;
  faltaJustificadaDocumentoNome?: string | null;
  justificativaParcial?: {
    id: string;
    tipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
    horaInicio: string | null;
    horaFim: string | null;
    descricao: string | null;
    documentoAnexoUrl?: string | null;
    documentoAnexoNome?: string | null;
  } | null;
  minutosMetaDia?: number;
  statusCompensacaoRh?: 'PENDENTE' | 'APROVADO_RH' | 'REPROVADO' | null;
  compensacaoDiaId?: string | null;
  /** Intervalo de almoço explícito (manual), formato "HH:mm" */
  intervaloAlmocoInicio?: string | null;
  /** Intervalo de almoço explícito (manual), formato "HH:mm" */
  intervaloAlmocoFim?: string | null;
}

export interface FolhaMesResumo {
  funcionarioId: string;
  nome: string;
  tipoContrato: TipoContratoFuncionario;
  referencia: {
    ano: number;
    mes: number;
  };
  horas: {
    normais: number;
    extras50: number;
    extras100: number;
    fimDeSemana: number;
    total: number;
  };
  valores: {
    salarioBase: number;
    valorHoraBase: number;
    valorHorasNormais: number;
    valorHorasExtras50: number;
    valorHorasExtras100: number;
    valorHorasAutonomo: number;
    /** Autônomo modo por_hora: trecho noturno (após 18h), pago como acréscimo */
    valorHorasNoturnaAutonomo?: number;
    totalBeneficios: number;
    totalAPagar: number;
    /** Total calculado sem lançamentos manuais (+/-) */
    totalSemBonusDescontos: number;
  };
  resumoPonto?: {
    diasFaltados: number;
    horasTrabalhadas: number;
    /** Dias úteis sem registro (para detalhar no PDF) */
    diasFaltadosDetalhe?: Array<{ dia: number; diaSemanaLabel: string }>;
  };
  /** CLT: quando true, HE são pagas (não usar banco de horas no resumo do PDF) */
  permitirHorasExtras100?: boolean;
  folgas?: {
    horasFolgaAcumuladas: number;
  };
  /** Detalhe autônomo: diárias legado ou breakdown por tarifas de hora */
  autonomo?: {
    modo: 'legacy' | 'por_hora';
    /** Com tarifas: dias seg–sex (não feriado) com registro de ponto × diária. Legado: seg–sex com registro. */
    diasUteisComRegistro: number;
    valorDiaria: number;
    valorHoraFimDeSemana: number;
    subtotalDiarias: number;
    subtotalFimDeSemana: number;
    /** modo por_hora: sábado pago por hora normal (não entra na diária) */
    subtotalSabado?: number;
    horasSabado?: number;
    /** Horas dentro de 8h–17h30 em seg–sex não feriado (só auditoria; valor coberto pela diária) */
    horasNormaisJornadaAuditoria?: number;
    /** HE 50% + noturna + domingo/feriado */
    totalAcrescimosJornada?: number;
    /** modo por_hora: subtotalSabado; legado não usa */
    subtotalHoraNormal?: number;
    subtotalHoraExtra50?: number;
    subtotalHoraExtra100?: number;
    subtotalHoraNoturna?: number;
    /** modo por_hora: horas jornada (seg–sex) + sábado, para conferência */
    horasHoraNormal?: number;
    horasExtra50?: number;
    horasExtra100?: number;
    horasNoturna?: number;
  };
  /** Detalhe CLT: banco de horas */
  registrado?: {
    cargaHorariaMensal: number;
    horasTrabalhadasNoMes: number;
    horasExcedentesParaBanco: number;
    /** Parte do excedente do mês atribuída a HE 100% (vs jornada/HE50) */
    horasExcedentesNormaisCompetencia: number;
    horasExcedentesExtras100Competencia: number;
    saldoBancoHorasAtual: number;
    saldoBancoHorasNormaisAtual: number;
    saldoBancoHorasExtras100Atual: number;
    saldoBancoHorasProjetado: number;
    horasNegativas: number;
    horasDevidas: number;
    modoQuitacaoHorasNegativas: ModoQuitacaoHorasNegativas | null;
    periodoCompensacaoHoras: PeriodoCompensacaoHoras | null;
  };
  jornada?: {
    id: string | null;
    nome: string | null;
    entrada1: string | null;
    saida1: string | null;
    entrada2: string | null;
    saida2: string | null;
    toleranciaMinutos: number;
    cargaHorariaMensalCalculada: number | null;
  };
  dividaHoras?: {
    horasNegativas: number;
    horasCompensacaoPendente: number;
    horasCompensacaoAprovadas: number;
  };
  lancamentos: Array<{
    id: string;
    categoria: LancamentoFolhaCategoria;
    valor: number;
    descricao: string | null;
    quantidadeHoras: number | null;
    horasComponenteNormais: number | null;
    horasComponenteExtras100: number | null;
  }>;
  totaisLancamentos: {
    subtracoes: number;
    acrescimos: number;
  };
  conferenciaPonto: ConferenciaPontoDia[];
}

function getMesReferenciaRange(dataReferencia: Date): { inicio: Date; fim: Date; ano: number; mes: number } {
  const ano = dataReferencia.getUTCFullYear();
  const mesIndex = dataReferencia.getUTCMonth();
  const { inicio, fim } = inicioFimMesCivilUtc(ano, mesIndex + 1);
  return { inicio, fim, ano, mes: mesIndex + 1 };
}

function diaSemanaUtc(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)).getUTCDay();
}

export const RhService = {
  async calcularFolhaMes(params: CalcularFolhaMesParams): Promise<FolhaMesResumo> {
    const { funcionarioId } = params;
    const dataRef =
      params.dataReferencia instanceof Date ? params.dataReferencia : new Date(params.dataReferencia);

    const { inicio, fim, ano, mes } = getMesReferenciaRange(dataRef);

    await sincronizarExcessoCompetencia(funcionarioId, ano, mes);

    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        configuracaoPonto: {
          include: { workShift: true },
        },
        beneficios: true,
        registrosPonto: {
          where: {
            dataReferencia: {
              gte: inicio,
              lte: fim,
            },
          },
        },
        ocorrenciasPontoRh: {
          where: {
            dataReferencia: {
              gte: inicio,
              lte: fim,
            },
          },
        },
        workShiftCompensacoes: {
          where: {
            referenciaAno: ano,
            referenciaMes: mes,
          },
          include: { dias: true },
        },
      },
    });

    if (!funcionario) {
      throw new Error('Funcionário não encontrado');
    }

    const lancamentosDb = await prisma.lancamentoFolha.findMany({
      where: {
        funcionarioId,
        referenciaAno: ano,
        referenciaMes: mes,
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtracoesLanc = 0;
    let acrescimosLanc = 0;
    for (const l of lancamentosDb) {
      const v = Number(l.valor);
      if (
        l.categoria === LancamentoFolhaCategoria.ACRESCIMO ||
        l.categoria === LancamentoFolhaCategoria.PAGAMENTO_BANCO_HORAS
      ) {
        acrescimosLanc += v;
      } else {
        subtracoesLanc += v;
      }
    }

    const lancamentos = lancamentosDb.map((l) => ({
      id: l.id,
      categoria: l.categoria,
      valor: Number(l.valor),
      descricao: l.descricao,
      quantidadeHoras: l.quantidadeHoras != null ? Number(l.quantidadeHoras) : null,
      horasComponenteNormais: l.horasComponenteNormais != null ? Number(l.horasComponenteNormais) : null,
      horasComponenteExtras100:
        l.horasComponenteExtras100 != null ? Number(l.horasComponenteExtras100) : null,
    }));

    const registros = funcionario.registrosPonto ?? [];

    let horasNormais = 0;
    let horasExtras50 = 0;
    let horasExtras100 = 0;
    let horasFimDeSemana = 0;
    let minutosAtrasoMes = 0;
    let minutosDevidosMes = 0;
    let minutosExtra20Mes = 0;

    const diasUteisComRegistro = new Set<string>();

    for (const registro of registros) {
      horasNormais += registro.horasNormais;
      horasExtras50 += registro.horasExtras50;
      horasExtras100 += registro.horasExtras100;
      minutosAtrasoMes += Number((registro as any).minutosAtraso ?? 0);
      minutosDevidosMes += Number((registro as any).minutosHorasDevidas ?? 0);
      minutosExtra20Mes += Number((registro as any).minutosExtra20 ?? 0);

      const dataRefRegistro = registro.dataReferencia;
      const dow = diaSemanaUtc(dataRefRegistro);
      const isWeekend =
        registro.ehFimDeSemana || dow === 0 || dow === 6;

      if (dow >= 1 && dow <= 5) {
        diasUteisComRegistro.add(chaveDiaUtc(dataRefRegistro));
      }

      if (isWeekend) {
        horasFimDeSemana +=
          registro.horasNormais + registro.horasExtras50 + registro.horasExtras100;
      }
    }

    const horasTotais = horasNormais + horasExtras50 + horasExtras100;

    const totalBeneficios = (funcionario.beneficios ?? []).reduce(
      (sum, b) => sum + Number(b.valorPadrao),
      0,
    );

    const salarioBaseNumero =
      funcionario.salarioBase != null
        ? Number(funcionario.salarioBase)
        : Number(funcionario.salario ?? 0);

    const configPonto = funcionario.configuracaoPonto ?? null;
    const workShift = configPonto?.workShift ?? null;
    const cargaHorariaMensal = funcionario.cargaHorariaMensal ?? 220;
    let saldoNAtual = Number(funcionario.saldoBancoHorasNormaisExcedente ?? 0);
    let saldo100Atual = Number(funcionario.saldoBancoHorasExtras100 ?? 0);
    const saldoLegado = Number(funcionario.saldoBancoHoras ?? saldoNAtual + saldo100Atual);
    if (saldoNAtual + saldo100Atual <= 0 && saldoLegado > 0) {
      saldoNAtual = saldoLegado;
      saldo100Atual = 0;
    }
    const saldoBancoAtual = saldoNAtual + saldo100Atual;
    const ocorrenciasRh = funcionario.ocorrenciasPontoRh ?? [];
    const faltasJustificadasMap = new Map(
      ocorrenciasRh
        .filter((o) => o.tipo === 'FALTA_JUSTIFICADA' && o.status !== 'REPROVADO')
        .map((o) => [
          chaveDiaUtc(o.dataReferencia),
          {
            id: o.id,
            descricao: o.descricao ?? null,
            documentoAnexoUrl: (o as { documentoAnexoUrl?: string | null }).documentoAnexoUrl ?? null,
            documentoAnexoNome: (o as { documentoAnexoNome?: string | null }).documentoAnexoNome ?? null,
          },
        ]),
    );
    const faltasJustificadasSet = new Set(faltasJustificadasMap.keys());

    const hhmmToMin = (hhmm: string | null | undefined): number => {
      const m = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return 0;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };
    const intervaloMin = (ini: string | null, fim: string | null): number =>
      Math.max(0, hhmmToMin(fim) - hhmmToMin(ini));

    const justificativasParciaisMap = new Map(
      ocorrenciasRh
        .filter((o) => (o as any).tipo === ('JUSTIFICATIVA_PARCIAL' as any) && o.status !== 'REPROVADO')
        .map((o) => [
          chaveDiaUtc(o.dataReferencia),
          {
            id: o.id,
            tipo: String((o as any).justificativaTipo ?? '') as 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA',
            horaInicio: ((o as any).horaInicio ?? null) as string | null,
            horaFim: ((o as any).horaFim ?? null) as string | null,
            descricao: o.descricao ?? null,
            documentoAnexoUrl: (o as { documentoAnexoUrl?: string | null }).documentoAnexoUrl ?? null,
            documentoAnexoNome: (o as { documentoAnexoNome?: string | null }).documentoAnexoNome ?? null,
          },
        ]),
    );
    const compensacaoDias = (funcionario.workShiftCompensacoes ?? []).flatMap((c) =>
      (c.dias ?? []).map((d) => ({
        id: d.id,
        key: chaveDiaUtc(d.dataCompensacao),
        status: d.status,
        minutosPrevistos: d.minutosPrevistos,
      })),
    );
    const compensacaoMap = new Map(
      compensacaoDias.map((d) => [d.key, d] as const),
    );

    let valorHoraBase = 0;
    let valorHorasNormais = 0;
    let valorHorasExtras50 = 0;
    let valorHorasExtras100 = 0;
    let valorHorasNoturnaAutonomo = 0;
    let valorHorasAutonomo = 0;
    let totalAPagar = 0;

    let autonomoDetail: FolhaMesResumo['autonomo'];
    let registradoDetail: FolhaMesResumo['registrado'];

    /** Para autônomo modo por_hora, sobrescreve totais de horas exibidos na folha */
    let horasNormaisResumo = horasNormais;
    let horasExtras50Resumo = horasExtras50;
    let horasExtras100Resumo = horasExtras100;
    let horasFimDeSemanaResumo = horasFimDeSemana;
    let horasTotaisResumo = horasTotais;

    if (funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO) {
      const qtdDiarias = diasUteisComRegistro.size;
      const valorDiaria = Number(funcionario.valorDiaria ?? 0);
      const valorHoraFS =
        configPonto?.valorHoraFimDeSemana != null
          ? Number(configPonto.valorHoraFimDeSemana)
          : Number(funcionario.valorHora ?? 0);

      const temTarifasPorHora =
        funcionario.valorHoraNormalAutonomo != null ||
        funcionario.valorHoraExtra50Autonomo != null ||
        funcionario.valorHoraExtra100Autonomo != null ||
        funcionario.valorHoraNoturna20Autonomo != null;

      if (temTarifasPorHora) {
        const vNorm = Number(
          funcionario.valorHoraNormalAutonomo ?? funcionario.valorHora ?? 0,
        );
        const v50 = Number(funcionario.valorHoraExtra50Autonomo ?? 0);
        const v100 = Number(funcionario.valorHoraExtra100Autonomo ?? 0);
        const vNot = Number(funcionario.valorHoraNoturna20Autonomo ?? 0);

        const diasComDiaria = new Set<string>();
        for (const reg of registros) {
          const dr = reg.dataReferencia;
          const y = dr.getUTCFullYear();
          const mo = dr.getUTCMonth() + 1;
          const day = dr.getUTCDate();
          const dow = diaSemanaCivil(y, mo, day);
          if (dow >= 1 && dow <= 5 && !ehDomingoOuFeriado(y, mo, day)) {
            diasComDiaria.add(chaveDiaUtc(dr));
          }
        }
        const qtdDiariasTarifa = diasComDiaria.size;
        const subtotalDiariasCalc = qtdDiariasTarifa * valorDiaria;

        let minNJornadaSegSex = 0;
        let min50 = 0;
        let min100 = 0;
        let minNot = 0;
        let reais50 = 0;
        let reais100 = 0;
        let reaisNot = 0;
        let reaisSabado = 0;
        let minSabado = 0;
        let minDomFeriado = 0;

        for (const reg of registros) {
          const dr = reg.dataReferencia;
          const y = dr.getUTCFullYear();
          const mo = dr.getUTCMonth() + 1;
          const day = dr.getUTCDate();
          const dow = diaSemanaCivil(y, mo, day);
          const hLiq = reg.horasNormais + reg.horasExtras50 + reg.horasExtras100;

          if (ehDomingoOuFeriado(y, mo, day)) {
            const rate = v100 > 0 ? v100 : vNorm;
            reais100 += hLiq * rate;
            min100 += Math.round(hLiq * 60);
            minDomFeriado += Math.round(hLiq * 60);
            continue;
          }

          if (dow === 6) {
            reaisSabado += hLiq * vNorm;
            minSabado += Math.round(hLiq * 60);
            continue;
          }

          if (dow >= 1 && dow <= 5) {
            const em = minutosMeiaNoiteBrasilia(reg.entrada);
            const sm = minutosMeiaNoiteBrasilia(reg.saida);
            if (em != null && sm != null && sm > em) {
              const sp = splitMinutosJornadaSegSex(em, sm);
              reais50 += (sp.extra50 / 60) * v50;
              reaisNot += (sp.noturna / 60) * vNot;
              minNJornadaSegSex += sp.normal;
              min50 += sp.extra50;
              minNot += sp.noturna;
            } else {
              minNJornadaSegSex += Math.round(hLiq * 60);
            }
          }
        }

        const horasSabadoNum = minSabado / 60;
        const horasJornadaAud = minNJornadaSegSex / 60;
        const totalAcresc = reais50 + reais100 + reaisNot;

        valorHorasNormais = subtotalDiariasCalc + reaisSabado;
        valorHorasExtras50 = reais50;
        valorHorasExtras100 = reais100;
        valorHorasNoturnaAutonomo = reaisNot;
        valorHorasAutonomo = subtotalDiariasCalc + reaisSabado + reais50 + reais100 + reaisNot;

        totalAPagar =
          valorHorasAutonomo + totalBeneficios + acrescimosLanc - subtracoesLanc;

        horasNormaisResumo = horasJornadaAud + horasSabadoNum;
        horasExtras50Resumo = min50 / 60;
        horasExtras100Resumo = min100 / 60;
        horasFimDeSemanaResumo = horasSabadoNum + minDomFeriado / 60;
        horasTotaisResumo =
          horasNormaisResumo + horasExtras50Resumo + horasExtras100Resumo + minNot / 60;

        autonomoDetail = {
          modo: 'por_hora',
          diasUteisComRegistro: qtdDiariasTarifa,
          valorDiaria,
          valorHoraFimDeSemana: valorHoraFS,
          subtotalDiarias: subtotalDiariasCalc,
          subtotalFimDeSemana: 0,
          subtotalSabado: reaisSabado,
          horasSabado: horasSabadoNum,
          horasNormaisJornadaAuditoria: horasJornadaAud,
          totalAcrescimosJornada: totalAcresc,
          subtotalHoraNormal: reaisSabado,
          subtotalHoraExtra50: reais50,
          subtotalHoraExtra100: reais100,
          subtotalHoraNoturna: reaisNot,
          horasHoraNormal: horasJornadaAud + horasSabadoNum,
          horasExtra50: min50 / 60,
          horasExtra100: min100 / 60,
          horasNoturna: minNot / 60,
        };
      } else {
        const subtotalDiarias = qtdDiarias * valorDiaria;
        const subtotalFimDeSemana = horasFimDeSemana * valorHoraFS;

        valorHorasAutonomo = subtotalDiarias + subtotalFimDeSemana;

        totalAPagar =
          valorHorasAutonomo + totalBeneficios + acrescimosLanc - subtracoesLanc;

        autonomoDetail = {
          modo: 'legacy',
          diasUteisComRegistro: qtdDiarias,
          valorDiaria,
          valorHoraFimDeSemana: valorHoraFS,
          subtotalDiarias,
          subtotalFimDeSemana,
        };
      }
    } else {
      // REGISTRADO: salário fixo + banco de horas (sem pagar hora extra imediata no total)
      valorHoraBase =
        salarioBaseNumero > 0
          ? salarioBaseNumero / cargaHorariaMensal
          : funcionario.valorHora
            ? Number(funcionario.valorHora)
            : 0;

      valorHorasNormais = horasNormais * valorHoraBase;
      valorHorasExtras50 = horasExtras50 * valorHoraBase * 1.5;
      valorHorasExtras100 = horasExtras100 * valorHoraBase * 2;

      const horasExcedentesParaBanco = Math.max(0, horasTotais - cargaHorariaMensal);
      const decComp = decomporExcessoBancoHoras({
        sumNormais: horasNormais,
        sumExtras50: horasExtras50,
        sumExtras100: horasExtras100,
        cargaMensal: cargaHorariaMensal,
      });
      /** Saldo já inclui o excedente desta competência após sincronizarExcessoCompetencia */
      const saldoProjetado = saldoBancoAtual;

      totalAPagar =
        salarioBaseNumero + totalBeneficios + acrescimosLanc - subtracoesLanc;

      registradoDetail = {
        cargaHorariaMensal,
        horasTrabalhadasNoMes: horasTotais,
        horasExcedentesParaBanco,
        horasExcedentesNormaisCompetencia: decComp.excessoNormais,
        horasExcedentesExtras100Competencia: decComp.excessoExtras100,
        saldoBancoHorasAtual: saldoBancoAtual,
        saldoBancoHorasNormaisAtual: saldoNAtual,
        saldoBancoHorasExtras100Atual: saldo100Atual,
        saldoBancoHorasProjetado: saldoProjetado,
        horasNegativas: (minutosAtrasoMes + minutosDevidosMes) / 60,
        horasDevidas: (minutosAtrasoMes + minutosDevidosMes) / 60,
        modoQuitacaoHorasNegativas: funcionario.modoQuitacaoHorasNegativas ?? null,
        periodoCompensacaoHoras: funcionario.periodoCompensacaoHoras ?? null,
      };
    }

    const registrosPorDia = new Map<string, (typeof registros)[number]>();
    for (const reg of registros) {
      registrosPorDia.set(chaveDiaUtc(reg.dataReferencia), reg);
    }

    const totalDias = diasNoMes(ano, mes);
    const conferenciaPonto: ConferenciaPontoDia[] = [];
    let minutosFaltaSemRegistro = 0;
    // Para RH, a "meta" do mês precisa seguir a cargaHorariaMensal do colaborador (ex.: 160h em jornada 40h),
    // independentemente da quantidade de dias úteis no calendário. Distribuímos a carga pelos dias úteis do mês.
    const diasUteisNoMes = (() => {
      let uteis = 0;
      for (let dia = 1; dia <= totalDias; dia++) {
        const dow = diaSemanaCivil(ano, mes, dia);
        const ehFds = dow === 0 || dow === 6;
        const ehFer = ehFeriado(ano, mes, dia);
        if (!ehFds && !ehFer) uteis += 1;
      }
      return uteis;
    })();
    const minutosPrevistosDia = (() => {
      const carga = Number(cargaHorariaMensal ?? 0);
      if (Number.isFinite(carga) && carga > 0 && diasUteisNoMes > 0) {
        return Math.round(((carga * 60) / diasUteisNoMes));
      }
      // Fallback legado
      return workShift != null
        ? Math.round((calculateMonthlyTotal(workShift, ano, mes) / Math.max(1, totalDias)) * 60)
        : Math.round((220 / 22) * 60);
    })();
    for (let dia = 1; dia <= totalDias; dia++) {
      const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const dow = diaSemanaCivil(ano, mes, dia);
      const ehFds = dow === 0 || dow === 6;
      const ehFer = ehFeriado(ano, mes, dia);
      const nomeFer = nomeFeriado(ano, mes, dia);
      const reg = registrosPorDia.get(chave);

      const faltaJustificada = faltasJustificadasSet.has(chave);
      const faltaInfo = faltasJustificadasMap.get(chave);
      const justParcial = justificativasParciaisMap.get(chave) ?? null;

      let situacao: SituacaoPontoDia = 'Sem registro';
      if (reg) {
        if (reg.statusConsistencia === StatusConsistenciaPonto.INCONSISTENTE) {
          situacao = 'Inconsistente';
        } else if (faltaJustificada) {
          situacao = 'OK';
        } else {
          const minTrab = Number((reg as { minutosTrabalhados?: number }).minutosTrabalhados ?? 0);
          const meta = minutosPrevistosDia;
          situacao = minTrab >= meta ? 'OK' : 'OK_PARCIAL';
        }
      } else if (faltaJustificada) {
        situacao = 'OK';
      }
      const compDia = compensacaoMap.get(chave);
      if (!reg && !ehFds && !ehFer && !faltaJustificada) {
        minutosFaltaSemRegistro += Math.max(0, minutosPrevistosDia);
      }

      let batidasDia: string[] = [];
      if (reg) {
        const raw = reg.batidasBrutas;
        if (Array.isArray(raw) && raw.length > 0) {
          batidasDia = raw.map((x) => String(x).trim()).filter(Boolean);
        } else {
          const e = formatHoraBrasilia(reg.entrada);
          const s = formatHoraBrasilia(reg.saida);
          if (e) batidasDia.push(e);
          if (s && s !== e) batidasDia.push(s);
        }
      }

      conferenciaPonto.push({
        dia,
        diaSemana: dow,
        diaSemanaLabel: labelDiaSemana(dow),
        ehFimDeSemana: ehFds,
        ehFeriado: ehFer,
        nomeFeriado: nomeFer,
        temRegistro: !!reg,
        horasLiquidas: reg ? reg.horasNormais + reg.horasExtras50 + reg.horasExtras100 : 0,
        entrada: reg ? formatHoraBrasilia(reg.entrada) : null,
        saida: reg ? formatHoraBrasilia(reg.saida) : null,
        batidas: batidasDia,
        registroPontoId: reg?.id ?? null,
        statusConsistencia: reg?.statusConsistencia ?? null,
        situacao,
        minutosAtraso: (() => {
          const bruto = reg && !ehFer ? Number((reg as any).minutosAtraso ?? 0) : 0;
          if (justParcial?.tipo !== 'ENTRADA_ATRASADA') return bruto;
          return Math.max(0, bruto - intervaloMin(justParcial.horaInicio, justParcial.horaFim));
        })(),
        minutosHorasDevidas: (() => {
          const bruto = reg && !ehFer ? Number((reg as any).minutosHorasDevidas ?? 0) : 0;
          if (justParcial?.tipo !== 'SAIDA_ANTECIPADA') return bruto;
          return Math.max(0, bruto - intervaloMin(justParcial.horaInicio, justParcial.horaFim));
        })(),
        minutosExtra20: reg ? Number((reg as any).minutosExtra20 ?? 0) : 0,
        faltaJustificada,
        faltaJustificadaOcorrenciaId: faltaInfo?.id ?? null,
        faltaJustificadaDescricao: faltaInfo?.descricao ?? null,
        faltaJustificadaDocumentoUrl: faltaInfo?.documentoAnexoUrl ?? null,
        faltaJustificadaDocumentoNome: faltaInfo?.documentoAnexoNome ?? null,
        justificativaParcial: justParcial
          ? {
            id: justParcial.id,
            tipo: justParcial.tipo,
            horaInicio: justParcial.horaInicio,
            horaFim: justParcial.horaFim,
            descricao: justParcial.descricao,
            documentoAnexoUrl: justParcial.documentoAnexoUrl,
            documentoAnexoNome: justParcial.documentoAnexoNome,
          }
          : null,
        minutosMetaDia: minutosPrevistosDia,
        statusCompensacaoRh: compDia?.status ?? null,
        compensacaoDiaId: compDia?.id ?? null,
        intervaloAlmocoInicio: reg ? (reg as any).intervaloAlmocoInicio ?? null : null,
        intervaloAlmocoFim: reg ? (reg as any).intervaloAlmocoFim ?? null : null,
      });
    }

    const minutosAtrasoMesEf = conferenciaPonto.reduce((sum, d) => sum + Math.max(0, d.minutosAtraso ?? 0), 0);
    const minutosDevidosMesEf = conferenciaPonto.reduce((sum, d) => sum + Math.max(0, d.minutosHorasDevidas ?? 0), 0);

    const horasNegativas = (minutosAtrasoMesEf + minutosDevidosMesEf + minutosFaltaSemRegistro) / 60;
    const horasCompPendentes =
      compensacaoDias
        .filter((d) => d.status === 'PENDENTE')
        .reduce((sum, d) => sum + d.minutosPrevistos, 0) / 60;
    const horasCompAprovadas =
      compensacaoDias
        .filter((d) => d.status === 'APROVADO_RH')
        .reduce((sum, d) => sum + d.minutosPrevistos, 0) / 60;
    if (registradoDetail) {
      const horasNegComFalta = (minutosAtrasoMesEf + minutosDevidosMesEf + minutosFaltaSemRegistro) / 60;
      registradoDetail.horasNegativas = horasNegComFalta;
      registradoDetail.horasDevidas = horasNegComFalta;
    }

    const diasFaltadosDetalhe = conferenciaPonto
      .filter((d) => !d.ehFimDeSemana && !d.ehFeriado && !d.faltaJustificada && !d.temRegistro)
      .map((d) => ({ dia: d.dia, diaSemanaLabel: d.diaSemanaLabel }));
    const diasFaltados = diasFaltadosDetalhe.length;
    const horasTrabalhadas = conferenciaPonto.reduce((sum, d) => sum + (d.temRegistro ? d.horasLiquidas : 0), 0);

    const totalSemBonusDescontos =
      funcionario.tipoContrato === TipoContratoFuncionario.REGISTRADO
        ? salarioBaseNumero + totalBeneficios
        : // Autônomo: base + acréscimos automáticos (já dentro de valorHorasAutonomo)
          valorHorasAutonomo + totalBeneficios;

    return {
      funcionarioId: funcionario.id,
      nome: funcionario.nome,
      tipoContrato: funcionario.tipoContrato,
      referencia: { ano, mes },
      horas: {
        normais: horasNormaisResumo,
        extras50: horasExtras50Resumo,
        extras100: horasExtras100Resumo,
        fimDeSemana: horasFimDeSemanaResumo,
        total: horasTotaisResumo,
      },
      valores: {
        salarioBase: salarioBaseNumero,
        valorHoraBase,
        valorHorasNormais,
        valorHorasExtras50,
        valorHorasExtras100,
        valorHorasAutonomo,
        valorHorasNoturnaAutonomo:
          funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO &&
          autonomoDetail?.modo === 'por_hora'
            ? valorHorasNoturnaAutonomo
            : undefined,
        totalBeneficios,
        totalAPagar,
        totalSemBonusDescontos,
      },
      resumoPonto: {
        diasFaltados,
        horasTrabalhadas,
        diasFaltadosDetalhe,
      },
      permitirHorasExtras100: funcionario.permitirHorasExtras100 === true,
      folgas: {
        horasFolgaAcumuladas: Number((funcionario as any).horasFolgaAcumuladas ?? 0),
      },
      autonomo: autonomoDetail,
      registrado: registradoDetail,
      jornada: {
        id: workShift?.id ?? null,
        nome: workShift?.nome ?? null,
        entrada1: workShift?.entrada1 ?? null,
        saida1: workShift?.saida1 ?? null,
        entrada2: workShift?.entrada2 ?? null,
        saida2: workShift?.saida2 ?? null,
        toleranciaMinutos: configPonto?.toleranciaMinutos ?? 5,
        cargaHorariaMensalCalculada: workShift
          ? calculateMonthlyTotal(workShift, ano, mes)
          : null,
      },
      dividaHoras: {
        horasNegativas,
        horasCompensacaoPendente: horasCompPendentes,
        horasCompensacaoAprovadas: horasCompAprovadas,
      },
      lancamentos,
      totaisLancamentos: {
        subtracoes: subtracoesLanc,
        acrescimos: acrescimosLanc,
      },
      conferenciaPonto,
    };
  },
};
