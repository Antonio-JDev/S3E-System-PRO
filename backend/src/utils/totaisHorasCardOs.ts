import { HORAS_COMERCIAIS_POR_DIA } from './custoEventoCalendario';
import { chaveDiaUtc } from './datetime-sp.util';
import {
  horasPorDiaAlocacao,
  particionarEquipeAlocacao,
  type HorarioDiaAlocacao,
  type MembroAlocacao,
} from './horasAlocacaoCalendario';

/**
 * Totais do card da listagem.
 * Mesma regra de `montarResumoFatiasOs` (frontend/src/utils/fatiasTempoOs.ts):
 * a previsão da agenda permanece depois do apontamento;
 * HORA_ENGENHARIA em horas e DIARIA_EQUIPE × 8 h.
 * Engenharia e execução somadas numa leitura só.
 */

export interface EventoHoraCardOs {
  id: string;
  dataInicio: Date | string;
  dataFim: Date | string;
  status: string;
  tipo?: string | null;
  eventoOrigemId?: string | null;
  equipe?: MembroAlocacao[];
  equipeEngenhariaIds?: string[];
  equipeExecucaoIds?: string[];
  horariosPorDia?: unknown;
}

export interface ItemHoraCardOs {
  dataApontamento?: Date | string | null;
  tipoRecurso: string;
  quantidade: number;
}

function roundHoras(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function somarMapa(map: Map<string, number>, dia: string, horas: number) {
  map.set(dia, (map.get(dia) || 0) + horas);
}

function diaApontamento(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  if (Number.isNaN(v.getTime())) return null;
  return chaveDiaUtc(v);
}

function lerHorarios(value: unknown): HorarioDiaAlocacao[] | null {
  if (value == null) return null;
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  const out: HorarioDiaAlocacao[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const dia = String((item as { dia?: unknown }).dia || '');
    const inicio = String((item as { inicio?: unknown }).inicio || '');
    const fim = String((item as { fim?: unknown }).fim || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) continue;
    out.push({ dia, inicio, fim });
  }
  return out.length > 0 ? out : null;
}

function parseDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function totaisHorasCardOs(input: {
  eventos: EventoHoraCardOs[];
  itens: ItemHoraCardOs[];
}): { horasPrevistas: number; horasExecutadas: number } {
  const efetivasEng = new Map<string, number>();
  const efetivasExe = new Map<string, number>();

  for (const item of input.itens) {
    const dia = diaApontamento(item.dataApontamento);
    if (!dia) continue;
    const qtd = Number(item.quantidade) || 0;
    if (qtd <= 0) continue;
    if (item.tipoRecurso === 'HORA_ENGENHARIA') somarMapa(efetivasEng, dia, qtd);
    else if (item.tipoRecurso === 'DIARIA_EQUIPE') {
      somarMapa(efetivasExe, dia, qtd * HORAS_COMERCIAIS_POR_DIA);
    }
  }

  const origemConfirmada = new Set(
    input.eventos.map((e) => e.eventoOrigemId).filter((id): id is string => Boolean(id)),
  );

  const agendaEng = new Map<string, number>();
  const agendaExe = new Map<string, number>();

  for (const ev of input.eventos) {
    if ((ev.tipo || '') !== 'OBRA') continue;
    if (origemConfirmada.has(ev.id)) continue;
    const { engenharia, execucao } = particionarEquipeAlocacao(
      ev.equipe || [],
      ev.equipeEngenhariaIds,
      ev.equipeExecucaoIds,
    );
    for (const slice of horasPorDiaAlocacao(
      parseDate(ev.dataInicio),
      parseDate(ev.dataFim),
      lerHorarios(ev.horariosPorDia),
    )) {
      if (engenharia.length > 0) somarMapa(agendaEng, slice.dia, slice.horas * engenharia.length);
      if (execucao.length > 0) somarMapa(agendaExe, slice.dia, slice.horas * execucao.length);
    }
  }

  const soma = (map: Map<string, number>) =>
    roundHoras([...map.values()].reduce((a, b) => a + b, 0));

  return {
    horasPrevistas: roundHoras(soma(agendaEng) + soma(agendaExe)),
    horasExecutadas: roundHoras(soma(efetivasEng) + soma(efetivasExe)),
  };
}
