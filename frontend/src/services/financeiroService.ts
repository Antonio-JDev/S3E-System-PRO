import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface MovimentacaoCaixaItem {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  dataPagamento: string;
  descricao: string;
  categoria: string;
  valor: number;
  valorBase?: number;
  valorJuros?: number;
  valorDesconto?: number;
  meioPagamento: string | null;
  origem: string;
  referenciaId: string;
  tipoCategoria?: string; // FORNECEDOR, RH, etc. para edição de saídas
  observacoes?: string | null; // Justificativa/descrição (ex.: desconto por falta)
  /** true quando a entrada vem do histórico de recebimentos parciais (id = recebimento parcial) */
  recebimentoParcial?: boolean;
}

export interface AtualizarMovimentacaoPayload {
  dataPagamento?: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  valorJuros?: number;
  valorDesconto?: number;
  meioPagamento?: string;
}

export interface ResumoMovimentacoes {
  entradasTotal: number;
  saidasTotal: number;
  saldoConta: number;
}

export interface ContaReceber {
  id: string;
  vendaId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  observacoes?: string;
  cliente?: {
    id: string;
    nome: string;
  };
  venda?: {
    id: string;
    valorTotal: number;
  };
}

export interface ContaPagar {
  id: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataAgendamento?: string;
  dataPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  numeroParcela?: number;
  totalParcelas?: number;
  compraId?: string;
  observacoes?: string;
}

export interface ResumoFinanceiro {
  receitaTotal: number;
  despesaTotal: number;
  lucroLiquido: number;
  contasReceber: number;
  contasPagar: number;
  saldoAtual: number;
  receitaMes: number;
  despesaMes: number;
  lucroMes: number;
}

export interface DadosFinanceirosMensais {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
}

export interface FinanceiroFilters {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  tipo?: 'receber' | 'pagar' | 'FORNECEDOR' | 'RH' | 'DESPESA_FIXA' | 'FROTA';
  valorExato?: number;
  valorMin?: number;
  valorMax?: number;
}

