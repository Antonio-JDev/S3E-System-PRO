import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { roundMoney } from '../utils/currency';
import { kitTemCotacaoBancoFrio } from '../utils/kitCatalogFlags';

export const CATALOGO_KITS_QUERY_KEY = ['catalogo', 'kits'] as const;

export type CatalogoKitItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type: 'Kit';
  createdAt: string;
  updatedAt: string;
  temItensCotacao?: boolean;
  itensFaltantes?: unknown[];
  statusEstoque?: string;
  isActive?: boolean;
};

export async function fetchCatalogoKits(): Promise<CatalogoKitItem[]> {
  const kitsResponse = await axiosApiService.get(ENDPOINTS.KITS);
  if (!kitsResponse.success || !kitsResponse.data) return [];

  const kits = Array.isArray(kitsResponse.data) ? kitsResponse.data : [];
  return kits.map((kit: any) => {
    let precoTotal = 0;
    if (kit.items && Array.isArray(kit.items)) {
      kit.items.forEach((item: any) => {
        const precoVenda = item.material?.valorVenda || item.material?.preco || 0;
        precoTotal += (item.quantidade || 0) * precoVenda;
      });
    }
    if (kit.itensFaltantes && Array.isArray(kit.itensFaltantes)) {
      kit.itensFaltantes.forEach((item: any) => {
        const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
        precoTotal += precoUnit * (item.quantidade || 0);
      });
    }
    const precoFinal = roundMoney(precoTotal > 0 ? precoTotal : kit.preco || 0);
    return {
      id: kit.id,
      name: kit.nome,
      description: kit.descricao || 'Kit sem descrição',
      price: precoFinal,
      category: kit.tipo || 'Kit',
      type: 'Kit' as const,
      createdAt: kit.createdAt || new Date().toISOString(),
      updatedAt: kit.updatedAt || new Date().toISOString(),
      temItensCotacao: kitTemCotacaoBancoFrio(kit),
      itensFaltantes: kit.itensFaltantes || [],
      statusEstoque: kit.statusEstoque || 'COMPLETO',
      isActive: kit.ativo !== false,
    };
  });
}

export function useCatalogoKits() {
  return useQuery({
    queryKey: CATALOGO_KITS_QUERY_KEY,
    queryFn: fetchCatalogoKits,
  });
}

export function useInvalidateCatalogoKits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CATALOGO_KITS_QUERY_KEY });
}
