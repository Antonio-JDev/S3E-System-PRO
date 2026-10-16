import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosApiService } from '../services/axiosApi';

export const FERRAMENTAS_LISTA_QUERY_KEY = ['ferramentas', 'lista'] as const;
export const FERRAMENTAS_HUB_QUERY_KEY = ['ferramentas', 'hub'] as const;

export async function fetchFerramentasHub() {
  const [ferramentasRes, kitsRes, usuariosRes, estatisticasRes] = await Promise.all([
    axiosApiService.get('/api/ferramentas'),
    axiosApiService.get('/api/kits-ferramenta'),
    axiosApiService.get('/api/configuracoes/usuarios'),
    axiosApiService.get('/api/ferramentas/estatisticas'),
  ]);

  return {
    ferramentas:
      ferramentasRes.success && ferramentasRes.data
        ? Array.isArray(ferramentasRes.data)
          ? ferramentasRes.data
          : []
        : [],
    kits: kitsRes.success && kitsRes.data ? (Array.isArray(kitsRes.data) ? kitsRes.data : []) : [],
    eletricistas:
      usuariosRes.success && usuariosRes.data
        ? Array.isArray(usuariosRes.data)
          ? usuariosRes.data
          : []
        : [],
    estatisticas: estatisticasRes.success ? estatisticasRes.data : null,
  };
}

export function useFerramentasHub() {
  return useQuery({
    queryKey: FERRAMENTAS_HUB_QUERY_KEY,
    queryFn: fetchFerramentasHub,
  });
}

export function useInvalidateFerramentas() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: FERRAMENTAS_LISTA_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: FERRAMENTAS_HUB_QUERY_KEY });
  };
}
