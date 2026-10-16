import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesService, type Cliente } from '../services/clientesService';

export const CLIENTES_LISTA_QUERY_KEY = ['clientes', 'lista'] as const;

async function fetchClientesLista(): Promise<Cliente[]> {
  const response = await clientesService.listar();
  return Array.isArray(response.data) ? response.data : [];
}

export function useClientesLista() {
  return useQuery({
    queryKey: CLIENTES_LISTA_QUERY_KEY,
    queryFn: fetchClientesLista,
  });
}

export function useInvalidateClientesLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CLIENTES_LISTA_QUERY_KEY });
}
