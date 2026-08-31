export interface UsuarioOsOption {
  id: string;
  nome: string;
  email?: string;
  funcao?: string;
  role?: string;
}

export interface ProjetoResponsavelRef {
  responsavelId?: string | null;
  responsavel?: { id: string; nome: string } | null;
}

/** Inclui o responsável atual nas opções do card mesmo se estiver fora da lista filtrada. */
export function listarUsuariosResponsavelOs(
  usuariosOs: UsuarioOsOption[],
  projeto: ProjetoResponsavelRef,
): UsuarioOsOption[] {
  const ids = new Set(usuariosOs.map((u) => u.id));
  if (projeto.responsavelId && !ids.has(projeto.responsavelId)) {
    return [
      ...usuariosOs,
      {
        id: projeto.responsavelId,
        nome: projeto.responsavel?.nome || 'Responsável atual',
        email: '',
        funcao: '',
        role: '',
      },
    ];
  }
  return usuariosOs;
}
