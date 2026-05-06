import { create } from 'zustand';

type UnreadState = {
  totalUnread: number;
  activeChatId: string | null;
  lastUpdatedAt: number | null;
  setTotalUnread: (n: number) => void;
  incTotalUnread: (delta?: number) => void;
  setActiveChatId: (chatId: string | null) => void;
  bumpUpdated: () => void;
};

export const useWhatsappUnreadStore = create<UnreadState>((set) => ({
  totalUnread: 0,
  activeChatId: null,
  lastUpdatedAt: null,
  setTotalUnread: (n) => set({ totalUnread: Math.max(0, Math.trunc(Number(n) || 0)) }),
  incTotalUnread: (delta) =>
    set((s) => ({
      totalUnread: Math.max(0, Math.trunc((s.totalUnread || 0) + (Number(delta) || 1))),
    })),
  setActiveChatId: (chatId) => set({ activeChatId: chatId && chatId.trim() ? chatId.trim() : null }),
  bumpUpdated: () => set({ lastUpdatedAt: Date.now() }),
}));

