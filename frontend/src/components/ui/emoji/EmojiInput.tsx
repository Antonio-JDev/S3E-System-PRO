import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EmojiMenu } from './EmojiMenu';
import { ExpandableInputOpener } from './ExpandableInputOpener';

export type EmojiInputHandle = {
  insertAtCursor: (text: string) => void;
  focus: () => void;
};

interface EmojiInputProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Fundo único com ícones (barra tipo WhatsApp Web) */
  embeddedInPill?: boolean;
  /** Controla o menu de emoji externamente (opcional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Mostra o botão 🙂 dentro do componente (opcional). */
  showOpener?: boolean;
  /** Quando true, não renderiza o menu flutuante de emojis (painel externo no compositor). */
  hideEmojiMenu?: boolean;
}

export const EmojiInput = forwardRef<EmojiInputHandle, EmojiInputProps>(function EmojiInput(
  {
    value,
    onChange,
    onSubmit,
    placeholder = 'Digite uma mensagem',
    disabled = false,
    embeddedInPill = false,
    open: openProp,
    onOpenChange,
    showOpener = true,
    hideEmojiMenu = false,
  },
  ref
) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = typeof openProp === 'boolean' ? openProp : openInternal;
  const setOpen = (next: boolean) => {
    if (typeof openProp === 'boolean') onOpenChange?.(next);
    else setOpenInternal(next);
  };
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!open || hideEmojiMenu) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, hideEmojiMenu]);

  const insertAtCursor = useCallback((text: string) => {
    if (!text) return;
    const v = valueRef.current;
    const el = inputRef.current;
    const apply = (next: string, cursorPos: number) => {
      onChangeRef.current(next);
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursorPos, cursorPos);
      });
    };
    if (!el) {
      apply(`${v}${text}`, (v + text).length);
      return;
    }
    const start = el.selectionStart ?? v.length;
    const end = el.selectionEnd ?? v.length;
    const next = v.slice(0, start) + text + v.slice(end);
    const pos = start + text.length;
    apply(next, pos);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor,
      focus: () => {
        inputRef.current?.focus();
      },
    }),
    [insertAtCursor]
  );

  const insertEmojiFromMenu = (emoji: string) => {
    insertAtCursor(emoji);
    setOpen(false);
  };

  const emojiMenu =
    !hideEmojiMenu && open ? (
      <EmojiMenu
        open={open}
        onClose={() => setOpen(false)}
        darkMode={darkMode}
        onSelect={insertEmojiFromMenu}
      />
    ) : null;

  if (embeddedInPill) {
    return (
      <div ref={rootRef} className="relative flex min-h-[44px] min-w-0 flex-1 items-center gap-0.5">
        {showOpener ? (
          <ExpandableInputOpener
            open={open}
            onToggle={() => setOpen(!open)}
            disabled={disabled}
            className="mb-0"
            waGreenHover
          />
        ) : null}
        {emojiMenu}
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="max-h-32 min-h-[40px] w-full resize-none bg-transparent py-2 pl-1 pr-1 text-[15px] leading-snug text-[#111b21] placeholder:text-[#8696a0] focus:outline-none disabled:opacity-60 dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative flex flex-1 items-end gap-1">
      {showOpener ? (
        <ExpandableInputOpener
          open={open}
          onToggle={() => setOpen(!open)}
          disabled={disabled}
          className="mb-0.5"
        />
      ) : null}
      {emojiMenu}
      <div className="flex flex-1 items-end rounded-lg bg-white px-2 py-1 dark:bg-[#2a3942]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-2.5 pl-2 pr-2 text-[15px] leading-snug text-[#111b21] placeholder:text-[#8696a0] focus:outline-none disabled:opacity-60 dark:text-[#e9edef]"
        />
      </div>
    </div>
  );
});
