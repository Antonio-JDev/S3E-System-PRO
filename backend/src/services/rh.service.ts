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
  ehFeriadoEfetivo,
  nomeFeriadoEfetivo,
  diaElegivelParaFalta,
} from '../utils/datetime-sp.util';
import { minutosMeiaNoiteBrasilia, splitMinutosJornadaSegSex } from '../utils/autonomo-folha.util';
import { sincronizarExcessoCompetencia } from './bancoHorasExcesso.service';
import { montarBancoHorasResumo } from './bancoHorasRh.service';
import { sincronizarExtratoBancoHorasCompetencia } from './bancoHorasExtrato.service';
import { sincronizarBancoAvaliacoesCompetencia } from './rhComentarioConferencia.service';
import type { BancoHorasExtratoResumo } from '../utils/bancoHorasExtrato.util';
import { decomporExcessoBancoHoras } from '../utils/banco-horas-excesso.util';
import { calculateMonthlyTotal, jornadaMinutosPorDia } from '../utils/workshift.util';
import { listarOverridesFeriadoMes } from './feriadoOverride.service';
import { usaJornadaEBanco } from '../utils/tipoContrato.util';
import {
  aplicarClassificacaoNosMinutos,
  minutosAbonadosParaHorasTrabalhadas,
  parseClassificacaoJustificativa,
  type ClassificacaoJustificativaPonto,
} from '../utils/justificativaPonto.util';
import {
  aplicarAvaliacaoRhDia,
  parseTratamentoCredito,
  parseTratamentoDebito,
} from '../utils/avaliacaoPontoRh.util';
import {
  calcularDemonstrativoFolha,
  type FolhaDemonstrativoResumo,
} from '../utils/rhFolhaDemonstrativo.util';

interface CalcularFolhaMesParams {
  funcionarioId: string;
  dataReferencia: Date | string;
  /** Simulação sem persistir: força tipo/valores e pode pular sync de excedente. */
  override?: {
    tipoContrato?: TipoContratoFuncionario;
    salarioBase?: number;
    valorDiaria?: number;
    valorHoraNormalAutonomo?: number;
    skipSyncExcesso?: boolean;
  };
}

export type SituacaoPontoDia = 'OK' | 'OK_PARCIAL' | 'Sem registro' | 'Inconsistente';

