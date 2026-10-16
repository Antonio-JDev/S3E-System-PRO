import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Banknote,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  Receipt,
  Settings2,
  ShoppingCart,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  RELEASE_NOTES_ITEMS,
  RELEASE_NOTES_META,
  RELEASE_NOTES_VERSION,
  hasSeenReleaseNotes,
  markReleaseNotesSeen,
  shouldOfferReleaseNotes,
  type ReleaseNoteItem,
  type ReleaseNoteTipo,
} from '../config/releaseNotes';

type NotasAtualizacaoModalProps = {
  /** ID do usuário logado — o “já vi” é gravado por usuário. */
  userId: string;
  /** Força abrir (ex.: botão “Ver novidades”). Ignora o gate de hostname. */
  forceOpen?: boolean;
  onClose?: () => void;
};

const ICONE_AREA: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  'Ordens de Serviço': ClipboardList,
  Calendário: CalendarDays,
  Orçamentos: FileText,
  Compras: ShoppingCart,
  Estoque: Package,
  Sistema: Settings2,
  Financeiro: Landmark,
  Fiscal: Receipt,
  Suprimentos: ShoppingCart,
  Vendas: Receipt,
  Folha: Banknote,
  RH: Users,
};

const TIPO_META: Record<ReleaseNoteTipo, { label: string; className: string }> = {
  novo: {
    label: 'Novo',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  melhoria: {
    label: 'Melhoria',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  correcao: {
    label: 'Correção',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  removido: {
    label: 'Removido',
    className: 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
  },
};

const TODAS = '__todas__';

const NotasAtualizacaoModal: React.FC<NotasAtualizacaoModalProps> = ({
  userId,
  forceOpen = false,
  onClose,
}) => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [areaAtiva, setAreaAtiva] = useState<string>(TODAS);

  const items = RELEASE_NOTES_ITEMS;

  useEffect(() => {
    if (!userId) return;
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (!shouldOfferReleaseNotes()) return;
    if (hasSeenReleaseNotes(userId)) return;
    setOpen(true);
  }, [forceOpen, userId]);

  const total = items.length;
  const checkedCount = useMemo(
    () => items.reduce((acc, item) => acc + (checked[item.id] ? 1 : 0), 0),
    [items, checked]
  );
  const allChecked = total > 0 && checkedCount === total;
  const percentual = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  const toggleItem = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const markAll = () => {
    const next: Record<string, boolean> = {};
    items.forEach((item) => {
      next[item.id] = true;
    });
    setChecked(next);
  };

  const handleClose = () => {
    markReleaseNotesSeen(userId);
    setOpen(false);
    onClose?.();
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ReleaseNoteItem[]>();
    items.forEach((item) => {
      const list = map.get(item.area) || [];
      list.push(item);
      map.set(item.area, list);
    });
    return Array.from(map.entries());
  }, [items]);

  const gruposVisiveis = areaAtiva === TODAS ? grouped : grouped.filter(([area]) => area === areaAtiva);

  const contagemNovos = items.filter((item) => item.tipo === 'novo').length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 pt-6 pb-5 text-left text-white">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 pr-6">
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                {RELEASE_NOTES_META.titulo}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-blue-100">
                {RELEASE_NOTES_META.subtitulo}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
                  {RELEASE_NOTES_META.dataLabel}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
                  {total} alterações
                </span>
                {contagemNovos > 0 && (
                  <span className="rounded-full bg-emerald-400/25 px-2.5 py-1 font-medium text-emerald-50">
                    {contagemNovos} novidades
                  </span>
                )}
                <span className="font-mono text-[11px] text-blue-200/80">v{RELEASE_NOTES_VERSION}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-gray-200 px-6 py-4 dark:border-dark-border">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-gray-600 dark:text-dark-text-secondary">
              {checkedCount} de {total} revisados
            </span>
            <button
              type="button"
              onClick={markAll}
              disabled={allChecked}
              className="font-semibold text-brand-blue hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
            >
              Marcar todos
            </button>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={percentual}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Itens revisados"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${percentual}%` }}
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {[[TODAS, items] as [string, ReleaseNoteItem[]], ...grouped].map(([area, areaItems]) => {
              const ativa = areaAtiva === area;
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => setAreaAtiva(area)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    ativa
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-dark-text-secondary dark:hover:bg-slate-800'
                  }`}
                >
                  {area === TODAS ? 'Todas' : area}
                  <span className={`ml-1.5 tabular-nums ${ativa ? 'text-blue-100' : 'text-gray-400'}`}>
                    {areaItems.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {gruposVisiveis.map(([area, areaItems]) => {
            const Icone = ICONE_AREA[area] ?? Sparkles;
            return (
              <section key={area} className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">
                  <Icone className="h-4 w-4 text-brand-blue" />
                  {area}
                </h3>
                <ul className="space-y-2">
                  {areaItems.map((item) => {
                    const isOn = Boolean(checked[item.id]);
                    const tipo = TIPO_META[item.tipo];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isOn}
                          onClick={() => toggleItem(item.id)}
                          className={`group flex w-full gap-3 rounded-xl border p-3.5 text-left transition-all ${
                            isOn
                              ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-700/60 dark:bg-emerald-900/15'
                              : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm dark:border-dark-border dark:bg-dark-card dark:hover:border-blue-800'
                          }`}
                        >
                          {isOn ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300 group-hover:text-blue-400 dark:text-gray-600" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  isOn
                                    ? 'text-emerald-800 dark:text-emerald-200'
                                    : 'text-gray-900 dark:text-dark-text'
                                }`}
                              >
                                {item.titulo}
                              </span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tipo.className}`}
                              >
                                {tipo.label}
                              </span>
                            </span>
                            <span
                              className={`mt-1 block text-xs leading-relaxed ${
                                isOn
                                  ? 'text-emerald-900/70 dark:text-emerald-100/60'
                                  : 'text-gray-600 dark:text-dark-text-secondary'
                              }`}
                            >
                              {item.descricao}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <DialogFooter className="shrink-0 items-center gap-2 border-t border-gray-200 bg-gray-50/80 px-6 py-4 dark:border-dark-border dark:bg-slate-900/40 sm:justify-between sm:gap-2">
          <p className="hidden text-xs text-gray-500 dark:text-dark-text-secondary sm:block">
            {allChecked ? 'Tudo revisado. Bom trabalho!' : 'Este aviso aparece uma vez por versão.'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button type="button" onClick={handleClose}>
              {allChecked ? 'Concluir' : 'Entendi'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotasAtualizacaoModal;
