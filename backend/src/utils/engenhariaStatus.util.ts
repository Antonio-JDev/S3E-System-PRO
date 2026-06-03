export const STATUS_ENGENHARIA_OPCOES = [
  'A fazer',
  'Andamento',
  'Parado',
  'Protocolado',
  'Concluído',
] as const;

export function isStatusEngenhariaConcluido(status: string | null | undefined): boolean {
  const n = String(status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return n === 'concluido';
}
