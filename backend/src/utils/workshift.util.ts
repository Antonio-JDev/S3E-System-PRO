import { dataHoraEmBrasilia } from './datetime-sp.util';

export interface WorkShiftTemplate {
  nome: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
}

export interface TimeDifferenceResult {
  minutosAtrasoEntrada: number;
  minutosExtraEntrada: number;
  minutosSaidaAntecipada: number;
  minutosExtraSaida: number;
  minutosAtrasoTotal: number;
  minutosExtraTotal: number;
}

export const WORK_SHIFT_TEMPLATES_44H: WorkShiftTemplate[] = [
  { nome: '44h - 07:00/12:12/17:00', entrada1: '07:00', saida1: '12:12', entrada2: '12:12', saida2: '17:00' },
  { nome: '44h - 07:15/11:45/17:18', entrada1: '07:15', saida1: '11:45', entrada2: '13:00', saida2: '17:18' },
  { nome: '44h - 07:30/12:00/17:18', entrada1: '07:30', saida1: '12:00', entrada2: '13:00', saida2: '17:18' },
  { nome: '44h - 07:30/12:00/17:30', entrada1: '07:30', saida1: '12:00', entrada2: '13:00', saida2: '17:30' },
  { nome: '44h - 07:30/12:00/17:48', entrada1: '07:30', saida1: '12:00', entrada2: '13:30', saida2: '17:48' },
  { nome: '44h - 07:42/12:00/17:30', entrada1: '07:42', saida1: '12:00', entrada2: '13:00', saida2: '17:30' },
  { nome: '44h - 07:42/12:00/18:00', entrada1: '07:42', saida1: '12:00', entrada2: '13:30', saida2: '18:00' },
  { nome: '44h - 08:00/12:00/17:48', entrada1: '08:00', saida1: '12:00', entrada2: '13:30', saida2: '17:48' },
  { nome: '44h - 08:00/12:00/18:00', entrada1: '08:00', saida1: '12:00', entrada2: '13:12', saida2: '18:00' },
  // 40h semanais (seg–sex): 08:00–12:00 / 13:00–17:00 (8h/dia)
  { nome: '40h - 08:00/12:00/17:00', entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:00' },
];

function dateFromHm(base: Date, hhmm: string): Date {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, min, 0, 0);
}

export function parseHoraEmDataBase(hhmm: string): Date {
  return dateFromHm(new Date(2000, 0, 1, 0, 0, 0, 0), hhmm);
}

export function diffMinutosHora(inicio: string, fim: string): number {
  return Math.round((parseHoraEmDataBase(fim).getTime() - parseHoraEmDataBase(inicio).getTime()) / 60000);
}

export function jornadaMinutosPorDia(shift: {
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
}): number {
  const p1 = Math.max(0, diffMinutosHora(shift.entrada1, shift.saida1));
  const p2 = Math.max(0, diffMinutosHora(shift.entrada2, shift.saida2));
  return p1 + p2;
}

const DEFAULT_WORKSHIFT = { entrada1: '07:30', saida2: '17:30' } as const;

function civilYmdEmBrasilia(dia: Date): { ano: number; mes: number; d: number } {
  const partes = dia
    .toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo', hour12: false })
    .slice(0, 10)
    .split('-');
  return { ano: Number(partes[0]), mes: Number(partes[1]), d: Number(partes[2]) };
}

/** Aplica a faixa da workshift (entrada1–saida2) ao dia civil em Brasília. */
export function snapWorkshiftAoDia(
  dia: Date,
  shift?: { entrada1?: string | null; saida2?: string | null } | null,
): { dataInicio: Date; dataFim: Date } {
  const entrada = (shift?.entrada1 || DEFAULT_WORKSHIFT.entrada1).trim();
  const saida = (shift?.saida2 || DEFAULT_WORKSHIFT.saida2).trim();
  const { ano, mes, d } = civilYmdEmBrasilia(dia);
  return {
    dataInicio: dataHoraEmBrasilia(ano, mes, d, entrada),
    dataFim: dataHoraEmBrasilia(ano, mes, d, saida),
  };
}

export function calculateMonthlyTotal(
  shift: { entrada1: string; saida1: string; entrada2: string; saida2: string },
  referenciaAno: number,
  referenciaMes: number,
): number {
  const inicio = new Date(referenciaAno, referenciaMes - 1, 1);
  const fim = new Date(referenciaAno, referenciaMes, 0);
  const minutosDia = jornadaMinutosPorDia(shift);
  let uteis = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) uteis += 1;
  }
  return Math.round((uteis * minutosDia) / 60);
}

export function calculateTimeDifference(params: {
  batidaEntrada: Date;
  batidaSaida: Date;
  shiftEntrada: string;
  shiftSaida: string;
  toleranceMin?: number;
}): TimeDifferenceResult {
  const tolerance = params.toleranceMin ?? 5;
  const baseDay = new Date(
    params.batidaEntrada.getFullYear(),
    params.batidaEntrada.getMonth(),
    params.batidaEntrada.getDate(),
    0,
    0,
    0,
    0,
  );

  const shiftEntrada = dateFromHm(baseDay, params.shiftEntrada);
  const shiftSaida = dateFromHm(baseDay, params.shiftSaida);
  const entradaMin = new Date(shiftEntrada.getTime() - tolerance * 60000);
  const entradaMax = new Date(shiftEntrada.getTime() + tolerance * 60000);
  const saidaMin = new Date(shiftSaida.getTime() - tolerance * 60000);
  const saidaMax = new Date(shiftSaida.getTime() + tolerance * 60000);

  const minutosExtraEntrada =
    params.batidaEntrada < entradaMin
      ? Math.round((entradaMin.getTime() - params.batidaEntrada.getTime()) / 60000)
      : 0;
  // Atraso/saída antecipada: só o que passar da janela de tolerância (evita minutos “fantasma”).
  const minutosAtrasoEntrada =
    params.batidaEntrada > entradaMax
      ? Math.round((params.batidaEntrada.getTime() - entradaMax.getTime()) / 60000)
      : 0;

  const minutosSaidaAntecipada =
    params.batidaSaida < saidaMin
      ? Math.round((saidaMin.getTime() - params.batidaSaida.getTime()) / 60000)
      : 0;
  const minutosExtraSaida =
    params.batidaSaida > saidaMax
      ? Math.round((params.batidaSaida.getTime() - saidaMax.getTime()) / 60000)
      : 0;

  return {
    minutosAtrasoEntrada,
    minutosExtraEntrada,
    minutosSaidaAntecipada,
    minutosExtraSaida,
    minutosAtrasoTotal: minutosAtrasoEntrada + minutosSaidaAntecipada,
    minutosExtraTotal: minutosExtraEntrada + minutosExtraSaida,
  };
}

export function formatShiftLabel(shift: {
  nome: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
}): string {
  return `${shift.nome} (${shift.entrada1} - ${shift.saida1} / ${shift.entrada2} - ${shift.saida2})`;
}

export function buildCompKey(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function toHourMinuteLabel(minutos: number): string {
  const abs = Math.abs(Math.round(minutos));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function parseMesRef(ym: string): { ano: number; mes: number } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

export function formatCompetencia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}
