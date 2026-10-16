import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Service, type ServiceType } from '../types';
import {
  servicosService,
  type CreateServicoData,
  type Servico,
  type UpdateServicoData,
} from '../services/servicosService';

/** Key canônica — mesma do prefetch em Sidebar.tsx */
export const SERVICOS_LISTA_QUERY_KEY = ['servicos', 'lista'] as const;

function mapServicoToService(serv: Servico): Service {
  return {
    ...serv,
    name: serv.nome,
    internalCode: serv.codigo,
    description: serv.descricao || '',
    type: serv.tipo as ServiceType,
    price: serv.preco,
    ativo: serv.ativo !== undefined ? serv.ativo : true,
  };
}

export async function fetchServicosLista(): Promise<Service[]> {
  const response = await servicosService.listar();
  if (!response.success || !response.data) return [];
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(mapServicoToService);
}

export function useServicosLista() {
  return useQuery({
    queryKey: SERVICOS_LISTA_QUERY_KEY,
    queryFn: fetchServicosLista,
  });
}

export function useInvalidateServicosLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SERVICOS_LISTA_QUERY_KEY });
}

export function useCriarServicoMutation() {
  const invalidate = useInvalidateServicosLista();
  return useMutation({
    mutationFn: (data: CreateServicoData) => servicosService.criar(data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useAtualizarServicoMutation() {
  const invalidate = useInvalidateServicosLista();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServicoData }) =>
      servicosService.atualizar(id, data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useDesativarServicoMutation() {
  const invalidate = useInvalidateServicosLista();
  return useMutation({
    mutationFn: (id: string) => servicosService.desativar(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useReativarServicoMutation() {
  const invalidate = useInvalidateServicosLista();
  return useMutation({
    mutationFn: (id: string) => servicosService.reativar(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}
