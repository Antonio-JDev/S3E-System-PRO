import { Suspense, lazy, useEffect, useMemo, useState } from 'react';

const LazyEmojiMartPicker = lazy(() => import('./EmojiMartPicker'));

interface EmojiMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  darkMode: boolean;
}

export function EmojiMenu({ open, onClose, onSelect, darkMode }: EmojiMenuProps) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const sync = () => setMobile(window.innerWidth < 768);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const theme = useMemo<'light' | 'dark'>(() => (darkMode ? 'dark' : 'light'), [darkMode]);

  if (!open) return null;

  if (mobile) {
    return (
      <div className="fixed inset-0 z-[120] flex items-end bg-black/40" onClick={onClose}>
        <div
          className="w-full rounded-t-2xl border border-[#d1d7db] bg-white p-2 shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">Emojis</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-xs text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/5"
            >
              Fechar
            </button>
          </div>
          <Suspense fallback={<div className="p-4 text-sm text-[#667781]">Carregando emojis...</div>}>
            <LazyEmojiMartPicker theme={theme} onSelect={onSelect} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 z-[120] overflow-hidden rounded-xl border border-[#d1d7db] bg-white shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]">
      <Suspense fallback={<div className="p-4 text-sm text-[#667781]">Carregando emojis...</div>}>
        <LazyEmojiMartPicker theme={theme} onSelect={onSelect} />
      </Suspense>
    </div>
  );
}
