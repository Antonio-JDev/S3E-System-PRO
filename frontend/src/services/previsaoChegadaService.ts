import { axiosApiService } from './axiosApi';
import type { TipoReferenciaChegada } from '../utils/previsaoChegadaBom.util';

export interface PrevisaoChegadaMaterial {
  id: string;
  projetoId: string;
  itemKey: string;
  descricao?: string | null;
  materialId?: string | null;
  dataChegada: string;
  tipoReferencia?: TipoReferenciaChegada | null;
  referencia?: string | null;
  definidoPorNome?: string | null;
  updatedAt?: string;
}

export interface DefinirPrevisaoChegadaPayload {
  itens: Array<{ itemKey: string; descricao?: string | null; materialId?: string | null }>;
  dataChegada: string;
  tipoReferencia?: TipoReferenciaChegada | null;
  referencia?: string | null;
}

export const previsaoChegadaService = {
  listar(projetoId: string) {
    return axiosApiService.get<PrevisaoChegadaMaterial[]>(`/api/projetos/${projetoId}/previsoes-chegada`);
  },
  definir(projetoId: string, payload: DefinirPrevisaoChegadaPayload) {
    return axiosApiService.put<PrevisaoChegadaMaterial[]>(`/api/projetos/${projetoId}/previsoes-chegada`, payload);
  },
  remover(projetoId: string, itemKeys: string[]) {
    return axiosApiService.post<PrevisaoChegadaMaterial[]>(
      `/api/projetos/${projetoId}/previsoes-chegada/remover`,
      { itemKeys },
    );
  },
};
