import React, { useEffect, useMemo, useState } from 'react';
import type { WhatsappChatPreview } from '../../services/whatsappChatService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

export interface WhatsAppForwardModalProps {
  open: boolean;
  onClose: () => void;
  recentChats: WhatsappChatPreview[];
  selectedCount: number;
  /** Seleção única (como combinado). */
  selectedChatId: string | null;
  onSelectChatId: (chatId: string | null) => void;
  onConfirm: () => void;
  confirming?: boolean;
}

function displayChatName(c: WhatsappChatPreview): string {
  return (c.contactName || c.providerCachedName || c.chatId || '').trim() || 'Sem nome';
}

/** Prévia curta para lista (evita URLs longas e texto infinito no botão). */
function displayChatSubtext(c: WhatsappChatPreview): string {
  let t = (c.lastContent || '').trim();
  t = t.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  if (t) return t;
  if (c.lastFromMe) return 'Sua última mensagem';
  return c.lastContent?.trim() ? 'Mensagem com link ou mídia' : '';
}

export const WhatsAppForwardModal: React.FC<WhatsAppForwardModalProps> = ({
  open,
  onClose,
  recentChats,
  selectedCount,
  selectedChatId,
  onSelectChatId,
  onConfirm,
  confirming,
}) => {
  const [search, setSearch] = useState('');
  const busy = Boolean(confirming);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentChats;
    return recentChats.filter((c) => {
      const name = displayChatName(c).toLowerCase();
      const id = (c.chatId || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [recentChats, search]);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="flex max-h-[min(90vh,640px)] w-[min(94vw,28rem)] max-w-lg flex-col gap-0 overflow-hidden border-gray-200 bg-white p-0 dark:border-dark-border dark:bg-dark-card sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-gray-200 px-6 pb-4 pt-6 pr-14 text-left dark:border-dark-border">
          <DialogTitle className="text-lg text-gray-900 dark:text-white">Encaminhar mensagem</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-dark-text-secondary">
            Escolha uma conversa recente. A prévia mostra só um trecho da última mensagem.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 pt-2">
          <label htmlFor="wa-forward-search" className="sr-only">
            Pesquisar conversa
          </label>
          <input
            id="wa-forward-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou número…"
            disabled={busy}
            autoComplete="off"
            className="input-field py-2.5 text-sm"
          />
        </div>

        <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">
          Conversas recentes
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {filtered.length <= 0 ? (
            <div className="px-3 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            <ul className="space-y-1 pb-1" role="listbox" aria-label="Conversas para encaminhar">
              {filtered.map((c) => {
                const checked = selectedChatId === c.chatId;
                const name = displayChatName(c);
                const sub = displayChatSubtext(c);
                const avatar = (c.cachedProfilePictureUrl || '').trim();
                return (
                  <li key={c.chatId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => onSelectChatId(checked ? null : c.chatId)}
                      disabled={busy}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        checked
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600/50 dark:bg-indigo-950/30'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                            : 'border-gray-300 bg-white text-transparent dark:border-dark-border dark:bg-dark-bg'
                        }`}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-200">
                        {avatar ? (
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          name.slice(0, 1).toUpperCase()
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-dark-text">{name}</span>
                        {sub ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                            {sub}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-3 border-t border-gray-200 px-6 py-4 dark:border-dark-border sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            {selectedChatId ? (
              <>
                {selectedCount === 1 ? '1 mensagem' : `${selectedCount} mensagens`} ·{' '}
                <span className="font-medium text-gray-900 dark:text-dark-text">destino selecionado</span>
              </>
            ) : (
              <>
                {selectedCount === 1 ? '1 mensagem selecionada' : `${selectedCount} mensagens selecionadas`} · escolha o
                destino
              </>
            )}
          </p>
          <button
            type="button"
            disabled={!selectedChatId || busy}
            onClick={onConfirm}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 text-sm"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Encaminhando…
              </>
            ) : (
              'Encaminhar'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CheckIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default WhatsAppForwardModal;

