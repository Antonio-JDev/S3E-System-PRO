import { apiService } from './api';

export interface Compra {
  id: number;
  fornecedorId: number;
  dataCompra: string;
  dataPrevista?: string;
  dataRecebimento?: string;
  valorTotal: number;
  status: 'PENDENTE' | 'APROVADA' | 'RECEBIDA' | 'CANCELADA';
  observacao?: string;
  itens?: ItemCompra[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemCompra {
  id: number;
  compraId: number;
  materialId: number;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
}

export interface CreateCompraDto {
  fornecedorId: number;
  dataCompra: string;
  dataPrevista?: string;
  observacao?: string;
  itens: {
    materialId: number;
    quantidade: number;
    precoUnitario: number;
  }[];
}

export interface UpdateCompraStatusDto {
  status: 'PENDENTE' | 'APROVADA' | 'RECEBIDA' | 'CANCELADA';
  dataRecebimento?: string;
  observacao?: string;
}

class ComprasService {
  /**
   * Listar todas as compras
   */
  async listarCompras(params?: {
    fornecedorId?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Compra[]>('/api/compras', params);
  }

  /**
   * Criar nova compra
   */
  async criarCompra(data: CreateCompraDto) {
    return apiService.post<Compra>('/api/compras', data);
  }

  /**
   * Atualizar status da compra
   */
  async atualizarStatusCompra(id: number, data: UpdateCompraStatusDto) {
    return apiService.patch<Compra>(`/api/compras/${id}/status`, data);
  }

  /**
   * Parse XML de nota fiscal
   */
  async parseXML(xmlData: string) {
    return apiService.post('/api/compras/parse-xml', { xmlData });
  }
}

export const comprasService = new ComprasService();
