import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  orcamentosService,
  type CreateOrcamentoData,
  type Orcamento,
  type UpdateOrcamentoData,
} from '../services/orcamentosService';

/** Key canônica — mesma do prefetch em Sidebar.tsx */
export const ORCAMENTOS_LISTA_QUERY_KEY = ['orcamentos', 'lista'] as const;

async function fetchOrcamentosLista(): Promise<Orcamento[]> {
  const res = await orcamentosService.listar();
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

export function useOrcamentosLista() {
  return useQuery({
    queryKey: ORCAMENTOS_LISTA_QUERY_KEY,
    queryFn: fetchOrcamentosLista,
  });
}

export function useInvalidateOrcamentosLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ORCAMENTOS_LISTA_QUERY_KEY });
}

export function useCriarOrcamentoMutation() {
  const invalidate = useInvalidateOrcamentosLista();
  return useMutation({
    mutationFn: (data: CreateOrcamentoData) => orcamentosService.criar(data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useAtualizarOrcamentoMutation() {
  const invalidate = useInvalidateOrcamentosLista();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrcamentoData }) =>
      orcamentosService.atualizar(id, data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useExcluirOrcamentoMutation() {
  const invalidate = useInvalidateOrcamentosLista();
  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
      orcamentosService.excluir(id, permanent ?? false),
    onSuccess: () => {
      void invalidate();
    },
  });
}
