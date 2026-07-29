import React, { useState } from 'react';
import type { HistoricoReprovacaoVistoria } from '../../services/ordemServicosService';

interface ModalReprovacaoVistoriaProps {
  open: boolean;
  tituloOs: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    dataReprovacao: string;
    motivos: string;
    itensReprovados: string[];
  }) => Promise<void> | void;
}

function hojeInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const ModalReprovacaoVistoria: React.FC<ModalReprovacaoVistoriaProps> = ({
  open,
  tituloOs,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const [dataReprovacao, setDataReprovacao] = useState(hojeInput());
  const [motivos, setMotivos] = useState('');
  const [itensTexto, setItensTexto] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itensReprovados = itensTexto
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    await onSubmit({ dataReprovacao, motivos: motivos.trim(), itensReprovados });
    setMotivos('');
    setItensTexto('');
    setDataReprovacao(hojeInput());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-card shadow-strong border border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Registrar Reprova CELESC</h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">{tituloOs}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border"
            disabled={submitting}
          >
            Fechar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-text">
              Data do Ocorrido *
            </label>
            <input
              type="date"
              required
              value={dataReprovacao}
              onChange={(e) => setDataReprovacao(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-text">
              Itens Reprovados * <span className="font-normal text-gray-400">(um por linha)</span>
            </label>
            <textarea
              required
              rows={4}
              value={itensTexto}
              onChange={(e) => setItensTexto(e.target.value)}
              placeholder={'Ex.: Quadro de medição\nAterramento'}
              className="w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-text">
              Motivos / Observações *
            </label>
            <textarea
              required
              rows={3}
              value={motivos}
              onChange={(e) => setMotivos(e.target.value)}
              placeholder="Descreva o motivo da reprovação..."
              className="w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-dark-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Registrar Reprova'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function formatItensReprovados(itens: HistoricoReprovacaoVistoria['itensReprovados']): string[] {
  if (Array.isArray(itens)) return itens.map(String);
  if (typeof itens === 'string') {
    try {
      const parsed = JSON.parse(itens);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return itens.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}
