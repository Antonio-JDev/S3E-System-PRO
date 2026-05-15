// Utilitários simples para lidar com datas sem provocar shifts de timezone.
// Estratégia:
// - Ao receber datas do backend, preferimos extrair apenas a parte YYYY-MM-DD (antes do 'T'),
//   evitando criar um Date que pode aplicar offset de timezone e exibir dia anterior.
// - Ao enviar datas ao backend, enviamos a string YYYY-MM-DD (date-only), nunca ISO com timezone.

export function serverDateToInput(dateStr?: string | null): string {
  if (!dateStr) return '';
  // Se já for no formato YYYY-MM-DD, retorna diretamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Caso venha com hora (ISO), extrair antes do 'T'
  const parts = String(dateStr).split('T');
  if (parts.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return parts[0];
  // Fallback: ISO com timezone (ex.: ...Z) — usar componentes UTC para preservar o "dia civil" salvo no servidor
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const s = String(dateStr);
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s))) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function inputDateToServer(inputValue?: string | null): string {
  // Envia a própria string YYYY-MM-DD para o backend (date-only)
  return inputValue ? inputValue : '';
}

export function formatDateDisplay(dateStr?: string | null): string {
  const x = serverDateToInput(dateStr);
  if (!x) return 'Não informado';
  const [yyyy, mm, dd] = x.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

/** YYYY-MM-DD a partir de um Date no fuso local (criação da tarefa etc.). */
export function localYmdFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysToYmd(ymd: string, days: number): string {
  const base = serverDateToInput(ymd);
  if (!base) return '';
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localYmdFromDate(dt);
}

export const SAO_PAULO_TZ = 'America/Sao_Paulo' as const;

function ymdPartsInTimeZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  return {
    y: Number.isFinite(y) ? y : date.getUTCFullYear(),
    m: Number.isFinite(m) ? m : date.getUTCMonth() + 1,
    d: Number.isFinite(d) ? d : date.getUTCDate(),
  };
}

/** YYYY-MM-DD do calendário do timezone informado (padrão SP). */
export function ymdInTimeZone(date: Date, timeZone: string = SAO_PAULO_TZ): string {
  const p = ymdPartsInTimeZone(date, timeZone);
  const mm = String(p.m).padStart(2, '0');
  const dd = String(p.d).padStart(2, '0');
  return `${p.y}-${mm}-${dd}`;
}

/** Hoje (YYYY-MM-DD) no timezone de São Paulo, evitando shift por UTC. */
export function nowYmdInSaoPaulo(): string {
  return ymdInTimeZone(new Date(), SAO_PAULO_TZ);
}

/** Formata "data" (sem hora) para pt-BR respeitando timezone SP quando input contém hora/offset. */
export function formatDatePtBrInSaoPaulo(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const s = typeof input === 'string' ? input.trim() : '';
  // Se já for date-only, não criar Date (evita o bug do JS: YYYY-MM-DD => UTC)
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return formatDateDisplay(s);
  }
  if (typeof input === 'string' && s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s) && !s.includes('T')) {
    return formatDateDisplay(s.slice(0, 10));
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Formata data/hora pt-BR (exibição de histórico) em `America/Sao_Paulo`. */
export function formatDateTimePtBrInSaoPaulo(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

/** Compara data-only (YYYY-MM-DD ou ISO) com hoje no calendário local. */
export function isDateStrBeforeLocalToday(dateStr?: string | null): boolean {
  const x = serverDateToInput(dateStr);
  if (!x) return false;
  const [y, m, d] = x.split('-').map(Number);
  const now = new Date();
  const ty = now.getFullYear();
  const tm = now.getMonth() + 1;
  const td = now.getDate();
  if (y !== ty) return y < ty;
  if (m !== tm) return m < tm;
  return d < td;
}

/** Prazo vencido: data do prazo (calendário local) é anterior a hoje. */
export function isPrazoAtrasadoCalendarioLocal(dateStr?: string | null): boolean {
  return isDateStrBeforeLocalToday(dateStr);
}

const MESES_LONGO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

/** Ex.: 10 de abril de 2026 — sem deslocar dia por timezone (usa YYYY-MM-DD da API). */
export function formatDateDisplayLong(dateStr?: string | null): string {
  const x = serverDateToInput(dateStr);
  if (!x) return '';
  const [ys, ms, ds] = x.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const mes = MESES_LONGO[m - 1];
  if (!mes) return formatDateDisplay(dateStr);
  return `${d} de ${mes} de ${y}`;
}

