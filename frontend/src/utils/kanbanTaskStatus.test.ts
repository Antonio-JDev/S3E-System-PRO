import { describe, it, expect } from 'vitest';
import {
  isKanbanConcluido,
  isKanbanEmAndamento,
  kanbanStatusClass,
  labelKanbanStatus,
  normalizeKanbanStatusKey,
  toBackendKanbanStatus,
} from './kanbanTaskStatus';

describe('kanbanTaskStatus', () => {
  describe('normalizeKanbanStatusKey', () => {
    it('normaliza formatos do backend', () => {
      expect(normalizeKanbanStatusKey('ToDo')).toBe('todo');
      expect(normalizeKanbanStatusKey('Doing')).toBe('doing');
      expect(normalizeKanbanStatusKey('Done')).toBe('done');
    });

    it('normaliza rótulos em português', () => {
      expect(normalizeKanbanStatusKey('A Fazer')).toBe('todo');
      expect(normalizeKanbanStatusKey('Em Andamento')).toBe('doing');
      expect(normalizeKanbanStatusKey('Concluído')).toBe('done');
    });
  });

  describe('labelKanbanStatus', () => {
    it('retorna rótulo legível', () => {
      expect(labelKanbanStatus('Doing')).toBe('Em Andamento');
      expect(labelKanbanStatus('Done')).toBe('Concluído');
      expect(labelKanbanStatus('ToDo')).toBe('A Fazer');
    });
  });

  describe('toBackendKanbanStatus', () => {
    it('converte para ToDo/Doing/Done', () => {
      expect(toBackendKanbanStatus('Em Andamento')).toBe('Doing');
      expect(toBackendKanbanStatus('Concluído')).toBe('Done');
      expect(toBackendKanbanStatus('A Fazer')).toBe('ToDo');
    });
  });

  describe('flags de status', () => {
    it('detecta concluída e em andamento', () => {
      expect(isKanbanConcluido('Done')).toBe(true);
      expect(isKanbanConcluido('Concluído')).toBe(true);
      expect(isKanbanEmAndamento('Doing')).toBe(true);
      expect(isKanbanConcluido('ToDo')).toBe(false);
    });
  });

  describe('kanbanStatusClass', () => {
    it('aplica classes por status', () => {
      expect(kanbanStatusClass('Done')).toContain('emerald');
      expect(kanbanStatusClass('Doing')).toContain('amber');
      expect(kanbanStatusClass('ToDo')).toContain('gray');
    });
  });
});
