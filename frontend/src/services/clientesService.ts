import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  tipo: 'PF' | 'PJ';
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClienteData {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  tipo: 'PF' | 'PJ';
}

export interface UpdateClienteData extends Partial<CreateClienteData> {
  ativo?: boolean;
}

export interface ClienteFilters {
  tipo?: string;
  ativo?: boolean;
  search?: string;
}

class ClientesService {
  /**
   * Lista todos os clientes com filtros opcionais
   */
  async listar(filters?: ClienteFilters) {
    try {
      console.log('👥 Carregando lista de clientes...', filters);
      
      const response = await axiosApiService.get<Cliente[]>(ENDPOINTS.CLIENTES, filters);
      
      if (response.success && response.data) {
        // Verificar se os dados estão em response.data.data ou diretamente em response.data
        const clientesData = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log(`✅ ${clientesData.length} clientes carregados`);
        
        return {
          success: true,
          data: clientesData,
          message: `${clientesData.length} clientes carregados`
        };
      } else {
        console.warn('⚠️ Resposta inválida da API de clientes:', response);
        return {
          success: false,
          error: response.error || 'Erro ao carregar clientes',
          data: []
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      return {
        success: false,
        error: 'Erro de conexão ao carregar clientes',
        data: []
      };
    }
  }

  /**
   * Busca um cliente específico por ID
   */
  async buscar(id: string) {
    try {
      console.log(`👤 Buscando cliente ${id}...`);
      
      const response = await axiosApiService.get<Cliente>(`${ENDPOINTS.CLIENTES}/${id}`);
      
      if (response.success && response.data) {
        console.log('✅ Cliente encontrado:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ Cliente não encontrado:', response);
        return {
          success: false,
          error: response.error || 'Cliente não encontrado'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      return {
        success: false,
        error: 'Erro de conexão ao buscar cliente'
      };
    }
  }

  /**
   * Cria um novo cliente
   */
  async criar(data: CreateClienteData) {
    try {
      console.log('➕ Criando novo cliente...', data);
      
      // Validações básicas antes de enviar
      if (!data.nome || !data.cpfCnpj || !data.email) {
        return {
          success: false,
          error: 'Nome, CPF/CNPJ e email são obrigatórios'
        };
      }

      const response = await axiosApiService.post<Cliente>(ENDPOINTS.CLIENTES, data);
      
      if (response.success && response.data) {
        console.log('✅ Cliente criado com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Cliente criado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao criar cliente:', response);
        return {
          success: false,
          error: response.error || 'Erro ao criar cliente'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error);
      return {
        success: false,
        error: 'Erro de conexão ao criar cliente'
      };
    }
  }

  /**
   * Atualiza um cliente existente
   */
  async atualizar(id: string, data: UpdateClienteData) {
    try {
      console.log(`✏️ Atualizando cliente ${id}...`, data);
      
      const response = await axiosApiService.put<Cliente>(`${ENDPOINTS.CLIENTES}/${id}`, data);
      
      if (response.success && response.data) {
        console.log('✅ Cliente atualizado com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Cliente atualizado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao atualizar cliente:', response);
        return {
          success: false,
          error: response.error || 'Erro ao atualizar cliente'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar cliente'
      };
    }
  }

  /**
   * Desativa um cliente (soft delete) ou exclui permanentemente
   * @param id - ID do cliente
   * @param permanent - Se true, exclui permanentemente (apenas dev/admin)
   */
  async desativar(id: string, permanent: boolean = false) {
    try {
      const action = permanent ? 'excluindo permanentemente' : 'desativando';
      console.log(`🗑️ ${action} cliente ${id}...`);
      
      const url = permanent 
        ? `${ENDPOINTS.CLIENTES}/${id}?permanent=true`
        : `${ENDPOINTS.CLIENTES}/${id}`;
      
      const response = await axiosApiService.delete<Cliente>(url);
      
      if (response.success) {
        const message = permanent 
          ? 'Cliente excluído permanentemente do banco de dados'
          : 'Cliente desativado com sucesso';
        console.log(`✅ ${message}`);
        return {
          success: true,
          message
        };
      } else {
        console.warn('⚠️ Erro ao desativar/excluir cliente:', response);
        return {
          success: false,
          error: response.error || 'Erro ao desativar/excluir cliente'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao desativar/excluir cliente:', error);
      return {
        success: false,
        error: 'Erro de conexão ao desativar/excluir cliente'
      };
    }
  }

  /**
   * Reativa um cliente desativado
   */
  async reativar(id: string) {
    try {
      console.log(`🔄 Reativando cliente ${id}...`);
      
      const response = await axiosApiService.put<Cliente>(`${ENDPOINTS.CLIENTES}/${id}/reativar`);
      
      if (response.success && response.data) {
        console.log('✅ Cliente reativado com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Cliente reativado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao reativar cliente:', response);
        return {
          success: false,
          error: response.error || 'Erro ao reativar cliente'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao reativar cliente:', error);
      return {
        success: false,
        error: 'Erro de conexão ao reativar cliente'
      };
    }
  }

  /**
   * Valida CPF/CNPJ antes de criar/atualizar
   */
  async validarCpfCnpj(cpfCnpj: string, excludeId?: string) {
    try {
      console.log(`🔍 Validando CPF/CNPJ: ${cpfCnpj}...`);
      
      const params = excludeId ? { excludeId } : {};
      const response = await axiosApiService.get(`${ENDPOINTS.CLIENTES}/validar-cpf-cnpj/${cpfCnpj}`, params);
      
      return {
        success: response.success,
        available: response.data?.available || false,
        message: response.message || response.error
      };
    } catch (error) {
      console.error('❌ Erro ao validar CPF/CNPJ:', error);
      return {
        success: false,
        available: false,
        message: 'Erro ao validar CPF/CNPJ'
      };
    }
  }

  /**
   * Busca clientes por termo de pesquisa
   */
  async pesquisar(termo: string, tipo?: 'PF' | 'PJ', ativo?: boolean) {
    try {
      console.log(`🔍 Pesquisando clientes: "${termo}"...`);
      
      const filters: ClienteFilters = {
        search: termo
      };
      
      if (tipo) filters.tipo = tipo;
      if (ativo !== undefined) filters.ativo = ativo;
      
      return this.listar(filters);
    } catch (error) {
      console.error('❌ Erro ao pesquisar clientes:', error);
      return {
        success: false,
        error: 'Erro ao pesquisar clientes',
        data: []
      };
    }
  }

  /**
   * Estatísticas de clientes para dashboard
   */
  async getEstatisticas() {
    try {
      console.log('📊 Carregando estatísticas de clientes...');
      
      const response = await axiosApiService.get(`${ENDPOINTS.CLIENTES}/estatisticas`);
      
      if (response.success && response.data) {
        console.log('✅ Estatísticas de clientes carregadas:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ Erro ao carregar estatísticas:', response);
        return {
          success: false,
          error: 'Erro ao carregar estatísticas'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas de clientes:', error);
      return {
        success: false,
        error: 'Erro de conexão ao carregar estatísticas'
      };
    }
  }
}

export const clientesService = new ClientesService();