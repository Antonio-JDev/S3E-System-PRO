import { useEffect } from 'react';

export function useF1Key(
  enabled: boolean,
  onOpen: () => void
) {
  useEffect(() => {
    if (!enabled) return;

    const handleF1 = (event: KeyboardEvent) => {
      if (event.key !== 'F1') return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    };

    window.addEventListener('keydown', handleF1);
    return () => window.removeEventListener('keydown', handleF1);
  }, [enabled, onOpen]);
}
