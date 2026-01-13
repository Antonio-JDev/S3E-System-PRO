import { axiosApiService } from './axiosApi';
import { type PurchaseOrder } from '../types';

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
   * Excluir compra permanentemente
   */
  async excluir(id: string) {
    try {
      console.log(`🗑️ Excluindo compra ${id}...`);
      
      const response = await axiosApiService.delete<void>(`/api/compras/${id}`);
      
      if (response.success) {
        console.log('✅ Compra excluída com sucesso');
        return {
          success: true,
          message: 'Compra excluída permanentemente'
        };
      } else {
        console.warn('⚠️ Erro ao excluir compra:', response);
        return {
          success: false,
          error: response.error || 'Erro ao excluir compra'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao excluir compra:', error);
      return {
        success: false,
        error: 'Erro de conexão ao excluir compra'
      };
    }
  }
  /**
   * Converte o DTO do backend em um PurchaseOrder usado na UI
   */
  mapCompraToPurchaseOrder(compraDTO: any): PurchaseOrder {
    return {
      id: compraDTO.id,
      numeroSequencial: compraDTO.numeroSequencial || compraDTO.numero || null, // ✅ Número sequencial da compra
      supplierId: compraDTO.fornecedorId || compraDTO.fornecedor?.id || '',
      supplierName: compraDTO.fornecedorNome || compraDTO.fornecedor?.nome || compraDTO.supplierName || 'Fornecedor',
      orderDate: compraDTO.dataCompra || compraDTO.orderDate,
      invoiceNumber: compraDTO.numeroNF || compraDTO.invoiceNumber,
      serieNF: compraDTO.serieNF || compraDTO.serie || compraDTO.numeroSerie || null, // ✅ Campo de série da NF
      status: (compraDTO.status as any) || 'Pendente',
      items: (compraDTO.items || compraDTO.itens || []).map((it: any) => {
        // ✅ CRÍTICO: Sempre buscar NCM e SKU do material quando disponível
        // Prioridade: material.ncm/material.sku > item.ncm/item.sku
        const ncm = it.material?.ncm || it.ncm || null;
        const sku = it.material?.sku || it.sku || null;
        const unidadeMedida = it.material?.unidadeMedida || it.unidadeMedida || 'un';
        
        return {
          id: it.id, // ✅ CRÍTICO: Preservar o ID do CompraItem para processamento no backend
          productId: it.materialId || it.productId || it.id || '',
          productName: it.nomeProduto || it.productName || it.nome || 'Item',
          quantity: it.quantidade || it.quantity || 0,
          unitCost: it.valorUnit || it.precoUnitario || it.unitCost || 0,
          totalCost: (it.quantidade || it.quantity || 0) * (it.valorUnit || it.precoUnitario || it.unitCost || 0),
          materialId: it.materialId, // Preservar materialId também
          nomeProduto: it.nomeProduto || it.productName || it.nome, // Preservar nome original
          ncm: ncm, // ✅ Sempre usar NCM do material quando disponível
          sku: sku, // ✅ Sempre usar SKU do material quando disponível
          unidadeMedida: unidadeMedida, // ✅ Preservar unidade de medida
          material: it.material // ✅ Preservar objeto material completo para referência
        };
      }),
      totalAmount: compraDTO.valorTotal || compraDTO.totalAmount || 0,
      notes: compraDTO.observacoes || compraDTO.notes || '',
      // Data de recebimento real da remessa, quando já recebida
      dataRecebimento: compraDTO.dataRecebimento || compraDTO.dataEntregaReal || null,
      // ✅ NOVO: Obra vinculada (para compras avulsas)
      obraId: compraDTO.obraId || undefined,
      obra: compraDTO.obra || undefined,
      // ✅ Preservar dados adicionais do backend
      duplicatas: compraDTO.duplicatas || [],
      contasPagar: compraDTO.contasPagar || [],
      condicoesPagamento: compraDTO.condicoesPagamento,
      parcelas: compraDTO.parcelas,
      dataPrimeiroVencimento: compraDTO.dataPrimeiroVencimento,
      valorTotalProdutos: compraDTO.valorTotalProdutos,
      frete: compraDTO.frete,
      valorIPI: compraDTO.valorIPI,
      outrasDespesas: compraDTO.outrasDespesas,
      valorTotalNota: compraDTO.valorTotalNota,
      destinatarioCNPJ: compraDTO.destinatarioCNPJ,
      statusImportacao: compraDTO.statusImportacao
    } as any;
  }
  /**
   * Listar todas as compras
   */
  async getCompras(params?: {
    status?: string;
    fornecedorId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
    const resp = await axiosApiService.get<any>('/api/compras', params);
    
    // Backend retorna: { success: true, data: { compras: [], pagination: {} } }
    let raw: any[] = [];
    
    if (Array.isArray(resp)) {
      raw = resp;
    } else if ((resp as any)?.data?.compras && Array.isArray((resp as any).data.compras)) {
      raw = (resp as any).data.compras;
    } else if (Array.isArray((resp as any)?.data)) {
      raw = (resp as any).data;
    } else if (Array.isArray((resp as any)?.data?.data)) {
      raw = (resp as any).data.data;
    }
    
    console.log('📦 Compras carregadas do backend:', raw.length, raw);
    return (raw as any[]).map((c) => this.mapCompraToPurchaseOrder(c));
  }

  /**
   * Criar nova compra
   */
  async createCompra(data: any) {
    const resp = await axiosApiService.post<any>('/api/compras', data);
    return (resp as any)?.data ?? resp;
  }

  /**
   * Atualizar status da compra
   */
  async updateCompraStatus(id: string, status: 'Pendente' | 'Aprovado' | 'Recebido' | 'Cancelado', dataEntregaReal?: string) {
    return axiosApiService.put<Compra>(`/api/compras/${id}/status`, { 
      status,
      dataEntregaReal 
    });
  }

  /**
   * Receber remessa parcial (somente itens específicos)
   */
  async receberRemessaParcial(
    id: string, 
    status: 'Pendente' | 'Aprovado' | 'Recebido' | 'Cancelado', 
    dataRecebimento: string,
    produtoIds: string[]
  ) {
    // ✅ CORREÇÃO: Backend espera dataEntregaReal, mas semanticamente é dataRecebimento
    return axiosApiService.put<Compra>(`/api/compras/${id}/receber-parcial`, { 
      status,
      dataEntregaReal: dataRecebimento, // Backend usa dataEntregaReal mas é a data de recebimento
      produtoIds
    });
  }

  /**
   * Receber compra com associações explícitas de materiais
   * Previne criação de duplicatas
   */
  async receberComAssociacoes(
    id: string,
    associacoes: { [compraItemId: string]: { materialId?: string; criarNovo?: boolean; nomeMaterial?: string } },
    dataRecebimento?: string
  ) {
    console.log('🔗 Recebendo compra com associações:', id, associacoes);
    
    return axiosApiService.put<Compra>(`/api/compras/${id}/receber-com-associacoes`, {
      associacoes,
      dataRecebimento: dataRecebimento || new Date().toISOString()
    });
  }

  /**
   * Buscar compra específica por ID com todos os detalhes (incluindo NCMs, duplicatas, contas a pagar)
   */
  async getCompraById(id: string) {
    try {
      const resp = await axiosApiService.get<any>(`/api/compras/${id}`);
      const compraDTO = (resp as any)?.data?.data || (resp as any)?.data || resp;
      return this.mapCompraToPurchaseOrder(compraDTO);
    } catch (error) {
      console.error('Erro ao buscar compra:', error);
      throw error;
    }
  }

  /**
   * Fazer parse de XML de nota fiscal no backend
   * Envia o conteúdo XML como JSON { xml: string }
   */
  async parseXML(xmlText: string) {
    return axiosApiService.post<any>('/api/compras/parse-xml', { xml: xmlText });
  }

  /**
   * Cancelar compra
   */
  async cancelarCompra(id: string) {
    try {
      console.log(`🚫 Cancelando compra ${id}...`);
      
      const response = await axiosApiService.put<any>(`/api/compras/${id}/cancelar`, {});
      
      if (response.success) {
        console.log('✅ Compra cancelada com sucesso');
        return {
          success: true,
          message: response.message || 'Compra cancelada com sucesso',
          data: response.data
        };
      } else {
        console.warn('⚠️ Erro ao cancelar compra:', response);
        return {
          success: false,
          error: response.error || 'Erro ao cancelar compra'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao cancelar compra:', error);
      return {
        success: false,
        error: 'Erro de conexão ao cancelar compra'
      };
    }
  }

  /**
   * Buscar compras com fracionamento pendente
   */
  async buscarComprasComFracionamentoPendente() {
    const response = await axiosApiService.get('/api/compras/fracionamento/pendentes');
    return response.data || response;
  }

  /**
   * Processar atualizações de fracionamento
   */
  async processarAtualizacoesFracionamento() {
    const response = await axiosApiService.post('/api/compras/fracionamento/processar');
    return response.data || response;
  }
}

export const comprasService = new ComprasService();

