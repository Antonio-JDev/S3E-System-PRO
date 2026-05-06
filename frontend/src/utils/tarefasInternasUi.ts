/** Estilo do chip de prioridade no Kanban / detalhes de tarefas internas */
export function prioridadeTarefaInternaClassNames(p: string | undefined): {
  wrapper: string;
  label: string;
  displayLabel: string;
} {
  const raw = (p || '').trim();
  const u = raw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const displayLabel = raw || '—';
  if (u === 'ALTA') {
    return {
      wrapper: 'bg-red-50 dark:bg-red-900/25',
      label: 'font-bold text-red-600 dark:text-red-400',
      displayLabel
    };
  }
  if (u === 'MEDIA') {
    return {
      wrapper: 'bg-amber-50 dark:bg-amber-900/25',
      label: 'font-bold text-amber-700 dark:text-amber-400',
      displayLabel
    };
  }
  if (u === 'BAIXA') {
    return {
      wrapper: 'bg-blue-50 dark:bg-blue-900/25',
      label: 'font-bold text-blue-700 dark:text-blue-400',
      displayLabel
    };
  }
  return {
    wrapper: 'bg-gray-100 dark:bg-gray-700',
    label: 'font-bold text-gray-800 dark:text-gray-200',
    displayLabel
  };
}
