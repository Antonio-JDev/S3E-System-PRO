/**
 * Utilitários para verificação de permissões RBAC
 */

export interface User {
  role?: string;
}

export type Permission = 
  | 'view_projetos'
  | 'view_vendas'
  | 'view_catalogo'
  | 'view_movimentacoes'
  | 'view_comparacao_precos'
  | 'view_obras'
  | 'view_tarefas_obra'
  | 'view_gestao_obras'
  | 'view_servicos'
  | 'view_financeiro'
  | 'view_nfe'
  | 'view_logs'
  | 'view_gerenciamento';

/**
 * Verifica se o usuário tem permissão para excluir registros
 * Apenas Desenvolvedor e Administrador podem excluir
 */
export const canDelete = (user: User | null | undefined): boolean => {
  if (!user || !user.role) return false;
  
  const role = user.role.toLowerCase();
  return role === 'desenvolvedor' || role === 'admin' || role === 'administrador';
};

/**
 * Verifica se o usuário é Desenvolvedor
 */
export const isDeveloper = (user: User | null | undefined): boolean => {
  if (!user || !user.role) return false;
  return user.role.toLowerCase() === 'desenvolvedor';
};

/**
 * Verifica se o usuário é Administrador
 */
export const isAdmin = (user: User | null | undefined): boolean => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'administrador';
};

/**
 * Verifica se o usuário tem uma permissão específica
 * @param user - Usuário a verificar
 * @param permission - Permissão necessária (ex: 'view_projetos', 'view_vendas')
 * 
 * IMPORTANTE: Desenvolvedor tem acesso UNIVERSAL a todas as páginas e funcionalidades
 */
export const hasPermission = (user: User | null | undefined, permission: Permission | string): boolean => {
  if (!user || !user.role) return false;
  const userRole = user.role.toLowerCase();
  
  // Desenvolvedor tem acesso UNIVERSAL - sempre retorna true
  if (userRole === 'desenvolvedor') return true;
  
  // Admin/Administrador tem todas as permissões (exceto logs que é devOnly)
  if (userRole === 'admin' || userRole === 'administrador') {
    // Logs é apenas para desenvolvedor
    if (permission === 'view_logs') return false;
    return true;
  }
  
  // Mapeamento de permissões por role
  const rolePermissions: Record<string, Permission[]> = {
    // Gerente: acesso amplo (quase tudo exceto logs)
    gerente: [
      'view_projetos',
      'view_vendas',
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras',
      'view_tarefas_obra',
      'view_gestao_obras',
      'view_servicos',
      'view_financeiro',
      'view_nfe',
      'view_gerenciamento'
    ],
    
    // Engenheiro Elétrico: acesso operacional e projetos
    engenheiro: [
      'view_projetos',
      'view_obras',
      'view_tarefas_obra',
      'view_gestao_obras',
      'view_servicos',
      'view_movimentacoes',
      'view_catalogo',
      'view_gerenciamento'
    ],
    
    // Orcamentista: acesso comercial
    orcamentista: [
      'view_projetos',
      'view_vendas',
      'view_catalogo',
      'view_obras',
      'view_servicos'
    ],
    
    // Compras: acesso a suprimentos
    compras: [
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras' // Para ver obras e necessidades
    ],
    
    // Eletricista: acesso operacional básico
    eletricista: [
      'view_obras',
      'view_tarefas_obra',
      'view_movimentacoes'
    ],
    
    // User padrão: acesso mínimo
    user: [
      'view_obras',
      'view_tarefas_obra'
    ]
  };
  
  // Verificar se o role tem a permissão
  const permissions = rolePermissions[userRole];
  if (permissions) {
    return permissions.includes(permission as Permission);
  }
  
  // Se o role não estiver mapeado, retorna false (segurança)
  return false;
};
