import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ConfiguracaoData {
  temaPreferido?: string; // 'light' | 'dark' | 'system'
  logoUrl?: string; // Logo geral da empresa
  logoLoginUrl?: string; // Logo específica para página de login
  nomeEmpresa?: string;
  emailContato?: string;
  telefoneContato?: string;
}

export interface UsuarioFiltros {
  search?: string;
  role?: string;
  active?: boolean;
}

export class ConfiguracaoService {
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
            nomeEmpresa: 'S3E Engenharia'
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
      const config = await prisma.configuracaoSistema.upsert({
        where: { id: 'sistema-config' },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          id: 'sistema-config',
          temaPreferido: data.temaPreferido || 'light',
          logoUrl: data.logoUrl,
          logoLoginUrl: data.logoLoginUrl,
          nomeEmpresa: data.nomeEmpresa || 'S3E Engenharia',
          emailContato: data.emailContato,
          telefoneContato: data.telefoneContato
        }
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
          { email: { contains: filtros.search, mode: 'insensitive' } }
        ];
      }

      const usuarios = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
      // Validar roles permitidos
      const rolesPermitidos = ['admin', 'gerente', 'orcamentista', 'compras', 'engenheiro', 'eletricista', 'user'];
      
      if (!rolesPermitidos.includes(newRole)) {
        throw new Error(`Role inválido: ${newRole}. Permitidos: ${rolesPermitidos.join(', ')}`);
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
          email: true,
          role: true,
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
      const usuario = await prisma.user.update({
        where: { id: userId },
        data: { 
          active,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
   * Cria um novo usuário (Admin-only)
   */
  async criarUsuario(data: { email: string; password: string; name: string; role: string }) {
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
          role: data.role,
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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

