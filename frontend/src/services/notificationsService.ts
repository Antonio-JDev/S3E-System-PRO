import { axiosApiService } from './axiosApi';

export interface Notificacao {
  id: string;
  userId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  emailEnviado: boolean;
  metadata?: {
    entityId?: string;
    entityType?: string;
    link?: string;
    numeroOrdemServico?: string;
    [k: string]: unknown;
  };
  createdAt: string;
}

export interface NotificacoesResponse {
  success: boolean;
  data: Notificacao[];
}

export interface ContagemResponse {
  success: boolean;
  data: { total: number };
}

class NotificationsService {
  async listar(limit = 50): Promise<Notificacao[]> {
    const res = await axiosApiService.get<Notificacao[]>('/api/notificacoes', { limit });
    if (res.success && Array.isArray(res.data)) return res.data;
    return [];
  }

  async contagemNaoLidas(): Promise<number> {
    const res = await axiosApiService.get<{ total: number }>('/api/notificacoes/contagem');
    if (res.success && res.data?.total != null) return res.data.total;
    return 0;
  }

  async marcarComoLida(id: string): Promise<boolean> {
    const res = await axiosApiService.patch(`/api/notificacoes/${id}/lida`);
    return !!res.success;
  }

  async marcarTodasComoLidas(): Promise<void> {
    await axiosApiService.patch('/api/notificacoes/marcar-todas-lidas');
  }

  /** Exclui todas as notificações do usuário (limpar todos) */
  async excluirTodas(): Promise<void> {
    await axiosApiService.delete('/api/notificacoes/todas');
  }

  /** Exclui uma notificação pelo id */
  async excluirUma(id: string): Promise<boolean> {
    const res = await axiosApiService.delete(`/api/notificacoes/${id}`);
    return !!res?.success;
  }

  /**
   * Criar notificação para outro usuário (admin/gerente/desenvolvedor/financeiro)
   */
  async criar(payload: {
    userId: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    metadata?: Record<string, unknown>;
    enviarEmail?: boolean;
  }): Promise<Notificacao | null> {
    const res = await axiosApiService.post<Notificacao>('/api/notificacoes', payload);
    if (res.success && res.data) return res.data;
    return null;
  }
}

export const notificationsService = new NotificationsService();
