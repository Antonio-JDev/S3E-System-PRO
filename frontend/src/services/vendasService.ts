import { axiosApiService } from './axiosApi';

export interface ContaReceber {
  id: string;
  vendaId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  observacoes?: string;
}

export interface Venda {
  id: string;
  orcamentoId: string;
  clienteId: string;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  dataVenda: string;
  status: 'Ativa' | 'Cancelada' | 'Finalizada' | 'Pendente' | 'Faturado';
  formaPagamento: string;
  numeroParcelas: number;
  observacoes?: string;
  contasReceber?: ContaReceber[];
  orcamento?: any;
  cliente?: any;
  contratoPdfUrl?: string | null;
  contratoHtml?: string | null;
  vendedorNome?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardVendas {
  vendasMes: number;
  receitaMes: number;
  contasReceber: number;
  contasAtrasadas: number;
  ticketMedio: number;
  vendasPorPeriodo: Array<{
    periodo: string;
    total: number;
  }>;
  contasPorStatus: Array<{
    status: string;
    quantidade: number;
    valor: number;
  }>;
}

export interface VerificacaoEstoque {
  disponivel: boolean;
  itensIndisponiveis: Array<{
    materialId: string;
    material: string;
    necessario: number;
    disponivel: number;
    faltando: number;
  }>;
}

class VendasService {
  /**
   * Buscar dashboard de vendas
   */
  async getDashboard() {
    try {
      console.log('📊 Carregando dashboard de vendas...');
      
      const response = await axiosApiService.get<DashboardVendas>('/api/vendas/dashboard');
      
      if (response.success && response.data) {
        console.log('✅ Dashboard de vendas carregado:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Dashboard carregado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao carregar dashboard:', response);
        // Retornar dados mock quando o dashboard não estiver disponível
        const mockDashboard = {
          vendasMes: 0,
          receitaMes: 0,
          contasReceber: 0,
          contasAtrasadas: 0,
          ticketMedio: 0,
          vendasPorPeriodo: [],
          contasPorStatus: []
        };
        return {
          success: true,
          data: mockDashboard,
          message: 'Dashboard carregado com dados padrão'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      // Retornar dados mock em caso de erro
      const mockDashboard = {
        vendasMes: 0,
        receitaMes: 0,
        contasReceber: 0,
        contasAtrasadas: 0,
        ticketMedio: 0,
        vendasPorPeriodo: [],
        contasPorStatus: []
      };
      return {
        success: true,
        data: mockDashboard,
        message: 'Dashboard carregado com dados padrão (erro na API)'
      };
    }
  }

  /**
   * Verificar disponibilidade de estoque para orçamento
   */
  async verificarEstoque(orcamentoId: string) {
    try {
      console.log(`📦 Verificando estoque para orçamento ${orcamentoId}...`);
      
      const response = await axiosApiService.get<VerificacaoEstoque>(`/api/vendas/estoque/${orcamentoId}`);
      
      if (response.success && response.data) {
        console.log('✅ Verificação de estoque realizada:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ Erro na verificação de estoque:', response);
        return {
          success: false,
          error: response.error || 'Erro ao verificar estoque'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao verificar estoque:', error);
      return {
        success: false,
        error: 'Erro de conexão ao verificar estoque'
      };
    }
  }

  /**
   * Listar vendas com paginação
   */
  async listarVendas(params?: {
    page?: number;
    limit?: number;
    status?: string;
    clienteId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    try {
      console.log('📋 Carregando vendas...', params);
      
      const response = await axiosApiService.get<{
        vendas: Venda[];
        total: number;
        page: number;
        totalPages: number;
      }>('/api/vendas', params);
      
      if (response.success && response.data) {
        const vendasData = response.data;
        // Verificar se vendasData.vendas existe, caso contrário pode ser que os dados venham diretamente como array
        const vendasArray = Array.isArray(vendasData) ? vendasData : (vendasData.vendas || []);
        const total = Array.isArray(vendasData) ? vendasData.length : (vendasData.total || vendasArray.length);
        
        console.log(`✅ ${vendasArray.length} vendas carregadas`);
        return {
          success: true,
          data: {
            vendas: vendasArray,
            total: total,
            page: vendasData.page || 1,
            totalPages: vendasData.totalPages || 1
          },
          message: `${vendasArray.length} vendas carregadas`
        };
      } else {
        console.warn('⚠️ Erro ao carregar vendas:', response);
        // Retornar dados vazios quando não houver vendas
        return {
          success: true,
          data: { vendas: [], total: 0, page: 1, totalPages: 0 },
          message: 'Nenhuma venda encontrada'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar vendas:', error);
      // Retornar dados vazios em caso de erro
      return {
        success: true,
        data: { vendas: [], total: 0, page: 1, totalPages: 0 },
        message: 'Nenhuma venda encontrada (erro na API)'
      };
    }
  }

  /**
   * Buscar venda específica
   */
  async buscarVenda(id: string) {
    try {
      console.log(`🔍 Buscando venda ${id}...`);
      
      const response = await axiosApiService.get<Venda>(`/api/vendas/${id}`);
      
      if (response.success && response.data) {
        console.log('✅ Venda encontrada:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ Venda não encontrada:', response);
        return {
          success: false,
          error: response.error || 'Venda não encontrada'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar venda:', error);
      return {
        success: false,
        error: 'Erro de conexão ao buscar venda'
      };
    }
  }

  /**
   * Realizar nova venda
   */
  async realizarVenda(data: {
    orcamentoId: string;
    clienteId: string;
    formaPagamento: string;
    numeroParcelas: number;
    dataVencimentoPrimeiraParcela: string;
    observacoes?: string;
  }) {
    try {
      console.log('💰 Realizando nova venda...', data);
      
      // Validações básicas
      if (!data.orcamentoId || !data.clienteId || !data.formaPagamento) {
        return {
          success: false,
          error: 'Orçamento, cliente e forma de pagamento são obrigatórios'
        };
      }

      const response = await axiosApiService.post<Venda>('/api/vendas/realizar', data);
      
      if (response.success && response.data) {
        console.log('✅ Venda realizada com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Venda realizada com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao realizar venda:', response);
        return {
          success: false,
          error: response.error || 'Erro ao realizar venda'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao realizar venda:', error);
      return {
        success: false,
        error: 'Erro de conexão ao realizar venda'
      };
    }
  }

  /**
   * Cancelar venda
   */
  async cancelarVenda(id: string, motivo?: string) {
    try {
      console.log(`❌ Cancelando venda ${id}...`, motivo);
      
      const response = await axiosApiService.put<Venda>(`/api/vendas/${id}/cancelar`, { motivo });
      
      if (response.success && response.data) {
        console.log('✅ Venda cancelada com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Venda cancelada com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao cancelar venda:', response);
        return {
          success: false,
          error: response.error || 'Erro ao cancelar venda'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao cancelar venda:', error);
      return {
        success: false,
        error: 'Erro de conexão ao cancelar venda'
      };
    }
  }

  /**
   * Excluir venda permanentemente
   */
  async excluir(id: string) {
    try {
      console.log(`🗑️ Excluindo venda ${id}...`);
      
      const response = await axiosApiService.delete<void>(`/api/vendas/${id}`);
      
      if (response.success) {
        console.log('✅ Venda excluída com sucesso');
        return {
          success: true,
          message: 'Venda excluída permanentemente'
        };
      } else {
        console.warn('⚠️ Erro ao excluir venda:', response);
        return {
          success: false,
          error: response.error || 'Erro ao excluir venda'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao excluir venda:', error);
      return {
        success: false,
        error: 'Erro de conexão ao excluir venda'
      };
    }
  }

  /**
   * Pagar conta a receber
   */
  async pagarConta(id: string, data: {
    dataPagamento: string;
    valorPago: number;
    observacoes?: string;
  }) {
    try {
      console.log(`💳 Pagando conta ${id}...`, data);
      
      const response = await axiosApiService.put<ContaReceber>(`/api/vendas/contas/${id}/pagar`, data);
      
      if (response.success && response.data) {
        console.log('✅ Conta paga com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
          message: 'Conta marcada como paga'
        };
      } else {
        console.warn('⚠️ Erro ao pagar conta:', response);
        return {
          success: false,
          error: response.error || 'Erro ao pagar conta'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao pagar conta:', error);
      return {
        success: false,
        error: 'Erro de conexão ao pagar conta'
      };
    }
  }

  /**
   * Atualização parcial da venda: parcelas (datas/valores) e NCM dos itens do orçamento.
   */
  async atualizarVenda(
    vendaId: string,
    payload: {
      parcelas?: Array<{ id: string; dataVencimento?: string; valorParcela?: number }>;
      itensNcm?: Array<{ id: string; ncm: string }>;
    }
  ) {
    try {
      const response = await axiosApiService.patch<Venda>(`/api/vendas/${vendaId}`, payload);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao atualizar venda.' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão.'
      };
    }
  }

  /**
   * Atualiza o valor total da venda e das parcelas (contas a receber) com o valor final do orçamento.
   * Apenas role desenvolvedor (backend retorna 403 para outros).
   */
  async atualizarValorDoOrcamento(vendaId: string) {
    try {
      const response = await axiosApiService.patch<{
        success: boolean;
        message: string;
        valorAnterior: number;
        valorNovo: number;
        contasAtualizadas: number;
      }>(`/api/vendas/${vendaId}/atualizar-valor-orcamento`);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: (response as any).error || 'Erro ao atualizar valor.' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão.'
      };
    }
  }

  /**
   * Atualiza o status da venda (ex.: Faturado após emissão de NF-e/NFS-e)
   */
  async atualizarStatus(vendaId: string, status: string) {
    try {
      const response = await axiosApiService.put<Venda>(`/api/vendas/${vendaId}/status`, { status });
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao atualizar status.' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão.'
      };
    }
  }

  /**
   * Upload do PDF do contrato assinado pelo cliente (PV)
   */
  async uploadContratoAssinado(vendaId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const response = await axiosApiService.put<{ contratoPdfUrl: string }>(
        `/api/vendas/${vendaId}/contrato-assinado`,
        formData as any
      );
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Contrato assinado enviado com sucesso.'
        };
      }
      return {
        success: false,
        error: response.error || 'Erro ao enviar contrato.'
      };
    } catch (error) {
      console.error('❌ Erro ao enviar contrato assinado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão ao enviar contrato.'
      };
    }
  }

  /**
   * Salvar HTML do contrato editado (Jodit) no PV
   */
  async saveContratoHtml(vendaId: string, contratoHtml: string) {
    try {
      const response = await axiosApiService.put<{ contratoHtml: string }>(
        `/api/vendas/${vendaId}/contrato`,
        { contratoHtml }
      );
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Contrato salvo com sucesso.'
        };
      }
      return {
        success: false,
        error: response.error || 'Erro ao salvar contrato.'
      };
    } catch (error) {
      console.error('❌ Erro ao salvar contrato:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão ao salvar contrato.'
      };
    }
  }
}

export const vendasService = new VendasService();
