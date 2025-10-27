import { apiService } from './api';

export interface ItemCompra {
  id: string;
  materialId: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  material?: any;
}

export interface Compra {
  id: string;
  fornecedorId: string;
  valorTotal: number;
  status: 'Pendente' | 'Aprovado' | 'Recebido' | 'Cancelado';
  dataCompra: string;
  dataEntregaPrevista?: string;
  dataEntregaReal?: string;
  notaFiscal?: string;
  observacoes?: string;
  itens?: ItemCompra[];
  fornecedor?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedXMLData {
  fornecedor: {
    cnpj: string;
    nome: string;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  valorTotal: number;
  numeroNota: string;
  dataEmissao: string;
}

class ComprasService {
  /**
   * Listar todas as compras
   */
  async getCompras(params?: {
    status?: string;
    fornecedorId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    return apiService.get<Compra[]>('/api/compras', params);
  }

  /**
   * Criar nova compra
   */
  async createCompra(data: {
    fornecedorId: string;
    dataEntregaPrevista?: string;
    notaFiscal?: string;
    observacoes?: string;
    itens: Array<{
      materialId: string;
      quantidade: number;
      precoUnitario: number;
    }>;
  }) {
    return apiService.post<Compra>('/api/compras', data);
  }

  /**
   * Atualizar status da compra
   */
  async updateCompraStatus(id: string, status: 'Pendente' | 'Aprovado' | 'Recebido' | 'Cancelado', dataEntregaReal?: string) {
    return apiService.put<Compra>(`/api/compras/${id}/status`, { 
      status,
      dataEntregaReal 
    });
  }

  /**
   * Fazer parse de XML de nota fiscal
   */
  async parseXML(file: File) {
    const formData = new FormData();
    formData.append('xml', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${apiService['baseURL']}/api/compras/parse-xml`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao fazer parse do XML');
    }

    return await response.json();
  }
}

export const comprasService = new ComprasService();
