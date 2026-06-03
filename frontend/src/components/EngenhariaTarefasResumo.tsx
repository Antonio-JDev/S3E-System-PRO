import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  projetosEngenhariaService,
  type EngenhariaTarefaResumoRow,
} from '../services/projetosEngenhariaService';
import { formatDateDisplay } from '../utils/date';
import {
  isKanbanConcluido,
  isKanbanEmAndamento,
  kanbanStatusClass,
  labelKanbanStatus,
  toBackendKanbanStatus,
} from '../utils/kanbanTaskStatus';

interface EngenhariaTarefasResumoProps {
  onOpenOs?: (projetoId: string) => void;
  refreshKey?: number;
  onProgressRefresh?: () => void;
}

const btnAmber =
  'text-xs px-2 py-1 rounded-lg font-medium border border-amber-200 dark:border-amber-700/60 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/35 dark:text-amber-200 dark:hover:bg-amber-900/55 disabled:opacity-50';

const btnEmerald =
  'text-xs px-2 py-1 rounded-lg font-medium border border-emerald-200 dark:border-emerald-700/60 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/35 dark:text-emerald-200 dark:hover:bg-emerald-900/55 disabled:opacity-50';

const EngenhariaTarefasResumo: React.FC<EngenhariaTarefasResumoProps> = ({
  onOpenOs,
  refreshKey = 0,
  onProgressRefresh,
}) => {
  const [tarefas, setTarefas] = useState<EngenhariaTarefaResumoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projetosEngenhariaService.listarResumoTarefas();
      if (res.success && Array.isArray(res.data)) {
        setTarefas(res.data);
      } else {
        toast.error(res.error || 'Erro ao carregar tarefas');
      }
    } catch {
      toast.error('Erro ao carregar tarefas do Kanban');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const atualizarStatus = async (
    tarefa: EngenhariaTarefaResumoRow,
    novoStatus: 'Em Andamento' | 'Concluído',
  ) => {
    setUpdatingTaskId(tarefa.id);
    try {
      const res = await projetosEngenhariaService.atualizarStatusTarefaKanban(
        tarefa.projetoId,
        tarefa.id,
        novoStatus,
      );
      if (res.success) {
        const backendStatus = toBackendKanbanStatus(novoStatus);
        setTarefas((prev) =>
          prev.map((t) => (t.id === tarefa.id ? { ...t, status: backendStatus } : t)),
        );
        toast.success(
          novoStatus === 'Concluído'
            ? 'Tarefa marcada como concluída'
            : 'Tarefa em andamento',
        );
        onProgressRefresh?.();
      } else {
        toast.error(res.error || 'Erro ao atualizar tarefa');
      }
    } catch {
      toast.error('Erro ao atualizar tarefa');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-soft overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-slate-50 dark:bg-slate-900/50">
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
          <span>☁️</span>
          Tarefas — resumo do Kanban (suas OS)
        </h3>
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
          Tarefas atribuídas a você nas ordens de serviço da sua lista de projetos.
        </p>
      </div>

      {loading ? (
        <p className="p-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm">Carregando tarefas…</p>
      ) : tarefas.length === 0 ? (
        <p className="p-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm">
          Nenhuma tarefa do Kanban atribuída a você nos seus projetos.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/90">
                <th className="px-4 py-3">OS / Cliente</th>
                <th className="px-4 py-3">Tarefa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((t) => {
                const busy = updatingTaskId === t.id;
                const concluida = isKanbanConcluido(t.status);
                const emAndamento = isKanbanEmAndamento(t.status);

                return (
                  <tr
                    key={t.id}
                    className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50/80 dark:hover:bg-dark-bg/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-blue-700 dark:text-blue-400">
                        #{t.numeroSequencial ?? '—'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-dark-text-secondary truncate max-w-[180px]">
                        {t.clienteNome || t.osTitulo}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-dark-text">{t.titulo}</div>
                      {t.descricao && (
                        <div className="text-xs text-gray-500 dark:text-dark-text-secondary line-clamp-2">
                          {t.descricao}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${kanbanStatusClass(t.status)} dark:ring-1 dark:ring-inset dark:ring-white/10`}
                      >
                        {labelKanbanStatus(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-dark-text-secondary">{t.prioridade}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-dark-text-secondary whitespace-nowrap">
                      {t.prazo ? formatDateDisplay(t.prazo) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {!concluida && !emAndamento && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void atualizarStatus(t, 'Em Andamento')}
                            className={btnAmber}
                          >
                            Em andamento
                          </button>
                        )}
                        {!concluida && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void atualizarStatus(t, 'Concluído')}
                            className={btnEmerald}
                          >
                            Concluída
                          </button>
                        )}
                        {onOpenOs && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onOpenOs(t.projetoId)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                          >
                            Abrir OS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EngenhariaTarefasResumo;
