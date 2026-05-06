import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

class LogsService {
  async listarAuditLogs(params?: { limit?: number; offset?: number; action?: string; entity?: string }) {
    try {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      if (params?.action) query.set('action', params.action);
      if (params?.entity) query.set('entity', params.entity);
      const url = `/api/logs/audit${query.toString() ? `?${query.toString()}` : ''}`;
      const resp = await axiosApiService.get<any>(url);
      if (resp.success && resp.data) {
        return { success: true, data: resp.data };
      }
      return { success: false, error: resp.error || 'Erro ao buscar logs' };
    } catch (error: any) {
      console.error('Erro ao buscar audit logs:', error);
      return { success: false, error: error?.message || 'Erro de conexão' };
    }
  }
}

export const logsService = new LogsService();

