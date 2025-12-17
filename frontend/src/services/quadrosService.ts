import { axiosApiService } from './axiosApi';

export interface QuadroConfig {
  tipo: 'POLICARBONATO' | 'ALUMINIO' | 'COMANDO';
  caixas: { materialId: string; quantidade: number }[];
  disjuntorGeral?: { materialId: string; quantidade: number };
  barramento?: { materialId: string; quantidade: number; unidade?: 'METROS' | 'CM' };
  medidores: { disjuntorId: string; medidorId?: string; quantidade: number }[];
  cabos: { materialId: string; quantidade: number; unidade: 'METROS' | 'CM' }[];
  dps?: {
    classe: 'CLASSE_1' | 'CLASSE_2';
    items: { materialId: string; quantidade: number }[];
  };
  born?: { materialId: string; quantidade: number }[];
  parafusos?: { materialId: string; quantidade: number }[];
  trilhos?: { materialId: string; quantidade: number; unidade: 'METROS' | 'CM' }[];
  componentes: { materialId: string; quantidade: number }[];
}

export interface CreateQuadroData {
  nome: string;
  descricao: string;
  configuracao: QuadroConfig;
}

export interface CaixaEstoque {
  id: string;
  codigo: string;
  descricao: string;
  estoque: number;
  preco: number;
  unidadeMedida: string;
}

class QuadrosService {
  async criar(quadroData: CreateQuadroData) {
    return axiosApiService.post('/api/quadros', quadroData);
  }
  
  async listar() {
    return axiosApiService.get('/api/quadros');
  }
  
  async buscar(id: string) {
    return axiosApiService.get(`/api/quadros/${id}`);
  }
  
  async desativar(id: string) {
    return axiosApiService.delete(`/api/quadros/${id}`);
  }

  /**
   * Busca caixas de estoque específicas para quadros elétricos
   * @param tipo - Tipo de caixa (ALUMINIO ou COMANDO)
   * @returns Lista de caixas disponíveis em estoque
   */
  async buscarCaixasEstoque(tipo: 'ALUMINIO' | 'COMANDO'): Promise<CaixaEstoque[]> {
    try {
      console.log(`🔍 Buscando caixas de estoque do tipo: ${tipo}`);
      
      // IMPORTANTE: Por enquanto, retorna array vazio até criar endpoint no backend
      // TODO: Implementar endpoint real no backend: GET /api/materiais?categoria=caixa-${tipo.toLowerCase()}
      
      // Quando o endpoint estiver pronto, usar este código:
      // const response = await axiosApiService.get(`/api/materiais`, {
      //   params: {
      //     categoria: `caixa-${tipo.toLowerCase()}`,
      //     ativo: true
      //   }
      // });
      // if (response.success && response.data) {
      //   return response.data.map((m: any) => ({
      //     id: m.id,
      //     codigo: m.codigo || m.sku,
      //     descricao: m.nome,
      //     estoque: m.estoque || 0,
      //     preco: m.preco || 0,
      //     unidadeMedida: m.unidadeMedida || 'un'
      //   }));
      // }
      
      console.log(`⚠️ Endpoint de caixas ainda não implementado. Retornando lista vazia.`);
      return [];
      
    } catch (error) {
      console.error('❌ Erro ao buscar caixas de estoque:', error);
      return [];
    }
  }
}

export const quadrosService = new QuadrosService();

