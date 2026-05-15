interface ExpandableInputOpenerProps {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  /** Hover verde estilo barra do WhatsApp Web (compositor) */
  waGreenHover?: boolean;
}

export function ExpandableInputOpener({
  open,
  onToggle,
  disabled,
  className = '',
  waGreenHover = false
}: ExpandableInputOpenerProps) {
  const hover =
    waGreenHover
      ? 'hover:bg-[#00a884]/14 dark:hover:bg-[#00a884]/28'
      : 'hover:bg-black/5 dark:hover:bg-white/5';
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label="Abrir seletor de emojis"
      aria-expanded={open}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition disabled:opacity-50 dark:text-[#8696a0] ${hover} ${className}`}
    >
      <span className="text-xl leading-none" aria-hidden>
        🙂
      </span>
    </button>
  );
}