class FinanceiroService {
  /**
   * Buscar resumo financeiro geral
   */
  async getResumo(): Promise<{ success: boolean; data?: ResumoFinanceiro; error?: string }> {
    try {
      console.log('📊 Carregando resumo financeiro...');
      
      const response = await axiosApiService.get<ResumoFinanceiro>(ENDPOINTS.RELATORIOS.FINANCEIRO_RESUMO);
      
      if (response.success && response.data) {
        console.log('✅ Resumo financeiro carregado:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao carregar resumo:', response);
        return { success: false, error: response.error || 'Erro ao carregar resumo financeiro' };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar resumo financeiro:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Buscar dados financeiros mensais (12 meses)
   */
  async getDadosMensais(): Promise<{ success: boolean; data?: DadosFinanceirosMensais[]; error?: string }> {
    try {
      console.log('📈 Carregando dados financeiros mensais...');
      
      const response = await axiosApiService.get<DadosFinanceirosMensais[]>(ENDPOINTS.RELATORIOS.FINANCEIRO);
      
      if (response.success && response.data) {
        console.log('✅ Dados mensais carregados:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao carregar dados mensais:', response);
        return { success: false, error: response.error || 'Erro ao carregar dados mensais' };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados mensais:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Listar contas a receber (vendas + manuais via GET /api/contas-receber)
   */
  async listarContasReceber(filters?: FinanceiroFilters): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('📥 Carregando contas a receber...', filters);

      const response = await axiosApiService.get<any>('/api/contas-receber', filters);

      if (response.success && response.data) {
        const contas = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
        console.log(`✅ ${contas.length} contas a receber carregadas`);
        return { success: true, data: contas };
      }
      console.warn('⚠️ Erro ao carregar contas a receber:', response);
      return { success: false, error: response.error || 'Erro ao carregar contas a receber' };
    } catch (error) {
      console.error('❌ Erro ao carregar contas a receber:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Criar conta a receber manual (Entradas / Outras Receitas)
   */
  async criarContaReceber(data: {
    tipo: 'ENTRADA' | 'OUTRAS_RECEITAS';
    pagadorNome?: string;
    descricao: string;
    valorParcela: number;
    valorJuros?: number;
    valorDesconto?: number;
    dataVencimento: string;
    observacoes?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('📝 Criando conta a receber...', data);
      const response = await axiosApiService.post<any>('/api/contas-receber', data);
      if (response.success && response.data) {
        const created = response.data?.data ?? response.data;
        console.log('✅ Conta a receber criada:', created);
        return { success: true, data: created };
      }
      return { success: false, error: response.error || 'Erro ao criar conta a receber' };
    } catch (error) {
      console.error('❌ Erro ao criar conta a receber:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  async atualizarContaReceber(
    id: string,
    data: {
      tipo?: 'ENTRADA' | 'OUTRAS_RECEITAS';
      pagadorNome?: string;
      descricao?: string;
      valorParcela?: number;
      valorJuros?: number;
      valorDesconto?: number;
      dataVencimento?: string;
      observacoes?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axiosApiService.put<any>(`/api/contas-receber/${id}`, data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao atualizar conta a receber' };
    } catch (error) {
      console.error('❌ Erro ao atualizar conta a receber:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  async excluirContaReceber(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axiosApiService.delete<any>(`/api/contas-receber/${id}`);
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: response.error || 'Erro ao excluir conta a receber' };
    } catch (error) {
      console.error('❌ Erro ao excluir conta a receber:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Listar contas a pagar
   */
  async listarContasPagar(filters?: FinanceiroFilters): Promise<{ success: boolean; data?: ContaPagar[]; error?: string }> {
    try {
      console.log('📤 Carregando contas a pagar...', filters);
      
      const response = await axiosApiService.get<any>('/api/contas-pagar', filters);
      
      if (response.success && response.data) {
        // O backend retorna { contas, pagination }, então precisamos acessar response.data.contas
        const contas = Array.isArray(response.data) 
          ? response.data 
          : (response.data.contas && Array.isArray(response.data.contas) 
            ? response.data.contas 
            : []);
        
        console.log(`✅ ${contas.length} contas a pagar carregadas`);
        return { success: true, data: contas };
      } else {
        console.warn('⚠️ Erro ao carregar contas a pagar:', response);
        return { success: false, error: response.error || 'Erro ao carregar contas a pagar' };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar contas a pagar:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Pagar conta a pagar
   */
  async pagarContaPagar(id: string, data: {
    dataPagamento: string;
    valorPago: number;
    valorJuros?: number;
    valorDesconto?: number;
    observacoes?: string;
    meioPagamento?: string;
  }): Promise<{ success: boolean; data?: ContaPagar; error?: string }> {
    try {
      console.log(`💳 Pagando conta a pagar ${id}...`, data);
      
      const response = await axiosApiService.put<ContaPagar>(`/api/contas-pagar/${id}/pagar`, data);
      
      if (response.success && response.data) {
        console.log('✅ Conta paga com sucesso:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao pagar conta:', response);
        return { success: false, error: response.error || 'Erro ao pagar conta' };
      }
    } catch (error) {
      console.error('❌ Erro ao pagar conta:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Criar conta a pagar
   */
  async criarContaPagar(data: {
    fornecedorId?: string;
    origemCadastro?: 'FORNECEDOR_CADASTRADO' | 'FORNECEDOR_NOVO' | 'RH' | 'DESPESA_FIXA';
    fornecedorNome?: string;
    credorNome?: string; // Nome do credor para contas manuais (sem compra)
    tipo?: string; // FORNECEDOR, RH, DESPESA_FIXA, FROTA
    subtipo?: 'ADIANTAMENTO' | 'VALE' | 'SALARIO';
    funcionarioId?: string;
    descontoFolhaTipo?: 'UMA_VEZ' | 'PARCELADO';
    descontoFolhaParcelas?: number;
    descontoFolhaReferenciaAno?: number;
    descontoFolhaReferenciaMes?: number;
    descricao: string;
    valor: number;
    valorJuros?: number;
    valorDesconto?: number;
    dataVencimento: string;
    observacoes?: string;
    classificacao?: string; // Impostos, TRT-ART, Serviço mão de obra eletricista, Brindes, etc.
  }): Promise<{ success: boolean; data?: ContaPagar; error?: string }> {
    try {
      console.log('📝 Criando conta a pagar...', data);
      
      const response = await axiosApiService.post<ContaPagar>('/api/contas-pagar', data);
      
      if (response.success && response.data) {
        console.log('✅ Conta criada com sucesso:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao criar conta:', response);
        return { success: false, error: response.error || 'Erro ao criar conta' };
      }
    } catch (error) {
      console.error('❌ Erro ao criar conta:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Agendar pagamento de conta a pagar
   */
  async agendarPagamento(id: string, dataAgendamento: string): Promise<{ success: boolean; data?: ContaPagar; error?: string }> {
    try {
      console.log(`📅 Agendando pagamento da conta ${id} para ${dataAgendamento}...`);
      
      const response = await axiosApiService.put<ContaPagar>(`/api/contas-pagar/${id}/agendar`, {
        dataAgendamento
      });
      
      if (response.success && response.data) {
        console.log('✅ Pagamento agendado com sucesso:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao agendar pagamento:', response);
        return { success: false, error: response.error || 'Erro ao agendar pagamento' };
      }
    } catch (error) {
      console.error('❌ Erro ao agendar pagamento:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Remover agendamento de pagamento
   */
  async removerAgendamento(id: string): Promise<{ success: boolean; data?: ContaPagar; error?: string }> {
    try {
      console.log(`🗑️ Removendo agendamento da conta ${id}...`);
      
      const response = await axiosApiService.put<ContaPagar>(`/api/contas-pagar/${id}/remover-agendamento`, {});
      
      if (response.success && response.data) {
        console.log('✅ Agendamento removido com sucesso:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao remover agendamento:', response);
        return { success: false, error: response.error || 'Erro ao remover agendamento' };
      }
    } catch (error) {
      console.error('❌ Erro ao remover agendamento:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Dar baixa em conta a receber
   */
  async darBaixaRecebimento(contaId: string, data: {
    dataPagamento: string;
    valorRecebido: number;
    valorJuros?: number;
    valorDesconto?: number;
    observacoes?: string;
    meioPagamento?: string;
  }): Promise<{ success: boolean; data?: ContaReceber; error?: string }> {
    try {
      console.log(`💳 Dando baixa em conta a receber ${contaId}...`, data);
      
      const response = await axiosApiService.put<ContaReceber>(`/api/vendas/contas/${contaId}/pagar`, data);
      
      if (response.success && response.data) {
        console.log('✅ Baixa registrada com sucesso:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao dar baixa:', response);
        return { success: false, error: response.error || 'Erro ao dar baixa' };
      }
    } catch (error) {
      console.error('❌ Erro ao dar baixa em conta a receber:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Histórico de recebimentos parciais de uma duplicata (conta a receber)
   */
  async historicoRecebimentos(contaId: string): Promise<{
    success: boolean;
    data?: { conta: any; recebimentos: Array<{ id: string; valorPago: number; dataPagamento: string; observacoes?: string; meioPagamento?: string; createdAt: string }> };
    error?: string;
  }> {
    try {
      const response = await axiosApiService.get<any>(`/api/contas-receber/${contaId}/historico`);
      if (response.success && response.data) {
        const data = response.data?.data ?? response.data;
        return { success: true, data };
      }
      return { success: false, error: response.error || 'Erro ao carregar histórico' };
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de recebimentos:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Listar movimentações de caixa (extrato: entradas e saídas realizadas)
   */
  async listarMovimentacoesCaixa(filtros?: {
    dataInicio?: string;
    dataFim?: string;
    categoria?: string;
    busca?: string;
  }): Promise<{
    success: boolean;
    data?: { movimentacoes: MovimentacaoCaixaItem[]; resumo: ResumoMovimentacoes };
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filtros?.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.set('dataFim', filtros.dataFim);
      if (filtros?.categoria) params.set('categoria', filtros.categoria);
      if (filtros?.busca) params.set('busca', filtros.busca);
      const query = params.toString();
      const url = ENDPOINTS.MOVIMENTACOES_CAIXA + (query ? `?${query}` : '');
      const response = await axiosApiService.get<{ movimentacoes: MovimentacaoCaixaItem[]; resumo: ResumoMovimentacoes }>(url);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao carregar movimentações' };
    } catch (error) {
      console.error('❌ Erro ao carregar movimentações de caixa:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Atualizar movimentação (conciliação bancária) - dataPagamento, descricao, categoria, valor, juros, desconto, meioPagamento
   */
  async atualizarMovimentacao(
    id: string,
    payload: AtualizarMovimentacaoPayload
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axiosApiService.put<any>(`/api/movimentacoes-caixa/${id}`, payload);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao atualizar movimentação' };
    } catch (error) {
      console.error('❌ Erro ao atualizar movimentação:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Desfazer pagamento (contaReceber ou contaPagar)
   */
  async desfazerPagamento(id: string, motivo?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🧾 Desfazendo pagamento ${id} motivo: ${motivo}`);
      const response = await axiosApiService.delete<any>(`/api/movimentacoes-caixa/${id}`, {
        data: { motivo }
      });
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Erro ao desfazer pagamento' };
    } catch (error) {
      console.error('❌ Erro ao desfazer pagamento:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }

  /**
   * Buscar dados para gráficos do dashboard
   */
  async getDadosGraficos(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('📈 Carregando dados de gráficos...');
      
      // Tentar endpoint dedicado de gráficos, se não existir, usar dados mensais
      const response = await axiosApiService.get<any>(ENDPOINTS.RELATORIOS.FINANCEIRO);
      
      if (response.success && response.data) {
        console.log('✅ Dados de gráficos carregados:', response.data);
        return { success: true, data: response.data };
      } else {
        console.warn('⚠️ Erro ao carregar gráficos:', response);
        return { success: false, error: response.error || 'Erro ao carregar gráficos' };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar gráficos:', error);
      return { success: false, error: 'Erro de conexão com o backend' };
    }
  }
}

export const financeiroService = new FinanceiroService();

