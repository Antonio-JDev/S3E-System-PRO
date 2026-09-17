import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface MaterialContagem {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  localizacao: string | null;
  unidadeMedida: string;
  categoria?: string | null;
  tipo?: string | null;
  ean?: string | null;
  codigoFornecedor?: string | null;
}

export interface AjusteInventarioPayload {
  materialId: string;
  quantidadeContada: number;
  observacoes?: string;
}

export interface AjusteInventarioResultado {
  materialId: string;
  materialNome?: string;
  estoqueAnterior: number;
  quantidadeContada: number;
  diferenca: number;
  semAlteracao: boolean;
  movimentacaoId?: string;
  message: string;
}

export interface AjusteLoteResultado {
  resultados: AjusteInventarioResultado[];
  aplicados: number;
  semAlteracao: number;
  erros: number;
}

class InventarioService {
  async listarMateriais(busca?: string) {
    return axiosApiService.get<MaterialContagem[]>(`${ENDPOINTS.INVENTARIO}/materiais`, {
      busca: busca || undefined,
    });
  }

  async aplicarAjuste(data: AjusteInventarioPayload) {
    return axiosApiService.post<AjusteInventarioResultado>(
      `${ENDPOINTS.INVENTARIO}/ajuste`,
      data
    );
  }

  async aplicarAjustesLote(itens: AjusteInventarioPayload[]) {
    return axiosApiService.post<AjusteLoteResultado>(`${ENDPOINTS.INVENTARIO}/ajustes`, {
      itens,
    });
  }
}

export const inventarioService = new InventarioService();
