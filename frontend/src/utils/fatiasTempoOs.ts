import { HORAS_COMERCIAIS_POR_DIA } from './custoEventoCalendario';

export type TipoAlocacaoTempo = 'ENGENHARIA' | 'EXECUCAO';

export interface MembroClassificavel {
  id: string;
  cargo?: string | null;
  valorHora?: number | string | null;
  valorDiaria?: number | string | null;
}

export interface FatiasHoras {
  orcadas: number;
  efetivadas: number;
  previstas: number;
  restante: number;
  excedente: number;
  semOrcamento: boolean;
}

export function roundHorasFatia(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Três fatias disjuntas sobre o orçado.
 * restante = orcadas − efetivadas − previstas (nunca negativo).
 * excedente = o que passou do orçado, visível à parte.
 */
export function calcularFatiasHoras(
  orcadas: number,
  efetivadas: number,
  previstas: number,
): FatiasHoras {
  const o = roundHorasFatia(Math.max(0, Number(orcadas) || 0));
  const e = roundHorasFatia(Math.max(0, Number(efetivadas) || 0));
  const p = roundHorasFatia(Math.max(0, Number(previstas) || 0));
  const soma = roundHorasFatia(e + p);
  return {
    orcadas: o,
    efetivadas: e,
    previstas: p,
    restante: roundHorasFatia(Math.max(0, o - soma)),
    excedente: roundHorasFatia(Math.max(0, soma - o)),
    semOrcamento: o <= 0,
  };
}

export function diariasParaHoras(diarias: number): number {
  return roundHorasFatia(Math.max(0, Number(diarias) || 0) * HORAS_COMERCIAIS_POR_DIA);
}

/**
 * Eventos antigos não têm lista explícita.
 * Cargo de engenharia/projeto classifica como engenharia.
 * Caso contrário, hora sem diária é engenharia; diária (prioridade de calcularCustoDiaFuncionario) é execução.
 */
export function classificarMembroLegado(membro: MembroClassificavel): TipoAlocacaoTempo {
  const cargo = (membro.cargo || '').toLowerCase();
  if (/engen|projet/.test(cargo)) return 'ENGENHARIA';
  const diaria = Number(membro.valorDiaria) || 0;
  const hora = Number(membro.valorHora) || 0;
  if (hora > 0 && diaria <= 0) return 'ENGENHARIA';
  return 'EXECUCAO';
}

export function particionarEquipe<T extends MembroClassificavel>(
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

export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function horasPorDiaLocal(inicio: Date, fim: Date): Array<{ dia: string; horas: number }> {
  const out: Array<{ dia: string; horas: number }> = [];
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) return out;
  let cursor = new Date(inicio.getTime());
  const end = fim.getTime();
  while (cursor.getTime() < end) {
    const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const sliceEndMs = Math.min(nextMidnight.getTime(), end);
    const horas = (sliceEndMs - cursor.getTime()) / 3_600_000;
    if (horas > 0) out.push({ dia: ymdLocal(cursor), horas });
    cursor = new Date(sliceEndMs);
  }
  return out;
}

export interface EventoFatiaInput {
  id: string;
  dataInicio: string | Date;
  dataFim: string | Date;
  status: string;
  tipo?: string | null;
  eventoOrigemId?: string | null;
  equipe?: MembroClassificavel[];
  equipeEngenhariaIds?: string[];
  equipeExecucaoIds?: string[];
}

export interface ApontamentoFatiaInput {
  dataApontamento: string | Date;
  itens: Array<{ tipoRecurso: string; quantidade: number }>;
}

export interface ResumoFatiasOs {
  engenharia: FatiasHoras;
  execucao: FatiasHoras;
  diasPrevistos: number;
  diasEfetivados: number;
}

function somarMapa(map: Map<string, number>, dia: string, horas: number) {
  map.set(dia, (map.get(dia) || 0) + horas);
}

/** Horas da agenda que ainda não foram cobertas por apontamento no mesmo dia. */
export function horasPrevistasSemDuplaContagem(
  agendaPorDia: Map<string, number>,
  efetivasPorDia: Map<string, number>,
): number {
  let total = 0;
  for (const [dia, horas] of agendaPorDia) {
    total += Math.max(0, horas - (efetivasPorDia.get(dia) || 0));
  }
  return roundHorasFatia(total);
}

function diaCivil(v: string | Date): string | null {
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return ymdLocal(d);
}

function parseDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

function diasCobertos(inicio: Date, fim: Date): string[] {
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return [];
  const start = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  if (end < start) return [];
  const dias: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    dias.push(ymdLocal(new Date(t)));
  }
  return dias;
}

