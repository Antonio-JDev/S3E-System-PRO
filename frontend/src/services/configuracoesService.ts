import { axiosApiService } from './axiosApi';

export interface ConfiguracaoSistema {
  id: string;
  temaPreferido: string; // 'light' | 'dark' | 'system'
  logoUrl?: string; // Logo geral da empresa
  logoLoginUrl?: string; // Logo específica para página de login
  nomeEmpresa: string;
  emailContato?: string;
  telefoneContato?: string;
  portfolioUrl?: string;
  multiplicadorVenda?: number | null;
  percentualImpostoPadrao?: number | null;
  aliquotaImpostoPadrao?: number | null; // Alíquota % sobre valor de venda (DAS Simples Nacional), default 8
  markupFabricante?: number | null; // Preço venda = Preço compra × este valor (Fabricante), default 1.55
  markupRevendedor?: number | null; // Preço venda = Preço compra × este valor (Representante/Vendedor), default 1.10
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConfiguracaoData {
  temaPreferido?: string;
  logoUrl?: string;
  nomeEmpresa?: string;
  emailContato?: string;
  telefoneContato?: string;
  portfolioUrl?: string;
  multiplicadorVenda?: number;
  percentualImpostoPadrao?: number;
  aliquotaImpostoPadrao?: number;
  markupFabricante?: number;
  markupRevendedor?: number;
}

export interface Usuario {
  id: string;
  name: string;
  setor?: string | null;
  email: string;
  role: string;
  isAdmin?: boolean;
  contaProtegida?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioFiltros {
  search?: string;
  role?: string;
  active?: boolean;
}

export type OrcamentoInsercaoModo = 'check' | 'ocultar';

export interface PreferenciasUsuario {
  orcamentoInsercaoModo: OrcamentoInsercaoModo;
}

/** Meta de vendas global (API /api/configuracoes/meta-vendas) */
export interface MetaVendasSistema {
  padrao: number;
  porMes: Record<string, number>;
  mesAtual: string;
  valorEfetivo: number;
}

class ConfiguracoesService {
  /**
   * Busca as configurações do sistema
   */
  async getConfiguracoes() {
    return axiosApiService.get<ConfiguracaoSistema>('/api/configuracoes');
  }

  /**
   * Meta de faturamento mensal (sistema inteiro; leitura para usuário autenticado)
   */
  async getMetaVendas(mes?: string) {
    return axiosApiService.get<MetaVendasSistema>('/api/configuracoes/meta-vendas', mes ? { mes } : undefined);
  }

  /**
   * Atualiza meta de um mês (admin ou desenvolvedor)
   */
  async salvarMetaVendas(body: { mes?: string; valor: number; atualizarMetaPadrao?: boolean }) {
    return axiosApiService.put<MetaVendasSistema>('/api/configuracoes/meta-vendas', body);
  }

  /**
   * Salva/atualiza as configurações do sistema
   */
  async salvarConfiguracoes(data: UpdateConfiguracaoData) {
    return axiosApiService.put<ConfiguracaoSistema>('/api/configuracoes', data);
  }

  /**
   * Atualiza URL pública do portfólio (apenas desenvolvedor)
   */
  async atualizarPortfolioUrl(portfolioUrl: string) {
    return axiosApiService.put<{ portfolioUrl: string }>('/api/configuracoes/portfolio-url', { portfolioUrl });
  }

  /**
   * Upload de logo da empresa
   */
  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    
    return axiosApiService.post<{ logoUrl: string; configuracoes: ConfiguracaoSistema }>('/api/configuracoes/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Lista todas as logos disponíveis na pasta uploads/logos
   */
  async listarLogos() {
    return axiosApiService.get<Array<{ filename: string; url: string }>>('/api/configuracoes/logos');
  }

  /**
   * Atualiza a logo da empresa selecionando uma logo existente
   */
  async atualizarLogo(logoUrl: string) {
    return axiosApiService.put<ConfiguracaoSistema>('/api/configuracoes/logo', { logoUrl });
  }

  /**
   * Atualiza a logo da página de login selecionando uma logo existente
   */
  async atualizarLogoLogin(logoUrl: string) {
    return axiosApiService.put<ConfiguracaoSistema>('/api/configuracoes/logo-login', { logoUrl });
  }

  /**
   * Deleta uma logo do servidor
   */
  async deletarLogo(filename: string) {
    return axiosApiService.delete(`/api/configuracoes/logo/${filename}`);
  }

  /**
   * Lista todos os usuários
   */
  async listarUsuarios(filtros?: UsuarioFiltros) {
    return axiosApiService.get<Usuario[]>('/api/configuracoes/usuarios', filtros);
  }

  /**
   * Atualiza o role de um usuário
   */
  async atualizarUsuarioRole(userId: string, newRole: string) {
    return axiosApiService.put(`/api/configuracoes/usuarios/${userId}/role`, { role: newRole });
  }

  /**
   * Atualiza o perfil do usuário (nome e senha)
   */
  async atualizarPerfil(userId: string, data: { name?: string; senhaAtual?: string; senhaNova?: string }) {
    return axiosApiService.put(`/api/configuracoes/usuarios/${userId}/perfil`, data);
  }

  /**
   * Ativa/desativa um usuário
   */
  async toggleUsuarioStatus(userId: string, active: boolean) {
    return axiosApiService.put(`/api/configuracoes/usuarios/${userId}/status`, { active });
  }

  /**
   * Cria um novo usuário (Admin-only)
   */
  async criarUsuario(data: { email: string; password: string; name: string; role: string; setor?: string | null }) {
    return axiosApiService.post<Usuario>('/api/configuracoes/usuarios/criar', data);
  }

  /**
   * Exclui um usuário permanentemente (Admin-only)
   * ATENÇÃO: Esta operação é irreversível!
   */
  async excluirUsuario(userId: string) {
    return axiosApiService.delete(`/api/configuracoes/usuarios/${userId}`);
  }

  /**
   * Atualiza email e senha de um usuário (Gerente, Admin ou Desenvolvedor)
   */
  async atualizarUsuario(
    userId: string,
    data: { email?: string; name?: string; setor?: string | null; senhaNova?: string; isAdmin?: boolean }
  ) {
    return axiosApiService.put<Usuario>(`/api/configuracoes/usuarios/${userId}`, data);
  }

  /**
   * Retorna as preferências do usuário logado (ex: orcamentoInsercaoModo)
   */
  async getPreferenciasUsuario() {
    const res = await axiosApiService.get<PreferenciasUsuario>('/api/configuracoes/usuarios/me/preferencias');
    if (res.success && res.data) {
      return { success: true as const, data: res.data };
    }
    return { success: false as const, error: (res as any).error || 'Erro ao buscar preferências' };
  }

  /**
   * Salva as preferências do usuário logado
   */
  async salvarPreferenciasUsuario(data: { orcamentoInsercaoModo?: OrcamentoInsercaoModo }) {
    return axiosApiService.put<PreferenciasUsuario>('/api/configuracoes/usuarios/me/preferencias', data);
  }
}

export const configuracoesService = new ConfiguracoesService();

