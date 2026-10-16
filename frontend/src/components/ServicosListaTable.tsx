import React, { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { type Service, ServiceType } from '../types';
import { DataTable } from './data-table/DataTable';

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
const WrenchScrewdriverIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

function getTypeClass(type: ServiceType) {
  switch (type) {
    case ServiceType.Consultoria:
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800';
    case ServiceType.Instalacao:
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800';
    case ServiceType.Manutencao:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 ring-1 ring-yellow-200 dark:ring-yellow-800';
    case ServiceType.LaudoTecnico:
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700';
  }
}

function getTypeIcon(type: ServiceType) {
  switch (type) {
    case ServiceType.Consultoria:
      return '💡';
    case ServiceType.Instalacao:
      return '🔧';
    case ServiceType.Manutencao:
      return '⚙️';
    case ServiceType.LaudoTecnico:
      return '📐';
    default:
      return '🛠️';
  }
}

export type ServicosListaTableProps = {
  data: Service[];
  onView: (service: Service) => void;
  onEdit: (service: Service) => void;
  onDesativar: (service: Service) => void;
  onReativar: (service: Service) => void;
};

export function ServicosListaTable({
  data,
  onView,
  onEdit,
  onDesativar,
  onReativar,
}: ServicosListaTableProps) {
  const columns = useMemo<ColumnDef<Service, unknown>[]>(
    () => [
      {
        id: 'servico',
        accessorFn: (row) => row.name || row.nome || '',
        header: 'Serviço',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/50 dark:to-cyan-800/50">
              <WrenchScrewdriverIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {row.original.name || row.original.nome}
            </p>
          </div>
        ),
      },
      {
        id: 'codigo',
        accessorFn: (row) => row.internalCode || row.codigo || '',
        header: 'Código',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{String(getValue())}</span>
        ),
      },
      {
        id: 'tipo',
        accessorFn: (row) => row.type || row.tipo || ServiceType.Instalacao,
        header: 'Tipo',
        cell: ({ row }) => {
          const tipo = (row.original.type || row.original.tipo || ServiceType.Instalacao) as ServiceType;
          return (
            <span className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold ${getTypeClass(tipo)}`}>
              {getTypeIcon(tipo)} {tipo}
            </span>
          );
        },
      },
      {
        id: 'descricao',
        accessorFn: (row) => row.description || row.descricao || '',
        header: 'Descrição',
        cell: ({ getValue }) => (
          <p className="line-clamp-2 max-w-xs text-sm text-gray-600 dark:text-gray-400">
            {String(getValue() || 'Sem descrição')}
          </p>
        ),
      },
      {
        id: 'preco',
        accessorFn: (row) => row.price ?? row.preco ?? 0,
        header: () => <span className="block w-full text-right">Preço</span>,
        cell: ({ getValue }) => (
          <p className="text-right text-lg font-bold text-green-600 dark:text-green-400">
            R${' '}
            {Number(getValue() || 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
        ),
      },
      {
        accessorKey: 'unidade',
        header: () => <span className="block w-full text-center">Unidade</span>,
        cell: ({ getValue }) => (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">{String(getValue() || 'un')}</p>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => (row.ativo !== false ? 1 : 0),
        header: () => <span className="block w-full text-center">Status</span>,
        cell: ({ row }) => {
          const isAtivo = row.original.ativo !== false && row.original.ativo !== undefined;
          return (
            <div className="flex justify-center">
              {isAtivo ? (
                <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800">
                  ✅ Ativo
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-800 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800">
                  ❌ Inativo
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'acoes',
        enableSorting: false,
        header: () => <span className="block w-full text-center">Ações</span>,
        cell: ({ row }) => {
          const service = row.original;
          const isAtivo = service.ativo !== false && service.ativo !== undefined;
          return (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onView(service)}
                className="rounded-lg bg-blue-100 p-2 text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
                title="Visualizar"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(service)}
                className="rounded-lg bg-cyan-100 p-2 text-cyan-700 transition-colors hover:bg-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:hover:bg-cyan-900/70"
                title="Editar"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              {isAtivo ? (
                <button
                  type="button"
                  onClick={() => onDesativar(service)}
                  className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
                  title="Desativar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onReativar(service)}
                  className="rounded-lg bg-green-100 p-2 text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"
                  title="Ativar"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [onDesativar, onEdit, onReativar, onView]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      <DataTable
        columns={columns}
        data={data}
        hideSearchInput
        pageSize={20}
        emptyMessage="Nenhum serviço encontrado"
        tableClassName="min-w-full"
      />
    </div>
  );
}

export default ServicosListaTable;
