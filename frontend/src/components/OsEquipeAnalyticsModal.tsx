import React, { useEffect, useMemo, useState } from 'react';
import { axiosApiService } from '../services/axiosApi';
import { formatDateDisplay } from '../utils/date';

type Row = {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalAtribuidas: number;
  todo: number;
  doing: number;
  done: number;
  avgHorasConclusao: number;
  atrasadas: number;
  atrasoPercent?: number;
  totalHorasAtraso: number;
  avgHorasAtraso: number;
  maxHorasAtraso: number;
};

type DrillRow = {
  taskId: string;
  projetoId: string;
  projetoTitulo: string | null;
  numeroOs?: string | null;
  titulo: string;
  status: string;
  prazo: string | null;
  createdAt: string;
  updatedAt: string;
  atrasoHoras: number;
  atrasada: boolean;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canView: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatHoras(h: number): string {
  const v = Number.isFinite(h) ? h : 0;
  if (v < 24) return `${v.toFixed(1)}h`;
  const dias = v / 24;
  return `${dias.toFixed(1)}d`;
}

const OsEquipeAnalyticsModal: React.FC<Props> = ({ isOpen, onClose, canView }) => {
  const [start, setStart] = useState(() => isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(() => isoDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'atrasoPercent' | 'totalHorasAtraso' | 'avgHorasConclusao'>('atrasoPercent');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillUser, setDrillUser] = useState<Row | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<DrillRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      `${r.name} ${r.email} ${r.role}`.toLowerCase().includes(s)
    );
  }, [rows, search]);

  const ranked = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const av = sortBy === 'atrasoPercent' ? (a.atrasoPercent ?? 0) : (a as any)[sortBy] ?? 0;
      const bv = sortBy === 'atrasoPercent' ? (b.atrasoPercent ?? 0) : (b as any)[sortBy] ?? 0;
      if (bv === av) return (b.totalHorasAtraso - a.totalHorasAtraso) * dir;
      return (bv - av) * dir;
    });
    return list;
  }, [filtered, sortBy, sortDir]);

  const totals = useMemo(() => {
    return ranked.reduce(
      (acc, r) => {
        acc.totalAtribuidas += r.totalAtribuidas;
        acc.done += r.done;
        acc.atrasadas += r.atrasadas;
        acc.totalHorasAtraso += r.totalHorasAtraso;
        return acc;
      },
      { totalAtribuidas: 0, done: 0, atrasadas: 0, totalHorasAtraso: 0 }
    );
  }, [ranked]);

  async function load() {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosApiService.get<any>(`/api/projetos/relatorios/kanban-usuarios?start=${start}&end=${end}`);
      if (res.success && Array.isArray(res.data)) {
        setRows(res.data as Row[]);
      } else if (res.success && Array.isArray((res as any)?.data?.data)) {
        setRows(((res as any).data.data ?? []) as Row[]);
      } else if ((res as any)?.data?.success && Array.isArray((res as any)?.data?.data)) {
        setRows((res as any).data.data);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Erro ao carregar relatório');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function openDrilldown(user: Row) {
    setDrillUser(user);
    setDrillOpen(true);
    setDrillLoading(true);
    setDrillError(null);
    setDrillRows([]);
    try {
      const res = await axiosApiService.get<any>(`/api/projetos/relatorios/kanban-usuarios/${user.userId}/atrasadas?start=${start}&end=${end}`);
      const data = (res?.data?.data ?? res?.data ?? res?.data?.data) as DrillRow[] | undefined;
      if ((res as any)?.success && Array.isArray((res as any)?.data)) {
        setDrillRows((res as any).data);
      } else if ((res as any)?.success && Array.isArray((res as any)?.data?.data)) {
        setDrillRows((res as any).data.data);
      } else if ((res as any)?.data?.success && Array.isArray((res as any)?.data?.data)) {
        setDrillRows((res as any).data.data);
      } else if (Array.isArray(data)) {
        setDrillRows(data);
      } else {
        setDrillRows([]);
      }
    } catch (e: any) {
      setDrillError(e?.response?.data?.error || e?.message || 'Erro ao carregar drilldown');
    } finally {
      setDrillLoading(false);
    }
  }

  function downloadCsv() {
    const header = [
      'userId',
      'name',
      'email',
      'role',
      'totalAtribuidas',
      'todo',
      'doing',
      'done',
      'atrasadas',
      'atrasoPercent',
      'avgHorasConclusao',
      'totalHorasAtraso',
      'avgHorasAtraso',
      'maxHorasAtraso'
    ];
    const lines = ranked.map(r => [
      r.userId,
      r.name,
      r.email,
      r.role,
      r.totalAtribuidas,
      r.todo,
      r.doing,
      r.done,
      r.atrasadas,
      (r.atrasoPercent ?? 0).toFixed(2),
      r.avgHorasConclusao.toFixed(2),
      r.totalHorasAtraso.toFixed(2),
      r.avgHorasAtraso.toFixed(2),
      r.maxHorasAtraso.toFixed(2)
    ]);
    const esc = (v: any) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [header.join(','), ...lines.map(row => row.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-kanban-usuarios_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!isOpen) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-white truncate">Análise de Equipe — Kanban (OS)</h3>
            <p className="text-xs sm:text-sm text-blue-50">
              Tempo para concluir e tempo em atraso por usuário (período selecionado)
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/15 text-white transition-colors">
            ✕
          </button>
        </div>

        {!canView ? (
          <div className="p-6">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary">
              Este relatório está disponível apenas para <strong>Admin</strong> e <strong>Dev</strong>.
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={onClose} className="btn-secondary">Fechar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Início</label>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Fim</label>
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Buscar usuário</label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nome, email ou função..."
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-start lg:justify-end">
                  <div className="hidden lg:flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">Ordenar</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="select-field"
                      title="Ordenação do ranking"
                    >
                      <option value="atrasoPercent">% atraso</option>
                      <option value="totalHorasAtraso">Total atraso</option>
                      <option value="avgHorasConclusao">Média conclusão</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                      className="btn-secondary"
                      title="Inverter ordem"
                    >
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </div>
                  <button onClick={downloadCsv} disabled={loading || ranked.length === 0} className="btn-secondary">
                    Exportar CSV
                  </button>
                  <button onClick={load} disabled={loading} className="btn-primary">
                    {loading ? 'Carregando...' : 'Atualizar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                <div className="card-primary">
                  <div className="text-xs text-gray-600 dark:text-dark-text-secondary">Atribuídas</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{totals.totalAtribuidas}</div>
                </div>
                <div className="card-primary">
                  <div className="text-xs text-gray-600 dark:text-dark-text-secondary">Concluídas</div>
                  <div className="text-2xl font-bold text-green-600">{totals.done}</div>
                </div>
                <div className="card-primary">
                  <div className="text-xs text-gray-600 dark:text-dark-text-secondary">Atrasadas (eventos)</div>
                  <div className="text-2xl font-bold text-red-600">{totals.atrasadas}</div>
                </div>
                <div className="card-primary">
                  <div className="text-xs text-gray-600 dark:text-dark-text-secondary">Total em atraso</div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatHoras(totals.totalHorasAtraso)}</div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Usuário</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Função</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Atrib.</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Done</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">% atraso</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Média concl.</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Atrasos</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Total atraso</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Máx atraso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                            Carregando relatório...
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                            Nenhum dado para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        ranked.map((r) => (
                          <tr
                            key={r.userId}
                            className={`cursor-pointer ${r.totalHorasAtraso > 0 ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                            onClick={() => openDrilldown(r)}
                            title="Clique para ver tarefas atrasadas"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900 dark:text-dark-text">{r.name}</div>
                              <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{r.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary">{r.role}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-dark-text">{r.totalAtribuidas}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-400">{r.done}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-red-700 dark:text-red-400">
                              {(r.atrasoPercent ?? 0).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-text-secondary">{formatHoras(r.avgHorasConclusao)}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-red-700 dark:text-red-400">{r.atrasadas}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-red-800 dark:text-red-300">{formatHoras(r.totalHorasAtraso)}</td>
                            <td className="px-4 py-3 text-right text-sm text-red-800 dark:text-red-300">{formatHoras(r.maxHorasAtraso)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end bg-white dark:bg-dark-card">
              <button onClick={onClose} className="btn-secondary">Fechar</button>
            </div>

            {/* Drilldown modal */}
            {drillOpen && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-5xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-red-600 to-red-500">
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-white truncate">Tarefas atrasadas — {drillUser?.name}</h4>
                      <p className="text-xs text-red-50">Período: {start} até {end}</p>
                    </div>
                    <button
                      onClick={() => { setDrillOpen(false); setDrillUser(null); setDrillRows([]); }}
                      className="p-2 rounded-lg hover:bg-white/15 text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-6">
                    {drillError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
                        {drillError}
                      </div>
                    )}
                    <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">OS</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Task</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Status</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Prazo</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Atraso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                            {drillLoading ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                                  Carregando tarefas atrasadas...
                                </td>
                              </tr>
                            ) : drillRows.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                                  Nenhuma tarefa atrasada no período.
                                </td>
                              </tr>
                            ) : (
                              drillRows.map(t => (
                                <tr key={t.taskId}>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">
                                    <div className="font-semibold">
                                      {t.numeroOs ? `${t.numeroOs} — ` : ''}
                                      {t.projetoTitulo?.trim() || 'Ordem de serviço'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">{t.titulo}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary">{t.status}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">
                                    {t.prazo ? formatDateDisplay(t.prazo) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-red-700 dark:text-red-400">
                                    {formatHoras(t.atrasoHoras)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end bg-white dark:bg-dark-card">
                    <button
                      onClick={() => { setDrillOpen(false); setDrillUser(null); setDrillRows([]); }}
                      className="btn-secondary"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OsEquipeAnalyticsModal;

