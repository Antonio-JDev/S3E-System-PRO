export function statusLabel(status: string): string {
  switch (status) {
    case 'PROPOSTA': return 'Pendente';
    case 'VALIDADO':
    case 'APROVADO': return 'Aprovada';
    case 'EXECUCAO': return 'Em Execução';
    case 'CONCLUIDO': return 'Concluída';
    case 'CANCELADO': return 'Cancelado';
    default: return status;
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'PROPOSTA': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'VALIDADO':
    case 'APROVADO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'EXECUCAO': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'CONCLUIDO': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'CANCELADO': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
  }
}
