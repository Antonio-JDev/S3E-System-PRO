import { Suspense, lazy, useEffect, useState, type RefObject } from 'react';
import { Smile, Sticker } from 'lucide-react';

const LazyEmojiPickerReact = lazy(() => import('../ui/emoji/EmojiPickerReact'));

export type ComposerPickerTab = 'emoji' | 'gif' | 'sticker';

export interface ComposerEmojiGifStickerModalProps {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  tab: ComposerPickerTab;
  onTabChange: (tab: ComposerPickerTab) => void;
  darkMode: boolean;
  onEmojiSelect: (emoji: string) => void;
  onChooseGif: () => void;
  onChooseSticker: () => void;
}

function TabBar({
  tab,
  onTabChange,
  darkMode,
}: {
  tab: ComposerPickerTab;
  onTabChange: (t: ComposerPickerTab) => void;
  darkMode: boolean;
}) {
  const seg =
    'flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg text-[13px] font-medium transition-colors';
  const inactive = darkMode
    ? 'text-[#8696a0] hover:bg-white/5'
    : 'text-[#54656f] hover:bg-black/[0.04]';
  const active = darkMode
    ? 'bg-[#2a3942] text-[#e9edef] shadow-sm'
    : 'bg-[#f0f2f5] text-[#111b21] shadow-sm';

  return (
    <div
      className={`flex shrink-0 items-stretch justify-center gap-0.5 rounded-full border p-0.5 ${
        darkMode ? 'border-[#2a3942] bg-[#111b21]' : 'border-[#e9edef] bg-[#f8f9fa]'
      }`}
      role="tablist"
      aria-label="Tipo de mídia"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'emoji'}
        className={`${seg} ${tab === 'emoji' ? active : inactive}`}
        onClick={() => onTabChange('emoji')}
      >
        <Smile className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">Emojis</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'gif'}
        className={`${seg} ${tab === 'gif' ? active : inactive}`}
        onClick={() => onTabChange('gif')}
      >
        <span className="text-[15px] font-bold tracking-tight">GIF</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'sticker'}
        className={`${seg} ${tab === 'sticker' ? active : inactive}`}
        onClick={() => onTabChange('sticker')}
      >
        <Sticker className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">Figurinhas</span>
      </button>
    </div>
  );
}

export function ComposerEmojiGifStickerModal({
  open,
  onClose,
  panelRef,
  tab,
  onTabChange,
  darkMode,
  onEmojiSelect,
  onChooseGif,
  onChooseSticker,
}: ComposerEmojiGifStickerModalProps) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const sync = () => setMobile(window.innerWidth < 768);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const emojiPickerHeight = mobile ? 320 : 400;

  if (!open) return null;

  const tabBar = (
    <div className="shrink-0 border-t border-[#e9edef] p-2 dark:border-[#2a3942]">
      <TabBar tab={tab} onTabChange={onTabChange} darkMode={darkMode} />
    </div>
  );

  const bodyEmoji = (
    <div className="min-h-0 flex-1 overflow-hidden">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-[13px] text-[#667781] dark:text-[#8696a0]">
            Carregando emojis…
          </div>
        }
      >
        <LazyEmojiPickerReact
          theme={darkMode ? 'dark' : 'light'}
          onSelect={onEmojiSelect}
          height={emojiPickerHeight}
        />
      </Suspense>
    </div>
  );

  const bodyGif = (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      <p className="text-[14px] leading-snug text-[#54656f] dark:text-[#a9b4ba]">
        Envie um GIF do seu dispositivo (arquivo <span className="font-mono text-[13px]">.gif</span>).
      </p>
      <button
        type="button"
        onClick={onChooseGif}
        className="rounded-full bg-[#00a884] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#008f6f]"
      >
        Selecionar GIF
      </button>
    </div>
  );

  const bodySticker = (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      <p className="text-[14px] leading-snug text-[#54656f] dark:text-[#a9b4ba]">
        Envie uma figurinha (PNG, WebP ou JPEG). O arquivo será enviado como mídia.
      </p>
      <button
        type="button"
        onClick={onChooseSticker}
        className="rounded-full bg-[#00a884] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#008f6f]"
      >
        Selecionar figurinha
      </button>
    </div>
  );

  const body =
    tab === 'emoji' ? bodyEmoji : tab === 'gif' ? bodyGif : bodySticker;

  if (mobile) {
    return (
      <div
        className="fixed inset-0 z-[125] flex items-end justify-center bg-black/40"
        onClick={onClose}
        role="presentation"
      >
        <div
          ref={panelRef}
          className="flex max-h-[min(88vh,620px)] w-full flex-col overflow-hidden rounded-t-2xl border border-[#d1d7db] bg-white shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Emojis, GIFs e figurinhas"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#e9edef] px-3 py-2 dark:border-[#2a3942]">
            <p className="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Emojis, GIFs e figurinhas</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-[13px] text-[#54656f] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/10"
            >
              Fechar
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
          {tabBar}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-[calc(100%+10px)] left-1/2 z-[125] flex w-[min(400px,calc(100vw-32px))] max-h-[min(520px,70vh)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[#d1d7db] bg-white shadow-2xl dark:border-[#2a3942] dark:bg-[#202c33]"
      role="dialog"
      aria-modal="true"
      aria-label="Emojis, GIFs e figurinhas"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
      {tabBar}
    </div>
  );
}
