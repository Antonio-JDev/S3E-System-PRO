import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface Material {
  id: string;
  nome: string; // Nome do material
  sku: string; // Código SKU único
  codigo?: string; // Alias para compatibilidade (deprecated, usar sku)
  descricao: string;
  unidadeMedida: string; // Unidade de medida (un, m, kg, l, etc)
  unidade?: string; // Alias para compatibilidade (deprecated, usar unidadeMedida)
  ncm?: string; // Nomenclatura Comum do Mercosul (dado fiscal)
  imagemUrl?: string; // URL da imagem do material

  preco: number; // Preço de custo (última compra)
  valorVenda?: number; // Preço de venda (usado em orçamentos)
  porcentagemLucro?: number; // Porcentagem de lucro ((valorVenda - preco) / preco * 100)
  estoque: number;
  estoqueMinimo: number;
  categoria?: string;
  tipo?: string; // Tipo do material
  fornecedorId?: string;
  fornecedor?: {
    id: string;
    nome: string;
  };
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Famílias de cabo para atualização por bitola (alinhado ao backend). */
export type CableFamilia = 'FLEX_750V' | 'FLEX_1KV' | 'RIGIDO_1KV';

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
   * Aceita nome, descricao, tipo, categoria, unidadeMedida (ou unidade/codigo para compatibilidade).
   */
  async createMaterial(data: {
    nome?: string;
    descricao?: string;
    tipo?: string;
    categoria?: string;
    unidadeMedida?: string;
    unidade?: string;
    codigo?: string;
    preco?: number;
    valorVenda?: number;
    porcentagemLucro?: number;
    estoque?: number;
    estoqueMinimo?: number;
    sku?: string;
    ncm?: string;
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
   * Importar vários materiais de uma vez (JSON em lote).
   * body: { materiais: Array<{ nome?, descricao?, tipo?, categoria?, unidadeMedida?, preco?, estoque?, ... }> }
   */
  async importMateriais(materiais: any[]) {
    try {
      const response = await axiosApiService.post<{ success: boolean; message: string; data: { criados: number; erros: number; mensagens: string[] } }>(
        `${ENDPOINTS.MATERIAIS}/import`,
        { materiais }
      );
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data as any,
          message: (response.data as any).message || 'Importação concluída'
        };
      }
      return {
        success: false,
        data: null,
        message: (response as any).error || 'Erro na importação'
      };
    } catch (error) {
      console.error('❌ Erro ao importar materiais:', error);
      return {
        success: false,
        data: null,
        message: 'Erro ao importar materiais'
      };
    }
  }

  /**
   * Pré-visualiza materiais que serão atualizados (mesma bitola / todas as cores).
   */
  async previewPrecoBitola(familia: CableFamilia, bitolaMm2: number) {
    try {
      const res = await axiosApiService.post<{
        success: boolean;
        total?: number;
        materiais?: { id: string; nome: string; precoAtual: number | null }[];
        error?: string;
      }>(`${ENDPOINTS.MATERIAIS}/cabos/preview-preco-bitola`, { familia, bitolaMm2 });
      const anyRes = res as Record<string, unknown>;
      if (anyRes.success && Array.isArray(anyRes.materiais)) {
        return {
          success: true as const,
          total: Number(anyRes.total ?? 0),
          materiais: anyRes.materiais as { id: string; nome: string; precoAtual: number | null }[]
        };
      }
      return {
        success: false as const,
        message: (anyRes.error as string) || 'Não foi possível pré-visualizar'
      };
    } catch (e) {
      console.error('previewPrecoBitola:', e);
      return { success: false as const, message: 'Erro ao pré-visualizar' };
    }
  }

  /**
   * Aplica novo preço de custo (R$/m) a todos os materiais da bitola (todas as cores).
   */
  async aplicarPrecoBitola(familia: CableFamilia, bitolaMm2: number, preco: number) {
    try {
      const res = await axiosApiService.post<{
        success: boolean;
        atualizados?: number;
        ids?: string[];
        error?: string;
      }>(`${ENDPOINTS.MATERIAIS}/cabos/aplicar-preco-bitola`, { familia, bitolaMm2, preco });
      const anyRes = res as Record<string, unknown>;
      if (anyRes.success === true && typeof anyRes.atualizados === 'number') {
        return {
          success: true as const,
          atualizados: anyRes.atualizados,
          ids: (anyRes.ids as string[]) || []
        };
      }
      return {
        success: false as const,
        message: (anyRes.error as string) || 'Não foi possível aplicar os preços'
      };
    } catch (e) {
      console.error('aplicarPrecoBitola:', e);
      return { success: false as const, message: 'Erro ao aplicar preços' };
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
      
      const response = await axiosApiService.delete<any>(url);
      
      if (response.success) {
        console.log('✅ Material deletado com sucesso');
        return {
          success: true,
          message: response.message || 'Material deletado com sucesso',
          movimentacoesExcluidas: response.movimentacoesExcluidas || 0
        };
      } else {
        console.warn('⚠️ Erro ao deletar material:', response);
        return {
          success: false,
          error: response.error || 'Erro ao deletar material',
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
  /**
   * Atualizar SKUs e NCMs de materiais existentes
   */
  async atualizarSKUsENCMs(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔄 Atualizando SKUs e NCMs...');
      const response = await axiosApiService.post<any>(`${ENDPOINTS.MATERIAIS}/atualizar-skus-ncms`);
      
      if (response.success && response.data) {
        console.log('✅ SKUs e NCMs atualizados com sucesso:', response.data);
        return {
          success: true,
          data: response.data,
        };
      } else {
        console.warn('⚠️ Erro ao atualizar SKUs e NCMs:', response);
        return {
          success: false,
          error: response.error || 'Erro ao atualizar SKUs e NCMs',
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar SKUs e NCMs:', error);
      return {
        success: false,
        error: 'Erro de conexão com o backend',
      };
    }
  }

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

