import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  ncm?: string; // Nomenclatura Comum do Mercosul (dado fiscal)

  preco: number; // Preço de custo (última compra)
  valorVenda?: number; // Preço de venda (usado em orçamentos)
  porcentagemLucro?: number; // Porcentagem de lucro ((valorVenda - preco) / preco * 100)
  estoque: number;
  estoqueMinimo: number;
  categoria?: string;
  fornecedorId?: string;
  fornecedor?: {
    id: string;
    nome: string;
  };
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movimentacao {
  id: string;
  materialId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivoMovimentacao: string;
  observacoes?: string;
  usuarioId?: string;
  material?: Material;
  createdAt: string;
}

class MateriaisService {
  /**
   * Listar todos os materiais
   */
  async getMateriais(params?: {
    categoria?: string;
    ativo?: boolean;
    busca?: string;
  }) {
    try {
      console.log('📦 Carregando materiais...', params);
      
      const response = await axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS, params);
      
      if (response.success && response.data) {
        console.log(`✅ ${response.data.length} materiais carregados`);
        return {
          success: true,
          data: response.data,
          message: `${response.data.length} materiais carregados`
        };
      } else {
        console.warn('⚠️ Erro ao carregar materiais:', response);
        return {
          success: true,
          data: [],
          message: 'Nenhum material encontrado'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar materiais:', error);
      return {
        success: false,
        data: [],
        message: 'Erro ao carregar materiais'
      };
    }
  }

  /**
   * Buscar material por ID
   */
  async getMaterialById(id: string) {
    try {
      console.log('🔍 Buscando material por ID:', id);
      
      const response = await axiosApiService.get<Material>(`${ENDPOINTS.MATERIAIS}/${id}`);
      
      if (response.success && response.data) {
        console.log('✅ Material encontrado:', response.data.descricao);
        return {
          success: true,
          data: response.data,
          message: 'Material encontrado'
        };
      } else {
        console.warn('⚠️ Material não encontrado:', id);
        return {
          success: false,
          data: null,
          message: 'Material não encontrado'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar material:', error);
      return {
        success: false,
        data: null,
        message: 'Erro ao buscar material'
      };
    }
  }

  /**
   * Criar novo material
   */
  async createMaterial(data: {
    codigo: string;
    descricao: string;
    unidade: string;
    preco: number;

    valorVenda?: number;
    porcentagemLucro?: number;
    estoque: number;
    estoqueMinimo: number;
    categoria?: string;
    fornecedorId?: string;
  }) {
    try {
      console.log('➕ Criando novo material:', data.descricao);
      
      const response = await axiosApiService.post<Material>(ENDPOINTS.MATERIAIS, data);
      
      if (response.success && response.data) {
        console.log('✅ Material criado com sucesso:', response.data.descricao);
        return {
          success: true,
          data: response.data,
          message: 'Material criado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao criar material:', response);
        return {
          success: false,
          data: null,
          message: 'Erro ao criar material'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao criar material:', error);
      return {
        success: false,
        data: null,
        message: 'Erro ao criar material'
      };
    }
  }

  /**
   * Atualizar material
   */
  async updateMaterial(id: string, data: Partial<Material>) {
    try {
      console.log('✏️ Atualizando material:', id);
      
      const response = await axiosApiService.put<Material>(`${ENDPOINTS.MATERIAIS}/${id}`, data);
      
      if (response.success && response.data) {
        console.log('✅ Material atualizado com sucesso:', response.data.descricao);
        return {
          success: true,
          data: response.data,
          message: 'Material atualizado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao atualizar material:', response);
        return {
          success: false,
          data: null,
          message: 'Erro ao atualizar material'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar material:', error);
      return {
        success: false,
        data: null,
        message: 'Erro ao atualizar material'
      };
    }
  }

  /**
   * Deletar material
   */
  async deleteMaterial(id: string, permanent: boolean = false) {
    try {
      console.log('🗑️ Deletando material:', id, permanent ? '(permanente)' : '(soft delete)');
      
      // ✅ CORREÇÃO: Passar ?permanent=true para exclusão permanente
      const url = permanent 
        ? `${ENDPOINTS.MATERIAIS}/${id}?permanent=true`
        : `${ENDPOINTS.MATERIAIS}/${id}`;
      
      const response = await axiosApiService.delete<void>(url);
      
      if (response.success) {
        console.log('✅ Material deletado com sucesso');
        return {
          success: true,
          message: 'Material deletado com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao deletar material:', response);
        return {
          success: false,
          message: 'Erro ao deletar material'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao deletar material:', error);
      return {
        success: false,
        message: 'Erro ao deletar material'
      };
    }
  }

  /**
   * Buscar histórico de compras de um material
   */
  async getHistoricoCompras(id: string) {
    try {
      console.log('📜 Buscando histórico de compras do material:', id);
      
      const response = await axiosApiService.get(`${ENDPOINTS.MATERIAIS}/${id}/historico-compras`);
      
      console.log('✅ Histórico carregado:', response);
      return response.data || response || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de compras:', error);
      return [];
    }
  }

  /**
   * Corrigir nomes genéricos de materiais importados via XML
   */
  async corrigirNomesGenericos() {
    try {
      console.log('🔄 Corrigindo nomes genéricos de materiais...');
      
      const response = await axiosApiService.post(`${ENDPOINTS.MATERIAIS}/corrigir-nomes`, {});
      
      console.log('✅ Nomes corrigidos:', response);
      return response.data || response || { success: false };
    } catch (error) {
      console.error('❌ Erro ao corrigir nomes genéricos:', error);
      return { success: false, error };
    }
  }

  /**
   * Registrar movimentação de estoque
   */
  async registrarMovimentacao(data: {
    materialId: string;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivoMovimentacao: string;
    observacoes?: string;
  }) {
    try {
      console.log('📦 Registrando movimentação de estoque:', data);
      
      const response = await axiosApiService.post<Movimentacao>('/api/materiais/movimentacao', data);
      
      if (response.success && response.data) {
        console.log('✅ Movimentação registrada com sucesso');
        return {
          success: true,
          data: response.data,
          message: 'Movimentação registrada com sucesso'
        };
      } else {
        console.warn('⚠️ Erro ao registrar movimentação:', response);
        return {
          success: false,
          data: null,
          message: 'Erro ao registrar movimentação'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao registrar movimentação:', error);
      return {
        success: false,
        data: null,
        message: 'Erro ao registrar movimentação'
      };
    }
  }

  /**
   * Buscar histórico de movimentações
   */
  async getMovimentacoes(params?: {
    materialId?: string;
    tipo?: 'ENTRADA' | 'SAIDA';
    dataInicio?: string;
    dataFim?: string;
  }) {
    try {
      console.log('📋 Buscando histórico de movimentações...', params);
      
      const response = await axiosApiService.get<Movimentacao[]>('/api/materiais/movimentacoes/historico', params);
      
      if (response.success && response.data) {
        console.log(`✅ ${response.data.length} movimentações encontradas`);
        return {
          success: true,
          data: response.data,
          message: `${response.data.length} movimentações encontradas`
        };
      } else {
        console.warn('⚠️ Erro ao buscar movimentações:', response);
        return {
          success: true,
          data: [],
          message: 'Nenhuma movimentação encontrada'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar movimentações:', error);
      return {
        success: false,
        data: [],
        message: 'Erro ao buscar movimentações'
      };
    }
  }

  /**
   * Buscar materiais similares (para verificação de duplicatas)
   */
  async buscarMateriaisSimilares(nomeProduto: string, ncm?: string) {
    try {
      console.log(`🔍 Buscando materiais similares a: "${nomeProduto}"`);
      
      const response = await axiosApiService.post<any[]>(`${ENDPOINTS.MATERIAIS}/buscar-similares`, {
        nomeProduto,
        ncm
      });
      
      if (response.success && response.data) {
        console.log(`✅ ${response.data.length} materiais similares encontrados`);
        return {
          success: true,
          data: response.data || [],
          message: `${response.data.length} materiais similares encontrados`
        };
      } else {
        console.warn('⚠️ Nenhum material similar encontrado');
        return {
          success: true,
          data: [],
          message: 'Nenhum material similar encontrado'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar materiais similares:', error);
      return {
        success: false,
        data: [],
        message: 'Erro ao buscar materiais similares'
      };
    }
  }

  /**
   * Exportar materiais críticos (estoque baixo/zerado) para cotação
   */
  async exportarMateriaisCriticos(formato: 'xlsx' | 'csv' | 'pdf') {
    return axiosApiService.get(`${ENDPOINTS.MATERIAIS}/exportar-criticos?formato=${formato}`, {}, {
      responseType: 'blob'
    });
  }

  /**
   * Importar preços atualizados do fornecedor
   */
  async importarPrecos(formData: FormData) {
    return axiosApiService.post(`${ENDPOINTS.MATERIAIS}/importar-precos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

export const materiaisService = new MateriaisService();

