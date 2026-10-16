import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService, type DashboardCompleto } from '../services/dashboardService';

/** Key canônica — mesma do prefetch em Sidebar.tsx */
export const DASHBOARD_COMPLETO_QUERY_KEY = ['dashboard', 'completo'] as const;

async function fetchDashboardCompleto(): Promise<DashboardCompleto | null> {
  const result = await dashboardService.getDashboardCompleto();
  return result.data ?? null;
}

export function useDashboardCompleto(options?: { refetchIntervalMs?: number | false }) {
  return useQuery({
    queryKey: DASHBOARD_COMPLETO_QUERY_KEY,
    queryFn: fetchDashboardCompleto,
    refetchInterval: options?.refetchIntervalMs ?? false,
  });
}

export function useInvalidateDashboardCompleto() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DASHBOARD_COMPLETO_QUERY_KEY });
}
