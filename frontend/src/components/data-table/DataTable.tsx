import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '@/lib/utils';

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  /** Filtro global controlado (ex.: busca já existente na página) */
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  pageSize?: number;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
  /** Esconde o input interno quando a busca vem de fora */
  hideSearchInput?: boolean;
};

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Buscar…',
  globalFilter: controlledFilter,
  onGlobalFilterChange,
  pageSize = 20,
  className,
  tableClassName,
  emptyMessage = 'Nenhum registro encontrado',
  hideSearchInput = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalFilter, setInternalFilter] = React.useState('');
  const isControlled = controlledFilter !== undefined;
  const globalFilter = isControlled ? controlledFilter : internalFilter;

  const setGlobalFilter = (value: string) => {
    if (isControlled) {
      onGlobalFilterChange?.(value);
    } else {
      setInternalFilter(value);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  const showSearch = !hideSearchInput && (searchPlaceholder != null || !isControlled);

  return (
    <div className={cn('space-y-3', className)}>
      {showSearch ? (
        <div className="flex items-center gap-2 px-1">
          <input
            type="search"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-field w-full max-w-sm text-sm"
            aria-label="Busca global na tabela"
          />
        </div>
      ) : null}

      <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
        <Table className={cn('w-full', tableClassName)}>
          <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 dark:from-dark-elevated dark:to-dark-card dark:border-dark-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-0">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'px-6 py-4 text-xs font-semibold text-gray-700 uppercase dark:text-dark-text-secondary',
                        canSort && 'cursor-pointer select-none'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? (
                          <span className="text-[10px] text-gray-400" aria-hidden>
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted() as string] ?? '↕'}
                          </span>
                        ) : null}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-dark-border">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-gray-600 dark:text-dark-text-secondary">
        <span>
          {table.getFilteredRowModel().rows.length} registro(s)
          {table.getPageCount() > 1
            ? ` · página ${table.getState().pagination.pageIndex + 1} de ${table.getPageCount()}`
            : ''}
        </span>
        {table.getPageCount() > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Próxima
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
