/**
 * Expansão hierárquica de kits (catálogo / unificado) na BOM da OS — até 4 camadas.
 */

export type BomKitExpandRow = {
  item: Record<string, unknown>;
  isSubItem: boolean;
  parentKit?: Record<string, unknown>;
  isFirstSubItem?: boolean;
  itensDoKitIndex?: number;
  expandKey?: string;
};

export function buildKitExpandKey(parentOrcamentoItemId: string, kitId: string): string {
  return `${parentOrcamentoItemId}::kit::${kitId}`;
}

export function parseItensFaltantesKit(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Monta itensDoKit plano a partir do objeto kit do Prisma (items + itensFaltantes). */
export function flattenKitEntityToComposicao(kit: any, rootKitId: string): any[] {
  if (!kit) return [];
  const out: any[] = [];

  for (const extra of parseItensFaltantesKit(kit.itensFaltantes)) {
    const tipo = String(extra?.tipo || 'COTACAO').toUpperCase();
    out.push({
      tipo: tipo === 'SERVICO' ? 'SERVICO' : 'COTACAO',
      nome: extra?.nome || extra?.materialNome || 'Item extra',
      quantidade: Number(extra?.quantidade ?? 1),
      parentKitId: rootKitId,
      cotacaoId: extra?.cotacaoId,
      servicoId: extra?.servicoId,
      codigo: extra?.codigo,
      ncm: extra?.ncm,
      materialVinculadoId: extra?.materialVinculadoId,
    });
  }

  for (const ki of kit.items || []) {
    const qtd = Number(ki.quantidade ?? 1);
    if (ki.material?.id || ki.materialId) {
      const mat = ki.material || {};
      out.push({
        tipo: 'MATERIAL',
        nome: mat.nome || 'Material',
        quantidade: qtd,
        parentKitId: rootKitId,
        materialId: ki.materialId || mat.id,
        codigo: mat.sku,
        ncm: mat.ncm,
      });
      continue;
    }
    const filhoId = ki.kitFilho?.id || ki.kitFilhoId;
    if (filhoId) {
      out.push({
        tipo: 'KIT',
        nome: ki.kitFilho?.nome || 'Kit filho',
        quantidade: qtd,
        kitId: filhoId,
        parentKitId: rootKitId,
      });
      const sub = flattenKitEntityToComposicao(ki.kitFilho || { id: filhoId }, filhoId);
      for (const s of sub) {
        out.push({
          ...s,
          parentKitId: s.parentKitId || filhoId,
          quantidade: Number(s.quantidade ?? 1) * qtd,
        });
      }
    }
  }

  return out;
}

export function parseKitIdFromExpandKey(key: string): string | null {
  const marker = '::kit::';
  const idx = key.indexOf(marker);
  if (idx === -1) return null;
  const kitId = key.slice(idx + marker.length);
  return kitId || null;
}

export function resolveComposicaoCatalogoKit(
  sub: any,
  subKitId: string,
  itensOrcamento: any[],
  composicaoCache?: Record<string, any[]>,
): any[] {
  if (Array.isArray(sub?.itensDoKit) && sub.itensDoKit.length > 0) {
    return sub.itensDoKit;
  }
  if (composicaoCache?.[subKitId]?.length) {
    return composicaoCache[subKitId];
  }
  if (sub?.kit) {
    return flattenKitEntityToComposicao(sub.kit, subKitId);
  }
  const linhaCatalogo = itensOrcamento.find((x) => x?.kitId === subKitId);
  if (linhaCatalogo) {
    if (Array.isArray(linhaCatalogo.itensDoKit) && linhaCatalogo.itensDoKit.length > 0) {
      return linhaCatalogo.itensDoKit;
    }
    if (linhaCatalogo.kit) {
      return flattenKitEntityToComposicao(linhaCatalogo.kit, subKitId);
    }
  }
  return [];
}

export type ExpandItensDoKitParams = {
  composicao: any[];
  rootKitId: string;
  parentOrcamentoItem: Record<string, unknown>;
  parentKitForRows: Record<string, unknown>;
  qtdKitMult: number;
  kitsDesunificados: Set<string>;
  materiaisEstoque: Array<{ id: string; estoque?: number; nome?: string; sku?: string; ncm?: string }>;
  idPrefix: string;
  maxDepth?: number;
};

export function expandItensDoKitHierarquia(params: ExpandItensDoKitParams): BomKitExpandRow[] {
  const {
    composicao,
    rootKitId,
    parentOrcamentoItem,
    parentKitForRows,
    qtdKitMult,
    kitsDesunificados,
    materiaisEstoque,
    idPrefix,
    maxDepth = 4,
  } = params;

  const resultado: BomKitExpandRow[] = [];
  const parentId = String(parentOrcamentoItem.id ?? 'parent');

  const byParent = composicao.reduce((acc: Record<string, any[]>, sub: any, idx: number) => {
    const p = String(sub.parentKitId || rootKitId || '__root__');
    acc[p] = acc[p] || [];
    acc[p].push({ ...sub, __idx: idx });
    return acc;
  }, {});

  const pushNode = (parentKitId: string, depth: number) => {
    const arr = byParent[parentKitId] || [];
    for (let i = 0; i < arr.length; i++) {
      const sub = arr[i];
      const tipo = String(sub.tipo || '').toUpperCase();
      const ehKit = tipo === 'KIT' && !!sub.kitId;
      const ehServico = tipo === 'SERVICO' || !!sub.servicoId;
      const isBancoFrio = tipo === 'COTACAO' || !!sub.cotacaoId;

      const materialRef = sub.materialId
        ? materiaisEstoque.find((m) => m.id === sub.materialId)
        : null;
      const syntheticId = `${idPrefix}-node-${parentKitId}-${i}-${sub.kitId || sub.materialId || sub.cotacaoId || sub.servicoId || 'x'}`;
      const expandKey = ehKit ? buildKitExpandKey(parentId, String(sub.kitId)) : undefined;

      const virtualItem: Record<string, unknown> = {
        id: syntheticId,
        quantidade: Number(sub.quantidade ?? 0) * qtdKitMult,
        subtotal: (sub.subtotal ?? (sub.valorVenda ?? 0) * (sub.quantidade ?? 0)) * qtdKitMult,
        tipo: ehKit ? 'KIT' : ehServico ? 'SERVICO' : materialRef ? 'MATERIAL' : isBancoFrio ? 'COTACAO' : 'MATERIAL',
        descricao: sub.nome || sub.descricao || 'Item',
        material: materialRef || undefined,
        materialVinculadoId: sub.materialVinculadoId || null,
        cotacao: isBancoFrio
          ? { id: sub.cotacaoId, nome: sub.nome, ncm: sub.ncm || sub.codigo || undefined }
          : undefined,
        cotacaoId: sub.cotacaoId || undefined,
        servico: ehServico ? { nome: sub.nome } : undefined,
        servicoId: sub.servicoId || undefined,
        codigo: sub.codigo || sub.sku,
        kitId: sub.kitId || undefined,
        kit: ehKit ? { id: sub.kitId, nome: sub.nome } : undefined,
      };

      resultado.push({
        item: virtualItem,
        isSubItem: true,
        parentKit: parentKitForRows,
        isFirstSubItem: false,
        itensDoKitIndex: sub.__idx,
        expandKey,
      });

      if (ehKit && expandKey && kitsDesunificados.has(expandKey) && depth < maxDepth) {
        pushNode(String(sub.kitId), depth + 1);
      }
    }
  };

  pushNode(String(rootKitId), 0);
  return resultado;
}

export function createVirtualCatalogKitHeader(params: {
  parentItemId: string;
  sub: any;
  subKitId: string;
  qtdKitMult: number;
  itensDoKit?: any[];
}): { item: Record<string, unknown>; expandKey: string } {
  const { parentItemId, sub, subKitId, qtdKitMult, itensDoKit } = params;
  const expandKey = buildKitExpandKey(parentItemId, subKitId);
  const qtdSub = (Number(sub.quantidade) || 1) * qtdKitMult;
  return {
    expandKey,
    item: {
      id: `${parentItemId}-sub-kit-${subKitId}`,
      kitId: subKitId,
      kit: { id: subKitId, nome: sub.nome },
      quantidade: qtdSub,
      subtotal: (sub.subtotal ?? (sub.valorVenda ?? 0) * (sub.quantidade ?? 1)) * qtdKitMult,
      tipo: 'KIT',
      descricao: sub.nome || sub.descricao || 'Kit do catálogo',
      itensDoKit: itensDoKit?.length ? itensDoKit : undefined,
    },
  };
}
