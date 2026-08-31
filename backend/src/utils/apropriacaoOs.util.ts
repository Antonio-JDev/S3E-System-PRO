import { TipoRecursoApontamento } from '@prisma/client';
import { HORAS_COMERCIAIS_POR_DIA } from './custoEventoCalendario';

export interface ItemApropriacaoInput {
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
}

export interface TotaisApropriacao {
  horasEngenhariaRealizadas: number;
  diariasEquipeRealizadas: number;
}

export interface DadosPlanejamentoOs {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  valorHoraEngenharia: number | null;
  valorDiariaEquipe: number | null;
  valorTotal: number;
  precoVendaOrcamento?: number | null;
}

export interface LinhaCustoCalendarioResumo {
  eventoId: string;
  data: string;
  funcionarioId: string;
  funcionarioNome: string;
  cargo: string;
  horasJornada: number;
  horasExtras: number;
  totalHoras: number;
  modoCusto: string;
  valorUnitario: number;
  custoDia: number;
  status: string;
}

export interface ResultadoOsCalculado extends TotaisApropriacao {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  homemHoraOrcado: number;
  homemHoraRealizado: number;
  custoOrcado: number;
  /** Custo F1 (apontamento) × taxas genéricas da OS */
  custoApontamento: number;
  /** Custo de eventos VALIDO do calendário × taxas do Funcionario */
  custoCalendario: number;
  /** Custo de eventos PREVISAO (ocupação futura / projetado) */
  custoCalendarioPrevisto: number;
  /** custoApontamento + custoCalendario (somente confirmado) */
  custoRealizado: number;
  /** custoRealizado + custoCalendarioPrevisto */
  custoProjetado: number;
  valorFechado: number;
  resultado: number;
  estouroHorasEngenharia: boolean;
  estouroDiariasEquipe: boolean;
  /** Detalhe pessoa × dia (calendário confirmado) */
  calendarioLinhas: LinhaCustoCalendarioResumo[];
}

export function calcularHomemHoraTotal(
  horasEngenharia: number,
  diariasEquipe: number
): number {
  return horasEngenharia + diariasEquipe * HORAS_COMERCIAIS_POR_DIA;
}

export function calcularTotaisApropriacao(
  itens: ItemApropriacaoInput[]
): TotaisApropriacao {
  let horasEngenhariaRealizadas = 0;
  let diariasEquipeRealizadas = 0;

  for (const item of itens) {
    const qtd = Number(item.quantidade) || 0;
    if (qtd <= 0) continue;
    if (item.tipoRecurso === 'HORA_ENGENHARIA') {
      horasEngenhariaRealizadas += qtd;
    } else if (item.tipoRecurso === 'DIARIA_EQUIPE') {
      diariasEquipeRealizadas += qtd;
    }
  }

  return {
    horasEngenhariaRealizadas: round2(horasEngenhariaRealizadas),
    diariasEquipeRealizadas: round2(diariasEquipeRealizadas),
  };
}

export interface TotaisCalendarioOs {
  custoCalendario: number;
  custoCalendarioPrevisto?: number;
  horasEngenharia: number;
  diariasEquipe: number;
  linhas?: LinhaCustoCalendarioResumo[];
}

export function calcularResultadoOs(
  projeto: DadosPlanejamentoOs,
  totais: TotaisApropriacao,
  calendario?: TotaisCalendarioOs,
): ResultadoOsCalculado {
  const horasEngenhariaOrcadas = Number(projeto.horasEngenhariaOrcadas) || 0;
  const diariasEquipeOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const valorHora = Number(projeto.valorHoraEngenharia) || 0;
  const valorDiaria = Number(projeto.valorDiariaEquipe) || 0;

  const custoOrcado =
    horasEngenhariaOrcadas * valorHora + diariasEquipeOrcadas * valorDiaria;
  const custoApontamento =
    totais.horasEngenhariaRealizadas * valorHora +
    totais.diariasEquipeRealizadas * valorDiaria;
  const custoCalendario = Number(calendario?.custoCalendario) || 0;
  const custoCalendarioPrevisto = Number(calendario?.custoCalendarioPrevisto) || 0;
  const custoRealizado = custoApontamento + custoCalendario;
  const custoProjetado = custoRealizado + custoCalendarioPrevisto;

  const horasEngenhariaRealizadas = round2(
    totais.horasEngenhariaRealizadas + (Number(calendario?.horasEngenharia) || 0),
  );
  const diariasEquipeRealizadas = round2(
    totais.diariasEquipeRealizadas + (Number(calendario?.diariasEquipe) || 0),
  );

  const valorFechado =
    Number(projeto.valorTotal) > 0
      ? Number(projeto.valorTotal)
      : Number(projeto.precoVendaOrcamento) || 0;

  return {
    horasEngenhariaOrcadas,
    diariasEquipeOrcadas,
    horasEngenhariaRealizadas,
    diariasEquipeRealizadas,
    homemHoraOrcado: round2(
      calcularHomemHoraTotal(horasEngenhariaOrcadas, diariasEquipeOrcadas)
    ),
    homemHoraRealizado: round2(
      calcularHomemHoraTotal(horasEngenhariaRealizadas, diariasEquipeRealizadas)
    ),
    custoOrcado: round2(custoOrcado),
    custoApontamento: round2(custoApontamento),
    custoCalendario: round2(custoCalendario),
    custoCalendarioPrevisto: round2(custoCalendarioPrevisto),
    custoRealizado: round2(custoRealizado),
    custoProjetado: round2(custoProjetado),
    valorFechado: round2(valorFechado),
    resultado: round2(valorFechado - custoRealizado),
    estouroHorasEngenharia: horasEngenhariaRealizadas > horasEngenhariaOrcadas,
    estouroDiariasEquipe: diariasEquipeRealizadas > diariasEquipeOrcadas,
    calendarioLinhas: calendario?.linhas ?? [],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
