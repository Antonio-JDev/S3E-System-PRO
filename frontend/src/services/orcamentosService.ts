import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Orcamento {
  id: string;
  numeroSequencial?: number;
  clienteId: string;
  titulo: string;
  descricao?: string;
  descricaoProjeto?: string;
  validade?: string;
  bdi: number;
  observacoes?: string;
  status: 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado' | 'Cancelado';
  valorTotal: number;
  items?: OrcamentoItem[];
  cliente?: any;
  empresaCNPJ?: string;
  enderecoObra?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  responsavelObra?: string;
  previsaoInicio?: string;
  previsaoTermino?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrcamentoItem {
  id?: string;
  materialId?: string;
  kitId?: string;
  servicoId?: string;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  valorUnitario: number;
  valorTotal: number;
  material?: any;
  kit?: any;
  servico?: any;
  ncm?: string;
}

export interface CreateOrcamentoData {
  clienteId: string;
  titulo: string;
  descricao?: string;
  descricaoProjeto?: string;
  validade?: string;
  bdi?: number;
  observacoes?: string;
  items: OrcamentoItem[];
  empresaCNPJ?: string;
  enderecoObra?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  responsavelObra?: string;
  previsaoInicio?: string;
  previsaoTermino?: string;
}

export interface UpdateOrcamentoData extends Partial<CreateOrcamentoData> {
  status?: string;
}

class OrcamentosService {
  /**
   * Lista todos os orçamentos
   */
  async listar() {
    try {
      console.log('📋 Carregando lista de orçamentos...');
      const response = await axiosApiService.get<Orcamento[]>(ENDPOINTS.ORCAMENTOS);
      
      if (response.success && response.data) {
        const orcamentosData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        console.log(`✅ ${orcamentosData.length} orçamentos carregados`);
        return {
          success: true,
          data: orcamentosData,
          message: `${orcamentosData.length} orçamentos carregados`
        };
      } else {
        console.warn('⚠️ Resposta inválida da API de orçamentos:', response);
        return {
          success: false,
          error: response.error || 'Erro ao carregar orçamentos',
          data: []
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar orçamentos:', error);
      return {
        success: false,
        error: 'Erro de conexão ao carregar orçamentos',
        data: []
      };
    }
  }

  /**
   * Busca um orçamento específico por ID
   */
  async buscar(id: string) {
    try {
      console.log(`🔍 Buscando orçamento ${id}...`);
      const response = await axiosApiService.get<Orcamento>(`${ENDPOINTS.ORCAMENTOS}/${id}`);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento encontrado');
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ Orçamento não encontrado:', response);
        return {
          success: false,
          error: response.error || 'Orçamento não encontrado'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao buscar orçamento'
      };
    }
  }

  /**
   * Cria um novo orçamento
   */
  async criar(data: CreateOrcamentoData) {
    try {
      console.log('📝 Criando novo orçamento...');
      const response = await axiosApiService.post<Orcamento>(ENDPOINTS.ORCAMENTOS, data);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento criado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento criado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao criar orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao criar orçamento'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar orçamento:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao criar orçamento'
      };
    }
  }

  /**
   * Atualiza um orçamento existente
   */
  async atualizar(id: string, data: UpdateOrcamentoData) {
    try {
      console.log(`✏️ Atualizando orçamento ${id}...`);
      const response = await axiosApiService.put<Orcamento>(`${ENDPOINTS.ORCAMENTOS}/${id}`, data);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento atualizado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento atualizado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao atualizar orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao atualizar orçamento'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar orçamento:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao atualizar orçamento'
      };
    }
  }

  /**
   * Aprova um orçamento
   */
  async aprovar(id: string) {
    try {
      console.log(`✅ Aprovando orçamento ${id}...`);
      const response = await axiosApiService.put<Orcamento>(`${ENDPOINTS.ORCAMENTOS}/${id}/aprovar`);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento aprovado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento aprovado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao aprovar orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao aprovar orçamento'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao aprovar orçamento:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao aprovar orçamento'
      };
    }
  }

  /**
   * Recusa um orçamento
   */
  async recusar(id: string, motivo?: string) {
    try {
      console.log(`❌ Recusando orçamento ${id}...`);
      const response = await axiosApiService.put<Orcamento>(`${ENDPOINTS.ORCAMENTOS}/${id}/recusar`, { motivo });
      
      if (response.success && response.data) {
        console.log('✅ Orçamento recusado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento recusado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao recusar orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao recusar orçamento'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao recusar orçamento:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao recusar orçamento'
      };
    }
  }

  /**
   * Exclui um orçamento
   */
  async excluir(id: string, permanent: boolean = false) {
    try {
      console.log(`🗑️ Excluindo orçamento ${id}...`);
      const response = await axiosApiService.delete<{ message: string }>(`${ENDPOINTS.ORCAMENTOS}/${id}`, {
        params: { permanent }
      });
      
      if (response.success) {
        console.log('✅ Orçamento excluído com sucesso');
        return {
          success: true,
          message: response.data?.message || 'Orçamento excluído com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao excluir orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao excluir orçamento'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao excluir orçamento:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao excluir orçamento'
      };
    }
  }

  /**
   * Atualiza o status de um orçamento
   */
  async atualizarStatus(id: string, status: string) {
    try {
      console.log(`🔄 Atualizando status do orçamento ${id} para ${status}...`);
      const response = await axiosApiService.put<Orcamento>(`${ENDPOINTS.ORCAMENTOS}/${id}/status`, { status });
      
      if (response.success && response.data) {
        console.log('✅ Status atualizado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Status atualizado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao atualizar status:', response);
        return {
          success: false,
          error: response.error || 'Erro ao atualizar status'
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro de conexão ao atualizar status'
      };
    }
  }
}

export const orcamentosService = new OrcamentosService();

