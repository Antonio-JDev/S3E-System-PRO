import { axiosApiService } from './axiosApi';

export interface Obra {
  id: string;
  projetoId: string | null; // ✅ Opcional para obras de manutenção
  nomeObra: string;
  status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
  clienteNome: string;
  tipoObra?: 'PROJETO' | 'MANUTENCAO'; // ✅ Tipo da obra
  createdAt?: string;
  dataPrevistaInicio?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  dataPrevistaFim?: string;
  /** Primeira equipe encontrada nas tarefas (para timeline/Gantt) */
  equipe?: { id: string; nome: string };
  totalTarefas: number;
  tarefasConcluidas: number;
  progresso: number;
  observacoes?: string;
}

export interface ObraKanbanData {
  BACKLOG: Obra[];
  A_FAZER: Obra[];
  ANDAMENTO: Obra[];
  CONCLUIDO: Obra[];
}

export interface TarefaObra {
  id: string;
  obraId: string;
  descricao: string;
  atribuidoA?: string;
  progresso: number;
  dataPrevista?: string;
  dataConclusaoReal?: string;
  observacoes?: string;
  registrosAtividade?: RegistroAtividade[];
}

export interface RegistroAtividade {
  id: string;
  tarefaId: string;
  dataRegistro: string;
  descricaoAtividade: string;
  horasTrabalhadas: number;
  observacoes?: string;
}

export interface CreateObraData {
  projetoId: string;
  nomeObra?: string;
}

export interface CreateTarefaData {
  descricao: string;
  atribuidoA?: string;
  dataPrevista?: string;
}

export interface CreateRegistroData {
  descricaoAtividade: string;
  horasTrabalhadas: number;
  observacoes?: string;
}

/** Material agrupado por movimentações de obra (SAIDA, motivo OBRA) */
export interface MaterialObra {
  materialId: string;
  nome: string;
  sku: string | null;
  categoria: string | null;
  ncm: string | null;
  unidadeMedida: string;
  preco: number;
  valorVenda: number | null;
  descricao: string | null;
  imagemUrl: string | null;
  quantidadeTotal: number;
  isItemNovo: boolean;
  fornecedor: { nome: string; cnpj: string | null } | null;
  movimentacoes: Array<{
    id: string;
    quantidade: number;
    data: string;
    observacoes: string | null;
    isItemNovo: boolean;
  }>;
}

export interface CompraAvulsa {
  id: string;
  numeroNF: string;
  obraId: string | null;
  fornecedor: { nome: string; cnpj: string | null };
  items: Array<{
    material: { nome: string; sku: string | null; categoria: string | null; unidadeMedida: string };
    quantidade: number;
    precoUnit?: number;
  }>;
  createdAt: string;
  [key: string]: unknown;
}

class ObrasService {
  /**
   * Gera uma obra a partir de um projeto
   */
  async gerarObra(data: CreateObraData) {
    return axiosApiService.post('/api/obras/gerar', data);
  }

  /**
   * Cria uma obra de manutenção (sem projeto)
   */
  async criarObraManutencao(data: {
    clienteId: string;
    nomeObra: string;
    descricao?: string;
    endereco?: string;
    dataPrevistaInicio?: string;
    dataPrevistaFim?: string;
  }) {
    return axiosApiService.post('/api/obras/manutencao', data);
  }

  /**
   * Busca obras agrupadas por status (Kanban)
   */
  async getObrasKanban() {
    return axiosApiService.get<ObraKanbanData>('/api/obras/kanban');
  }

  /**
   * Atualiza status da obra (move no Kanban)
   */
  async updateObraStatus(obraId: string, newStatus: string) {
    return axiosApiService.put(`/api/obras/${obraId}/status`, { status: newStatus });
  }

  /**
   * Inicia execução de uma obra (permite eletricistas iniciarem)
   */
  async iniciarExecucao(obraId: string) {
    return axiosApiService.put(`/api/obras/${obraId}/iniciar-execucao`);
  }

  /**
   * Busca detalhes de uma tarefa
   */
  async getTarefa(tarefaId: string) {
    return axiosApiService.get<TarefaObra>(`/api/obras/tarefas/${tarefaId}`);
  }

  /**
   * Adiciona registro de atividade em uma tarefa
   */
  async addRegistroAtividade(tarefaId: string, data: CreateRegistroData) {
    return axiosApiService.post(`/api/obras/tarefas/${tarefaId}/registro`, data);
  }

  /**
   * Cria nova tarefa em uma obra
   */
  async criarTarefa(obraId: string, data: CreateTarefaData) {
    return axiosApiService.post(`/api/obras/${obraId}/tarefas`, data);
  }

  /**
   * Atualiza progresso de uma tarefa
   */
  async atualizarProgressoTarefa(tarefaId: string, progresso: number) {
    return axiosApiService.put(`/api/obras/tarefas/${tarefaId}/progresso`, { progresso });
  }

  /**
   * Busca alocação de equipes (calendário)
   */
  async getAlocacaoEquipes(dataInicio?: string, dataFim?: string) {
    return axiosApiService.get('/api/obras/alocacao', {
      dataInicio,
      dataFim
    });
  }

  /**
   * Deleta uma obra (apenas admin e desenvolvedor)
   */
  async deletarObra(obraId: string) {
    return axiosApiService.delete(`/api/obras/${obraId}`);
  }

  /**
   * Busca materiais disponíveis na obra (agrupados por movimentações SAIDA/OBRA)
   */
  async getMateriaisObra(obraId: string): Promise<{ success: boolean; data?: { obraId: string; obraNome: string; materiais: MaterialObra[]; totalMateriais: number; totalMovimentacoes: number }; error?: string }> {
    const res = await axiosApiService.get<{ obraId: string; obraNome: string; materiais: MaterialObra[]; totalMateriais: number; totalMovimentacoes: number }>(`/api/obras/${obraId}/materiais`);
    return res as { success: boolean; data?: { obraId: string; obraNome: string; materiais: MaterialObra[]; totalMateriais: number; totalMovimentacoes: number }; error?: string };
  }

  /**
   * Busca compras avulsas vinculadas à obra
   */
  async getComprasAvulsasObra(obraId: string): Promise<{ success: boolean; data?: CompraAvulsa[]; error?: string }> {
    const res = await axiosApiService.get<CompraAvulsa[]>(`/api/obras/${obraId}/compras-avulsas`);
    return res as { success: boolean; data?: CompraAvulsa[]; error?: string };
  }
}

export const obrasService = new ObrasService();

