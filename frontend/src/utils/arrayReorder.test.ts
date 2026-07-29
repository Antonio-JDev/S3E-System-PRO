import { describe, expect, it } from 'vitest';
import {
    moveArrayItem,
    remapIndexAfterMove,
    remapIndexRecordAfterMove,
    remapIndexSetAfterMove,
} from './arrayReorder';

describe('moveArrayItem', () => {
    it('move item para baixo', () => {
        expect(moveArrayItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('move item para cima', () => {
        expect(moveArrayItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('não altera quando from === to', () => {
        const list = ['a', 'b', 'c'];
        expect(moveArrayItem(list, 1, 1)).toBe(list);
    });

    it('ignora índices inválidos', () => {
        const list = ['a', 'b'];
        expect(moveArrayItem(list, -1, 1)).toBe(list);
        expect(moveArrayItem(list, 0, 5)).toBe(list);
    });
});

describe('remapIndexAfterMove', () => {
    it('acompanha o item movido', () => {
        expect(remapIndexAfterMove(0, 0, 2)).toBe(2);
        expect(remapIndexAfterMove(3, 3, 1)).toBe(1);
    });

    it('ajusta índices intermediários ao mover para baixo', () => {
        // [0,1,2,3] move 0 → 2 => [1,2,0,3]
        expect(remapIndexAfterMove(1, 0, 2)).toBe(0);
        expect(remapIndexAfterMove(2, 0, 2)).toBe(1);
        expect(remapIndexAfterMove(3, 0, 2)).toBe(3);
    });

    it('ajusta índices intermediários ao mover para cima', () => {
        // [0,1,2,3] move 3 → 1 => [0,3,1,2]
        expect(remapIndexAfterMove(1, 3, 1)).toBe(2);
        expect(remapIndexAfterMove(2, 3, 1)).toBe(3);
        expect(remapIndexAfterMove(0, 3, 1)).toBe(0);
    });
});

describe('remapIndexSetAfterMove / remapIndexRecordAfterMove', () => {
    it('remapeia seleção', () => {
        expect([...remapIndexSetAfterMove(new Set([0, 2]), 0, 2)].sort()).toEqual([1, 2]);
    });

    it('remapeia record por índice', () => {
        expect(remapIndexRecordAfterMove({ 0: 'x', 2: 'y' }, 0, 2)).toEqual({ 2: 'x', 1: 'y' });
    });
});
