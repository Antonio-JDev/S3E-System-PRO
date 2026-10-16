import { useQuery, useQueryClient } from '@tanstack/react-query';
import { atendimentoCrmService } from '../services/atendimentoCrmService';
import { axiosApiService } from '../services/axiosApi';

export const FUNIL_LEADS_QUERY_KEY = ['funil-atendimento', 'leads'] as const;
export const FUNIL_USUARIOS_QUERY_KEY = ['funil-atendimento', 'usuarios'] as const;

export async function fetchFunilLeads() {
  const res = await atendimentoCrmService.listar();
  return Array.isArray(res?.data) ? res.data : [];
}

export function useFunilLeads() {
  return useQuery({
    queryKey: FUNIL_LEADS_QUERY_KEY,
    queryFn: fetchFunilLeads,
  });
}

export function useInvalidateFunilLeads() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FUNIL_LEADS_QUERY_KEY });
}

export async function fetchFunilUsuarios() {
  const res = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data
    .filter((u) => (u.role || u.funcao || '') !== 'eletricista')
    .map((u) => ({
      id: u.id,
      nome: u.name || u.nome || u.email || 'Usuário',
      role: u.role || u.funcao || '',
    }));
}

export function useFunilUsuarios() {
  return useQuery({
    queryKey: FUNIL_USUARIOS_QUERY_KEY,
    queryFn: fetchFunilUsuarios,
  });
}
