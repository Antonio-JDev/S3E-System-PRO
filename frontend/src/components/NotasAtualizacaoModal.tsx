import React, { useEffect, useMemo, useState } from 'react';
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
} from '../config/releaseNotes';

type NotasAtualizacaoModalProps = {
  /** ID do usuário logado — o “já vi” é gravado por usuário. */
  userId: string;
  /** Força abrir (ex.: botão “Ver novidades”). Ignora o gate de hostname. */
  forceOpen?: boolean;
  onClose?: () => void;
};

const NotasAtualizacaoModal: React.FC<NotasAtualizacaoModalProps> = ({
  userId,
  forceOpen = false,
  onClose,
}) => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 dark:border-dark-border shrink-0">
          <DialogTitle className="text-xl tracking-tight">
            {RELEASE_NOTES_META.titulo}
          </DialogTitle>
          <DialogDescription className="text-sm pt-1">
            {RELEASE_NOTES_META.subtitulo}
            <span className="block mt-1 text-xs text-gray-400 dark:text-dark-text-secondary">
              Versão {RELEASE_NOTES_VERSION} · {RELEASE_NOTES_META.dataLabel}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-5">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-dark-text-secondary">
            <span>
              Progresso: {checkedCount}/{total} itens revisados
            </span>
            <button
              type="button"
              onClick={markAll}
              className="text-brand-blue hover:underline font-medium"
            >
              Marcar todos
            </button>
          </div>

          {grouped.map(([area, areaItems]) => (
            <section key={area} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">
                {area}
              </h3>
              <ul className="space-y-2">
                {areaItems.map((item) => {
                  const isOn = Boolean(checked[item.id]);
                  return (
                    <li key={item.id}>
                      <label
                        className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isOn
                            ? 'border-emerald-400/70 bg-emerald-50/80 dark:bg-emerald-900/20 dark:border-emerald-600/50'
                            : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggleItem(item.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <span className="min-w-0">
                          <span
                            className={`block text-sm font-semibold ${
                              isOn
                                ? 'text-emerald-800 dark:text-emerald-200 line-through decoration-emerald-500/60'
                                : 'text-gray-900 dark:text-dark-text'
                            }`}
                          >
                            {item.titulo}
                          </span>
                          <span className="block text-xs text-gray-600 dark:text-dark-text-secondary mt-0.5 leading-relaxed">
                            {item.descricao}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-dark-border shrink-0 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button type="button" onClick={handleClose}>
            {allChecked ? 'Entendi — tudo revisado' : 'Entendi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotasAtualizacaoModal;
