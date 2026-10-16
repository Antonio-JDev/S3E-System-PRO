import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import {
  inventarioService,
  type MaterialContagem,
} from '../services/inventarioService';
import { useInventarioMateriais, useInvalidateInventarioMateriais } from '../hooks/useInventarioQuery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);
const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

interface InventarioProps {
  toggleSidebar: () => void;
}

type ContagemDraft = {
  quantidadeContada: string;
  selecionado: boolean;
  observacoes: string;
};

const formatDelta = (delta: number) => {
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : String(delta);
};

const Inventario: React.FC<InventarioProps> = ({ toggleSidebar }) => {
  const authContext = useContext(AuthContext);
  const userRole = authContext?.user?.role?.toLowerCase() || '';
  const user = authContext?.user;
  const canApply =
    userRole === 'admin' ||
    userRole === 'gerente' ||
    userRole === 'desenvolvedor' ||
    user?.isAdmin === true;

  const [drafts, setDrafts] = useState<Record<string, ContagemDraft>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingLote, setApplyingLote] = useState(false);
  const [confirmLoteOpen, setConfirmLoteOpen] = useState(false);
  const [observacaoGlobal, setObservacaoGlobal] = useState('');
  const invalidateInventario = useInvalidateInventarioMateriais();
  const { data: materiaisQueryData, isLoading: loading, isError } = useInventarioMateriais();
  const materiais = materiaisQueryData ?? [];

  useEffect(() => {
    if (isError) toast.error('Não foi possível carregar materiais');
  }, [isError]);

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, ContagemDraft> = {};
      for (const m of materiais) {
        next[m.id] = prev[m.id] || {
          quantidadeContada: String(m.estoqueAtual),
          selecionado: false,
          observacoes: '',
        };
      }
      return next;
    });
  }, [materiais]);

  const loadMateriais = useCallback(async (_busca?: string) => {
    await invalidateInventario();
  }, [invalidateInventario]);

  const filtered = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return materiais;
    return materiais.filter(
      (m) =>
        m.nome.toLowerCase().includes(termo) ||
        m.sku.toLowerCase().includes(termo) ||
        (m.localizacao || '').toLowerCase().includes(termo) ||
        (m.ean || '').toLowerCase().includes(termo) ||
        (m.codigoFornecedor || '').toLowerCase().includes(termo)
    );
  }, [materiais, searchTerm]);

  const itensComDiferenca = useMemo(() => {
    return filtered
      .map((m) => {
        const draft = drafts[m.id];
        const contada = Number(String(draft?.quantidadeContada ?? '').replace(',', '.'));
        const diferenca = Number.isFinite(contada) ? contada - m.estoqueAtual : NaN;
        return { material: m, draft, contada, diferenca };
      })
      .filter((row) => row.draft?.selecionado && Number.isFinite(row.contada) && row.contada >= 0);
  }, [filtered, drafts]);

  const selecionadosComMudanca = useMemo(
    () => itensComDiferenca.filter((r) => r.diferenca !== 0),
    [itensComDiferenca]
  );

  const updateDraft = (id: string, patch: Partial<ContagemDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { quantidadeContada: '0', selecionado: false, observacoes: '' }), ...patch },
    }));
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const m of filtered) {
        next[m.id] = {
          ...(next[m.id] || {
            quantidadeContada: String(m.estoqueAtual),
            selecionado: false,
            observacoes: '',
          }),
          selecionado: checked,
        };
      }
      return next;
    });
  };

  const aplicarLinha = async (material: MaterialContagem) => {
    if (!canApply) {
      toast.error('Sem permissão para aplicar ajustes (admin/gerente)');
      return;
    }
    const draft = drafts[material.id];
    const contada = Number(String(draft?.quantidadeContada ?? '').replace(',', '.'));
    if (!Number.isFinite(contada) || contada < 0) {
      toast.error('Informe uma quantidade contada válida (≥ 0)');
      return;
    }

    try {
      setApplyingId(material.id);
      const response = await inventarioService.aplicarAjuste({
        materialId: material.id,
        quantidadeContada: contada,
        observacoes: draft?.observacoes || observacaoGlobal || undefined,
      });

      if (!response.success) {
        toast.error(response.error || 'Falha ao aplicar ajuste');
        return;
      }

      const data = response.data;
      if (data?.semAlteracao) {
        toast.success('Saldo já confere — sem movimentação');
      } else {
        toast.success(data?.message || 'Ajuste aplicado');
      }

      setMateriais((prev) =>
        prev.map((m) =>
          m.id === material.id ? { ...m, estoqueAtual: contada } : m
        )
      );
      updateDraft(material.id, {
        quantidadeContada: String(contada),
        selecionado: false,
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aplicar ajuste');
    } finally {
      setApplyingId(null);
    }
  };

  const aplicarLote = async () => {
    if (!canApply) {
      toast.error('Sem permissão para aplicar ajustes (admin/gerente)');
      return;
    }
    if (selecionadosComMudanca.length === 0) {
      toast.message('Nenhum item selecionado com diferença');
      setConfirmLoteOpen(false);
      return;
    }

    try {
      setApplyingLote(true);
      const itens = selecionadosComMudanca.map((r) => ({
        materialId: r.material.id,
        quantidadeContada: r.contada,
        observacoes: r.draft?.observacoes || observacaoGlobal || undefined,
      }));

      const response = await inventarioService.aplicarAjustesLote(itens);
      if (!response.success || !response.data) {
        toast.error(response.error || 'Falha ao aplicar lote');
        return;
      }

      const { aplicados, semAlteracao, erros } = response.data;
      toast.success(
        `Lote: ${aplicados} ajustado(s), ${semAlteracao} sem alteração, ${erros} erro(s)`
      );

      await loadMateriais(searchTerm.trim() || undefined);
      setConfirmLoteOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aplicar ajustes em lote');
    } finally {
      setApplyingLote(false);
    }
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((m) => drafts[m.id]?.selecionado);

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-white dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
              Inventário
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">
              Contagem física com ajuste absoluto do saldo de estoque
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={!canApply || selecionadosComMudanca.length === 0 || applyingLote}
            onClick={() => setConfirmLoteOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-5 h-5" />
            Aplicar selecionados ({selecionadosComMudanca.length})
          </button>
        </div>
      </header>

      {!canApply && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Você pode visualizar a contagem, mas apenas admin/gerente podem aplicar ajustes.
        </div>
      )}

      <div className="card-primary mb-6 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, SKU, EAN, cProd ou localização…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1">
            Observação padrão (opcional — usada nos ajustes sem observação por linha)
          </label>
          <input
            type="text"
            value={observacaoGlobal}
            onChange={(e) => setObservacaoGlobal(e.target.value)}
            placeholder="Ex.: Inventário mensal — depósito principal"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text text-sm"
          />
        </div>
      </div>

      <div className="card-primary overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-dark-text-secondary">
            Carregando materiais…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-dark-text-secondary">
            Nenhum material encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-dark-card/80 text-left text-gray-600 dark:text-dark-text-secondary">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      aria-label="Selecionar todos visíveis"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Material</th>
                  <th className="px-3 py-3 font-semibold">SKU</th>
                  <th className="px-3 py-3 font-semibold">EAN / cProd</th>
                  <th className="px-3 py-3 font-semibold">Localização</th>
                  <th className="px-3 py-3 font-semibold text-right">Sistema</th>
                  <th className="px-3 py-3 font-semibold text-right">Qtd contada</th>
                  <th className="px-3 py-3 font-semibold text-right">Diferença</th>
                  <th className="px-3 py-3 font-semibold">Obs.</th>
                  <th className="px-3 py-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filtered.map((m) => {
                  const draft = drafts[m.id];
                  const contada = Number(String(draft?.quantidadeContada ?? '').replace(',', '.'));
                  const diferenca = Number.isFinite(contada) ? contada - m.estoqueAtual : NaN;
                  const deltaClass =
                    !Number.isFinite(diferenca) || diferenca === 0
                      ? 'text-gray-500 dark:text-dark-text-secondary'
                      : diferenca > 0
                        ? 'text-green-600 dark:text-green-400 font-semibold'
                        : 'text-orange-600 dark:text-orange-400 font-semibold';

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/80 dark:hover:bg-dark-card/40">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!draft?.selecionado}
                          onChange={(e) => updateDraft(m.id, { selecionado: e.target.checked })}
                          aria-label={`Selecionar ${m.nome}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-dark-text">
                        <div className="font-medium">{m.nome}</div>
                        <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                          {m.unidadeMedida}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-dark-text-secondary font-mono text-xs">
                        {m.sku}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-dark-text-secondary">
                        <div className="font-mono text-xs">{m.ean || '—'}</div>
                        {m.codigoFornecedor ? (
                          <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                            cProd: <span className="font-mono">{m.codigoFornecedor}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-dark-text-secondary">
                        {m.localizacao || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900 dark:text-dark-text">
                        {m.estoqueAtual}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={draft?.quantidadeContada ?? ''}
                          onChange={(e) => updateDraft(m.id, { quantidadeContada: e.target.value })}
                          className="w-24 ml-auto block px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-right tabular-nums"
                        />
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${deltaClass}`}>
                        {Number.isFinite(diferenca) ? formatDelta(diferenca) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={draft?.observacoes ?? ''}
                          onChange={(e) => updateDraft(m.id, { observacoes: e.target.value })}
                          placeholder="Opcional"
                          className="w-36 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={!canApply || applyingId === m.id || !Number.isFinite(contada)}
                          onClick={() => aplicarLinha(m)}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          {applyingId === m.id ? '…' : 'Aplicar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={confirmLoteOpen} onOpenChange={setConfirmLoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajustes em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Serão aplicados {selecionadosComMudanca.length} ajuste(s) absoluto(s). O saldo de cada
              material passará a ser a quantidade contada e será gerada uma movimentação do tipo
              AJUSTE. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingLote}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aplicarLote} disabled={applyingLote}>
              {applyingLote ? 'Aplicando…' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventario;
