import { formatHoraBrasilia } from './datetime-sp.util';

/** Minutos desde 0h no relógio de Brasília (string HH:mm do ponto). */
export function minutosMeiaNoiteBrasilia(d: Date | null | undefined): number | null {
  if (!d) return null;
  const s = formatHoraBrasilia(d);
  if (!s) return null;
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

const JORNADA_INI = 8 * 60;
const JORNADA_FIM = 17 * 60 + 30;
const NOTURNO_INI = 18 * 60;

function overlap(a: number, b: number, r0: number, r1: number): number {
  const x = Math.max(a, r0);
  const y = Math.min(b, r1);
  return Math.max(0, y - x);
}

/**
 * Segunda a sexta: divide o intervalo entrada–saída entre jornada típida (8h–17h30),
 * trecho fora da jornada até 18h (50%) e trecho noturno (após 18h).
 */
export function splitMinutosJornadaSegSex(entradaMin: number, saidaMin: number): {
  normal: number;
  extra50: number;
  noturna: number;
  total: number;
} {
  if (saidaMin <= entradaMin) {
    return { normal: 0, extra50: 0, noturna: 0, total: 0 };
  }
  const total = saidaMin - entradaMin;
  const normal = overlap(entradaMin, saidaMin, JORNADA_INI, JORNADA_FIM);
  const noturna = overlap(entradaMin, saidaMin, NOTURNO_INI, 24 * 60);
  const extra50 = Math.max(0, total - normal - noturna);
  return { normal, extra50, noturna, total };
}
