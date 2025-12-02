import { Request, Response, NextFunction } from 'express';

// Tipos de permissões
export type Permission = 
  | 'view_logs'
  | 'view_financeiro'
  | 'view_nfe'
  | 'view_gerenciamento'
  | 'view_frota'
  | 'view_obras'
  | 'view_movimentacoes'
  | 'view_catalogo'
  | 'view_comparacao_precos'
  | 'view_projetos'
  | 'view_gestao_obras'
  | 'view_servicos'
  | 'view_vendas'
  | 'view_tarefas_obra'
  | 'create_material'
  | 'update_material'
  | 'delete_material'
  | 'deactivate_material'
  | 'create_projeto'
  | 'update_projeto'
  | 'delete_projeto'
  | 'deactivate_projeto'
  | 'create_servico'
  | 'update_servico'
  | 'delete_servico'
  | 'deactivate_servico'
  | 'create_orcamento'
  | 'update_orcamento'
  | 'delete_orcamento'
  | 'deactivate_orcamento'
  | 'create_kit'
  | 'update_kit'
  | 'delete_kit'
  | 'deactivate_kit'
  | 'create_obra'
  | 'update_obra'
  | 'delete_obra'
  | 'deactivate_obra'
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'universal_delete';

type UserRole = 'desenvolvedor' | 'admin' | 'gerente' | 'comprador' | 'engenheiro' | 'eletricista';

// Mapeamento de permissões por role
const rolePermissions: Record<UserRole, Permission[]> = {
  desenvolvedor: [
    'view_logs', 'view_financeiro', 'view_nfe', 'view_gerenciamento', 'view_frota',
    'view_obras', 'view_movimentacoes', 'view_catalogo', 'view_comparacao_precos',
    'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas', 'view_tarefas_obra',
    'create_material', 'update_material', 'delete_material', 'deactivate_material',
    'create_projeto', 'update_projeto', 'delete_projeto', 'deactivate_projeto',
    'create_servico', 'update_servico', 'delete_servico', 'deactivate_servico',
    'create_orcamento', 'update_orcamento', 'delete_orcamento', 'deactivate_orcamento',
    'create_kit', 'update_kit', 'delete_kit', 'deactivate_kit',
    'create_obra', 'update_obra', 'delete_obra', 'deactivate_obra',
    'create_user', 'update_user', 'delete_user',
    'universal_delete'
  ],
  admin: [
    'view_financeiro', 'view_nfe', 'view_gerenciamento', 'view_frota',
    'view_obras', 'view_movimentacoes', 'view_catalogo', 'view_comparacao_precos',
    'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas',
    'create_material', 'update_material', 'delete_material', 'deactivate_material',
    'create_projeto', 'update_projeto', 'delete_projeto', 'deactivate_projeto',
    'create_servico', 'update_servico', 'delete_servico', 'deactivate_servico',
    'create_orcamento', 'update_orcamento', 'delete_orcamento', 'deactivate_orcamento',
    'create_kit', 'update_kit', 'delete_kit', 'deactivate_kit',
    'create_obra', 'update_obra', 'delete_obra', 'deactivate_obra',
    'create_user', 'update_user', 'delete_user'
  ],
  gerente: [
    'view_financeiro', 'view_nfe', 'view_gerenciamento', 'view_frota',
    'view_obras', 'view_movimentacoes', 'view_catalogo', 'view_comparacao_precos',
    'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas',
    'create_material', 'update_material', 'delete_material', 'deactivate_material',
    'create_projeto', 'update_projeto', 'delete_projeto', 'deactivate_projeto',
    'create_servico', 'update_servico', 'delete_servico', 'deactivate_servico',
    'create_orcamento', 'update_orcamento', 'delete_orcamento', 'deactivate_orcamento',
    'create_kit', 'update_kit', 'delete_kit', 'deactivate_kit',
    'create_obra', 'update_obra', 'delete_obra', 'deactivate_obra',
    'create_user', 'update_user', 'delete_user'
  ],
  comprador: [
    'view_frota', 'view_obras', 'view_movimentacoes', 'view_catalogo',
    'view_comparacao_precos', 'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas',
    'create_material', 'update_material', 'deactivate_material',
    'create_projeto', 'update_projeto', 'deactivate_projeto',
    'create_servico', 'update_servico', 'deactivate_servico',
    'create_orcamento', 'update_orcamento', 'deactivate_orcamento',
    'create_kit', 'update_kit', 'deactivate_kit',
    'create_obra', 'update_obra', 'deactivate_obra'
  ],
  engenheiro: [
    'view_obras', 'view_movimentacoes', 'view_catalogo', 'view_comparacao_precos',
    'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas',
    'create_material', 'update_material', 'deactivate_material',
    'create_projeto', 'update_projeto', 'deactivate_projeto',
    'create_servico', 'update_servico', 'deactivate_servico',
    'create_orcamento', 'update_orcamento', 'deactivate_orcamento',
    'create_kit', 'update_kit', 'deactivate_kit',
    'create_obra', 'update_obra', 'deactivate_obra'
  ],
  eletricista: [
    'view_tarefas_obra', 'view_movimentacoes',
    'update_obra' // Apenas atualizar status de tarefas
  ]
};

/**
 * Verifica se uma role tem uma permissão específica
 */
