import { createPortal } from 'react-dom';
import type { OrcamentoRegredirTarget } from '../utils/orcamentoStatus';

type OrcamentoRegredirStatusModalProps = {
  open: boolean;
  onClose: () => void;
  orcamentoLabel: string;
  currentStatus: string;
  options: OrcamentoRegredirTarget[];
  showConcretizadoWarning: boolean;
  loading: boolean;
  onSelect: (status: OrcamentoRegredirTarget) => void;
};

const STATUS_ICONS: Record<OrcamentoRegredirTarget, string> = {
  Pendente: '⏳',
  'Enviado ao Cliente': '📤',
  Aprovado: '✅',
};

export function OrcamentoRegredirStatusModal({
  open,
  onClose,
  orcamentoLabel,
  currentStatus,
  options,
  showConcretizadoWarning,
  loading,
  onSelect,
}: OrcamentoRegredirStatusModalProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="regredir-status-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />
      <div
        className="relative flex max-h-[min(90vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
          <h3 id="regredir-status-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Regredir status — {orcamentoLabel}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Status atual: <strong>{currentStatus}</strong>
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {showConcretizadoWarning ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">Atenção — orçamento concretizado</p>
              <p className="mt-2 text-sm leading-relaxed text-red-700 dark:text-red-300">
                Para regredir um orçamento concretizado é necessário excluir as contas a receber e, em seguida, o
                pedido de venda vinculado. Só então será possível alterar o status.
              </p>
            </div>
          ) : null}

          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Selecione o novo status:</p>
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={loading}
                onClick={() => onSelect(opt)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:border-violet-500 dark:hover:bg-violet-900/20"
              >
                <span className="text-lg" aria-hidden>
                  {STATUS_ICONS[opt]}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
