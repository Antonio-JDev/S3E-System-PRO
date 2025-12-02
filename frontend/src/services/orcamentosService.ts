import { axiosApiService } from './axiosApi';
import { API_CONFIG } from '../config/api';

export interface ItemOrcamento {
  id?: string;
  tipo: 'MATERIAL' | 'KIT' | 'SERVICO';
  materialId?: string;
  kitId?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  descricao?: string;
  nome?: string;
  materialNome?: string;
  unidadeMedida?: string;
  custoUnit?: number;
  precoUnit?: number;
}

export interface Orcamento {
  id: string;
  numeroSequencial?: number;
  numero?: string | number;
  clienteId: string;
  titulo: string;
  descricao?: string;
  descricaoProjeto?: string;
  validade: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  bdi: number;
  custoTotal: number;
  precoVenda: number;
  observacoes?: string;
  // Campos de endereço e obra
  empresaCNPJ?: string;
  enderecoObra?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  responsavelObra?: string;
  previsaoInicio?: string;
  previsaoTermino?: string;
  descontoValor?: number;
  impostoPercentual?: number;
  condicaoPagamento?: string;
  // Datas
  createdAt: string;
  updatedAt: string;
  dataCriacao?: string;
  aprovedAt?: string;
  recusadoAt?: string;
  motivoRecusa?: string;
  cliente?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
  };
  items?: ItemOrcamento[];
  errosOrcamento?: string[];
}

export interface CreateOrcamentoData {
  clienteId: string;
  titulo: string;
  descricao?: string;
  validade: string;
  bdi?: number;
  observacoes?: string;
  items: ItemOrcamento[];
}

class OrcamentosServiceClass {
  /**
   * Listar todos os orçamentos
   */
  async listar(params?: {
    status?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    try {
      console.log('📋 Carregando orçamentos...', params);
      
      const response = await axiosApiService.get<Orcamento[]>('/api/orcamentos', params);
      
      if (response.success && response.data) {
        const orcamentosData = Array.isArray(response.data) ? response.data : [];
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
   * Buscar orçamento por ID
   */
  async buscar(id: string) {
    try {
      console.log(`📋 Buscando orçamento ${id}...`);
      
      const response = await axiosApiService.get<Orcamento>(`/api/orcamentos/${id}`);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento encontrado:', response.data);
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
   * Criar novo orçamento
   */
  async criar(data: CreateOrcamentoData) {
    try {
      console.log('➕ Criando novo orçamento...', data);
      
      // Validações básicas
      if (!data.clienteId || !data.titulo || !data.validade) {
        return {
          success: false,
          error: 'Cliente, título e validade são obrigatórios'
        };
      }

      if (!data.items || data.items.length === 0) {
        return {
          success: false,
          error: 'Adicione pelo menos um item ao orçamento'
        };
      }

      const response = await axiosApiService.post<Orcamento>('/api/orcamentos', data);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento criado com sucesso:', response.data);
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
    } catch (error) {
      console.error('❌ Erro ao criar orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao criar orçamento'
      };
    }
  }

  /**
   * Atualizar orçamento completo
   */
  async atualizar(id: string, data: CreateOrcamentoData) {
    try {
      console.log(`✏️ Atualizando orçamento ${id}...`, data);
      
      const response = await axiosApiService.put<Orcamento>(`/api/orcamentos/${id}`, data);
      
      if (response.success && response.data) {
        console.log('✅ Orçamento atualizado com sucesso:', response.data);
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
    } catch (error) {
      console.error('❌ Erro ao atualizar orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar orçamento'
      };
    }
  }

  /**
   * Atualizar status do orçamento
   */
  async atualizarStatus(id: string, status: 'Pendente' | 'Aprovado' | 'Recusado') {
    try {
      console.log(`🔄 Atualizando status do orçamento ${id} para ${status}...`);
      
      const response = await axiosApiService.patch<Orcamento>(`/api/orcamentos/${id}/status`, { status });
      
      if (response.success && response.data) {
        console.log('✅ Status atualizado com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: `Status alterado para ${status}`
        };
      } else {
        console.warn('⚠️ Erro ao atualizar status:', response);
        return {
          success: false,
          error: response.error || 'Erro ao atualizar status'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar status'
      };
    }
  }

  /**
   * Excluir orçamento (soft delete ou permanente)
   * @param id - ID do orçamento
   * @param permanent - Se true, exclui permanentemente (apenas dev/admin)
   */
  async excluir(id: string, permanent: boolean = false) {
    try {
      const action = permanent ? 'excluindo permanentemente' : 'excluindo';
      console.log(`🗑️ ${action} orçamento ${id}...`);
      
      const url = permanent 
        ? `/api/orcamentos/${id}?permanent=true`
        : `/api/orcamentos/${id}`;
      
      const response = await axiosApiService.delete<void>(url);
      
      if (response.success) {
        const message = permanent 
          ? 'Orçamento excluído permanentemente do banco de dados'
          : 'Orçamento cancelado com sucesso';
        console.log(`✅ ${message}`);
        return {
          success: true,
          message
        };
      } else {
        console.warn('⚠️ Erro ao excluir orçamento:', response);
        return {
          success: false,
          error: response.error || 'Erro ao excluir orçamento'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao excluir orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao excluir orçamento'
      };
    }
  }

  /**
   * NOTA: Funções de PDF removidas
   * ====================================
   * As funções gerarPDF(), baixarPDF(), visualizarPDF(), gerarPDFURL() 
   * e verificarOrcamento() foram removidas.
   * 
   * Use o novo sistema de customização de PDF:
   * - Componente: PDFCustomizationModal
   * - Serviço: pdfCustomizationService
   * - Localização: frontend/src/components/PDFCustomization/PDFCustomizationModal.tsx
   * 
   * O novo sistema oferece:
   * ✅ Customização total (marca d'água, cores, layout)
   * ✅ Preview em tempo real
   * ✅ Sistema de templates
   * ✅ Upload de logos
   * ✅ Controle de conteúdo
   */

  /**
   * Aprovar orçamento
   */
  async aprovar(id: string) {
    try {
      console.log(`✅ Aprovando orçamento ${id}...`);
      
      const response = await axiosApiService.post<Orcamento>(`/api/orcamentos/${id}/aprovar`, {});
      
      if (response.success && response.data) {
        console.log('✅ Orçamento aprovado com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento aprovado com sucesso'
        };
      } else {
        return {
          success: false,
          error: response.error || 'Erro ao aprovar orçamento'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao aprovar orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao aprovar orçamento'
      };
    }
  }

  /**
   * Recusar orçamento
   */
  async recusar(id: string, motivo?: string) {
    try {
      console.log(`❌ Recusando orçamento ${id}...`);
      
      const response = await axiosApiService.post<Orcamento>(`/api/orcamentos/${id}/recusar`, { motivo });
      
      if (response.success && response.data) {
        console.log('✅ Orçamento recusado');
        return {
          success: true,
          data: response.data,
          message: 'Orçamento recusado'
        };
      } else {
        return {
          success: false,
          error: response.error || 'Erro ao recusar orçamento'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao recusar orçamento:', error);
      return {
        success: false,
        error: 'Erro de conexão ao recusar orçamento'
      };
    }
  }

  /**
   * Enviar orçamento por email (se implementado no backend)
   */
  async enviarPorEmail(id: string, email: string) {
    return axiosApiService.post<{ success: boolean; message: string }>(
      `/api/orcamentos/${id}/enviar-email`,
      { email }
    );
  }
}

export const orcamentosService = new OrcamentosServiceClass();