export function hasPermission(userRole: string | undefined, permission: Permission): boolean {
  if (!userRole) {
    console.log('⚠️ hasPermission: userRole é undefined');
    return false;
  }
  
  // Normalizar role: remover espaços, converter para minúsculas
  const normalizedRole = userRole.trim().toLowerCase() as UserRole;
  console.log(`🔍 hasPermission: Role original: "${userRole}" -> Normalizado: "${normalizedRole}"`);
  
  const permissions = rolePermissions[normalizedRole];
  
  if (!permissions) {
    console.log(`⚠️ hasPermission: Role "${normalizedRole}" não encontrado no mapeamento`);
    console.log(`🔍 Roles disponíveis:`, Object.keys(rolePermissions));
    return false;
  }
  
  const hasAccess = permissions.includes(permission);
  console.log(`🔍 hasPermission: Role "${normalizedRole}" tem permissão "${permission}": ${hasAccess}`);
  if (hasAccess) {
    console.log(`✅ hasPermission: Acesso concedido para "${normalizedRole}" com permissão "${permission}"`);
  } else {
    console.log(`❌ hasPermission: Acesso negado - Role "${normalizedRole}" não tem permissão "${permission}"`);
    console.log(`🔍 Permissões disponíveis para "${normalizedRole}":`, permissions);
  }
  return hasAccess;
}

/**
 * Middleware para verificar permissões
 */
export const checkPermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const userRole = user?.role;
    
    console.log(`🔍 [RBAC] checkPermission: Verificando permissões`);
    console.log(`🔍 [RBAC] User object completo:`, JSON.stringify(user, null, 2));
    console.log(`🔍 [RBAC] Role extraído: "${userRole}" (tipo: ${typeof userRole})`);
    console.log(`🔍 [RBAC] Permissões requeridas: ${requiredPermissions.join(', ')}`);
    
    if (!userRole) {
      console.error('❌ [RBAC] userRole é undefined ou null');
      res.status(403).json({ 
        success: false, 
        error: '🚫 Acesso negado. Role do usuário não identificado.' 
      });
      return;
    }
    
    // Desenvolvedor tem acesso universal
    const normalizedRoleForDev = userRole.trim().toLowerCase();
    if (normalizedRoleForDev === 'desenvolvedor') {
      console.log('🔓 [RBAC] Desenvolvedor detectado - Acesso universal concedido');
      next();
      return;
    }
    
    // Verificar se tem PELO MENOS UMA das permissões requeridas
    const hasAccess = requiredPermissions.some(permission => hasPermission(userRole, permission));
    
    if (!hasAccess) {
      console.error(`🚫 [RBAC] Acesso negado: Role "${userRole}" não tem permissões ${requiredPermissions.join(', ')}`);
      const normalizedRole = userRole.trim().toLowerCase();
      const availablePermissions = rolePermissions[normalizedRole as UserRole] || [];
      console.error(`🔍 [RBAC] Permissões disponíveis para "${normalizedRole}":`, availablePermissions);
      console.error(`🔍 [RBAC] Roles disponíveis no sistema:`, Object.keys(rolePermissions));
      res.status(403).json({ 
        success: false, 
        error: `🚫 Acesso negado. Role "${userRole}" não tem permissão para acessar este recurso.` 
      });
      return;
    }
    
    console.log(`✅ [RBAC] Permissão concedida: ${userRole} pode acessar ${requiredPermissions.join(', ')}`);
    next();
  };
};

/**
 * Middleware para verificar permissão de DELETE
 */
export const checkDeletePermission = (entityType: 'material' | 'projeto' | 'servico' | 'orcamento' | 'kit' | 'obra' | 'user') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).user?.role?.toLowerCase();
    const isPermanent = req.query.permanent === 'true';
    
    // Desenvolvedor tem permissão universal
    if (userRole === 'desenvolvedor') {
      console.log('🔓 Desenvolvedor - Permissão universal de delete');
      next();
      return;
    }
    
    // Se é delete permanente, apenas admin e gerente
    if (isPermanent) {
      if (['admin', 'gerente'].includes(userRole)) {
        console.log(`✅ ${userRole} pode deletar ${entityType} permanentemente`);
        next();
        return;
      } else {
        console.log(`🚫 ${userRole} NÃO pode deletar ${entityType} permanentemente`);
        res.status(403).json({ 
          success: false, 
          error: '🚫 Apenas Administradores e Gerentes podem excluir permanentemente.' 
        });
        return;
      }
    }
    
    // Se é apenas desativação, comprador e engenheiro podem
    if (['comprador', 'engenheiro'].includes(userRole)) {
      const permission = `deactivate_${entityType}` as Permission;
      if (hasPermission(userRole, permission)) {
        console.log(`✅ ${userRole} pode desativar ${entityType}`);
        next();
        return;
      }
    }
    
    // Admin e Gerente podem fazer ambos
    if (['admin', 'gerente'].includes(userRole)) {
      console.log(`✅ ${userRole} pode deletar/desativar ${entityType}`);
      next();
      return;
    }
    
    console.log(`🚫 ${userRole} não tem permissão para ${entityType}`);
    res.status(403).json({ 
      success: false, 
      error: '🚫 Você não tem permissão para esta operação.' 
    });
  };
};

/**
 * Middleware para verificar se usuário é eletricista
 */
export const checkEletricista = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = (req as any).user?.role?.toLowerCase();
  
  // Desenvolvedor tem acesso universal
  if (userRole === 'desenvolvedor') {
    next();
    return;
  }
  
  // Apenas eletricistas
  if (userRole === 'eletricista') {
    next();
    return;
  }
  
  res.status(403).json({ 
    success: false, 
    error: '🚫 Acesso negado. Apenas eletricistas podem acessar esta funcionalidade.' 
  });
};

