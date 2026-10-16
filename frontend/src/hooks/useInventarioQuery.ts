import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventarioService, type MaterialContagem } from '../services/inventarioService';

export const INVENTARIO_MATERIAIS_QUERY_KEY = ['inventario', 'materiais'] as const;

export async function fetchInventarioMateriais(busca?: string): Promise<MaterialContagem[]> {
  const response = await inventarioService.listarMateriais(busca);
  if (!response.success || !response.data) return [];
  return Array.isArray(response.data) ? response.data : [];
}

export function useInventarioMateriais(busca?: string) {
  return useQuery({
    queryKey: [...INVENTARIO_MATERIAIS_QUERY_KEY, busca ?? ''] as const,
    queryFn: () => fetchInventarioMateriais(busca),
  });
}

export function useInvalidateInventarioMateriais() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: INVENTARIO_MATERIAIS_QUERY_KEY });
}
