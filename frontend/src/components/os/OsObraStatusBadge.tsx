import React from 'react';
import type { Obra } from '../../services/obrasService';

const STATUS_STYLE: Record<
  NonNullable<Obra['status']>,
  { label: string; bg: string; text: string; border: string }
> = {
  BACKLOG: {
    label: 'Backlog',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-200',
    border: 'border-gray-300',
  },
  A_FAZER: {
    label: 'A fazer',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300',
  },
  ANDAMENTO: {
    label: 'Em andamento',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-300',
  },
  CONCLUIDO: {
    label: 'Concluída',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300',
  },
};

export interface OsObraStatusBadgeProps {
  status: Obra['status'] | null | undefined;
  nomeObra?: string;
  progresso?: number;
}

const OsObraStatusBadge: React.FC<OsObraStatusBadgeProps> = ({
  status,
  nomeObra,
  progresso,
}) => {
  if (!status) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center text-gray-500">
        Obra ainda não iniciada para esta OS.
      </div>
    );
  }

  const style = STATUS_STYLE[status];

  return (
    <div
      className={`rounded-2xl border-2 p-5 ${style.bg} ${style.border} flex flex-wrap items-center justify-between gap-3`}
    >
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase">Execução física (Kanban)</p>
        <p className={`text-xl font-bold ${style.text}`}>{style.label}</p>
        {nomeObra && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nomeObra}</p>
        )}
      </div>
      {progresso != null && (
        <div className="text-right">
          <p className="text-xs text-gray-500">Progresso obra</p>
          <p className="text-2xl font-bold text-blue-600">{Math.round(progresso)}%</p>
        </div>
      )}
    </div>
  );
};

export default OsObraStatusBadge;
