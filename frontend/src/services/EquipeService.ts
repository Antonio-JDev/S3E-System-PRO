import { axiosApiService, type ApiResponse } from './axiosApi';

export interface EquipeMemberDTO {
  id: string;
  nome: string;
  funcao: string;
  email?: string | null;
}

export interface EquipeDTO {
  id: string;
  nome: string;
  tipo: 'MONTAGEM' | 'MANUTENCAO' | 'INSTALACAO' | 'CAMPO' | 'DISTINTA';
  descricao?: string | null;
  membros: EquipeMemberDTO[];
  ativa: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateEquipeInput {
  nome: string;
  tipo: EquipeDTO['tipo'];
  descricao?: string;
  ativa?: boolean;
  membrosIds?: string[];
}

export interface UpdateEquipeInput {
  nome?: string;
  tipo?: EquipeDTO['tipo'];
  descricao?: string;
  ativa?: boolean;
  membrosIds?: string[];
}

class EquipeService {
  private unwrap<T>(res: ApiResponse<any>): ApiResponse<T> {
    if (!res.success) return res as unknown as ApiResponse<T>;
    const payload = res.data as any;
    // Normaliza para que data seja o conteúdo real (payload.data)
    const data = payload?.data ?? payload;
    return { success: true, data } as ApiResponse<T>;
  }

  async getAllEquipes(opts?: { todas?: boolean }): Promise<ApiResponse<EquipeDTO[]>> {
    const params = opts?.todas ? { todas: 'true' } : undefined;
    const res = await axiosApiService.get<any>('/api/equipes', params);
    return this.unwrap<EquipeDTO[]>(res);
  }

  async getEquipeById(id: string): Promise<ApiResponse<EquipeDTO>> {
    const res = await axiosApiService.get<any>(`/api/equipes/${id}`);
    return this.unwrap<EquipeDTO>(res);
  }

  async createEquipe(data: CreateEquipeInput): Promise<ApiResponse<EquipeDTO>> {
    const res = await axiosApiService.post<any>('/api/equipes', data);
    return this.unwrap<EquipeDTO>(res);
  }

  async updateEquipe(id: string, data: UpdateEquipeInput): Promise<ApiResponse<EquipeDTO>> {
    const res = await axiosApiService.put<any>(`/api/equipes/${id}`, data);
    return this.unwrap<EquipeDTO>(res);
  }

  async deleteEquipe(id: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await axiosApiService.delete<any>(`/api/equipes/${id}`);

    
    // Se a requisição falhou, retornar o erro diretamente
    if (!res.success) {
      return {
        success: false,
        error: res.error || 'Erro ao excluir equipe'
      };
    }
    
    // Se foi bem-sucedido, normalizar a resposta
    return {
      success: true,
      data: { success: true }
    };
  }
}

export const equipeService = new EquipeService();


