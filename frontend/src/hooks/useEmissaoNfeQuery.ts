import { useQuery, useQueryClient } from '@tanstack/react-query';
import { empresaFiscalService } from '../services/empresaFiscalService';
import { nfseService } from '../services/nfseService';
import { axiosApiService } from '../services/axiosApi';

export const EMISSAO_EMPRESAS_FISCAIS_QUERY_KEY = ['emissao-nfe', 'empresas-fiscais'] as const;
export const EMISSAO_VENDAS_FATURAMENTO_QUERY_KEY = ['emissao-nfe', 'vendas-faturamento'] as const;
export const EMISSAO_NOTAS_NFE_QUERY_KEY = ['emissao-nfe', 'notas'] as const;
export const EMISSAO_LISTA_NFSE_QUERY_KEY = ['emissao-nfe', 'nfse-lista'] as const;

export async function fetchEmissaoEmpresasFiscais() {
  const response = await empresaFiscalService.listar();
  if (!response.success || !response.data) return [];
  return Array.isArray(response.data) ? response.data : [];
}

export function useEmissaoEmpresasFiscais(enabled = true) {
  return useQuery({
    queryKey: EMISSAO_EMPRESAS_FISCAIS_QUERY_KEY,
    queryFn: fetchEmissaoEmpresasFiscais,
    enabled,
  });
}

export function useInvalidateEmissaoEmpresasFiscais() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EMISSAO_EMPRESAS_FISCAIS_QUERY_KEY });
}

export async function fetchEmissaoVendasFaturamento() {
  const response = await axiosApiService.get<any>('/api/vendas', {
    status: 'Ativa',
    limit: 50,
  });
  if (!response.success || !response.data) return [];
  const raw = response.data;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.vendas) ? raw.vendas : [];
  return list;
}

export function useEmissaoVendasFaturamento(enabled = true) {
  return useQuery({
    queryKey: EMISSAO_VENDAS_FATURAMENTO_QUERY_KEY,
    queryFn: fetchEmissaoVendasFaturamento,
    enabled,
  });
}

export function useInvalidateEmissaoVendasFaturamento() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EMISSAO_VENDAS_FATURAMENTO_QUERY_KEY });
}

export async function fetchEmissaoNotasNfe() {
  const response = await axiosApiService.get<any>('/api/nfe/notas');
  if (!response.success || !Array.isArray(response.data)) return [];
  return response.data;
}

export function useEmissaoNotasNfe(enabled = true) {
  return useQuery({
    queryKey: EMISSAO_NOTAS_NFE_QUERY_KEY,
    queryFn: fetchEmissaoNotasNfe,
    enabled,
  });
}

export function useInvalidateEmissaoNotasNfe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EMISSAO_NOTAS_NFE_QUERY_KEY });
}

export async function fetchEmissaoListaNfse() {
  const res = await nfseService.listar({ limit: 50 });
  if (!res.success || !res.data) return [];
  return Array.isArray(res.data) ? res.data : [];
}

export function useEmissaoListaNfse(enabled = true) {
  return useQuery({
    queryKey: EMISSAO_LISTA_NFSE_QUERY_KEY,
    queryFn: fetchEmissaoListaNfse,
    enabled,
  });
}

export function useInvalidateEmissaoListaNfse() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EMISSAO_LISTA_NFSE_QUERY_KEY });
}
