/** Move um elemento do índice `from` para `to` (inserção na posição de destino). */
export function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
    if (from === to) return list;
    if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/**
 * Remapeia um índice após mover o item em `from` para `to`.
 * Útil para estados baseados em índice (seleção, edição em curso, etc.).
 */
export function remapIndexAfterMove(index: number, from: number, to: number): number {
    if (index === from) return to;
    if (from < to) {
        if (index > from && index <= to) return index - 1;
    } else if (from > to) {
        if (index >= to && index < from) return index + 1;
    }
    return index;
}

export function remapIndexSetAfterMove(indices: Set<number>, from: number, to: number): Set<number> {
    if (from === to) return indices;
    const next = new Set<number>();
    indices.forEach((idx) => next.add(remapIndexAfterMove(idx, from, to)));
    return next;
}

export function remapIndexRecordAfterMove<T>(
    record: Record<number, T>,
    from: number,
    to: number
): Record<number, T> {
    if (from === to) return record;
    const next: Record<number, T> = {};
    Object.entries(record).forEach(([key, value]) => {
        const idx = Number(key);
        if (Number.isNaN(idx)) return;
        next[remapIndexAfterMove(idx, from, to)] = value;
    });
    return next;
}
