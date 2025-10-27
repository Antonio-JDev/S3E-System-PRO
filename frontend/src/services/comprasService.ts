import { apiService } from './api';

export interface Compra {
  id: string;
  fornecedorId: string;
  dataCompra: string;
  valorTotal: number;
  status: 'pendente' | 'confirmada' | 'recebida' | 'cancelada';
  observacoes?: string;
  itens?: ItemCompra[];
  fornecedor?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ItemCompra {
  id: string;
  compraId: string;
  materialId: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  material?: any;
}

export interface CreateCompraData {
  fornecedorId: string;
  dataCompra: string;
  observacoes?: string;
  itens: {
    materialId: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

export interface UpdateStatusData {
  status: 'pendente' | 'confirmada' | 'recebida' | 'cancelada';
}

export interface ParsedXMLData {
  fornecedor?: {
    cnpj: string;
    nome: string;
  };
  itens: {
    codigo: string;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    unidade?: string;
  }[];
  valorTotal: number;
}

class ComprasService {
  async getCompras(params?: {
    fornecedorId?: string;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<Compra[]>('/api/compras', params);
  }

  async createCompra(data: CreateCompraData) {
    return apiService.post<Compra>('/api/compras', data);
  }

  async updateCompraStatus(id: string, data: UpdateStatusData) {
    return apiService.patch<Compra>(`/api/compras/${id}/status`, data);
  }

  async parseXML(xmlContent: string) {
    return apiService.post<ParsedXMLData>('/api/compras/parse-xml', { xml: xmlContent });
  }
}

export const comprasService = new ComprasService();
