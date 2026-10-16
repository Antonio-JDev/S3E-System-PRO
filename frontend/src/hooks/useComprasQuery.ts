import { useQuery, useQueryClient } from '@tanstack/react-query';
import { comprasService } from '../services/comprasService';

export const COMPRAS_LISTA_QUERY_KEY = ['compras', 'lista'] as const;

export async function fetchComprasLista() {
  return comprasService.getCompras();
}

export function useComprasLista() {
  return useQuery({
    queryKey: COMPRAS_LISTA_QUERY_KEY,
    queryFn: fetchComprasLista,
  });
}

export function useInvalidateComprasLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: COMPRAS_LISTA_QUERY_KEY });
}
