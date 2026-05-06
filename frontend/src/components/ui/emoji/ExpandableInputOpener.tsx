interface ExpandableInputOpenerProps {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ExpandableInputOpener({ open, onToggle, disabled }: ExpandableInputOpenerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label="Abrir seletor de emojis"
      aria-expanded={open}
      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5 disabled:opacity-50 dark:text-[#8696a0] dark:hover:bg-white/5"
    >
      <span className="text-xl leading-none" aria-hidden>
        🙂
      </span>
    </button>
  );
}
