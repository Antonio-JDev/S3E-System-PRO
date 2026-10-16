import React, { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { Orcamento } from '../services/orcamentosService';
import { DataTable } from './data-table/DataTable';
import ActionsDropdown from './ui/ActionsDropdown';
import {
  calcularValorAReceberDoOrcamento,
  calcularValorVendaDiretaDoOrcamento,
} from '../utils/orcamentoValorAReceber';
import { roundMoney } from '../utils/currency';
import { getRegredirStatusTargets } from '../utils/orcamentoStatus';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type StatusChange =
  | 'Pendente'
  | 'Enviado ao Cliente'
  | 'Aprovado'
  | 'Recusado'
  | 'Declinado'
  | 'Cancelado';

export type OrcamentosListaTableProps = {
  data: Orcamento[];
  searchTerm: string;
  abaAtiva: string;
  pdfLoadingId: string | null;
  canDeleteRow: boolean;
  canRegredir: boolean;
  getStatusClass: (status: string) => string;
  getRowBorderClass: (statusVisual: string, abaAtiva: string) => string;
  isConcretizado: (o: Orcamento) => boolean;
  isExpirado: (o: Orcamento) => boolean;
  onView: (o: Orcamento) => void;
  onEdit: (o: Orcamento) => void;
  onWhatsApp: (o: Orcamento) => void;
  onCopy: (o: Orcamento) => void;
  onPdf: (o: Orcamento) => void;
  onRegredir: (o: Orcamento) => void;
  onChangeStatus: (id: string, status: StatusChange) => void;
  onDeclinar: (o: Orcamento) => void;
  onDeletePermanent: (o: Orcamento) => void;
};

export function OrcamentosListaTable({
  data,
  searchTerm,
  abaAtiva,
  pdfLoadingId,
  canDeleteRow,
  canRegredir,
  getStatusClass,
  getRowBorderClass,
  isConcretizado,
  isExpirado,
  onView,
  onEdit,
  onWhatsApp,
  onCopy,
  onPdf,
  onRegredir,
  onChangeStatus,
  onDeclinar,
  onDeletePermanent,
}: OrcamentosListaTableProps) {
  const columns = useMemo<ColumnDef<Orcamento, unknown>[]>(
    () => [
      {
        id: 'numero',
        accessorFn: (row) => row.numeroSequencial ?? 0,
        header: () => <span className="block w-full text-center">Nº</span>,
        cell: ({ row }) => {
          const orcamento = row.original;
          const statusVisual = isConcretizado(orcamento) ? 'Concretizado' : orcamento.status;
          return (
            <span
              className={`block text-center text-sm font-semibold text-gray-600 ${getRowBorderClass(statusVisual, abaAtiva)}`}
            >
              {orcamento.numeroSequencial || row.index + 1}
            </span>
          );
        },
      },
      {
        id: 'cliente',
        accessorFn: (row) => row.cliente?.nome || '',
        header: 'Cliente',
        cell: ({ row }) => (
          <p className="font-semibold text-gray-900 dark:text-dark-text">
            {row.original.cliente?.nome || 'N/A'}
          </p>
        ),
      },
      {
        accessorKey: 'titulo',
        header: 'Título',
        cell: ({ row }) => {
          const orcamento = row.original;
          return (
            <div>
              <p className="font-medium text-gray-900 dark:text-dark-text">{orcamento.titulo}</p>
              <p className="text-xs text-gray-500">
                #{orcamento.numeroSequencial ?? orcamento.numero ?? orcamento.id.substring(0, 8)}
              </p>
            </div>
          );
        },
      },
      {
        id: 'aReceber',
        accessorFn: (row) => calcularValorAReceberDoOrcamento(row as any),
        header: () => <span className="block w-full text-right">A receber (PV)</span>,
        cell: ({ row }) => {
          const orcamento = row.original;
          const valorAReceber = calcularValorAReceberDoOrcamento(orcamento as any);
          const valorVendaDireta = calcularValorVendaDiretaDoOrcamento(orcamento as any);
          const totalCliente = roundMoney(Number((orcamento as any).precoVenda) || 0);
          const temVendaDireta = valorVendaDireta > 0.009 && totalCliente > valorAReceber + 0.009;
          return (
            <div className="flex flex-col items-end leading-tight">
              <span className="text-lg font-bold text-purple-700">
                R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {temVendaDireta ? (
                <span className="text-xs text-gray-500">
                  Total cliente: R$ {totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'validade',
        accessorFn: (row) => row.validade || row.createdAt,
        header: () => <span className="block w-full text-center">Validade</span>,
        cell: ({ row }) => {
          const orcamento = row.original;
          const statusVisual = isConcretizado(orcamento) ? 'Concretizado' : orcamento.status;
          if (statusVisual === 'Concretizado') {
            return (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-violet-600 font-semibold">PV gerado</p>
                <p className="text-xs text-gray-500">
                  {new Date(
                    orcamento.venda?.createdAt || orcamento.venda?.dataVenda || orcamento.updatedAt
                  ).toLocaleDateString('pt-BR')}
                </p>
                {orcamento.venda?.numeroSequencial ? (
                  <span className="text-xs font-bold text-violet-700">#{orcamento.venda.numeroSequencial}</span>
                ) : null}
              </div>
            );
          }
          if (statusVisual === 'Aprovado') {
            return (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-gray-400 italic">Histórico</p>
                <p className="text-xs text-gray-500">
                  {new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center gap-1">
              <p
                className={`text-sm ${isExpirado(orcamento) ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}
              >
                {new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {isExpirado(orcamento) ? (
                <span className="text-xs text-orange-600 font-semibold">⏰ Expirado</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (row) => (isConcretizado(row) ? 'Concretizado' : row.status),
        header: () => <span className="block w-full text-center">Status</span>,
        cell: ({ row }) => {
          const orcamento = row.original;
          const statusVisual = isConcretizado(orcamento) ? 'Concretizado' : orcamento.status;
          return (
            <div className="flex flex-col items-center gap-1">
              <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusClass(statusVisual)}`}>
                {statusVisual === 'Pendente' && '⏳ '}
                {statusVisual === 'Enviado ao Cliente' && '📤 '}
                {statusVisual === 'Aprovado' && '✅ '}
                {statusVisual === 'Concretizado' && '📦 '}
                {statusVisual === 'Recusado' && '❌ '}
                {statusVisual === 'Declinado' && '🔻 '}
                {statusVisual === 'Cancelado' && '🚫 '}
                {statusVisual}
              </span>
              {isConcretizado(orcamento) && orcamento.venda?.numeroSequencial ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-violet-100 text-violet-800">
                  PV #{orcamento.venda.numeroSequencial}
                </span>
              ) : null}
              {isExpirado(orcamento) ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-100 text-orange-800">
                  ⏰ Expirado
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'acoes',
        enableSorting: false,
        header: () => <span className="block w-full text-center min-w-[200px]">Ações</span>,
        cell: ({ row }) => {
          const orcamento = row.original;
          const statusVisual = isConcretizado(orcamento) ? 'Concretizado' : orcamento.status;
          return (
            <div className="flex items-center justify-center" style={{ position: 'relative' }}>
              <ActionsDropdown
                actions={[
                  {
                    label: 'Visualizar',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ),
                    onClick: () => onView(orcamento),
                    variant: 'primary',
                  },
                  {
                    label: 'Editar',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                    onClick: () => onEdit(orcamento),
                    variant: 'default',
                  },
                  {
                    label: 'Chamar no WhatsApp',
                    icon: <WhatsAppIcon className="w-4 h-4" />,
                    onClick: () => onWhatsApp(orcamento),
                    variant: 'success',
                  },
                  {
                    label: 'Copiar',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ),
                    onClick: () => onCopy(orcamento),
                    variant: 'default',
                  },
                  {
                    label: pdfLoadingId === orcamento.id ? 'Abrindo…' : 'PDF',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    ),
                    onClick: () => onPdf(orcamento),
                    loading: pdfLoadingId === orcamento.id,
                    closeOnClick: false,
                    variant: 'default',
                  },
                  {
                    label: 'Regredir status',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    ),
                    onClick: () => onRegredir(orcamento),
                    variant: 'default',
                    show:
                      canRegredir &&
                      getRegredirStatusTargets(
                        isConcretizado(orcamento) ? 'Concretizado' : orcamento.status,
                        Boolean(orcamento.venda?.id)
                      ).length > 0,
                  },
                  {
                    label: 'Enviado-Cliente',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    ),
                    onClick: () => onChangeStatus(orcamento.id, 'Enviado ao Cliente'),
                    variant: 'primary',
                    show: orcamento.status === 'Pendente',
                  },
                  {
                    label: 'Declinar Orçamento',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ),
                    onClick: () => onDeclinar(orcamento),
                    variant: 'danger',
                    show: statusVisual === 'Aprovado' && !isConcretizado(orcamento),
                  },
                  {
                    label: 'Excluir Permanentemente',
                    icon: <TrashIcon className="w-4 h-4" />,
                    onClick: () => onDeletePermanent(orcamento),
                    variant: 'danger',
                    show: canDeleteRow,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [
      abaAtiva,
      canDeleteRow,
      canRegredir,
      getRowBorderClass,
      getStatusClass,
      isConcretizado,
      isExpirado,
      onChangeStatus,
      onCopy,
      onDeclinar,
      onDeletePermanent,
      onEdit,
      onPdf,
      onRegredir,
      onView,
      onWhatsApp,
      pdfLoadingId,
    ]
  );

  return (
    <div
      className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-soft"
      style={{ overflow: 'visible', position: 'relative' }}
    >
      <DataTable
        columns={columns}
        data={data}
        globalFilter={searchTerm}
        hideSearchInput
        pageSize={25}
        emptyMessage="Nenhum orçamento nesta página"
      />
    </div>
  );
}
