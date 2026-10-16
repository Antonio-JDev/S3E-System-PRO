/** Quantidade inicial de linhas renderizadas no modal "Adicionar Item" (evita montar milhares de nós DOM). */
export const ORCAMENTO_ITEM_MODAL_PAGE_SIZE = 80;

export function sliceModalList<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  return items.slice(0, limit);
}
