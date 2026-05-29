import type { ComposicaoDisponibilidadeData } from '../components/KitComposicaoDisponibilidadeModal';

export type ItemFaltaCompra = {
  productName: string;
  quantity: number;
  materialId?: string;
};

export type LinhaBomCompra = {
  item: {
    id: string;
    tipo?: string;
    quantidade?: number;
    kitId?: string;
    cotacao?: { nome?: string; ncm?: string };
    cotacaoId?: string;
    material?: { id?: string; nome?: string; estoque?: number };
    kit?: { nome?: string };
    descricao?: string;
    servico?: unknown;
    materialVinculadoId?: string;
    vendaDiretaFornecedor?: boolean;
  };
  kitExpanded?: boolean;
};

/** Agrega faltantes de kits (API profunda) + linhas BOM para compra avulsa da OS. */
export function agregarItensFaltantesParaCompra(
  kitDispCache: Record<string, ComposicaoDisponibilidadeData>,
  itensParaExibicao: LinhaBomCompra[],
  opts: {
    vinculacoesBancoFrio: Record<string, string>;
    materiaisEstoque: Array<{ id: string; estoque?: number; nome?: string }>;
  },
): ItemFaltaCompra[] {
  const agregados = new Map<string, ItemFaltaCompra>();

  const addFalta = (nome: string, qtd: number, materialId?: string) => {
    if (!nome || qtd <= 0) return;
    const key = materialId || nome;
    const atual = agregados.get(key);
    if (atual) {
      atual.quantity += qtd;
    } else {
      agregados.set(key, { productName: nome, quantity: qtd, materialId });
    }
  };

  Object.values(kitDispCache).forEach((k) => {
    k.faltantes.forEach((f) => {
      if (f.tipo === 'SERVICO' || f.precisaVincularBancoFrio) return;
      const falta = Math.max(0, Number(f.necessario) - Number(f.disponivel));
      if (falta <= 0 && !f.precisaComprar) return;
      addFalta(f.nome, falta > 0 ? falta : Number(f.necessario), f.materialId || undefined);
    });
  });

  itensParaExibicao.forEach((row) => {
    const item = row.item;
    const isServico = (item.tipo || '').toUpperCase() === 'SERVICO' || !!item.servico;
    if (isServico || !!item.vendaDiretaFornecedor) return;

    const quantidadeNecessaria = Number(item.quantidade ?? 0);
    if (quantidadeNecessaria <= 0) return;

    const isKitCatalogo = !!item.kitId && !row.kitExpanded;
    if (isKitCatalogo) return;

    const isBancoFrio =
      (item.tipo || '').toUpperCase() === 'COTACAO' || !!item.cotacao || !!item.cotacaoId;
    const materialVinculadoId = opts.vinculacoesBancoFrio[item.id] || item.materialVinculadoId;
    if (isBancoFrio && !materialVinculadoId) {
      addFalta(
        item.material?.nome || item.cotacao?.nome || item.descricao || 'Item',
        quantidadeNecessaria,
      );
      return;
    }
    const materialVinculado = materialVinculadoId
      ? opts.materiaisEstoque.find((m) => m.id === materialVinculadoId)
      : null;
    const estoqueDisponivel = materialVinculado
      ? Number(materialVinculado.estoque ?? 0)
      : Number(item.material?.estoque ?? 0);
    if (estoqueDisponivel < quantidadeNecessaria) {
      addFalta(
        item.material?.nome || item.kit?.nome || item.cotacao?.nome || item.descricao || 'Item',
        quantidadeNecessaria - estoqueDisponivel,
        materialVinculadoId || item.material?.id,
      );
    }
  });

  return Array.from(agregados.values());
}

export function montarPresetCompraAvulsaOs(params: {
  projetoId: string;
  projetoTitulo: string;
  clienteNome?: string;
  numeroSequencial?: number;
  items: ItemFaltaCompra[];
}) {
  const label = `OS-${params.numeroSequencial ?? '?'} · ${params.projetoTitulo}${
    params.clienteNome ? ` · ${params.clienteNome}` : ''
  }`;
  return {
    destinoTipo: 'PROJETO' as const,
    projetoId: params.projetoId,
    projetoLabel: label,
    items: params.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
      unitCost: 0,
      materialId: it.materialId,
      destinoEstoque: false,
    })),
  };
}
