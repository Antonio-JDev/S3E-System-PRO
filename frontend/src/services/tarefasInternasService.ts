import { axiosApiService } from './axiosApi';

export type StatusTarefaInterna = 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';

export interface TarefaInterna {
  id: string;
  titulo: string;
  motivo?: string | null;
  descricao?: string | null;
  prioridade: string;
  progresso: number;
  coluna: StatusTarefaInterna;
  userId?: string | null;
  user?: { id: string; name: string; email?: string } | null;
  prazo?: string;
  prazoDefinido?: boolean;
  createdAt: string;
  updatedAt: string;
  itens?: TarefaInternaItem[];
}

export interface TarefaInternaItem {
  id: string;
  tarefaInternaId: string;
  titulo: string;
  descricao?: string | null;
  dataInicio?: string | null;
  dataPrevisaoFim?: string | null;
  prazoDefinido?: boolean;
  observacoes?: string | null;
  concluido: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TarefaInternaKanbanItem extends TarefaInterna {
  userName?: string | null;
  userIds?: string[];
  userNames?: string[];
  totalItens: number;
  itensConcluidos: number;
}

export interface KanbanData {
  BACKLOG: TarefaInternaKanbanItem[];
  A_FAZER: TarefaInternaKanbanItem[];
  ANDAMENTO: TarefaInternaKanbanItem[];
  CONCLUIDO: TarefaInternaKanbanItem[];
}

export interface TarefaInternaStats {
  total: number;
  planejamento: number;
  andamento: number;
  concluidas: number;
}

export interface TarefasInternasUsuarioReportRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalAtribuidas: number;
  concluidas: number;
  concluidasPercent: number;
  avgHorasConclusaoTarefa: number;
  itensConcluidos: number;
  avgHorasConclusaoItem: number;
}

export interface TarefasInternasUsuarioReportDetalhes {
  userId: string;
  name: string;
  email: string;
  role: string;
  period: { start: string; end: string };
  tarefas: Array<{
    id: string;
    titulo: string;
    coluna: StatusTarefaInterna;
    createdAt: string;
    updatedAt: string;
    horasConclusao: number | null;
    itensTotal: number;
    itensConcluidos: number;
  }>;
  itens: Array<{
    id: string;
    tarefaInternaId: string;
    tarefaTitulo: string;
    titulo: string;
    concluido: boolean;
    createdAt: string;
    updatedAt: string;
    dataInicio: string | null;
    dataPrevisaoFim: string | null;
    horasConclusao: number | null;
  }>;
}

export interface CreateTarefaInternaData {
  titulo: string;
  motivo?: string;
  descricao?: string;
  prioridade?: string;
  progresso?: number;
  coluna?: StatusTarefaInterna;
  userId?: string;
  userIds?: string[];
  prazo?: string;
}

export interface UpdateTarefaInternaData extends Partial<CreateTarefaInternaData> {}

export interface CreateTarefaInternaItemData {
  titulo: string;
  descricao?: string;
  dataInicio?: string;
  dataPrevisaoFim?: string;
  observacoes?: string;
}

export interface UpdateTarefaInternaItemData {
  titulo?: string;
  descricao?: string;
  dataInicio?: string;
  dataPrevisaoFim?: string;
  observacoes?: string;
  concluido?: boolean;
}

class TarefasInternasService {
  async getKanban(): Promise<KanbanData> {
    const { data } = await axiosApiService.get<KanbanData>('/api/tarefas-internas/kanban');
    return data;
  }

  async getStats(): Promise<TarefaInternaStats> {
    const { data } = await axiosApiService.get<TarefaInternaStats>('/api/tarefas-internas/stats');
    return data;
  }

  async getRelatorioUsuarios(params: { start?: string; end?: string }): Promise<{ period: { start: string; end: string }; data: TarefasInternasUsuarioReportRow[] }> {
    const qs = new URLSearchParams();
    if (params.start) qs.set('start', params.start);
    if (params.end) qs.set('end', params.end);
    const { data } = await axiosApiService.get<any>(`/api/tarefas-internas/relatorios/usuarios?${qs.toString()}`);
    return (data?.data || data) as any;
  }

  async getRelatorioUsuarioDetalhes(userId: string, params: { start?: string; end?: string }): Promise<TarefasInternasUsuarioReportDetalhes> {
    const qs = new URLSearchParams();
    if (params.start) qs.set('start', params.start);
    if (params.end) qs.set('end', params.end);
    const { data } = await axiosApiService.get<any>(`/api/tarefas-internas/relatorios/usuarios/${userId}?${qs.toString()}`);
    return (data?.data?.data || data?.data || data) as any;
  }

  async create(payload: CreateTarefaInternaData): Promise<TarefaInterna> {
    const { data } = await axiosApiService.post<TarefaInterna>('/api/tarefas-internas', payload);
    return data;
  }

  async update(id: string, payload: UpdateTarefaInternaData): Promise<TarefaInterna> {
    const { data } = await axiosApiService.put<TarefaInterna>(`/api/tarefas-internas/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await axiosApiService.delete(`/api/tarefas-internas/${id}`);
  }

  async updateStatus(id: string, coluna: StatusTarefaInterna): Promise<TarefaInterna> {
    const { data } = await axiosApiService.put<TarefaInterna>(`/api/tarefas-internas/${id}/status`, { coluna });
    return data;
  }

  async getById(id: string): Promise<TarefaInterna> {
    const { data } = await axiosApiService.get<TarefaInterna>(`/api/tarefas-internas/${id}`);
    return data;
  }

  async createItem(tarefaInternaId: string, payload: CreateTarefaInternaItemData): Promise<TarefaInternaItem> {
    const { data } = await axiosApiService.post<TarefaInternaItem>(
      `/api/tarefas-internas/${tarefaInternaId}/itens`,
      payload
    );
    return data;
  }

  async updateItem(
    tarefaInternaId: string,
    itemId: string,
    payload: UpdateTarefaInternaItemData
  ): Promise<TarefaInternaItem> {
    const { data } = await axiosApiService.put<TarefaInternaItem>(
      `/api/tarefas-internas/${tarefaInternaId}/itens/${itemId}`,
      payload
    );
    return data;
  }

  async deleteItem(tarefaInternaId: string, itemId: string): Promise<void> {
    await axiosApiService.delete(`/api/tarefas-internas/${tarefaInternaId}/itens/${itemId}`);
  }
}

export const tarefasInternasService = new TarefasInternasService();
export default tarefasInternasService;
