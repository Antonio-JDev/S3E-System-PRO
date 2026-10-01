/** OS abertas que entram na lista do calendário para alocação. */
export const STATUS_OS_CALENDARIO = ['PROPOSTA', 'VALIDADO', 'APROVADO', 'EXECUCAO'] as const;

export type StatusOsCalendario = (typeof STATUS_OS_CALENDARIO)[number];

const ABERTAS = new Set<string>(STATUS_OS_CALENDARIO);

export function osVisivelNoCalendario(status: string | null | undefined): boolean {
  return ABERTAS.has(String(status || ''));
}
