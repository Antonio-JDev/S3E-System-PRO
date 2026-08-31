/**
 * Utilitários para verificação de permissões RBAC
 */

export interface User {
  role?: string;
  isAdmin?: boolean;
}

export type Permission = 
  | 'view_projetos'
  | 'view_vendas'
  | 'view_catalogo'
  | 'view_movimentacoes'
  | 'view_comparacao_precos'
  | 'view_obras'
  | 'view_tarefas_obra'
  | 'view_tarefas_internas'
  | 'view_gestao_obras'
  | 'view_servicos'
  | 'view_financeiro'
  | 'view_nfe'
  | 'view_logs'
  | 'view_gerenciamento'
  | 'view_kit'
  | 'view_frota';

/**
 * Verifica se o usuário tem permissão para excluir registros
 * Desenvolvedor, Administrador (role ou isAdmin), Financeiro/Faturamento podem excluir
 */
export const canDelete = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (!user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'desenvolvedor' || role === 'admin' || role === 'administrador' || role === 'financeiro_faturamento';
};

/** Admin, financeiro ou desenvolvedor — corrigir/excluir lançamentos manuais no financeiro. */
export const canEditarContaFinanceiraManual = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (!user.role) return false;
  const role = user.role.toLowerCase();
  return (
    role === 'desenvolvedor' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'financeiro' ||
    role === 'financeiro_faturamento'
  );
};

/**
 * Verifica se o usuário é Desenvolvedor
 */
export const isDeveloper = (user: User | null | undefined): boolean => {
  if (!user || !user.role) return false;
  return user.role.toLowerCase() === 'desenvolvedor';
};

/**
 * Verifica se o usuário é Administrador (role admin ou flag isAdmin definida no gerenciamento de usuários)
 */
export const isAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (!user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'administrador';
};

/** Admin ou desenvolvedor — regressão manual de status de orçamento. */
export const canRegredirOrcamentoStatus = (user: User | null | undefined): boolean => {
  return isAdmin(user) || isDeveloper(user);
};

/** Admin ou desenvolvedor — rollback de status da ordem de serviço. */
export const canReverterStatusOs = (user: User | null | undefined): boolean => {
  return isAdmin(user) || isDeveloper(user);
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
  
  // Admin/Administrador ou isAdmin: todas as permissões (exceto logs que é devOnly)
  if (userRole === 'admin' || userRole === 'administrador' || user.isAdmin === true) {
    if (permission === 'view_logs') return false;
    return true;
  }
  
  // Financeiro/Faturamento: mesmo nível que Administrador (acesso a todos os módulos exceto Logs)
  if (userRole === 'financeiro_faturamento') {
    if (permission === 'view_logs') return false;
    return true;
  }

  // Gestão de Frota: todos os perfis autenticados, exceto eletricista
  if (permission === 'view_frota') {
    return userRole !== 'eletricista';
  }
  
  // Módulo Financeiro: apenas admin, gerente, financeiro_faturamento ou isAdmin
  if (permission === 'view_financeiro') {
    return userRole === 'admin' || userRole === 'gerente' || userRole === 'financeiro_faturamento' || user.isAdmin === true;
  }
  
  // Mapeamento de permissões por role
  const rolePermissions: Record<string, Permission[]> = {
    // Gerente: acesso amplo EXCETO Emissão NF-e e aba Recursos Humanos (oculta no Gerenciamento)
    gerente: [
      'view_projetos',
      'view_vendas',
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_financeiro',
      'view_gerenciamento',
      'view_kit',
      'view_frota'
    ],
    
    // Desenhista Industrial: como engenheiro elétrico (sem Financeiro, NF-e, Frota; RH/Frota/Despesas ocultos no Gerenciamento)
    desenhista_industrial: [
      'view_projetos',
      'view_vendas',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_movimentacoes',
      'view_catalogo',
      'view_comparacao_precos',
      'view_gerenciamento',
      'view_kit'
    ],
    
    // Engenheiro Eletricista: sem Financeiro, Emissão NF-e, Frota; abas RH/Frota/Despesas Fixas ocultas no Gerenciamento
    engenheiro_eletricista: [
      'view_projetos',
      'view_vendas',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_movimentacoes',
      'view_catalogo',
      'view_comparacao_precos',
      'view_gerenciamento',
      'view_kit'
    ],
    
    // Engenheiro (legado): mesmo que engenheiro_eletricista (sem financeiro/logs/gerenciamento)
    engenheiro: [
      'view_projetos',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_movimentacoes',
      'view_catalogo',
      'view_comparacao_precos',
      'view_kit'
    ],
    
    // Financeiro/Faturamento: mesmo nível que Administrador (acesso a todos os módulos)
    financeiro_faturamento: [
      'view_projetos',
      'view_vendas',
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_financeiro',
      'view_nfe',
      'view_gerenciamento',
      'view_kit',
      'view_frota'
    ],
    
    // Orcamentista (legado): acesso comercial - módulo orçamentos todos podem usar
    orcamentista: [
      'view_projetos',
      'view_vendas',
      'view_catalogo',
      'view_obras',
      'view_tarefas_internas',
      'view_servicos'
    ],
    
    // Comprador: frota e suprimentos
    comprador: [
      'view_frota',
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas',
      'view_gestao_obras',
      'view_servicos',
      'view_vendas',
      'view_projetos',
      'view_kit'
    ],
    
    // Compras (legado): módulo compras todos podem usar
    compras: [
      'view_catalogo',
      'view_movimentacoes',
      'view_comparacao_precos',
      'view_obras',
      'view_tarefas_internas'
    ],
    
    // Eletricista: hub de OS + ferramentas (seu kit)
    eletricista: [
      'view_tarefas_obra',
      'view_kit',
      'view_projetos'
    ],
    
    // User padrão: acesso mínimo
    user: [
      'view_obras',
      'view_tarefas_obra',
      'view_tarefas_internas'
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
