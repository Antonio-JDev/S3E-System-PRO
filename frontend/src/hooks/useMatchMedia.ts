import { useEffect, useState } from 'react';

/** Observa media query (ex.: layout mobile do chat WhatsApp em telas &lt; 780px). */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Breakpoint alinhado ao layout mobile do WhatsApp CRM. */
export const WA_MOBILE_MEDIA = '(max-width: 779px)';
