import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';

export const FORNECEDORES_LISTA_QUERY_KEY = ['fornecedores', 'lista'] as const;

export async function fetchFornecedoresLista(): Promise<Fornecedor[]> {
  const response = await fornecedoresService.listar();
  if (!response.success || !response.data) return [];
  return Array.isArray(response.data) ? response.data : [];
}

export function useFornecedoresLista() {
  return useQuery({
    queryKey: FORNECEDORES_LISTA_QUERY_KEY,
    queryFn: fetchFornecedoresLista,
  });
}

export function useInvalidateFornecedoresLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FORNECEDORES_LISTA_QUERY_KEY });
}
