import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteContatoS3e,
  listContatosS3e,
  updateContatoS3e,
  type ContatoS3eDto,
  type ContatosS3eListParams,
} from '../services/contatosS3eService';

export const CONTATOS_S3E_LISTA_QUERY_KEY = ['contatos-s3e', 'lista'] as const;

export type ContatosS3eListaParams = {
  search?: string;
  revisado?: 'todos' | 'sim' | 'nao';
  page?: number;
  pageSize?: number;
  orderBy?: 'recentes' | 'nome' | 'criado';
};

export function contatosS3eListaQueryKey(params: ContatosS3eListaParams) {
  return [
    ...CONTATOS_S3E_LISTA_QUERY_KEY,
    params.search ?? '',
    params.revisado ?? 'todos',
    params.page ?? 1,
    params.pageSize ?? 50,
    params.orderBy ?? 'recentes',
  ] as const;
}

export async function fetchContatosS3eLista(params: ContatosS3eListaParams = {}) {
  const resp = await listContatosS3e({
    search: params.search,
    revisado: params.revisado ?? 'todos',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    orderBy: params.orderBy ?? 'recentes',
  } as ContatosS3eListParams);
  if (!resp.success || !resp.data) {
    throw new Error(resp.error || 'Falha ao carregar contatos');
  }
  return resp.data;
}

export function useContatosS3eLista(params: ContatosS3eListaParams) {
  return useQuery({
    queryKey: contatosS3eListaQueryKey(params),
    queryFn: () => fetchContatosS3eLista(params),
  });
}

export function useInvalidateContatosS3eLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CONTATOS_S3E_LISTA_QUERY_KEY });
}

export function useAtualizarContatoS3eMutation() {
  const invalidate = useInvalidateContatosS3eLista();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateContatoS3e>[1];
    }) => updateContatoS3e(id, data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useExcluirContatoS3eMutation() {
  const invalidate = useInvalidateContatosS3eLista();
  return useMutation({
    mutationFn: (id: string) => deleteContatoS3e(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export type { ContatoS3eDto };
