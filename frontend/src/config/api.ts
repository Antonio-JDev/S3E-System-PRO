// Configuração da API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '',
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
};

/**
 * Função auxiliar para garantir que a URL sempre use a porta 3001 (backend)
 * Nunca usa a porta 8080 (frontend) para requisições de API/arquivos
 */
export const getBackendUrl = (): string => {
  let baseUrl = API_CONFIG.BASE_URL;
  
  // Se não tiver BASE_URL, tentar construir a partir da origem atual
  if (!baseUrl && typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Se estiver na porta 8080, trocar para 3001
    if (origin.includes(':8080')) {
      baseUrl = origin.replace(':8080', ':3001');
    } else if (!origin.includes(':3001')) {
      // Se não tiver porta definida, adicionar :3001
      baseUrl = `${origin.split(':')[0]}:3001`;
    } else {
      baseUrl = origin;
    }
  }
  
  // Se BASE_URL ainda tiver porta 8080, corrigir para 3001
  if (baseUrl && baseUrl.includes(':8080')) {
    baseUrl = baseUrl.replace(':8080', ':3001');
  }
  
  return baseUrl || '';
};

/**
 * Constrói a URL completa para um arquivo de upload (logo, imagem, etc.)
 * Se a URL já começar com http/https ou for base64, retorna ela mesma.
 * Caso contrário, tenta usar o endpoint específico primeiro,
 * depois tenta a URL direta via express.static.
 * 
 * ⚠️ IMPORTANTE: Sempre usa a porta 3001 (backend), nunca 8080 (frontend)
 */
export const getUploadUrl = (url: string): string => {
  if (!url) return '';
  
  // Se for uma URL completa (http/https), retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // ✅ IMPORTANTE: Se for dados base64 (data:image), retornar como está
  // Isso evita tentar processar base64 como URL de arquivo
  if (url.startsWith('data:image/') || url.startsWith('data:application/')) {
    return url;
  }
  
  // ✅ CORREÇÃO: Garantir que sempre usa a porta 3001 (backend)
  const baseUrl = getBackendUrl();
  
  // ✅ SIMPLIFICADO: Usar express.static para TODAS as imagens de uploads
  // O backend já serve /uploads via express.static(uploadsPath) com CORS configurado
  // Isso funciona para: logos, materiais, tarefas-obra, pdf-customization, etc.
  
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return baseUrl ? `${baseUrl}${cleanUrl}` : cleanUrl;
};

// Headers padrão
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuração de endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout',
  },
  CLIENTES: '/api/clientes',
  FORNECEDORES: '/api/fornecedores',
  PROJETOS: '/api/projetos',
  SERVICOS: '/api/servicos',
  MOVIMENTACOES: '/api/movimentacoes',
  HISTORICO: '/api/historico',
  NFE: '/api/nfe',
  EMPRESAS: '/api/empresas',
  MATERIAIS: '/api/materiais',
  KITS: '/api/kits',
  CATALOGO: {
    // Usando materiais como base para o catálogo
    ITENS: '/api/materiais',
    SERVICOS: '/api/servicos',
    KITS: '/api/kits',
  },
  DASHBOARD: {
    ESTATISTICAS: '/api/dashboard/estatisticas',
    GRAFICOS: '/api/dashboard/graficos',
    ALERTAS: '/api/dashboard/alertas',
  },
  OBRAS: {
    EQUIPES: '/api/obras/equipes',
    ALOCACOES: '/api/obras/alocacoes',
    CALENDARIO: '/api/obras/alocacoes/calendario',
  },
  ORCAMENTOS: '/api/orcamentos',
  RELATORIOS: {
    FINANCEIRO: '/api/relatorios/financeiro',
    FINANCEIRO_RESUMO: '/api/relatorios/financeiro/resumo',
  },
  COMPARACAO_PRECOS: '/api/comparacao-precos',
};
