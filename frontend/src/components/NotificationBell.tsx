import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ArrowRight, InfoIcon, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from './ui/alert';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { notificationsService, type Notificacao } from '../services/notificationsService';
import { useNotificationsSocket } from '../hooks/useNotificationsSocket';

export interface NotificationBellProps {
  onNotificationIr?: (n: Notificacao) => void;
  /** Quando true (sidebar recolhida), mostra só o ícone do sino; quando false, mostra ícone + "Notificações" */
  collapsed?: boolean;
}

export function NotificationBell({ onNotificationIr, collapsed = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [contagem, setContagem] = useState(0);
  const [loading, setLoading] = useState(false);

  const carregarNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await notificationsService.listar();
      setNotificacoes(lista);
      const total = await notificationsService.contagemNaoLidas();
      setContagem(total);
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
      setNotificacoes([]);
      setContagem(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) carregarNotificacoes();
  }, [open, carregarNotificacoes]);

  // Carrega a contagem inicial uma vez no mount (depois o socket cuida do
  // realtime e o polling de fallback corre 5 min só por seguraça).
  useEffect(() => {
    notificationsService.contagemNaoLidas().then(setContagem).catch(() => undefined);
  }, []);

  // Realtime: o backend emite `notificacao:nova` etc. para a room privada
  // do usuário. Cada handler atualiza estado local sem precisar refetch.
  useNotificationsSocket({
    onNew: (n) => {
      setNotificacoes((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev;
        return [n, ...prev].slice(0, 50);
      });
      if (!n.lida) setContagem((prev) => prev + 1);
    },
    onUpdated: ({ id, lida }) => {
      setNotificacoes((prev) =>
        prev.map((x) => (x.id === id ? { ...x, lida } : x))
      );
      // Recalibra a contagem buscando no servidor — evita drift quando
      // a aba ficou pausada e perdeu mensagens.
      notificationsService.contagemNaoLidas().then(setContagem).catch(() => undefined);
    },
    onAllRead: () => {
      setNotificacoes((prev) => prev.map((x) => ({ ...x, lida: true })));
      setContagem(0);
    },
    onCleared: () => {
      setNotificacoes([]);
      setContagem(0);
    },
    onRemoved: ({ id }) => {
      setNotificacoes((prev) => {
        const target = prev.find((x) => x.id === id);
        if (target && !target.lida) {
          setContagem((c) => Math.max(0, c - 1));
        }
        return prev.filter((x) => x.id !== id);
      });
    }
  });

  // Fallback de polling MUITO espaçado (5 min). Roda só quando o sino
  // está fechado — a ideia é cobrir o caso raro do socket ficar pendurado
  // sem se desconectar formalmente (proxy/NAT). Com o realtime ligado a
  // diferença entre 60s e 5 min é imperceptível para o usuário.
  useEffect(() => {
    const t = setInterval(() => {
      if (!open) notificationsService.contagemNaoLidas().then(setContagem).catch(() => undefined);
    }, 5 * 60_000);
    return () => clearInterval(t);
  }, [open]);

  const handleMarcarComoLida = async (n: Notificacao) => {
    if (n.lida) return;
    await notificationsService.marcarComoLida(n.id);
    setNotificacoes(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x));
    setContagem(prev => Math.max(0, prev - 1));
  };

  const handleMarcarTodasComoLidas = async () => {
    await notificationsService.marcarTodasComoLidas();
    setNotificacoes(prev => prev.map(x => ({ ...x, lida: true })));
    setContagem(0);
  };

  const handleExcluirUma = async (n: Notificacao, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ok = await notificationsService.excluirUma(n.id);
      if (ok) {
        setNotificacoes(prev => prev.filter(x => x.id !== n.id));
        if (!n.lida) setContagem(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  };

  const handleExcluirTodas = async () => {
    if (notificacoes.length === 0) return;
    if (!window.confirm('Limpar todas as notificações? Esta ação não pode ser desfeita.')) return;
    try {
      await notificationsService.excluirTodas();
      setNotificacoes([]);
      setContagem(0);
    } catch (e) {
      console.error('Erro ao excluir notificações:', e);
    }
  };

  const tipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'kanban_ordem_servico': return 'Ordem de Serviço';
      case 'kanban_obras': return 'Ordem de Serviço';
      case 'financeiro': return 'Financeiro';
      default: return tipo;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return 'Agora';
    if (diffM < 60) return `${diffM} min atrás`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} dia(s) atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-white dark:hover:bg-dark-card hover:text-gray-800 dark:hover:text-dark-text transition-colors outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-dark-bg',
            collapsed ? 'p-1.5' : 'flex items-center gap-2 px-2.5 py-1.5 min-w-0'
          )}
          title="Notificações"
        >
          <Bell className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <span className="truncate text-sm font-medium">Notificações</span>
          )}
          {contagem > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-dark-card"
              aria-label={`${contagem} notificação${contagem !== 1 ? 'ões' : ''}`}
            >
              {contagem > 99 ? '99+' : contagem}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={`p-0 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-xl transition-all duration-200 ${
          notificacoes.length > 0
            ? 'w-[min(92vw,560px)] min-h-[200px]'
            : 'w-80'
        }`}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className={`flex flex-col ${
            notificacoes.length > 0 ? 'max-h-[min(80vh,520px)]' : 'max-h-[min(70vh,380px)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/80 shrink-0">
            <span className="font-semibold text-sm text-gray-900 dark:text-dark-text">Notificações</span>
            <div className="flex items-center gap-2">
              {contagem > 0 && (
                <button
                  type="button"
                  onClick={handleMarcarTodasComoLidas}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Marcar todas lidas
                </button>
              )}
              {notificacoes.length > 0 && (
                <button
                  type="button"
                  onClick={handleExcluirTodas}
                  className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                  title="Limpar todas as notificações"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar todos
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 pb-[50px] px-3 py-3">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-6 text-center">Carregando...</p>
            ) : notificacoes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-6 text-center px-4">Nenhuma notificação.</p>
            ) : (
              <div className="space-y-3">
                {notificacoes.map((n) => (
                  <Alert
                    key={n.id}
                    variant={n.lida ? 'default' : 'default'}
                    className={
                      n.lida
                        ? 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border'
                        : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-800/50'
                    }
                  >
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>{n.titulo}</AlertTitle>
                    <AlertDescription>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">
                        {tipoLabel(n.tipo)}
                        {n.tipo === 'kanban_ordem_servico' && (n.metadata as { numeroOrdemServico?: string })?.numeroOrdemServico && (
                          <> · Nº OS: {(n.metadata as { numeroOrdemServico: string }).numeroOrdemServico}</>
                        )}
                        {' · '}
                        {formatDate(n.createdAt)}
                      </span>
                      {n.mensagem}
                    </AlertDescription>
                    <AlertAction className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleExcluirUma(n, e)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        title="Excluir notificação"
                        aria-label="Excluir notificação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!n.lida) await handleMarcarComoLida(n);
                          onNotificationIr?.(n);
                          setOpen(false);
                        }}
                      >
                        IR
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </AlertAction>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
