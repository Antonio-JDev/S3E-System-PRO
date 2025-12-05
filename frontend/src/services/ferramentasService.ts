import { axiosApiService } from './axiosApi';

const BASE_URL = '/api';

export interface Ferramenta {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  descricao?: string;
  valorCompra?: number;
  imagemUrl?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KitFerramenta {
  id: string;
  nome: string;
  descricao?: string;
  eletricistaId: string;
  eletricistaNome: string;
  dataEntrega: string;
  imagemUrl?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  itens: KitFerramentaItem[];
}

export interface KitFerramentaItem {
  id: string;
  kitId: string;
  ferramentaId: string;
  quantidade: number;
  estadoEntrega: string;
  observacoes?: string;
  ferramenta?: Ferramenta;
}

export interface Eletricista {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const ferramentasService = {
  // ============================================
  // FERRAMENTAS
  // ============================================

  async listarFerramentas(apenasAtivas = true) {
    return axiosApiService.get<Ferramenta[]>(`${BASE_URL}/ferramentas`, {
      params: { apenasAtivas }
    });
  },

  async buscarFerramentaPorId(id: string) {
    return axiosApiService.get<Ferramenta>(`${BASE_URL}/ferramentas/${id}`);
  },

  async criarFerramenta(dados: Partial<Ferramenta>) {
    return axiosApiService.post<Ferramenta>(`${BASE_URL}/ferramentas`, dados);
  },

  async atualizarFerramenta(id: string, dados: Partial<Ferramenta>) {
    return axiosApiService.put<Ferramenta>(`${BASE_URL}/ferramentas/${id}`, dados);
  },

  async deletarFerramenta(id: string) {
    return axiosApiService.delete(`${BASE_URL}/ferramentas/${id}`);
  },

  async uploadImagemFerramenta(file: File) {
    const formData = new FormData();
    formData.append('imagem', file);

    return axiosApiService.post<{ imagemUrl: string; filename: string }>(
      `${BASE_URL}/ferramentas/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  },

  // ============================================
  // KITS DE FERRAMENTAS
  // ============================================

  async listarKits(eletricistaId?: string) {
    return axiosApiService.get<KitFerramenta[]>(`${BASE_URL}/kits-ferramenta`, {
      params: eletricistaId ? { eletricistaId } : {}
    });
  },

  async buscarKitPorId(id: string) {
    return axiosApiService.get<KitFerramenta>(`${BASE_URL}/kits-ferramenta/${id}`);
  },

  async criarKit(dados: Partial<KitFerramenta> & { itens: Partial<KitFerramentaItem>[] }) {
    return axiosApiService.post<KitFerramenta>(`${BASE_URL}/kits-ferramenta`, dados);
  },

  async atualizarKit(id: string, dados: Partial<KitFerramenta> & { itens?: Partial<KitFerramentaItem>[] }) {
    return axiosApiService.put<KitFerramenta>(`${BASE_URL}/kits-ferramenta/${id}`, dados);
  },

  async deletarKit(id: string) {
    return axiosApiService.delete(`${BASE_URL}/kits-ferramenta/${id}`);
  },

  async uploadImagemKit(file: File) {
    const formData = new FormData();
    formData.append('imagem', file);

    return axiosApiService.post<{ imagemUrl: string; filename: string }>(
      `${BASE_URL}/kits-ferramenta/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  },

  async listarEletricistas() {
    return axiosApiService.get<Eletricista[]>(`${BASE_URL}/kits-ferramenta/eletricistas`);
  }
};

