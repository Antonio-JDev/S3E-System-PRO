import { useEffect, useRef, useState } from 'react';
import { EmojiMenu } from './EmojiMenu';
import { ExpandableInputOpener } from './ExpandableInputOpener';

interface EmojiInputProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmojiInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Digite uma mensagem',
  disabled = false
}: EmojiInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const insertEmoji = (emoji: string) => {
    if (!emoji) return;
    const el = inputRef.current;
    if (!el) {
      onChange(`${value}${emoji}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div ref={rootRef} className="relative flex flex-1 items-end gap-1">
      <ExpandableInputOpener open={open} onToggle={() => setOpen((v) => !v)} disabled={disabled} />
      <EmojiMenu
        open={open}
        onClose={() => setOpen(false)}
        darkMode={darkMode}
        onSelect={(emoji) => {
          insertEmoji(emoji);
          setOpen(false);
        }}
      />
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
}
