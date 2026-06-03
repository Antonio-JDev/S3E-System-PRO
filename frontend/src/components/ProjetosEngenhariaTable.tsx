import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import EngenhariaTarefasResumo from './EngenhariaTarefasResumo';
import EngenhariaBibliotecaDocumentos from './EngenhariaBibliotecaDocumentos';
import {
  projetosEngenhariaService,
  type ProjetoEngenhariaRow,
} from '../services/projetosEngenhariaService';
import {
  PRIORIDADE_OPCOES,
  STATUS_CELESC_OPCOES,
  STATUS_ENGENHARIA_OPCOES,
  TIPOS_PROJETO_OPCOES,
  getPrioridadeStyle,
  getStatusCelescStyle,
  getStatusEngenhariaStyle,
  getTipoProjetoStyle,
} from '../constants/engenhariaProjeto';

const inputDark =
  'border border-gray-200 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-dark-text dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600';

interface ProjetosEngenhariaTableProps {
  onOpenOs?: (projetoId: string) => void;
  refreshKey?: number;
  onProgressRefresh?: () => void;
  /** Chamado após salvar metadados (ex.: status) — atualiza modal de OS aberto. */
  onEngenhariaUpdated?: (projetoId: string) => void;
}

function useDebouncedPatch(
  projetoId: string,
  onSaved?: (projetoId: string) => void,
  delay = 500,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (patch: Parameters<typeof projetosEngenhariaService.atualizarMetadados>[1]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const res = await projetosEngenhariaService.atualizarMetadados(projetoId, patch);
          if (!res.success) {
            toast.error(res.error || 'Erro ao salvar');
          } else {
            onSaved?.(projetoId);
          }
        } catch {
          toast.error('Erro ao salvar alterações');
        }
      }, delay);
    },
    [projetoId, onSaved, delay],
  );
}

