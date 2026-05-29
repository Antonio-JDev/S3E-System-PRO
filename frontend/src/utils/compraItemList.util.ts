/** Campos editáveis de um item na listagem da compra */
export type CompraItemEditDraft = {
  productName: string;
  quantity: string;
  unitCost: string;
  ncm: string;
  sku: string;
  unidadeMedida: string;
};

export type CompraItemComTotais = {
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  ncm?: string;
  sku?: string;
  unidadeMedida?: string;
};

export function itemParaDraft(item: CompraItemComTotais): CompraItemEditDraft {
  return {
    productName: item.productName || '',
    quantity: String(item.quantity ?? ''),
    unitCost: String(item.unitCost ?? ''),
    ncm: item.ncm || '',
    sku: item.sku || '',
    unidadeMedida: item.unidadeMedida || 'un'
  };
}

export function aplicarDraftNoItem<T extends CompraItemComTotais>(
  item: T,
  draft: CompraItemEditDraft
): T | null {
  const productName = draft.productName.trim();
  const quantity = parseFloat(draft.quantity);
  const unitCost = parseFloat(draft.unitCost);

  if (!productName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
    return null;
  }

  return {
    ...item,
    productName,
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    ncm: draft.ncm.trim() || undefined,
    sku: draft.sku.trim() || undefined,
    unidadeMedida: draft.unidadeMedida || 'un'
  };
}

export function atualizarCampoNumericoItem<T extends CompraItemComTotais>(
  item: T,
  campo: 'quantity' | 'unitCost',
  valor: string
): T | null {
  if (valor === '') return null;
  const parsed = parseDecimalInput(valor);
  if (parsed === null) return null;
  if (campo === 'quantity' && parsed <= 0) return null;
  if (campo === 'unitCost' && parsed < 0) return null;

  const quantity = campo === 'quantity' ? parsed : item.quantity;
  const unitCost = campo === 'unitCost' ? parsed : item.unitCost;
  return {
    ...item,
    quantity,
    unitCost,
    totalCost: quantity * unitCost
  };
}

/** Converte texto digitado (aceita vírgula) em número decimal */
export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Confirma rascunho inline de qtd/valor unitário ao sair do campo */
export function commitInlineNumericDraft<T extends CompraItemComTotais>(
  item: T,
  draft: { quantity: string; unitCost: string }
): T | null {
  const quantity = parseDecimalInput(draft.quantity);
  const unitCost = parseDecimalInput(draft.unitCost);
  if (quantity === null || quantity <= 0 || unitCost === null || unitCost < 0) {
    return null;
  }
  return {
    ...item,
    quantity,
    unitCost,
    totalCost: quantity * unitCost
  };
}

export function getInlineNumericDisplay(
  field: 'quantity' | 'unitCost',
  item: CompraItemComTotais,
  inlineDraft?: { quantity: string; unitCost: string },
  rowEditDraft?: CompraItemEditDraft | null,
  isRowEditing?: boolean
): string {
  if (inlineDraft) {
    return inlineDraft[field];
  }
  if (isRowEditing && rowEditDraft) {
    return field === 'quantity' ? rowEditDraft.quantity : rowEditDraft.unitCost;
  }
  const val = field === 'quantity' ? item.quantity : item.unitCost;
  return val === undefined || val === null ? '' : String(val);
}

/** Reindexa rascunhos inline após remover um item da lista */
export function reindexInlineNumericDraftAfterRemove(
  draft: Record<number, { quantity: string; unitCost: string }>,
  removedIndex: number
): Record<number, { quantity: string; unitCost: string }> {
  const next: Record<number, { quantity: string; unitCost: string }> = {};
  Object.entries(draft).forEach(([key, val]) => {
    const i = Number(key);
    if (i < removedIndex) next[i] = val;
    else if (i > removedIndex) next[i - 1] = val;
  });
  return next;
}
