import { axiosApiService } from './axiosApi';

export interface AlocarMaterialPayload {
  materialId: string;
  quantidade: number;
  projetoId?: string;
}

export interface MaterialAlocado {
  id: string;
  materialId: string;
  quantidade: number;
  tipo: string;
  motivo: string;
  referencia: string;
  observacoes?: string;
  createdAt: string;
  material: {
    id: string;
    nome: string;
    sku: string;
    unidadeMedida: string;
    categoria?: string;
  };
}

export interface AlocarMaterialResponse {
  success: boolean;
  data?: MaterialAlocado;
  message?: string;
  error?: string;
}

export interface ListarMateriaisObraResponse {
  success: boolean;
  data?: MaterialAlocado[];
  message?: string;
  error?: string;
}

class AlocacaoMateriaisService {
  /**
   * Aloca um material do estoque para uma obra
   */
  async alocarMaterialParaObra(
    obraId: string,
    payload: AlocarMaterialPayload
  ): Promise<AlocarMaterialResponse> {
    try {
      console.log('📦 [AlocacaoService] Alocando material:', { obraId, payload });
      const response = await axiosApiService.post<MaterialAlocado>(
        `/api/obras/${obraId}/materiais/alocar`,
        payload
      );
      
      console.log('📦 [AlocacaoService] Resposta recebida:', response);
      
      // axiosApiService já retorna { success, data, message, error }
      // Se sucesso, garantir que data está no formato correto
      if (response.success) {
        console.log('✅ [AlocacaoService] Alocação bem-sucedida');
        return {
          success: true,
          data: response.data as MaterialAlocado,
          message: response.message || 'Material alocado com sucesso'
        };
      }
      
      // Se não teve sucesso, retornar erro
      console.warn('⚠️ [AlocacaoService] Alocação falhou:', response.error || response.message);
      return {
        success: false,
        error: response.error || response.message || 'Não foi possível alocar o material'
      };
    } catch (error: any) {
      console.error('❌ [AlocacaoService] Erro ao alocar material para obra:', error);
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Erro ao alocar material'
      };
    }
  }

  /**
   * Lista todos os materiais alocados para uma obra
   */
  async listarMateriaisObra(obraId: string): Promise<ListarMateriaisObraResponse> {
    try {
      const response = await axiosApiService.get<MaterialAlocado[]>(
        `/api/obras/${obraId}/materiais`
      );
      
      // axiosApiService já retorna { success, data, message, error }
      if (response.success && response.data) {
        return {
          success: true,
          data: Array.isArray(response.data) ? response.data : [],
          message: response.message
        };
      }
      
      return {
        success: false,
        error: response.error || response.message || 'Erro ao listar materiais',
        data: []
      };
    } catch (error: any) {
      console.error('Erro ao listar materiais da obra:', error);
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Erro ao listar materiais',
        data: []
      };
    }
  }
}

export const alocacaoMateriaisService = new AlocacaoMateriaisService();

