import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { materiaisService, type CableFamilia } from '../../services/materiaisService';

const FAMILIAS: { value: CableFamilia; label: string }[] = [
  { value: 'FLEX_750V', label: 'Cabo Flex 750V' },
  { value: 'FLEX_1KV', label: 'Cabo Flex 1KV' },
  { value: 'RIGIDO_1KV', label: 'Cabo Rígido 1KV' }
];

const BITOLAS_FLEX_750V = [1.0, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
const BITOLAS_1KV_EXTRA = [70, 95, 120, 150, 185, 240];
const BITOLAS_FLEX_1KV = [...BITOLAS_FLEX_750V, ...BITOLAS_1KV_EXTRA];

function bitolasParaFamilia(f: CableFamilia): number[] {
  if (f === 'FLEX_750V') return BITOLAS_FLEX_750V;
  return BITOLAS_FLEX_1KV;
}

function formatBitolaLabel(mm: number): string {
  const s = Number.isInteger(mm) ? `${mm},00` : mm.toFixed(2).replace('.', ',');
  return `${s} mm²`;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface CabosPrecoBitolaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

export function CabosPrecoBitolaModal({ open, onOpenChange, onApplied }: CabosPrecoBitolaModalProps) {
  const [familia, setFamilia] = useState<CableFamilia>('FLEX_1KV');
  const [bitola, setBitola] = useState<string>('2.5');
  const [precoStr, setPrecoStr] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [previewOk, setPreviewOk] = useState(false);
  const [materiais, setMateriais] = useState<{ id: string; nome: string; precoAtual: number | null }[]>([]);

  const opcoesBitola = useMemo(() => bitolasParaFamilia(familia), [familia]);

  const resetState = () => {
    setPrecoStr('');
    setPreviewOk(false);
    setMateriais([]);
  };

  const handleFamiliaChange = (v: CableFamilia) => {
    setFamilia(v);
    const lista = bitolasParaFamilia(v);
    setBitola(String(lista[0] ?? '2.5'));
    resetState();
  };

  const handlePreview = async () => {
    const bitolaNum = parseFloat(bitola.replace(',', '.'));
    if (!Number.isFinite(bitolaNum) || bitolaNum <= 0) {
      toast.error('Selecione uma bitola válida');
      return;
    }
    setLoadingPreview(true);
    setPreviewOk(false);
    setMateriais([]);
    try {
      const res = await materiaisService.previewPrecoBitola(familia, bitolaNum);
      if (!res.success) {
        toast.error(res.message || 'Falha na pré-visualização');
        return;
      }
      setMateriais(res.materiais);
      setPreviewOk(true);
      if (res.total === 0) {
        toast.message('Nenhum material encontrado para essa família e bitola.');
      } else {
        toast.success(`${res.total} material(is) encontrado(s).`);
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    const preco = parseFloat(precoStr.replace(',', '.'));
    if (!Number.isFinite(preco) || preco < 0) {
      toast.error('Informe o novo preço de custo (R$/m)');
      return;
    }
    if (!previewOk || materiais.length === 0) {
      toast.error('Pré-visualize e confira a lista antes de aplicar');
      return;
    }
    const bitolaNum = parseFloat(bitola.replace(',', '.'));
    setLoadingApply(true);
    try {
      const res = await materiaisService.aplicarPrecoBitola(familia, bitolaNum, preco);
      if (!res.success) {
        toast.error(res.message || 'Erro ao aplicar');
        return;
      }
      toast.success(`Preço atualizado em ${res.atualizados} material(is).`);
      onApplied();
      onOpenChange(false);
      resetState();
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Preço por bitola (cabos)</DialogTitle>
          <DialogDescription>
            Atualiza o preço de custo (R$/m) de todos os materiais da mesma bitola — todas as cores de uma vez.
            Use pré-visualizar para conferir os nomes antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Família</label>
            <select
              className="input-field w-full"
              value={familia}
              onChange={(e) => handleFamiliaChange(e.target.value as CableFamilia)}
            >
              {FAMILIAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bitola</label>
            <select className="input-field w-full" value={bitola} onChange={(e) => { setBitola(e.target.value); resetState(); }}>
              {opcoesBitola.map((mm) => (
                <option key={mm} value={String(mm)}>
                  {formatBitolaLabel(mm)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Novo preço de custo (R$/m)</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field w-full max-w-xs"
            placeholder="0,00"
            value={precoStr}
            onChange={(e) => setPrecoStr(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loadingPreview}
            onClick={handlePreview}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
          >
            {loadingPreview ? 'Carregando…' : 'Pré-visualizar'}
          </button>
        </div>

        {materiais.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-bg sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Material</th>
                    <th className="text-right p-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Custo atual</th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 dark:border-dark-border">
                      <td className="p-2 text-gray-800 dark:text-gray-200">{m.nome}</td>
                      <td className="p-2 text-right text-blue-600 dark:text-blue-400">{formatMoney(m.precoAtual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={loadingApply || !previewOk || materiais.length === 0}
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
            {loadingApply ? 'Aplicando…' : 'Aplicar preço'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
