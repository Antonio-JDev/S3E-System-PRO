/** Conta seed/sistema (ex.: desenvolvedor principal) — cadastro bloqueado para terceiros. */
export function isProtectedAccount(user: { contaProtegida?: boolean | null } | null | undefined): boolean {
  return user?.contaProtegida === true;
}

/** Terceiros não podem editar conta protegida; o próprio titular pode. */
export function isProtectedAccountBlockedForEditor(
  target: { id: string; contaProtegida?: boolean | null } | null | undefined,
  editorUserId?: string | null
): boolean {
  if (!isProtectedAccount(target)) return false;
  return target!.id !== editorUserId;
}
