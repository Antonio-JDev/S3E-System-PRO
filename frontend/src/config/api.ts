// Configuração da API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '',
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
};

/**
 * Retorna a URL base do backend para requisições e uploads.
 * - Se VITE_API_URL estiver definido (produção ou dev), usa esse valor.
 * - Em desenvolvimento local (porta 8080 ou 5173): usa mesma origem com porta 3001 (backend).
 * - Em produção (sem porta de dev): usa a mesma origem, para funcionar com reverse proxy (ex: nginx fazendo /api → backend).
 */
export const getBackendUrl = (): string => {
  let baseUrl = API_CONFIG.BASE_URL;
  
  if (!baseUrl && typeof window !== 'undefined') {
    const origin = window.location.origin;
    const isDev = origin.includes(':8080') || origin.includes(':5173');
    if (isDev) {
      // Desenvolvimento: front na 8080/5173, backend na 3001
      baseUrl = origin.includes(':8080')
        ? origin.replace(':8080', ':3001')
        : origin.replace(':5173', ':3001');
    } else {
      // Produção: mesma origem (front e API atrás do mesmo host, ex: proxy /api → backend)
      baseUrl = origin;
    }
  }
  
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
 * Em dev (8080/5173): usa backend na porta 3001.
 * Em produção com Traefik: mesma origem do browser (porta 80), path /uploads → backend.
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
  
  let baseUrl = getBackendUrl();
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const isDev = origin.includes(':8080') || origin.includes(':5173');
    if (!isDev) {
      baseUrl = origin;
    }
  }
  
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
  MOVIMENTACOES_CAIXA: '/api/movimentacoes-caixa',
  COMPARACAO_PRECOS: '/api/comparacao-precos',
  ATENDIMENTO_CRM: '/api/atendimento-crm',
  BRASIL_API: {
    NCM_SEARCH: '/api/brasil-api/ncm/search',
    /** path com código NCM (com ou sem pontos); usar encodeURIComponent no código */
    ncmByCode: (code: string) => `/api/brasil-api/ncm/${encodeURIComponent(code)}`,
  },
};
