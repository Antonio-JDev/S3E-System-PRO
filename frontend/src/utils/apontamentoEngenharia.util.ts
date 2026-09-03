/** Funções de usuário elegíveis para apontamento "Hora engenharia". */
export const ROLES_APONTAMENTO_ENGENHARIA = [
  'engenheiro_eletricista',
  'engenheiro', // legado — exibido como "Engenheiro Elétrico" em Configurações
  'desenhista_industrial',
] as const;

/** Usuários-chave sempre elegíveis (independente de setor/função no cadastro). */
export const EMAILS_APONTAMENTO_ENGENHARIA_SISTEMA = [
  'alois@s3eengenharia.com.br',
  'tiago@s3eengenharia.com.br',
] as const;

const EMAILS_SISTEMA_SET = new Set(
  EMAILS_APONTAMENTO_ENGENHARIA_SISTEMA.map((e) => e.toLowerCase()),
);

export function normalizarTextoSetor(setor: string | null | undefined): string {
  return String(setor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

/** Usuários do setor Engenharia com função de projetos/engenharia (+ allowlist fixa). */
export function usuarioApontamentoEngenharia(u: {
  role?: string | null;
  setor?: string | null;
  active?: boolean | null;
  email?: string | null;
}): boolean {
  if (u.active === false) return false;
  if (EMAILS_SISTEMA_SET.has(normalizarEmail(u.email))) return true;
  const role = String(u.role ?? '').toLowerCase();
  const setor = normalizarTextoSetor(u.setor);
  if (!setor.includes('engenharia')) return false;
  return (ROLES_APONTAMENTO_ENGENHARIA as readonly string[]).includes(role);
}
