import { describe, expect, it, vi } from 'vitest';
import { buildCrudActions } from './buildCrudActions';

describe('buildCrudActions', () => {
  it('monta Visualizar, Editar e Excluir com variants corretas', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const actions = buildCrudActions({ onView, onEdit, onDelete });
    const visible = actions.filter((a) => a.show !== false);

    expect(visible.map((a) => a.label)).toEqual(['Visualizar', 'Editar', 'Excluir']);
    expect(visible[0].variant).toBe('info');
    expect(visible[2].variant).toBe('danger');
  });

  it('respeita show* e labels customizados', () => {
    const actions = buildCrudActions({
      onView: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      showEdit: false,
      deleteLabel: 'Desativar',
    });
    const visible = actions.filter((a) => a.show !== false);

    expect(visible.map((a) => a.label)).toEqual(['Visualizar', 'Desativar']);
  });

  it('insere extras entre Editar e Excluir', () => {
    const actions = buildCrudActions({
      onView: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      extras: [{ label: 'Histórico', onClick: vi.fn(), variant: 'info' }],
    });
    const visible = actions.filter((a) => a.show !== false);

    expect(visible.map((a) => a.label)).toEqual([
      'Visualizar',
      'Editar',
      'Histórico',
      'Excluir',
    ]);
  });
});
