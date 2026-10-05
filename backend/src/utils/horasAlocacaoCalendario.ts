import type { Prisma } from '@prisma/client';
import { HORAS_COMERCIAIS_POR_DIA } from './custoEventoCalendario';
import { chaveDiaCivil, dataHoraEmBrasilia, ymdCivilBrasilia } from './datetime-sp.util';

/** Mesmo ciclo do arraste de obra no calendário (07:30–17:30). A madrugada fica de fora. */
export const CICLO_ALOCACAO_INICIO = '07:30';
export const CICLO_ALOCACAO_FIM = '17:30';

export interface HorarioDiaAlocacao {
  dia: string;
  inicio: string;
  fim: string;
}

type ValorNumerico = number | string | Prisma.Decimal | null;

export interface MembroAlocacao {
  id: string;
  nome?: string | null;
  cargo?: string | null;
  email?: string | null;
  valorHora?: ValorNumerico;
  valorDiaria?: ValorNumerico;
}

export type TipoAlocacaoTempo = 'ENGENHARIA' | 'EXECUCAO';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function minutosHm(hhmm: string): number | null {
  const m = String(hhmm).trim().match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function horasEntreHorarios(inicio: string, fim: string): number {
  const a = minutosHm(inicio);
  const b = minutosHm(fim);
  if (a == null || b == null || b <= a) return 0;
  return round2((b - a) / 60);
}

/** Diárias equivalentes: horas do dia ÷ 8, com 4 casas (mesmo critério do apontamento). */
export function diariasDeHorasTotais(horasTotais: number): number {
  if (!Number.isFinite(horasTotais) || horasTotais <= 0) return 0;
  return round4(horasTotais / HORAS_COMERCIAIS_POR_DIA);
}

export function ymdHojeBrasilia(ref: Date = new Date()): string {
  const hoje = ymdCivilBrasilia(ref);
  return chaveDiaCivil(hoje.ano, hoje.mes, hoje.dia);
}

/**
 * Eventos antigos não têm lista explícita.
 * Cargo de engenharia/projeto classifica como engenharia.
 * Caso contrário, hora sem diária é engenharia; diária é execução.
 */
export function classificarMembroLegado(membro: MembroAlocacao): TipoAlocacaoTempo {
  const cargo = (membro.cargo || '').toLowerCase();
  if (/engen|projet/.test(cargo)) return 'ENGENHARIA';
  const diaria = Number(membro.valorDiaria) || 0;
  const hora = Number(membro.valorHora) || 0;
  if (hora > 0 && diaria <= 0) return 'ENGENHARIA';
  return 'EXECUCAO';
}

export function particionarEquipeAlocacao<T extends MembroAlocacao>(
  equipe: T[],
  engenhariaIds: string[] | undefined,
  execucaoIds: string[] | undefined,
): { engenharia: T[]; execucao: T[] } {
  const engSet = new Set(engenhariaIds || []);
  const exeSet = new Set(execucaoIds || []);
  const temLista = engSet.size + exeSet.size > 0;
  const engenharia: T[] = [];
  const execucao: T[] = [];
  for (const membro of equipe) {
    if (temLista) {
      if (engSet.has(membro.id)) engenharia.push(membro);
      else execucao.push(membro);
      continue;
    }
    if (classificarMembroLegado(membro) === 'ENGENHARIA') engenharia.push(membro);
    else execucao.push(membro);
  }
  return { engenharia, execucao };
}

function partesBrasilia(d: Date): { ano: number; mes: number; dia: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(d);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { ano: num('year'), mes: num('month'), dia: num('day') };
}

function somarDia(ymd: string, dias: number): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return { ano: dt.getUTCFullYear(), mes: dt.getUTCMonth() + 1, dia: dt.getUTCDate() };
}

/**
 * Horas por dia civil em Brasília.
 * Sem horário manual, recorta o intervalo ao ciclo 07:30–17:30 (madrugada de fora).
 * Com horariosPorDia, usa o que foi gravado (pode passar de 17:30).
 */
export function horasPorDiaAlocacao(
  inicio: Date,
  fim: Date,
  horariosManuais?: HorarioDiaAlocacao[] | null,
): Array<{ dia: string; horas: number }> {
  if (horariosManuais && horariosManuais.length > 0) {
    const porDia = new Map<string, number>();
    for (const slot of horariosManuais) {
      const horas = horasEntreHorarios(slot.inicio, slot.fim);
      if (horas <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(slot.dia)) continue;
      porDia.set(slot.dia, round2((porDia.get(slot.dia) || 0) + horas));
    }
    return [...porDia.entries()]
      .filter(([, horas]) => horas > 0)
      .map(([dia, horas]) => ({ dia, horas }));
  }

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) return [];

  const cicloIni = minutosHm(CICLO_ALOCACAO_INICIO) ?? 7 * 60 + 30;
  const cicloFim = minutosHm(CICLO_ALOCACAO_FIM) ?? 17 * 60 + 30;
  const iniHm = `${String(Math.floor(cicloIni / 60)).padStart(2, '0')}:${String(cicloIni % 60).padStart(2, '0')}`;
  const fimHm = `${String(Math.floor(cicloFim / 60)).padStart(2, '0')}:${String(cicloFim % 60).padStart(2, '0')}`;

  const out: Array<{ dia: string; horas: number }> = [];
  let cursor = inicio.getTime();
  const end = fim.getTime();
  let guard = 0;
  while (cursor < end && guard < 400) {
    guard += 1;
    const wall = partesBrasilia(new Date(cursor));
    const dia = chaveDiaCivil(wall.ano, wall.mes, wall.dia);
    const prox = somarDia(dia, 1);
    const nextMidnight = dataHoraEmBrasilia(prox.ano, prox.mes, prox.dia, '00:00').getTime();
    const cicloStart = dataHoraEmBrasilia(wall.ano, wall.mes, wall.dia, iniHm).getTime();
    const cicloEnd = dataHoraEmBrasilia(wall.ano, wall.mes, wall.dia, fimHm).getTime();
    const a = Math.max(cursor, cicloStart);
    const b = Math.min(end, nextMidnight, cicloEnd);
    if (b > a) {
      const horas = round2((b - a) / 3_600_000);
      if (horas > 0) out.push({ dia, horas });
    }
    if (nextMidnight <= cursor) break;
    cursor = nextMidnight;
  }
  return out;
}
