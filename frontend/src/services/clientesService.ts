import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  numero?: string;
  bairro: string;
  inscricaoEstadual?: string;
  /** 1=Contribuinte (exige IE), 2=Isento (IE "ISENTO"), 9=Não contribuinte */
  indIEDest?: number | null;
  cidade: string;
  estado: string;
  cep: string;
  tipo: 'PF' | 'PJ';
  /** JSON completo da API CNPJ.ws (raw) para modal de detalhes */
  dadosCnpjWs?: unknown;
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
  numero?: string;
  bairro?: string;
  inscricaoEstadual?: string;
  /** 1=Contribuinte, 2=Isento, 9=Não contribuinte */
  indIEDest?: number | null;
  cidade: string;
  estado: string;
  cep: string;
  tipo: 'PF' | 'PJ';
  /** JSON completo da API CNPJ.ws (raw) para persistir no cadastro */
  dadosCnpjWs?: unknown;
}

export interface UpdateClienteData extends Partial<CreateClienteData> {
  ativo?: boolean;
  /** JSON completo da API CNPJ.ws (raw) para persistir e exibir no modal sem nova consulta */
  dadosCnpjWs?: unknown;
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
        const clientesData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
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
   * Cria um cliente rápido (apenas com nome e tipo)
   */
  async criarClienteRapido(nome: string, tipo: 'PF' | 'PJ') {
    try {
      console.log('⚡ Criando cliente rápido...', { nome, tipo });
      
      // Validações básicas antes de enviar
      if (!nome || nome.trim().length < 3) {
        return {
          success: false,
          error: 'Nome deve ter pelo menos 3 caracteres'
        };
      }

      if (!['PF', 'PJ'].includes(tipo)) {
        return {
          success: false,
          error: 'Tipo deve ser PF ou PJ'
        };
      }

      const response = await axiosApiService.post<Cliente>(`${ENDPOINTS.CLIENTES}/rapido`, {
        nome: nome.trim(),
        tipo
      });
      
      if (response.success && response.data) {
        console.log('✅ Cliente rápido criado com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Cliente criado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao criar cliente rápido:', response);
        return {
          success: false,
          error: response.error || 'Erro ao criar cliente rápido'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao criar cliente rápido:', error);
      return {
        success: false,
        error: 'Erro de conexão ao criar cliente rápido'
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
   * Consulta CNPJ na CNPJ.ws (dados + IE por UF + indIEDest)
   */
  async consultarCnpj(cnpj: string) {
    try {
      const raw = cnpj.replace(/\D/g, '');
      if (raw.length !== 14) {
        return { success: false, error: 'CNPJ deve ter 14 dígitos', data: null };
      }
      const response = await axiosApiService.get<{
        razaoSocial: string;
        nomeFantasia?: string;
        cnpj: string;
        email?: string;
        telefone?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
        cep?: string;
        inscricaoEstadual: string;
        indIEDest: 1 | 2 | 9;
        raw?: any;
      }>(`${ENDPOINTS.CLIENTES}/cnpj/${raw}`);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: (response as any).error || 'CNPJ não encontrado',
        data: null
      };
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Erro ao consultar CNPJ';
      return { success: false, error: msg, data: null };
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
        available: (response.data as any)?.available || false,
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