export interface ConferenciaPontoDia {
  dia: number;
  diaSemana: number;
  diaSemanaLabel: string;
  ehFimDeSemana: boolean;
  /** Feriado nacional/municipal (calendário do sistema — mesmo usado na folha autônomo) */
  /** Feriado (calendário + override manual admin) */
  ehFeriado: boolean;
  /** Nome do feriado quando aplicável */
  nomeFeriado: string | null;
  /** true se o status de feriado veio de override manual */
  feriadoOverrideManual?: boolean;
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
  /** Soma HE (20+50+100) em minutos — habilita botões B/P */
  minutosExtraTotal?: number;
  faltaJustificada: boolean;
  faltaJustificadaOcorrenciaId?: string | null;
  faltaJustificadaDescricao?: string | null;
  faltaJustificadaDocumentoUrl?: string | null;
  faltaJustificadaDocumentoNome?: string | null;
  justificativaParcial?: {
    id: string;
    tipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
    classificacao: ClassificacaoJustificativaPonto;
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
  /** Observação do responsável RH (motivo, parecer aprovar/reprovar) */
  comentarioRh?: string | null;
  /** Decisão do RH sobre o dia (justificativa/falta); PENDENTE até revisão */
  decisaoRh?: 'PENDENTE' | 'APROVADO_RH' | 'REPROVADO' | null;
  /** Avaliação rápida A|B|D (atraso / saída / falta) */
  tratamentoDebito?: 'A' | 'B' | 'D' | null;
  /** Avaliação rápida B|P (hora extra) */
  tratamentoCredito?: 'B' | 'P' | null;
  /** Resultado da engine A/B/P/D no dia */
  avaliacaoRh?: {
    minutosAbonados: number;
    minutosBancoDelta: number;
    minutosBancoCredito: number;
    minutosBancoDebito: number;
    minutosPagarFolha: number;
    minutosDescontarFolha: number;
  } | null;
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
    modo: 'legacy' | 'por_hora' | 'diaria_banco';
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
    /** diaria_banco: valor hora usado em P/D */
    valorHoraParaPd?: number;
    /** diaria_banco: acréscimo monetário das HE com tratamento P */
    valorHePagas?: number;
    /** diaria_banco: desconto monetário com tratamento D */
    valorDescontosD?: number;
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
  /** Resumo do banco (positivas / negativas / líquido) para UI e PDF */
  bancoHorasResumo?: {
    horasPositivas: number;
    horasNegativas: number;
    horasTotalLiquido: number;
    horasPositivasCadastro: number;
    horasNegativasCadastro: number;
  };
  /** Extrato mensal ERP: saldo inicial → movimentos → saldo final */
  bancoHorasExtrato?: BancoHorasExtratoResumo;
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
  demonstrativo: FolhaDemonstrativoResumo;
  horasNormais: FolhaDemonstrativoResumo['horasNormais'];
  horasExtrasSegSex50: FolhaDemonstrativoResumo['horasExtrasSegSex50'];
  horasExtrasSabado50: FolhaDemonstrativoResumo['horasExtrasSabado50'];
  horasExtras100: FolhaDemonstrativoResumo['horasExtras100'];
  horasNoturnas20: FolhaDemonstrativoResumo['horasNoturnas20'];
  descontoAtraso: FolhaDemonstrativoResumo['descontoAtraso'];
  descontoSaidaAntecipada: FolhaDemonstrativoResumo['descontoSaidaAntecipada'];
  descontoFalta: FolhaDemonstrativoResumo['descontoFalta'];
  totalDescontosRef: FolhaDemonstrativoResumo['totalDescontosRef'];
  lancamentosManuais: FolhaDemonstrativoResumo['lancamentosManuais'];
  totalAPagar: FolhaDemonstrativoResumo['totalAPagar'];
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

    if (!params.override?.skipSyncExcesso) {
      await sincronizarExcessoCompetencia(funcionarioId, ano, mes);
    }

    // Alinha banco A/B/P/D (padrão B) com as métricas do mês — inclui faltas sem registro.
    if (!params.override?.skipSyncExcesso) {
      const tipoPre = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { tipoContrato: true },
      });
      const tipoEfetivo = params.override?.tipoContrato ?? tipoPre?.tipoContrato;
      if (tipoEfetivo && usaJornadaEBanco(tipoEfetivo)) {
        await sincronizarBancoAvaliacoesCompetencia(funcionarioId, ano, mes);
      }
    }

    const feriadoOverrides = await listarOverridesFeriadoMes(ano, mes);

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
        comentariosConferenciaPonto: {
          where: {
            dataReferencia: {
              gte: inicio,
              lte: fim,
            },
          },
        },
      },
    });

    if (!funcionario) {
      throw new Error('Funcionário não encontrado');
    }

    const ov = params.override;
    if (ov?.tipoContrato) {
      (funcionario as { tipoContrato: TipoContratoFuncionario }).tipoContrato = ov.tipoContrato;
    }
    if (ov?.salarioBase != null && Number.isFinite(ov.salarioBase)) {
      (funcionario as unknown as { salarioBase: number | null }).salarioBase = ov.salarioBase;
      (funcionario as unknown as { salario: number }).salario = ov.salarioBase;
    }
    if (ov?.valorDiaria != null && Number.isFinite(ov.valorDiaria)) {
      (funcionario as unknown as { valorDiaria: number | null }).valorDiaria = ov.valorDiaria;
    }
    if (ov?.valorHoraNormalAutonomo != null && Number.isFinite(ov.valorHoraNormalAutonomo)) {
      (funcionario as unknown as { valorHoraNormalAutonomo: number | null }).valorHoraNormalAutonomo =
        ov.valorHoraNormalAutonomo;
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
            status: o.status,
            descricao: o.descricao ?? null,
            documentoAnexoUrl: (o as { documentoAnexoUrl?: string | null }).documentoAnexoUrl ?? null,
            documentoAnexoNome: (o as { documentoAnexoNome?: string | null }).documentoAnexoNome ?? null,
          },
        ]),
    );
    const faltasJustificadasSet = new Set(faltasJustificadasMap.keys());

    const justificativasParciaisMap = new Map(
      ocorrenciasRh
        .filter((o) => (o as any).tipo === ('JUSTIFICATIVA_PARCIAL' as any) && o.status !== 'REPROVADO')
        .map((o) => [
          chaveDiaUtc(o.dataReferencia),
          {
            id: o.id,
            status: o.status,
            tipo: String((o as any).justificativaTipo ?? '') as 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA',
            classificacao: parseClassificacaoJustificativa((o as any).classificacaoJustificativa),
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

    const comentariosRhMap = new Map(
      (funcionario.comentariosConferenciaPonto ?? []).map((c) => [
        chaveDiaUtc(c.dataReferencia),
        {
          comentario: c.comentario ?? null,
          decisaoRh: c.decisaoRh,
          tratamentoDebito: parseTratamentoDebito((c as any).tratamentoDebito),
          tratamentoCredito: parseTratamentoCredito((c as any).tratamentoCredito),
        },
      ]),
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
          if (dow >= 1 && dow <= 5 && !ehDomingoOuFeriado(y, mo, day, feriadoOverrides)) {
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

          if (ehDomingoOuFeriado(y, mo, day, feriadoOverrides)) {
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
    } else if (funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO_BANCO_HORAS) {
      // Autônomo + banco: diária × dias úteis com ponto; jornada/Extra/A-B-P-D como CLT
      const valorDiaria = Number(funcionario.valorDiaria ?? 0);
      const qtdDiarias = diasUteisComRegistro.size;
      const subtotalDiarias = qtdDiarias * valorDiaria;
      const vh =
        Number(funcionario.valorHoraNormalAutonomo ?? 0) > 0
          ? Number(funcionario.valorHoraNormalAutonomo)
          : valorDiaria > 0
            ? valorDiaria / 8
            : Number(funcionario.valorHora ?? 0);

      valorHoraBase = vh;
      valorHorasNormais = subtotalDiarias;
      valorHorasExtras50 = 0;
      valorHorasExtras100 = 0;
      valorHorasAutonomo = subtotalDiarias;
      // totalAPagar provisório — P/D aplicados após conferência
      totalAPagar = subtotalDiarias + totalBeneficios + acrescimosLanc - subtracoesLanc;

      const horasExcedentesParaBanco = Math.max(0, horasTotais - cargaHorariaMensal);
      const decComp = decomporExcessoBancoHoras({
        sumNormais: horasNormais,
        sumExtras50: horasExtras50,
        sumExtras100: horasExtras100,
        cargaMensal: cargaHorariaMensal,
      });

      autonomoDetail = {
        modo: 'diaria_banco',
        diasUteisComRegistro: qtdDiarias,
        valorDiaria,
        valorHoraFimDeSemana: vh,
        subtotalDiarias,
        subtotalFimDeSemana: 0,
        valorHoraParaPd: vh,
        valorHePagas: 0,
        valorDescontosD: 0,
      };

      registradoDetail = {
        cargaHorariaMensal,
        horasTrabalhadasNoMes: horasTotais,
        horasExcedentesParaBanco,
        horasExcedentesNormaisCompetencia: decComp.excessoNormais,
        horasExcedentesExtras100Competencia: decComp.excessoExtras100,
        saldoBancoHorasAtual: saldoBancoAtual,
        saldoBancoHorasNormaisAtual: saldoNAtual,
        saldoBancoHorasExtras100Atual: saldo100Atual,
        saldoBancoHorasProjetado: saldoBancoAtual,
        horasNegativas: (minutosAtrasoMes + minutosDevidosMes) / 60,
        horasDevidas: (minutosAtrasoMes + minutosDevidosMes) / 60,
        modoQuitacaoHorasNegativas: funcionario.modoQuitacaoHorasNegativas ?? null,
        periodoCompensacaoHoras: funcionario.periodoCompensacaoHoras ?? null,
      };
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
    const dataAdmissao = (funcionario as { dataAdmissao?: Date | null }).dataAdmissao ?? null;
    // Meta do dia = jornada da workshift (S3E: 07:30–17:18 = 8h48). Carga 220h é só divisor salarial.
    const diasUteisNoMes = (() => {
      let uteis = 0;
      for (let dia = 1; dia <= totalDias; dia++) {
        const dow = diaSemanaCivil(ano, mes, dia);
        const ehFds = dow === 0 || dow === 6;
        const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
        if (!ehFds && !ehFer) uteis += 1;
      }
      return uteis;
    })();
    const minutosPrevistosDia = (() => {
      if (workShift != null) {
        return jornadaMinutosPorDia(workShift);
      }
      const carga = Number(cargaHorariaMensal ?? 0);
      if (Number.isFinite(carga) && carga > 0 && diasUteisNoMes > 0) {
        return Math.round((carga * 60) / diasUteisNoMes);
      }
      return Math.round((220 / 22) * 60);
    })();
    for (let dia = 1; dia <= totalDias; dia++) {
      const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const dow = diaSemanaCivil(ano, mes, dia);
      const ehFds = dow === 0 || dow === 6;
      const ehFer = ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
      const nomeFer = nomeFeriadoEfetivo(ano, mes, dia, feriadoOverrides);
      const feriadoOverrideManual = feriadoOverrides.has(
        `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      );
      const reg = registrosPorDia.get(chave);

      const faltaJustificada = faltasJustificadasSet.has(chave);
      const faltaInfo = faltasJustificadasMap.get(chave);
      const justParcial = justificativasParciaisMap.get(chave) ?? null;
      const minutosAbonoHoras = justParcial
        ? minutosAbonadosParaHorasTrabalhadas({
            classificacao: justParcial.classificacao,
            horaInicio: justParcial.horaInicio,
            horaFim: justParcial.horaFim,
          })
        : 0;

      let situacao: SituacaoPontoDia = 'Sem registro';
      if (reg) {
        if (reg.statusConsistencia === StatusConsistenciaPonto.INCONSISTENTE) {
          situacao = 'Inconsistente';
        } else if (faltaJustificada) {
          situacao = 'OK';
        } else {
          const minTrab =
            Number((reg as { minutosTrabalhados?: number }).minutosTrabalhados ?? 0) +
            minutosAbonoHoras;
          const meta = minutosPrevistosDia;
          situacao = minTrab >= meta ? 'OK' : 'OK_PARCIAL';
        }
      } else if (faltaJustificada) {
        situacao = 'OK';
      } else if (!reg && justParcial && minutosAbonoHoras > 0) {
        situacao = minutosAbonoHoras >= minutosPrevistosDia ? 'OK' : 'OK_PARCIAL';
      }
      const compDia = compensacaoMap.get(chave);
      const comentarioDia = comentariosRhMap.get(chave);
      const decisaoOcorrencia =
        justParcial != null
          ? justParcial.status
          : faltaJustificada && faltaInfo
            ? faltaInfo.status
            : null;
      const decisaoRh =
        comentarioDia?.decisaoRh ??
        (decisaoOcorrencia === 'PENDENTE' ||
        decisaoOcorrencia === 'APROVADO_RH' ||
        decisaoOcorrencia === 'REPROVADO'
          ? decisaoOcorrencia
          : null);
      if (!reg && !ehFds && !ehFer && !faltaJustificada) {
        const faltaElegivel = diaElegivelParaFalta(ano, mes, dia, { dataAdmissao });
        if (!faltaElegivel) {
          /* dia futuro ou anterior à admissão — não entra na dívida do mês */
        } else if (justParcial?.classificacao === 'ABONAR' && minutosAbonoHoras >= minutosPrevistosDia) {
          /* falta do dia abonada integralmente */
        } else if (justParcial?.classificacao === 'ABONAR' && minutosAbonoHoras > 0) {
          minutosFaltaSemRegistro += Math.max(0, minutosPrevistosDia - minutosAbonoHoras);
        } else {
          minutosFaltaSemRegistro += Math.max(0, minutosPrevistosDia);
        }
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
        feriadoOverrideManual,
        temRegistro: !!reg,
        horasLiquidas: reg
          ? reg.horasNormais +
            reg.horasExtras50 +
            reg.horasExtras100 +
            minutosAbonoHoras / 60
          : minutosAbonoHoras / 60,
        entrada: reg ? formatHoraBrasilia(reg.entrada) : null,
        saida: reg ? formatHoraBrasilia(reg.saida) : null,
        batidas: batidasDia,
        registroPontoId: reg?.id ?? null,
        statusConsistencia: reg?.statusConsistencia ?? null,
        situacao,
        minutosAtraso: (() => {
          const bruto = reg && !ehFer && !ehFds ? Number((reg as any).minutosAtraso ?? 0) : 0;
          if (!justParcial) return bruto;
          return aplicarClassificacaoNosMinutos({
            bruto,
            campo: 'ATRASO',
            justificativaTipo: justParcial.tipo,
            classificacao: justParcial.classificacao,
            horaInicio: justParcial.horaInicio,
            horaFim: justParcial.horaFim,
          });
        })(),
        minutosHorasDevidas: (() => {
          const bruto =
            reg && !ehFer && !ehFds ? Number((reg as any).minutosHorasDevidas ?? 0) : 0;
          if (!justParcial) return bruto;
          return aplicarClassificacaoNosMinutos({
            bruto,
            campo: 'SAIDA',
            justificativaTipo: justParcial.tipo,
            classificacao: justParcial.classificacao,
            horaInicio: justParcial.horaInicio,
            horaFim: justParcial.horaFim,
          });
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
            classificacao: justParcial.classificacao,
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
        comentarioRh: comentarioDia?.comentario ?? null,
        decisaoRh,
        tratamentoDebito: comentarioDia?.tratamentoDebito ?? null,
        tratamentoCredito: comentarioDia?.tratamentoCredito ?? null,
        avaliacaoRh: null as ConferenciaPontoDia['avaliacaoRh'],
      });

      // Engine A/B/P/D: prioridade sobre impacto financeiro/banco quando preenchida.
      const diaRef = conferenciaPonto[conferenciaPonto.length - 1];
      const faltaIntegralMin =
        !reg &&
        !ehFds &&
        !ehFer &&
        !faltaJustificada &&
        diaElegivelParaFalta(ano, mes, dia, { dataAdmissao })
          ? Math.max(0, minutosPrevistosDia)
          : 0;
      const minutosExtraTotal = (() => {
        let m =
          (diaRef.minutosExtra20 ?? 0) +
          (reg ? Number((reg as any).minutosExtra50 ?? 0) : 0) +
          (reg ? Number((reg as any).minutosExtra100 ?? 0) : 0);
        if (m <= 0 && reg) {
          m = Math.round(
            (Math.max(0, Number((reg as any).horasExtras50 ?? 0)) +
              Math.max(0, Number((reg as any).horasExtras100 ?? 0))) *
              60,
          );
        }
        return m;
      })();
      diaRef.minutosExtraTotal = minutosExtraTotal;
      const aval = aplicarAvaliacaoRhDia({
        minutosAtraso: diaRef.minutosAtraso,
        minutosHorasDevidas: diaRef.minutosHorasDevidas,
        minutosExtra: minutosExtraTotal,
        minutosFaltaIntegral: faltaIntegralMin,
        tratamentoDebito: comentarioDia?.tratamentoDebito ?? null,
        tratamentoCredito: comentarioDia?.tratamentoCredito ?? null,
      });
      diaRef.avaliacaoRh = {
        minutosAbonados: aval.minutosAbonados,
        minutosBancoDelta: aval.minutosBancoDelta,
        minutosBancoCredito: aval.minutosBancoCredito,
        minutosBancoDebito: aval.minutosBancoDebito,
        minutosPagarFolha: aval.minutosPagarFolha,
        minutosDescontarFolha: aval.minutosDescontarFolha,
      };
      // A zera impacto de atraso/saída na conferência (saldo zero / sem desconto).
      if (comentarioDia?.tratamentoDebito === 'A' && aval.minutosAbonados > 0) {
        diaRef.minutosAtraso = 0;
        diaRef.minutosHorasDevidas = 0;
      }
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

    if (
      funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO_BANCO_HORAS &&
      autonomoDetail?.modo === 'diaria_banco'
    ) {
      const vh = Number(autonomoDetail.valorHoraParaPd ?? valorHoraBase ?? 0);
      let minP = 0;
      let minD = 0;
      for (const d of conferenciaPonto) {
        minP += Math.max(0, Number(d.avaliacaoRh?.minutosPagarFolha ?? 0));
        minD += Math.max(0, Number(d.avaliacaoRh?.minutosDescontarFolha ?? 0));
      }
      const valorHePagas = (minP / 60) * vh;
      const valorDescontosD = (minD / 60) * vh;
      autonomoDetail.valorHePagas = valorHePagas;
      autonomoDetail.valorDescontosD = valorDescontosD;
      valorHorasExtras50 = valorHePagas;
      valorHorasAutonomo = Number(autonomoDetail.subtotalDiarias ?? 0) + valorHePagas - valorDescontosD;
      totalAPagar =
        Number(autonomoDetail.subtotalDiarias ?? 0) +
        valorHePagas -
        valorDescontosD +
        totalBeneficios +
        acrescimosLanc -
        subtracoesLanc;
    }

    const diasFaltadosDetalhe = conferenciaPonto
      .filter((d) => !d.ehFimDeSemana && !d.ehFeriado && !d.faltaJustificada && !d.temRegistro)
      .map((d) => ({ dia: d.dia, diaSemanaLabel: d.diaSemanaLabel }));
    const diasFaltados = diasFaltadosDetalhe.length;
    const horasTrabalhadas = conferenciaPonto.reduce(
      (sum, d) => sum + (d.temRegistro || d.horasLiquidas > 0 ? d.horasLiquidas : 0),
      0,
    );

    const totalSemBonusDescontos =
      funcionario.tipoContrato === TipoContratoFuncionario.REGISTRADO
        ? salarioBaseNumero + totalBeneficios
        : // Autônomo: base + acréscimos automáticos (já dentro de valorHorasAutonomo)
          valorHorasAutonomo + totalBeneficios;

    const folhaBase = {
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
      bancoHorasResumo: usaJornadaEBanco(funcionario.tipoContrato)
        ? montarBancoHorasResumo(funcionario)
        : funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO
          ? montarBancoHorasResumo(funcionario)
          : undefined,
      bancoHorasExtrato: undefined as BancoHorasExtratoResumo | undefined,
      lancamentos,
      totaisLancamentos: {
        subtracoes: subtracoesLanc,
        acrescimos: acrescimosLanc,
      },
      conferenciaPonto,
    };

    const demonstrativo = calcularDemonstrativoFolha(folhaBase);

    let bancoHorasExtrato: BancoHorasExtratoResumo | undefined;
    if (
      !params.override?.skipSyncExcesso &&
      (usaJornadaEBanco(funcionario.tipoContrato) ||
        funcionario.tipoContrato === TipoContratoFuncionario.AUTONOMO)
    ) {
      try {
        const extrato = await sincronizarExtratoBancoHorasCompetencia({
          funcionarioId,
          referenciaAno: ano,
          referenciaMes: mes,
          origem: 'FOLHA',
        });
        if (extrato) bancoHorasExtrato = extrato;
      } catch (e) {
        console.error(
          `[RhService] Falha ao sincronizar extrato banco ${funcionarioId} ${ano}-${mes}:`,
          e,
        );
      }
    }

    return {
      ...folhaBase,
      bancoHorasExtrato,
      demonstrativo,
      horasNormais: demonstrativo.horasNormais,
      horasExtrasSegSex50: demonstrativo.horasExtrasSegSex50,
      horasExtrasSabado50: demonstrativo.horasExtrasSabado50,
      horasExtras100: demonstrativo.horasExtras100,
      horasNoturnas20: demonstrativo.horasNoturnas20,
      descontoAtraso: demonstrativo.descontoAtraso,
      descontoSaidaAntecipada: demonstrativo.descontoSaidaAntecipada,
      descontoFalta: demonstrativo.descontoFalta,
      totalDescontosRef: demonstrativo.totalDescontosRef,
      lancamentosManuais: demonstrativo.lancamentosManuais,
      totalAPagar: demonstrativo.totalAPagar,
    };
  },

  /**
   * Simula folha do mês como CLT vs Autônomo+banco (mesmas batidas), sem persistir.
   */
  async compararContratosFolha(params: {
    funcionarioId: string;
    dataReferencia: Date | string;
  }): Promise<{
    clt: {
      totalAPagar: number;
      base: number;
      hePagas: number;
      descontos: number;
      bancoResumo: FolhaMesResumo['bancoHorasResumo'];
    };
    autonomoBanco: {
      totalAPagar: number;
      base: number;
      hePagas: number;
      descontos: number;
      bancoResumo: FolhaMesResumo['bancoHorasResumo'];
    };
    avisos: string[];
    delta: number;
  }> {
    const dataRef =
      params.dataReferencia instanceof Date
        ? params.dataReferencia
        : new Date(params.dataReferencia);
    const { ano, mes } = getMesReferenciaRange(dataRef);
    const feriadoOverrides = await listarOverridesFeriadoMes(ano, mes);

    const funcionario = await prisma.funcionario.findUnique({
      where: { id: params.funcionarioId },
      select: {
        salarioBase: true,
        salario: true,
        valorDiaria: true,
        valorHoraNormalAutonomo: true,
        valorHora: true,
        cargaHorariaMensal: true,
      },
    });
    if (!funcionario) {
      throw new Error('Funcionário não encontrado');
    }

    const totalDias = diasNoMes(ano, mes);
    let diasUteisMes = 0;
    for (let dia = 1; dia <= totalDias; dia++) {
      const dow = diaSemanaCivil(ano, mes, dia);
      if (dow >= 1 && dow <= 5 && !ehFeriadoEfetivo(ano, mes, dia, feriadoOverrides)) {
        diasUteisMes += 1;
      }
    }
    const diasBase = Math.max(1, diasUteisMes);

    const avisos: string[] = [];
    let salarioClt =
      funcionario.salarioBase != null
        ? Number(funcionario.salarioBase)
        : Number(funcionario.salario ?? 0);
    let diariaAuto = Number(funcionario.valorDiaria ?? 0);

    if (salarioClt <= 0 && diariaAuto > 0) {
      salarioClt = diariaAuto * diasBase;
      avisos.push(
        `CLT: salário estimado como diária × ${diasBase} dias úteis do mês (cadastro sem salário base).`,
      );
    }
    if (diariaAuto <= 0 && salarioClt > 0) {
      diariaAuto = salarioClt / diasBase;
      avisos.push(
        `Autônomo+banco: diária estimada como salário ÷ ${diasBase} dias úteis do mês (cadastro sem diária).`,
      );
    }

    const vhAuto =
      Number(funcionario.valorHoraNormalAutonomo ?? 0) > 0
        ? Number(funcionario.valorHoraNormalAutonomo)
        : diariaAuto > 0
          ? diariaAuto / 8
          : Number(funcionario.valorHora ?? 0);

    const cltFolha = await this.calcularFolhaMes({
      funcionarioId: params.funcionarioId,
      dataReferencia: dataRef,
      override: {
        tipoContrato: TipoContratoFuncionario.REGISTRADO,
        salarioBase: salarioClt,
        skipSyncExcesso: true,
      },
    });

    const autoFolha = await this.calcularFolhaMes({
      funcionarioId: params.funcionarioId,
      dataReferencia: dataRef,
      override: {
        tipoContrato: TipoContratoFuncionario.AUTONOMO_BANCO_HORAS,
        valorDiaria: diariaAuto,
        valorHoraNormalAutonomo: vhAuto,
        skipSyncExcesso: true,
      },
    });

    const snap = (f: FolhaMesResumo, modo: 'clt' | 'auto') => {
      if (modo === 'clt') {
        return {
          totalAPagar: Number(f.totalAPagar ?? 0),
          base: Number(f.valores?.salarioBase ?? 0),
          hePagas: 0,
          descontos: Number(f.totaisLancamentos?.subtracoes ?? 0),
          bancoResumo: f.bancoHorasResumo,
        };
      }
      return {
        totalAPagar: Number(f.totalAPagar ?? 0),
        base: Number(f.autonomo?.subtotalDiarias ?? 0),
        hePagas: Number(f.autonomo?.valorHePagas ?? 0),
        descontos:
          Number(f.autonomo?.valorDescontosD ?? 0) +
          Number(f.totaisLancamentos?.subtracoes ?? 0),
        bancoResumo: f.bancoHorasResumo,
      };
    };

    const clt = snap(cltFolha, 'clt');
    const autonomoBanco = snap(autoFolha, 'auto');
    return {
      clt,
      autonomoBanco,
      avisos,
      delta: autonomoBanco.totalAPagar - clt.totalAPagar,
    };
  },
};
