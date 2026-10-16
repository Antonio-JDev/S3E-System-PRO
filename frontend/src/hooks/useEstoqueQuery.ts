import { useQuery, useQueryClient } from '@tanstack/react-query';
import { materiaisService, type Material } from '../services/materiaisService';
import { movimentacoesService, type Movimentacao } from '../services/movimentacoesService';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import { MovementType } from '../types';

export const ESTOQUE_ITENS_QUERY_KEY = ['estoque', 'itens'] as const;
export const ESTOQUE_MOVIMENTACOES_QUERY_KEY = ['estoque', 'movimentacoes'] as const;

export type EstoqueMaterialItem = {
  id: string;
  nome: string;
  name: string;
  sku: string;
  skuAnterior?: string;
  type: string;
  category: string;
  description: string;
  ncm?: string;
  imagemUrl?: string;
  stock: number;
  minStock: number;
  unitOfMeasure: string;
  location: string;
  price: number;
  valorVenda?: number;
  valorVendaM?: number;
  valorVendaCM?: number;
  porcentagemLucro?: number;
  percentualImposto?: string;
  supplier: { id: string; nome: string; name: string };
  supplierClassificacao?: string | null;
  quantidadePorEmbalagem?: number;
  tipoEmbalagem?: string;
  precoEmbalagem?: number;
  precoUnitario?: number;
};

export async function fetchEstoqueItens(): Promise<EstoqueMaterialItem[]> {
  const response = await materiaisService.getMateriais({ ativo: true });
  if (!response.success || !response.data) return [];

  return response.data.map((material: Material) => {
    const m = material as Material & {
      quantidadePorEmbalagem?: number;
      tipoEmbalagem?: string;
      precoEmbalagem?: number;
      precoUnitario?: number;
      skuAnterior?: string | null;
    };
    return {
      id: material.id,
      nome: material.nome || material.descricao || '',
      name: material.nome || material.descricao || '',
      sku: material.sku || material.codigo || 'N/A',
      skuAnterior: m.skuAnterior || undefined,
      type: material.tipo || material.categoria || 'Material',
      category: material.categoria || 'ELETRICO',
      description: material.descricao ?? '',
      ncm: material.ncm,
      imagemUrl: material.imagemUrl,
      stock: material.estoque ?? 0,
      minStock: material.estoqueMinimo ?? 0,
      unitOfMeasure: material.unidadeMedida || material.unidade || 'un',
      location: 'Estoque',
      price: material.preco ?? 0,
      valorVenda: material.valorVenda,
      valorVendaM: (material as any).valorVendaM,
      valorVendaCM: (material as any).valorVendaCM,
      porcentagemLucro: material.porcentagemLucro,
      percentualImposto:
        (material as any).percentualImposto != null
          ? String((material as any).percentualImposto)
          : '8',
      supplier: material.fornecedor
        ? { id: material.fornecedor.id, nome: material.fornecedor.nome, name: material.fornecedor.nome }
        : { id: '', nome: 'Sem fornecedor', name: 'Sem fornecedor' },
      supplierClassificacao: (material.fornecedor as any)?.classificacao ?? null,
      quantidadePorEmbalagem: m.quantidadePorEmbalagem,
      tipoEmbalagem: m.tipoEmbalagem,
      precoEmbalagem: m.precoEmbalagem,
      precoUnitario: m.precoUnitario,
    };
  });
}

export function useEstoqueItens() {
  return useQuery({
    queryKey: ESTOQUE_ITENS_QUERY_KEY,
    queryFn: fetchEstoqueItens,
  });
}

export function useInvalidateEstoqueItens() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ESTOQUE_ITENS_QUERY_KEY });
}

export type EstoqueMovimentacaoItem = {
  id: string;
  materialId: string;
  materialName: string;
  type: MovementType;
  quantity: number;
  reason: string;
  responsible: string;
  date: string;
  notes: string;
};

export async function fetchEstoqueMovimentacoes(): Promise<{
  movements: EstoqueMovimentacaoItem[];
  materials: Array<{
    id: string;
    name: string;
    sku: string;
    type: string;
    category: string;
    description: string;
    stock: number;
    minStock: number;
    unitOfMeasure: string;
    location: string;
    price: number;
  }>;
}> {
  const [movimentacoesResponse, materiaisResponse] = await Promise.all([
    movimentacoesService.listar(),
    axiosApiService.get(ENDPOINTS.MATERIAIS),
  ]);

  const movements: EstoqueMovimentacaoItem[] =
    movimentacoesResponse.success && movimentacoesResponse.data
      ? (Array.isArray(movimentacoesResponse.data) ? movimentacoesResponse.data : [])
          .filter((mov: Movimentacao) => mov && mov.id)
          .map((mov: Movimentacao) => ({
            id: mov.id || `mov-${Date.now()}`,
            materialId: mov.materialId || '',
            materialName: mov.material?.nome || 'Material não encontrado',
            type:
              mov.tipo === 'ENTRADA'
                ? MovementType.Entrada
                : mov.tipo === 'AJUSTE'
                  ? MovementType.Ajuste
                  : MovementType.Saida,
            quantity: mov.quantidade || 0,
            reason: mov.motivo || 'Não informado',
            responsible: 'Sistema',
            date: mov.createdAt || mov.data || new Date().toISOString(),
            notes: mov.observacoes || '',
          }))
      : [];

  const materials =
    materiaisResponse.success && materiaisResponse.data
      ? (Array.isArray(materiaisResponse.data) ? materiaisResponse.data : [])
          .filter((mat: any) => mat && mat.id)
          .map((mat: any) => ({
            id: mat.id,
            name: mat.nome || mat.name || 'Material sem nome',
            sku: mat.sku || '',
            type: mat.categoria || mat.category || mat.type || 'Outros',
            category: mat.categoria || mat.category || 'Sem categoria',
            description: mat.descricao || mat.description || '',
            stock: mat.estoque || mat.stock || 0,
            minStock: mat.estoqueMinimo || mat.minStock || 0,
            unitOfMeasure: mat.unidadeMedida || mat.unitOfMeasure || 'un',
            location: mat.localizacao || mat.location || 'Não definido',
            price: mat.preco || mat.price || 0,
          }))
      : [];

  return { movements, materials };
}

export function useEstoqueMovimentacoes() {
  return useQuery({
    queryKey: ESTOQUE_MOVIMENTACOES_QUERY_KEY,
    queryFn: fetchEstoqueMovimentacoes,
  });
}

export function useInvalidateEstoqueMovimentacoes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ESTOQUE_MOVIMENTACOES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ESTOQUE_ITENS_QUERY_KEY });
  };
}
