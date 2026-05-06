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

