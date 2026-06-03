export function parseResponsaveisIdsFromTask(task: {
  responsavel?: string | null;
  responsaveisIds?: unknown;
}): string[] {
  const ids = new Set<string>();
  if (task.responsavel) ids.add(String(task.responsavel));
  const raw = task.responsaveisIds;
  if (Array.isArray(raw)) {
    raw.forEach((id) => {
      if (id) ids.add(String(id));
    });
  } else if (raw != null && typeof raw === 'object') {
    Object.values(raw as Record<string, unknown>).forEach((id) => {
      if (id) ids.add(String(id));
    });
  }
  return Array.from(ids);
}

export function taskAtribuidaAoUsuario(
  task: { responsavel?: string | null; responsaveisIds?: unknown },
  userId: string,
): boolean {
  return parseResponsaveisIdsFromTask(task).some((id) => id === String(userId));
}
