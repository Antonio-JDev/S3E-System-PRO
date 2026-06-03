export type KanbanStatusLabel = 'A Fazer' | 'Em Andamento' | 'Concluído';
export type KanbanStatusBackend = 'ToDo' | 'Doing' | 'Done';

export function normalizeKanbanStatusKey(status: string): 'todo' | 'doing' | 'done' | string {
  const s = status
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (s === 'todo' || s === 'a fazer') return 'todo';
  if (s === 'doing' || s === 'em andamento') return 'doing';
  if (s === 'done' || s === 'concluido') return 'done';
  return s;
}

export function labelKanbanStatus(status: string): KanbanStatusLabel {
  const key = normalizeKanbanStatusKey(status);
  if (key === 'doing') return 'Em Andamento';
  if (key === 'done') return 'Concluído';
  return 'A Fazer';
}

export function toBackendKanbanStatus(
  label: KanbanStatusLabel | 'Em Andamento' | 'Concluído' | 'A Fazer',
): KanbanStatusBackend {
  if (label === 'Em Andamento') return 'Doing';
  if (label === 'Concluído') return 'Done';
  return 'ToDo';
}

export function isKanbanConcluido(status: string): boolean {
  return normalizeKanbanStatusKey(status) === 'done';
}

export function isKanbanEmAndamento(status: string): boolean {
  return normalizeKanbanStatusKey(status) === 'doing';
}

export function kanbanStatusClass(status: string): string {
  const key = normalizeKanbanStatusKey(status);
  if (key === 'done') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
  }
  if (key === 'doing') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-slate-800/80 dark:text-slate-200';
}
