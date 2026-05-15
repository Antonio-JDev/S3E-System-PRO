type BackoffState = {
  attempt: number;
  nextAllowedAt: number;
  lastTriggeredAt: number;
};

const stateByKey = new Map<string, BackoffState>();

function jitterMs(ms: number): number {
  // jitter leve para evitar "thundering herd" de cliques/abas
  const j = Math.round(ms * 0.2);
  return Math.floor(Math.random() * (j + 1));
}

export function getBackoffRemainingMs(key: string, now = Date.now()): number {
  const s = stateByKey.get(key);
  if (!s) return 0;
  return Math.max(0, s.nextAllowedAt - now);
}

export function registerRateLimitBackoff(
  key: string,
  opts?: { baseMs?: number; maxMs?: number; now?: number }
): { waitMs: number; attempt: number } {
  const now = opts?.now ?? Date.now();
  const base = Math.max(1000, opts?.baseMs ?? 10_000);
  const max = Math.max(base, opts?.maxMs ?? 120_000);

  const prev = stateByKey.get(key);
  const attempt = Math.min(10, (prev?.attempt ?? 0) + 1);
  const backoff = Math.min(max, base * Math.pow(2, attempt - 1));
  const waitMs = Math.min(max, backoff + jitterMs(backoff));

  stateByKey.set(key, { attempt, nextAllowedAt: now + waitMs, lastTriggeredAt: now });
  return { waitMs, attempt };
}

export function registerBackoffSuccess(key: string): void {
  stateByKey.delete(key);
}

