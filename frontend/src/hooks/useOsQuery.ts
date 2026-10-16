import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projetosService } from '../services/projetosService';
import { clientesService } from '../services/clientesService';
import { orcamentosService } from '../services/orcamentosService';
import { axiosApiService } from '../services/axiosApi';

export const OS_HUB_QUERY_KEY = ['os', 'hub'] as const;
export const OS_PROJETOS_QUERY_KEY = ['os', 'projetos'] as const;

export async function fetchOsHub() {
  const [projetosRes, clientesRes, orcamentosRes, usuariosRes] = await Promise.all([
    projetosService.listar(),
    clientesService.listar(),
    orcamentosService.listar({ status: 'Aprovado' }),
    axiosApiService.get<any[]>('/api/configuracoes/usuarios'),
  ]);

  const usuariosArray =
    usuariosRes.success && Array.isArray(usuariosRes.data)
      ? usuariosRes.data.map((u: any) => ({
          id: u.id,
          nome: u.name || u.nome || '',
          email: u.email || '',
          funcao: u.role || u.funcao || '',
          role: u.role || '',
        }))
      : [];

  const projetosArray =
    projetosRes.success && projetosRes.data
      ? (Array.isArray(projetosRes.data) ? projetosRes.data : []).map((p: any) => {
          if (p.responsavel?.nome) return p;
          const u = usuariosArray.find((x) => x.id === p.responsavelId);
          return u ? { ...p, responsavel: { id: u.id, nome: u.nome } } : p;
        })
      : [];

  return {
    projetos: projetosArray,
    clientes:
      clientesRes.success && clientesRes.data
        ? Array.isArray(clientesRes.data)
          ? clientesRes.data
          : []
        : [],
    orcamentos:
      orcamentosRes.success && orcamentosRes.data
        ? Array.isArray(orcamentosRes.data)
          ? orcamentosRes.data
          : []
        : [],
    usuarios: usuariosArray,
  };
}

export function useOsHub() {
  return useQuery({
    queryKey: OS_HUB_QUERY_KEY,
    queryFn: fetchOsHub,
  });
}

export function useInvalidateOsHub() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: OS_HUB_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: OS_PROJETOS_QUERY_KEY });
  };
}
