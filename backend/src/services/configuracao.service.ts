import { prisma } from '../lib/prisma';
import { isProtectedAccount } from '../utils/userProtection.util';

export interface ConfiguracaoData {
  temaPreferido?: string; // 'light' | 'dark' | 'system'
  logoUrl?: string; // Logo geral da empresa
  logoLoginUrl?: string; // Logo específica para página de login
  logoDanfeUrl?: string; // Logo específica para DANFE
  nomeEmpresa?: string;
  emailContato?: string;
  telefoneContato?: string;
  portfolioUrl?: string;
  multiplicadorVenda?: number; // legado
  percentualImpostoPadrao?: number; // legado
  aliquotaImpostoPadrao?: number; // Alíquota % sobre valor de venda (DAS), default 8
  markupFabricante?: number; // Preço venda = Preço compra × este valor (Fabricante), default 1.55
  markupRevendedor?: number; // Preço venda = Preço compra × este valor (Revendedor), default 1.10
}

export interface UsuarioFiltros {
  search?: string;
  role?: string;
  active?: boolean;
}

export class ConfiguracaoService {
  private isDeveloperRole(role?: string | null): boolean {
    return String(role || '').toLowerCase() === 'desenvolvedor';
  }
  private normalizeMesReferencia(mes?: string): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const atual = `${y}-${m}`;
    if (mes && /^\d{4}-\d{2}$/.test(mes)) return mes;
    return atual;
  }

  private decimalConfigParaNumero(v: unknown): number {
    if (v == null) return 100000;
    if (typeof v === 'object' && v !== null && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
      return Number((v as { toNumber: () => number }).toNumber());
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 100000;
  }

  /**
   * Metas de vendas: padrão global + mapa por YYYY-MM (visível a todos; edição restrita na rota PUT).
   */
  async getMetaVendas(mesReferencia?: string) {
    const config = await this.getConfiguracoes();
    const mes = this.normalizeMesReferencia(mesReferencia);
    const padrao = this.decimalConfigParaNumero((config as { metaMensalVendas?: unknown }).metaMensalVendas);
    const raw = config.metasVendasPorMes;
    const porMes: Record<string, number> =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, val]) => [k, Number(val)])
          )
        : {};
    const especifica = porMes[mes];
    const valorEfetivo =
      typeof especifica === 'number' && !Number.isNaN(especifica) && especifica >= 0 ? especifica : padrao;

    return { padrao, porMes, mesAtual: mes, valorEfetivo };
  }

  async salvarMetaVendas(input: { mes?: string; valor: number; atualizarPadrao?: boolean }) {
    const mesBruto = input.mes?.trim();
    const mes = this.normalizeMesReferencia(mesBruto && /^\d{4}-\d{2}$/.test(mesBruto) ? mesBruto : undefined);
    const valor = Math.max(0, Number(input.valor));
    if (!Number.isFinite(valor)) {
      throw new Error('Valor da meta inválido');
    }
    const config = await this.getConfiguracoes();
    const prev = config.metasVendasPorMes;
    const map: Record<string, number> =
      prev && typeof prev === 'object' && !Array.isArray(prev)
        ? { ...(prev as Record<string, number>) }
        : {};
    map[mes] = valor;

    const data: { metasVendasPorMes: Record<string, number>; metaMensalVendas?: number } = { metasVendasPorMes: map };
    if (input.atualizarPadrao) {
      data.metaMensalVendas = valor;
    }

    await prisma.configuracaoSistema.update({
      where: { id: 'sistema-config' },
      data: data as any
    });

    return this.getMetaVendas(mes);
  }

  /**
   * Busca as configurações do sistema (cria se não existir)
   */
  async getConfiguracoes() {
    try {
      let config = await prisma.configuracaoSistema.findUnique({
        where: { id: 'sistema-config' }
      });

      // Se não existir, cria com valores padrão
      if (!config) {
        config = await prisma.configuracaoSistema.create({
          data: {
            id: 'sistema-config',
            temaPreferido: 'light',
            nomeEmpresa: 'Eng System Pro',
            multiplicadorVenda: 1.55,
            percentualImpostoPadrao: 8,
            aliquotaImpostoPadrao: 8,
            markupFabricante: 1.55,
            markupRevendedor: 1.10
          }
        });
      }

      return config;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw new Error('Erro ao buscar configurações do sistema');
    }
  }

  /**
   * Salva/atualiza as configurações do sistema
   */
  async salvarConfiguracoes(data: ConfiguracaoData) {
    try {
      const nomeEmpresaNormalized =
        data.nomeEmpresa != null && String(data.nomeEmpresa).trim() !== ''
          ? String(data.nomeEmpresa).trim()
          : 'Eng System Pro';

      const config = await prisma.configuracaoSistema.upsert({
        where: { id: 'sistema-config' },
        update: {
          ...data,
          nomeEmpresa: nomeEmpresaNormalized,
          updatedAt: new Date()
        } as any,
        create: {
          id: 'sistema-config',
          temaPreferido: data.temaPreferido || 'light',
          logoUrl: data.logoUrl,
          logoLoginUrl: data.logoLoginUrl,
          logoDanfeUrl: (data as any).logoDanfeUrl,
          nomeEmpresa: nomeEmpresaNormalized,
          emailContato: data.emailContato,
          telefoneContato: data.telefoneContato,
          portfolioUrl: data.portfolioUrl,
          multiplicadorVenda: data.multiplicadorVenda ?? data.markupFabricante ?? 1.55,
          percentualImpostoPadrao: data.percentualImpostoPadrao ?? data.aliquotaImpostoPadrao ?? 8,
          aliquotaImpostoPadrao: data.aliquotaImpostoPadrao ?? 8,
          markupFabricante: data.markupFabricante ?? 1.55,
          markupRevendedor: data.markupRevendedor ?? 1.10
        } as any
      });

      return config;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw new Error('Erro ao salvar configurações do sistema');
    }
  }

  /**
   * Lista todos os usuários com filtros
   */
  async listarUsuarios(filtros?: UsuarioFiltros) {
    try {
      const where: any = {};

      if (filtros?.role) {
        where.role = filtros.role;
      }

      if (filtros?.active !== undefined) {
        where.active = filtros.active;
      }

      if (filtros?.search) {
        where.OR = [
          { name: { contains: filtros.search, mode: 'insensitive' } },
          { email: { contains: filtros.search, mode: 'insensitive' } },
          { setor: { contains: filtros.search, mode: 'insensitive' } }
        ];
      }

      const usuarios = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          setor: true,
          email: true,
          role: true,
          isAdmin: true,
          contaProtegida: true,
          active: true,
          createdAt: true,
          updatedAt: true
          // NÃO retorna password por segurança
        },
        orderBy: { name: 'asc' }
      });

      return usuarios;
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw new Error('Erro ao listar usuários');
    }
  }

  /**
   * Atualiza o role de um usuário
   */
  async atualizarUsuarioRole(userId: string, newRole: string) {
    try {
      // Validar roles permitidos (novos + antigos para compatibilidade)
      const rolesPermitidos = [
        'admin', 'gerente', 'desenvolvedor', 'financeiro_faturamento',
        'desenhista_industrial', 'engenheiro_eletricista', 'engenheiro', 'eletricista',
        'orcamentista', 'compras', 'user'
      ];
      
      if (!rolesPermitidos.includes(newRole)) {
        throw new Error(`Role inválido: ${newRole}. Permitidos: ${rolesPermitidos.join(', ')}`);
      }

      const atual = await prisma.user.findUnique({ where: { id: userId } });
      if (!atual) {
        throw new Error('Usuário não encontrado');
      }
      if (isProtectedAccount(atual)) {
        throw new Error('Conta protegida do sistema — função não pode ser alterada');
      }

      const usuario = await prisma.user.update({
        where: { id: userId },
        data: { 
          role: newRole,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          setor: true,
          email: true,
          role: true,
          isAdmin: true,
          active: true,
          updatedAt: true
        }
      });

      return usuario;
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error);
      throw error;
    }
  }

  /**
   * Ativa/desativa um usuário
   */
  async toggleUsuarioStatus(userId: string, active: boolean) {
    try {
      const atual = await prisma.user.findUnique({ where: { id: userId } });
      if (!atual) {
        throw new Error('Usuário não encontrado');
      }
      if (isProtectedAccount(atual)) {
        throw new Error('Conta protegida do sistema — status não pode ser alterado');
      }

      const usuario = await prisma.user.update({
        where: { id: userId },
        data: { 
          active,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          setor: true,
          email: true,
          role: true,
          isAdmin: true,
          active: true,
          updatedAt: true
        }
      });

      return usuario;
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      throw new Error('Erro ao alterar status do usuário');
    }
  }

  /**
   * Atualiza o flag isAdmin de um usuário (acesso a módulo Financeiro e todos os módulos)
   */
  async atualizarUsuarioIsAdmin(userId: string, isAdmin: boolean) {
    const atual = await prisma.user.findUnique({ where: { id: userId } });
    if (!atual) {
      throw new Error('Usuário não encontrado');
    }
    if (isProtectedAccount(atual)) {
      throw new Error('Conta protegida do sistema — permissão de admin não pode ser alterada');
    }

    const usuario = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin, updatedAt: new Date() },
      select: {
        id: true,
        name: true,
        setor: true,
        email: true,
        role: true,
        isAdmin: true,
        active: true,
        updatedAt: true
      }
    });
    return usuario;
  }

  /**
   * Cria um novo usuário (Admin-only)
   */
  async criarUsuario(data: {
    email: string;
    password: string;
    name: string;
    role: string;
    setor?: string | null;
    isAdmin?: boolean;
  }) {
    try {
      // Verificar se o email já existe
      const usuarioExistente = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (usuarioExistente) {
        throw new Error('Email já cadastrado');
      }

      // Importar bcryptjs (instalado no projeto)
      const bcrypt = await import('bcryptjs');
      
      // Criptografar senha
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Criar usuário
      const usuario = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          setor: data.setor?.trim() || null,
          role: data.role,
          isAdmin: data.isAdmin ?? false,
          active: true
        },
        select: {
          id: true,
          name: true,
          setor: true,
          email: true,
          role: true,
          isAdmin: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return usuario;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  /**
   * Exclui um usuário permanentemente (Admin-only)
   * ATENÇÃO: Esta operação é irreversível!
   */
  async excluirUsuario(userId: string) {
    try {
      // Verificar se o usuário existe
      const usuario = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      if (isProtectedAccount(usuario)) {
        throw new Error('Conta protegida do sistema — não pode ser excluída');
      }

      // Não permitir que o usuário exclua a si mesmo (proteção adicional)
      // Isso pode ser implementado no controller se houver acesso ao userId do token

      // Excluir o usuário
      await prisma.user.delete({
        where: { id: userId }
      });

      return { 
        success: true, 
        message: `Usuário ${usuario.name} excluído permanentemente` 
      };
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  }
}

export default new ConfiguracaoService();

