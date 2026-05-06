import React, { useEffect, useState } from 'react';
import { logsService } from '../services/logsService';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

const AuditLogsPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setOffset(0);
    loadLogs(0, limit);
  }, [isOpen, limit]);

  const loadLogs = async (newOffset = 0, newLimit = limit) => {
    setLoading(true);
    const res = await logsService.listarAuditLogs({ limit: newLimit, offset: newOffset });
    if (res.success && res.data) {
      setLogs(res.data.logs || []);
      setTotal(res.data.pagination?.total ?? 0);
      setOffset(newOffset);
    } else {
      toast.error(res.error || 'Erro ao carregar auditoria');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Auditoria do Sistema</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Fechar</button>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <label className="text-sm text-gray-600 mr-2">Linhas por página:</label>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input-field inline-block w-auto">
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {offset + 1}–{Math.min(offset + limit, total)} de {total}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 dark:border-red-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-dark-text-secondary">Carregando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div>Nenhum log encontrado</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Usuário</th>
                    <th className="pb-2">Ação</th>
                    <th className="pb-2">Entidade</th>
                    <th className="pb-2">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-2 align-top">{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                      <td className="py-2 align-top">{l.userName || l.userId || 'Sistema'}</td>
                      <td className="py-2 align-top font-semibold">{l.action}</td>
                      <td className="py-2 align-top">{l.entity || '-' } {l.entityId ? `#${l.entityId}` : ''}</td>
                      <td className="py-2 align-top">{l.description || JSON.stringify(l.metadata || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {Math.floor(offset / limit) + 1} de {Math.max(1, Math.ceil(total / limit))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadLogs(Math.max(0, offset - limit), limit)}
                    disabled={offset === 0}
                    className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => loadLogs(offset + limit, limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPanel;

