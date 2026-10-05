import React, { useEffect, useState } from 'react';
import { localYmdFromDate, serverDateToInput } from '../../utils/date';
import {
  TIPOS_REFERENCIA_CHEGADA,
  type TipoReferenciaChegada,
} from '../../utils/previsaoChegadaBom.util';
import type { PrevisaoChegadaMaterial } from '../../services/previsaoChegadaService';

export interface ItemDefinirChegada {
  itemKey: string;
  nome: string;
  materialId?: string | null;
}

export interface DadosDefinirChegada {
  dataChegada: string;
  tipoReferencia: TipoReferenciaChegada | null;
  referencia: string;
}

interface ModalDefinirChegadaProps {
  open: boolean;
  itens: ItemDefinirChegada[];
  /** Preenche o formulário ao editar (usa a previsão do primeiro item que já tiver uma). */
  previsaoExistente?: PrevisaoChegadaMaterial | null;
  quantidadeComPrevisao?: number;
  salvando?: boolean;
  onClose: () => void;
  onSalvar: (dados: DadosDefinirChegada) => void;
  onRemover?: () => void;
}

const ModalDefinirChegada: React.FC<ModalDefinirChegadaProps> = ({
  open,
  itens,
  previsaoExistente,
  quantidadeComPrevisao = 0,
  salvando = false,
  onClose,
  onSalvar,
  onRemover,
}) => {
  const [dataChegada, setDataChegada] = useState('');
  const [tipoReferencia, setTipoReferencia] = useState<TipoReferenciaChegada | ''>('PEDIDO_COMPRA');
  const [referencia, setReferencia] = useState('');

  useEffect(() => {
    if (!open) return;
    setDataChegada(previsaoExistente ? serverDateToInput(previsaoExistente.dataChegada) : '');
    setTipoReferencia(previsaoExistente ? previsaoExistente.tipoReferencia || '' : 'PEDIDO_COMPRA');
    setReferencia(previsaoExistente?.referencia || '');
  }, [open, previsaoExistente]);

  if (!open) return null;

  const hojeYmd = localYmdFromDate(new Date());
  const lote = itens.length > 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataChegada || salvando) return;
    onSalvar({
      dataChegada,
      tipoReferencia: tipoReferencia || null,
      referencia: referencia.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col"
      >
        <div className="border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Definir data de chegada</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {lote ? `${itens.length} itens selecionados` : itens[0]?.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {lote && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg px-3 py-2">
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {itens.map((it) => (
                  <li key={it.itemKey} className="truncate">• {it.nome}</li>
                ))}
              </ul>
            </div>
          )}
          {lote && quantidadeComPrevisao > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {quantidadeComPrevisao} item(ns) já têm data de chegada e serão atualizados.
            </p>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data prevista de chegada *</span>
            <input
              type="date"
              required
              value={dataChegada}
              onChange={(e) => setDataChegada(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
            />
            {dataChegada && dataChegada < hojeYmd && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Data no passado — a chegada aparecerá como atrasada.</span>
            )}
          </label>

          <div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Documento de referência</span>
            <div className="mt-1 flex gap-2">
              <select
                value={tipoReferencia}
                onChange={(e) => setTipoReferencia(e.target.value as TipoReferenciaChegada | '')}
                className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
              >
                {TIPOS_REFERENCIA_CHEGADA.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
                <option value="">Outro</option>
              </select>
              <input
                type="text"
                value={referencia}
                maxLength={120}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Nº do orçamento, pedido ou NF"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between gap-2">
          <div>
            {onRemover && (
              <button
                type="button"
                onClick={onRemover}
                disabled={salvando}
                className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
              >
                Remover previsão
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!dataChegada || salvando}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? 'Salvando…' : lote ? `Salvar para ${itens.length} itens` : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ModalDefinirChegada;
