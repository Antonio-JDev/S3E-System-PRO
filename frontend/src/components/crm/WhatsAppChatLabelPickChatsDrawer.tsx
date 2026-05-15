import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Search } from 'lucide-react';
import {
  canonicalWhatsappChatId,
  formatPhoneForDisplay,
  isWhatsappGroupChatId
} from '../../utils/whatsappChat';

export interface SelectableChat {
  chatId: string;
  title: string;
  subtitle?: string | null;
  profilePictureUrl?: string | null;
}

export interface WhatsAppChatLabelPickChatsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Conversas iniciais já marcadas (chatIds canonicalizados). */
  initialSelected: string[];
  /** Universo de conversas para selecionar (lista do CRM + agenda). */
  availableChats: SelectableChat[];
  /** Devolve o conjunto final de chatIds (canon) ou `null` se cancelou. */
  onConfirm: (chatIds: string[]) => void;
}

const WhatsAppChatLabelPickChatsDrawer: React.FC<WhatsAppChatLabelPickChatsDrawerProps> = ({
  open,
  onClose,
  initialSelected,
  availableChats,
  onConfirm
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(initialSelected.map((c) => canonicalWhatsappChatId(c))));
    setSearch('');
  }, [open, initialSelected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return availableChats;
    return availableChats.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.chatId.toLowerCase().includes(term) ||
        (c.subtitle?.toLowerCase().includes(term) ?? false)
    );
  }, [search, availableChats]);

  function toggle(cid: string) {
    const canon = canonicalWhatsappChatId(cid);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(canon)) next.delete(canon);
      else next.add(canon);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected));
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#161717]">
      <div className="flex h-14 shrink-0 items-center gap-2 bg-[#00a884] px-4 text-white">
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-white/15" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-[15px] font-semibold">Adicionar conversas</h2>
          <span className="text-[11px] opacity-80">{selected.size} selecionada(s)</span>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#00a884] hover:bg-white/90"
        >
          OK
        </button>
      </div>

      <div className="border-b border-[#e9edef] bg-white p-2 dark:border-[#2a3942] dark:bg-[#202c33]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome ou número"
            className="w-full rounded-full border border-[#e9edef] bg-[#f7f5f3] py-2 pl-9 pr-3 text-[13px] text-[#111b21] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
          />
        </div>
      </div>

      <div className="wa-scroll min-h-0 flex-1 overflow-y-auto bg-white dark:bg-[#202c33]">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
            Nenhuma conversa encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
            {filtered.map((c) => {
              const canon = canonicalWhatsappChatId(c.chatId);
              const isOn = selected.has(canon);
              const grp = isWhatsappGroupChatId(canon);
              return (
                <li key={canon}>
                  <button
                    type="button"
                    onClick={() => toggle(canon)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f7f5f3] dark:hover:bg-[#2a3942]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        isOn
                          ? 'border-[#00a884] bg-[#00a884] text-white'
                          : 'border-[#8696a0] bg-transparent text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    {c.profilePictureUrl ? (
                      <img
                        src={c.profilePictureUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6b7280] text-[11px] font-semibold text-white">
                        {c.title.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                          {c.title || formatPhoneForDisplay(canon)}
                        </span>
                        {grp ? (
                          <span className="shrink-0 rounded bg-[#8696a0]/20 px-1.5 py-0.5 text-[10px] text-[#54656f] dark:text-[#8696a0]">
                            Grupo
                          </span>
                        ) : null}
                      </span>
                      {c.subtitle ? (
                        <span className="truncate text-[12px] text-[#667781] dark:text-[#8696a0]">{c.subtitle}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChatLabelPickChatsDrawer;
