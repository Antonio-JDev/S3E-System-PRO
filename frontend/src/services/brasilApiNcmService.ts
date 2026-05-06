import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export type BrasilApiNcmItem = {
  codigo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_ato: string;
  numero_ato: string;
  ano_ato: string;
};

export async function buscarNcmPorTermo(termo: string) {
  const trimmed = termo.trim();
  if (trimmed.length < 2) {
    return { success: false as const, data: [] as BrasilApiNcmItem[], error: 'Digite ao menos 2 caracteres.' };
  }

  const res = await axiosApiService.get<BrasilApiNcmItem[]>(ENDPOINTS.BRASIL_API.NCM_SEARCH, {
    search: trimmed,
  });

  if (!res.success) {
    return { success: false as const, data: [] as BrasilApiNcmItem[], error: res.error || 'Erro ao buscar NCM.' };
  }

  const data = res.data;
  if (Array.isArray(data)) {
    return { success: true as const, data };
  }
  return { success: false as const, data: [] as BrasilApiNcmItem[], error: 'Resposta inválida da API.' };
}

export async function consultarNcmPorCodigo(code: string) {
  const trimmed = code.trim();
  if (!trimmed) {
    return { success: false as const, data: null as BrasilApiNcmItem | null, error: 'Código vazio.' };
  }

  const res = await axiosApiService.get<BrasilApiNcmItem>(ENDPOINTS.BRASIL_API.ncmByCode(trimmed));

  if (!res.success) {
    return {
      success: false as const,
      data: null as BrasilApiNcmItem | null,
      error: res.error || 'NCM não encontrado.',
      status: res.status,
    };
  }

  const data = res.data;
  if (data && typeof data === 'object' && !Array.isArray(data) && 'codigo' in data) {
    return { success: true as const, data: data as BrasilApiNcmItem };
  }
  return { success: false as const, data: null as BrasilApiNcmItem | null, error: 'Resposta inválida da API.' };
}
