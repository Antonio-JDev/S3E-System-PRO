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

export interface ResultadoOsCalculado extends TotaisApropriacao {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  homemHoraOrcado: number;
  homemHoraRealizado: number;
  custoOrcado: number;
  custoRealizado: number;
  valorFechado: number;
  resultado: number;
  estouroHorasEngenharia: boolean;
  estouroDiariasEquipe: boolean;
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

export function calcularResultadoOs(
  projeto: DadosPlanejamentoOs,
  totais: TotaisApropriacao
): ResultadoOsCalculado {
  const horasEngenhariaOrcadas = Number(projeto.horasEngenhariaOrcadas) || 0;
  const diariasEquipeOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const valorHora = Number(projeto.valorHoraEngenharia) || 0;
  const valorDiaria = Number(projeto.valorDiariaEquipe) || 0;

  const custoOrcado =
    horasEngenhariaOrcadas * valorHora + diariasEquipeOrcadas * valorDiaria;
  const custoRealizado =
    totais.horasEngenhariaRealizadas * valorHora +
    totais.diariasEquipeRealizadas * valorDiaria;

  const valorFechado =
    Number(projeto.valorTotal) > 0
      ? Number(projeto.valorTotal)
      : Number(projeto.precoVendaOrcamento) || 0;

  return {
    horasEngenhariaOrcadas,
    diariasEquipeOrcadas,
    ...totais,
    homemHoraOrcado: round2(
      calcularHomemHoraTotal(horasEngenhariaOrcadas, diariasEquipeOrcadas)
    ),
    homemHoraRealizado: round2(
      calcularHomemHoraTotal(
        totais.horasEngenhariaRealizadas,
        totais.diariasEquipeRealizadas
      )
    ),
    custoOrcado: round2(custoOrcado),
    custoRealizado: round2(custoRealizado),
    valorFechado: round2(valorFechado),
    resultado: round2(valorFechado - custoRealizado),
    estouroHorasEngenharia:
      totais.horasEngenhariaRealizadas > horasEngenhariaOrcadas,
    estouroDiariasEquipe:
      totais.diariasEquipeRealizadas > diariasEquipeOrcadas,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
