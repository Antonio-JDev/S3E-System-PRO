// Configuração da API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
};

// Headers padrão
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuração de endpoints
export const ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout',
  },
  
  // Cadastros básicos
  CLIENTES: '/api/clientes',
  FORNECEDORES: '/api/fornecedores',
  EMPRESAS: '/api/empresas',
  
  // Projetos e Serviços
  PROJETOS: '/api/projetos',
  SERVICOS: '/api/servicos',
  
  // Estoque e Materiais
  MATERIAIS: '/api/materiais',
  MOVIMENTACOES: '/api/movimentacoes',
  
  // Compras e Orçamentos
  COMPRAS: '/api/compras',
  ORCAMENTOS: '/api/orcamentos',
  
  // Vendas e Financeiro
  VENDAS: '/api/vendas',
  CONTAS_PAGAR: '/api/contas-pagar',
  
  // Fiscal
  NFE: '/api/nfe',
  CONFIG_FISCAL: '/api/configuracoes-fiscais',
  
  // Obras e Equipes
  OBRAS: '/api/obras',
  EQUIPES: '/api/equipes',
  
  // Relatórios
  RELATORIOS: '/api/relatorios',
  
  // Dashboard
  DASHBOARD: {
    ESTATISTICAS: '/api/dashboard/estatisticas',
    GRAFICOS: '/api/dashboard/graficos',
    ALERTAS: '/api/dashboard/alertas',
  },
  
  // Histórico
  HISTORICO: '/api/historico',
  
  // Comparação de Preços
  COMPARACAO_PRECOS: '/api/comparacao-precos',
  
  // PDF
  PDF: '/api/pdf',
};