function RowEditor({
  row,
  onLocalUpdate,
  onEngenhariaUpdated,
}: {
  row: ProjetoEngenhariaRow;
  onLocalUpdate: (id: string, patch: Partial<ProjetoEngenhariaRow['engenharia']>) => void;
  onEngenhariaUpdated?: (projetoId: string) => void;
}) {
  const eng = row.engenharia;
  const debouncedPatch = useDebouncedPatch(row.projetoId, onEngenhariaUpdated);

  const patchField = (patch: Parameters<typeof projetosEngenhariaService.atualizarMetadados>[1]) => {
    onLocalUpdate(row.projetoId, patch as any);
    debouncedPatch(patch);
  };

  const toggleMulti = (field: 'tiposProjeto' | 'statusCelesc', value: string, current: string[]) => {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    patchField({ [field]: next });
  };

  return (
    <tr className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50/80 dark:hover:bg-dark-bg/60 align-top">
      <td className="px-4 py-3 min-w-[200px]">
        <div className="font-bold text-blue-700 dark:text-blue-400">#{row.numeroSequencial ?? '—'}</div>
        <input
          type="text"
          className={`mt-1 w-full text-sm px-2 py-1.5 ${inputDark}`}
          value={eng?.nomeProjeto ?? ''}
          placeholder="Nome do projeto"
          onChange={(e) => patchField({ nomeProjeto: e.target.value })}
        />
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1 truncate">{row.cliente.nome}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-[140px]">
          {TIPOS_PROJETO_OPCOES.map((t) => {
            const active = (eng?.tiposProjeto ?? []).includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleMulti('tiposProjeto', t, eng?.tiposProjeto ?? [])}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-opacity ${getTipoProjetoStyle(t)} ${active ? '' : 'opacity-40 dark:opacity-50'}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={eng?.statusEngenharia ?? 'A fazer'}
          onChange={(e) => patchField({ statusEngenharia: e.target.value })}
          className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer ${getStatusEngenhariaStyle(eng?.statusEngenharia ?? '')}`}
        >
          {STATUS_ENGENHARIA_OPCOES.map((s) => (
            <option key={s} value={s} className="bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text">
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {STATUS_CELESC_OPCOES.map((s) => {
            const active = (eng?.statusCelesc ?? []).includes(s);
            return (
              <button
                key={s}
                type="button"
                title={s}
                onClick={() => toggleMulti('statusCelesc', s, eng?.statusCelesc ?? [])}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-opacity ${getStatusCelescStyle(s)} ${active ? '' : 'opacity-35 dark:opacity-45'}`}
              >
                {s.length > 14 ? `${s.slice(0, 12)}…` : s}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3 min-w-[160px]">
        <textarea
          rows={2}
          className={`w-full text-xs px-2 py-1 resize-y ${inputDark}`}
          value={eng?.comentarioEngenharia ?? ''}
          placeholder="Comentário…"
          onChange={(e) => patchField({ comentarioEngenharia: e.target.value })}
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={eng?.prioridade ?? 'Média'}
          onChange={(e) => patchField({ prioridade: e.target.value })}
          className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer ${getPrioridadeStyle(eng?.prioridade ?? '')}`}
        >
          {PRIORIDADE_OPCOES.map((p) => (
            <option key={p} value={p} className="bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text">
              {p}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

const cardShell =
  'bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-soft';

const ProjetosEngenhariaTable: React.FC<ProjetosEngenhariaTableProps> = ({
  onOpenOs,
  refreshKey = 0,
  onProgressRefresh,
  onEngenhariaUpdated,
}) => {
  const [rows, setRows] = useState<ProjetoEngenhariaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projetosEngenhariaService.listar();
      if (res.success && Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        toast.error(res.error || 'Erro ao carregar projetos de engenharia');
      }
    } catch {
      toast.error('Erro ao carregar projetos de engenharia');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleLocalUpdate = (
    projetoId: string,
    patch: Partial<NonNullable<ProjetoEngenhariaRow['engenharia']>>,
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.projetoId === projetoId && r.engenharia
          ? { ...r, engenharia: { ...r.engenharia, ...patch } }
          : r,
      ),
    );
  };

  const filteredRows = useMemo(() => {
    if (statusFilter === 'Todos') return rows;
    return rows.filter((r) => (r.engenharia?.statusEngenharia ?? 'A fazer') === statusFilter);
  }, [rows, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`${cardShell} p-12 text-center text-gray-500 dark:text-dark-text-secondary`}>
          Carregando seus projetos de engenharia…
        </div>
      </div>
    );
  }

  const statusFiltros = ['Todos', ...STATUS_ENGENHARIA_OPCOES] as const;

  return (
    <div className="space-y-0">
      {rows.length === 0 ? (
        <div className={`${cardShell} p-12 text-center mb-6`}>
          <span className="text-4xl mb-4 block">📐</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhum projeto na sua lista</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary text-sm max-w-md mx-auto">
            Você só vê projetos em que é o responsável de engenharia. Use &quot;Atribuir à Engenharia&quot; em uma OS
            para incluí-la na sua lista (você será definido como responsável).
          </p>
        </div>
      ) : (
        <div className={`${cardShell} overflow-hidden mb-6`}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wide mr-1">
              Status:
            </span>
            {statusFiltros.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-blue-900/40 dark:hover:text-blue-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 dark:bg-slate-800/90 text-left text-xs font-bold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                  <th className="px-4 py-3">Nº / Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Status CELESC</th>
                  <th className="px-4 py-3">Comentário</th>
                  <th className="px-4 py-3">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm"
                    >
                      Nenhum projeto com status &quot;{statusFilter}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <RowEditor
                      key={row.projetoId}
                      row={row}
                      onLocalUpdate={handleLocalUpdate}
                      onEngenhariaUpdated={onEngenhariaUpdated}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EngenhariaTarefasResumo
        onOpenOs={onOpenOs}
        refreshKey={refreshKey}
        onProgressRefresh={onProgressRefresh}
      />
      <EngenhariaBibliotecaDocumentos refreshKey={refreshKey} />
    </div>
  );
};

export default ProjetosEngenhariaTable;
