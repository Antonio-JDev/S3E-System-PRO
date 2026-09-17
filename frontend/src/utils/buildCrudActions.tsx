import React from 'react';
import type { ActionItem } from '../components/ui/ActionsDropdown';

export type { ActionItem };

const iconClass = 'w-4 h-4';

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export interface BuildCrudActionsOptions {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Default: true se `onView` for informado */
  showView?: boolean;
  /** Default: true se `onEdit` for informado */
  showEdit?: boolean;
  /** Default: true se `onDelete` for informado */
  showDelete?: boolean;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  /** Ações extras do módulo (ex.: Histórico), inseridas entre Editar e Excluir */
  extras?: ActionItem[];
}

/**
 * Monta ações padrão Visualizar / Editar / Excluir para uso com `ActionsDropdown`.
 * Use `show*` ou omita o callback para ocultar ações conforme permissão.
 */
export function buildCrudActions(options: BuildCrudActionsOptions): ActionItem[] {
  const {
    onView,
    onEdit,
    onDelete,
    showView = Boolean(onView),
    showEdit = Boolean(onEdit),
    showDelete = Boolean(onDelete),
    viewLabel = 'Visualizar',
    editLabel = 'Editar',
    deleteLabel = 'Excluir',
    extras = [],
  } = options;

  const actions: ActionItem[] = [
    {
      label: viewLabel,
      icon: <EyeIcon className={iconClass} />,
      onClick: onView ?? (() => undefined),
      variant: 'info',
      show: showView && Boolean(onView),
    },
    {
      label: editLabel,
      icon: <PencilIcon className={iconClass} />,
      onClick: onEdit ?? (() => undefined),
      variant: 'default',
      show: showEdit && Boolean(onEdit),
    },
    ...extras,
    {
      label: deleteLabel,
      icon: <TrashIcon className={iconClass} />,
      onClick: onDelete ?? (() => undefined),
      variant: 'danger',
      show: showDelete && Boolean(onDelete),
    },
  ];

  return actions;
}
