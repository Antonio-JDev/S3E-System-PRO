import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  projetosService,
  type VistoriaCelescItem,
} from '../../services/projetosService';
import { VistoriaCelescCard } from './VistoriaCelescCard';

interface VistoriasCelescPanelProps {
  refreshKey?: number;
  onOpenOs?: (item: VistoriaCelescItem) => void;
  onCountChange?: (count: number) => void;
}

export const VistoriasCelescPanel: React.FC<VistoriasCelescPanelProps> = ({
  refreshKey = 0,
  onOpenOs,
  onCountChange,
}) => {
  const [itens, setItens] = useState<VistoriaCelescItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projetosService.listarVistoriasCelesc();
      const data = (res as { data?: VistoriaCelescItem[] })?.data ?? [];
      setItens(Array.isArray(data) ? data : []);
      onCountChange?.(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar vistorias CELESC');
      setItens([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void carregar();
  }, [carregar, refreshKey]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      await carregar();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-10 text-center text-gray-500 dark:text-dark-text-secondary">
        Carregando vistorias CELESC...
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-12 text-center">
        <div className="text-4xl mb-3">🔎</div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Nenhuma vistoria na fila</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary max-w-md mx-auto">
          OS com a flag &quot;Exige Vistoria CELESC&quot; entram aqui automaticamente após a aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          <span className="font-bold text-gray-900 dark:text-dark-text">{itens.length}</span> vistoria(s) em andamento
        </p>
        <button
          type="button"
          onClick={() => void carregar()}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Atualizar
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {itens.map((item) => (
          <VistoriaCelescCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onOpenOs={onOpenOs}
            onProtocolar={async (id) => {
              await withBusy(id, async () => {
                const res = await projetosService.protocolarVistoria(id);
                if (!(res as { success?: boolean }).success) {
                  throw new Error((res as { error?: string }).error || 'Falha ao protocolar');
                }
                toast.success('Protocolo confirmado');
              });
            }}
            onAprovar={async (id) => {
              await withBusy(id, async () => {
                const res = await projetosService.aprovarVistoria(id);
                if (!(res as { success?: boolean }).success) {
                  throw new Error((res as { error?: string }).error || 'Falha ao aprovar');
                }
                toast.success('Vistoria aprovada');
              });
            }}
            onReprovar={async (id, payload) => {
              await withBusy(id, async () => {
                const res = await projetosService.reprovarVistoria(id, payload);
                if (!(res as { success?: boolean }).success) {
                  throw new Error((res as { error?: string }).error || 'Falha ao reprovar');
                }
                toast.success('Reprova registrada');
              });
            }}
          />
        ))}
      </div>
    </div>
  );
};