export function montarResumoFatiasOs(input: {
  horasEngenhariaOrcadas: number;
  diariasEquipeOrcadas: number;
  eventos: EventoFatiaInput[];
  apontamentos: ApontamentoFatiaInput[];
}): ResumoFatiasOs {
  const efetivasEng = new Map<string, number>();
  const efetivasExe = new Map<string, number>();
  const diasEfetivados = new Set<string>();

  for (const ap of input.apontamentos) {
    const dia = diaCivil(ap.dataApontamento);
    if (!dia) continue;
    let teve = false;
    for (const item of ap.itens || []) {
      const qtd = Number(item.quantidade) || 0;
      if (qtd <= 0) continue;
      teve = true;
      if (item.tipoRecurso === 'HORA_ENGENHARIA') somarMapa(efetivasEng, dia, qtd);
      else if (item.tipoRecurso === 'DIARIA_EQUIPE') {
        somarMapa(efetivasExe, dia, qtd * HORAS_COMERCIAIS_POR_DIA);
      }
    }
    if (teve) diasEfetivados.add(dia);
  }

  const origemConfirmada = new Set(
    input.eventos.map((e) => e.eventoOrigemId).filter((id): id is string => Boolean(id)),
  );

  const agendaEng = new Map<string, number>();
  const agendaExe = new Map<string, number>();
  const diasPrevistos = new Set<string>();

  for (const ev of input.eventos) {
    if ((ev.tipo || '') !== 'OBRA') continue;
    const inicio = parseDate(ev.dataInicio);
    const fim = parseDate(ev.dataFim);
    if (ev.status === 'PREVISAO') {
      for (const dia of diasCobertos(inicio, fim)) diasPrevistos.add(dia);
    }
    if (ev.status === 'VALIDO') {
      for (const dia of diasCobertos(inicio, fim)) diasEfetivados.add(dia);
    }
    if (origemConfirmada.has(ev.id)) continue;

    const { engenharia, execucao } = particionarEquipe(
      ev.equipe || [],
      ev.equipeEngenhariaIds,
      ev.equipeExecucaoIds,
    );
    for (const slice of horasPorDiaLocal(inicio, fim)) {
      if (engenharia.length > 0) somarMapa(agendaEng, slice.dia, slice.horas * engenharia.length);
      if (execucao.length > 0) somarMapa(agendaExe, slice.dia, slice.horas * execucao.length);
    }
  }

  const soma = (map: Map<string, number>) =>
    roundHorasFatia([...map.values()].reduce((a, b) => a + b, 0));

  return {
    engenharia: calcularFatiasHoras(
      Number(input.horasEngenhariaOrcadas) || 0,
      soma(efetivasEng),
      horasPrevistasSemDuplaContagem(agendaEng, efetivasEng),
    ),
    execucao: calcularFatiasHoras(
      diariasParaHoras(Number(input.diariasEquipeOrcadas) || 0),
      soma(efetivasExe),
      horasPrevistasSemDuplaContagem(agendaExe, efetivasExe),
    ),
    diasPrevistos: diasPrevistos.size,
    diasEfetivados: diasEfetivados.size,
  };
}
