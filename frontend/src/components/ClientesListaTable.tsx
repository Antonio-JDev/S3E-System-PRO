import React, { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Cliente } from '../services/clientesService';
import { DataTable } from './data-table/DataTable';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

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
const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export type ClientesListaTableProps = {
  data: Cliente[];
  onView: (cliente: Cliente) => void;
  onEdit: (cliente: Cliente) => void;
  onDesativar: (cliente: Cliente) => void;
  onReativar: (cliente: Cliente) => void;
};

export function ClientesListaTable({
  data,
  onView,
  onEdit,
  onDesativar,
  onReativar,
}: ClientesListaTableProps) {
  const columns = useMemo<ColumnDef<Cliente, unknown>[]>(
    () => [
      {
        id: 'cliente',
        accessorFn: (row) => `${row.nome} ${row.email || ''}`,
        header: 'Cliente',
        cell: ({ row }) => (
          <div className={!row.original.ativo ? 'opacity-60' : undefined}>
            <p className="font-semibold text-gray-900 dark:text-dark-text">{row.original.nome}</p>
            {row.original.email ? (
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{row.original.email}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'cpfCnpj',
        header: 'CPF/CNPJ',
        cell: ({ getValue }) => (
          <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-dark-card dark:text-dark-text-secondary">
            {String(getValue() ?? '')}
          </span>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <span
            className={
              row.original.tipo === 'PF'
                ? 'badge-type bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'badge-type'
            }
          >
            {row.original.tipo === 'PF' ? '👤 PF' : '🏢 PJ'}
          </span>
        ),
      },
      {
        accessorKey: 'telefone',
        header: 'Contato',
        cell: ({ getValue }) => (
          <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{String(getValue() || '-')}</p>
        ),
      },
      {
        accessorKey: 'cidade',
        header: 'Cidade',
        cell: ({ getValue }) => (
          <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{String(getValue() || '-')}</p>
        ),
      },
      {
        accessorKey: 'ativo',
        header: () => <span className="block w-full text-center">Status</span>,
        cell: ({ row }) => (
          <div className="text-center">
            <span className={row.original.ativo ? 'badge-status-active' : 'badge-status-inactive'}>
              {row.original.ativo ? '✅ Ativo' : '❌ Inativo'}
            </span>
          </div>
        ),
      },
      {
        id: 'acoes',
        enableSorting: false,
        header: () => <span className="block w-full text-center">Ações</span>,
        cell: ({ row }) => {
          const cliente = row.original;
          return (
            <ScrollableRow className="justify-center gap-2">
              <button
                type="button"
                onClick={() => onView(cliente)}
                className={`${scrollableNavItemClasses} btn-action-edit rounded-lg p-2`}
                title="Visualizar"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(cliente)}
                className={`${scrollableNavItemClasses} rounded-lg bg-yellow-100 p-2 text-yellow-700 transition-colors hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50`}
                title="Editar"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              {cliente.ativo ? (
                <button
                  type="button"
                  onClick={() => onDesativar(cliente)}
                  className={`${scrollableNavItemClasses} btn-action-delete rounded-lg p-2`}
                  title="Desativar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onReativar(cliente)}
                  className={`${scrollableNavItemClasses} rounded-lg bg-green-100 p-2 text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50`}
                  title="Reativar"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              )}
            </ScrollableRow>
          );
        },
      },
    ],
    [onDesativar, onEdit, onReativar, onView]
  );

  return (
    <div className="card-primary overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        hideSearchInput
        pageSize={20}
        emptyMessage="Nenhum cliente encontrado"
        tableClassName="min-w-full"
      />
    </div>
  );
}

export default ClientesListaTable;
