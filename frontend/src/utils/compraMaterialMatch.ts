export type MatchTipoCompra =
  | 'EAN'
  | 'CODIGO_FORNECEDOR'
  | 'ALIAS_NOME'
  | 'HISTORICO_COMPRA'
  | 'NOME_MATERIAL'
  | 'MANUAL';

const MOTIVO_MATCH: Record<string, string> = {
  EAN: 'código de barras',
  CODIGO_FORNECEDOR: 'código do fornecedor',
  ALIAS_NOME: 'vínculo já cadastrado',
  HISTORICO_COMPRA: 'compra anterior',
  NOME_MATERIAL: 'nome parecido',
};

export function classificacaoVaiParaEstoque(classificacao?: string | null): boolean {
  const cls = (classificacao || 'COMPOSICAO_ESTOQUE').toUpperCase();
  return cls === 'COMPOSICAO_ESTOQUE' || cls === 'LIMPEZA_INSUMOS' || cls === 'ESCRITORIO_INSUMOS';
}

export function itemPrecisaVinculoEstoque(item: {
  materialId?: string;
  criarNovoMaterial?: boolean;
}): boolean {
  return !item.materialId && !item.criarNovoMaterial;
}

export function rotuloVinculoItem(item: {
  materialId?: string;
  materialVinculado?: { nome?: string } | null;
  matchAutomatico?: boolean;
  matchTipo?: string | null;
  criarNovoMaterial?: boolean;
}): { texto: string; tom: 'ok' | 'sugestao' | 'pendente' | 'novo' } {
  const nome = item.materialVinculado?.nome;
  if (item.criarNovoMaterial && !item.materialId) {
    return { texto: '🆕 Será cadastrado como item novo no estoque', tom: 'novo' };
  }
  if (item.materialId && nome && !item.matchAutomatico) {
    return { texto: `✅ Vinculado: ${nome}`, tom: 'ok' };
  }
  if (item.matchAutomatico && nome && item.matchTipo === 'NOME_MATERIAL') {
    return { texto: `⚠️ Sugestão por nome: ${nome} (confira)`, tom: 'sugestao' };
  }
  if (item.matchAutomatico && nome) {
    const motivo = MOTIVO_MATCH[item.matchTipo || ''] || 'automático';
    return { texto: `✅ Vinculado automaticamente (${motivo}): ${nome}`, tom: 'ok' };
  }
  if (item.materialId && nome) {
    return { texto: `✅ Vinculado: ${nome}`, tom: 'ok' };
  }
  return { texto: '⚠️ Precisa vincular ao estoque', tom: 'pendente' };
}

export function classesTomVinculo(tom: 'ok' | 'sugestao' | 'pendente' | 'novo'): string {
  if (tom === 'ok') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  if (tom === 'sugestao') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
  if (tom === 'novo') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
  return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
}
