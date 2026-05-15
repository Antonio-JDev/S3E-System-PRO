/**
 * Fila de envio do WhatsApp (mutex em memória).
 *
 * Por que existe:
 *  - O backend pode receber 7 operadores clicando "Enviar" ao mesmo tempo.
 *  - Sem fila, 7 chamadas paralelas batem na Evolution Go com pushes idênticos,
 *    criam race no `whatsappNumbers` (resolução de @lid) e configuram um padrão
 *    de tráfego "robótico" que o WhatsApp detecta → risco de ban.
 *  - Solução: serializar TODOS os envios num único worker dentro do processo,
 *    com pausa aleatória (jitter) entre cada job para parecer humano.
 *
 * Como funciona:
 *  - Lock global em memória via `async-lock` (chave fixa LOCK_KEY).
 *  - Cada envio executa `await fn()` SOB o lock; após retornar (sucesso OU erro),
 *    aplica um sleep aleatório entre WHATSAPP_SEND_JITTER_MS_MIN/MAX antes de
 *    liberar o lock — assim o próximo job só começa "no ritmo humano".
 *  - O sleep do jitter NÃO atrasa a resposta HTTP pro operador atual; apenas
 *    atrasa o início do próximo job na fila.
 *  - Kill-switch: WHATSAPP_SEND_LOCK_DISABLE=1 desativa o lock (bypass total).
 *
 * Configuração (env):
 *  - WHATSAPP_SEND_LOCK_DISABLE         '1' desativa o lock (bypass total)
 *  - WHATSAPP_SEND_JITTER_MS_MIN        default 2000
 *  - WHATSAPP_SEND_JITTER_MS_MAX        default 5000
 *  - WHATSAPP_SEND_LOCK_TIMEOUT_MS      default 120000 (2min máx esperando)
 *
 * Migração futura para BullMQ + Redis: a interface `withWhatsappSendLock(fn)`
 * permanece — o que muda é o backend (Redis). Os controllers/providers não
 * precisam ser tocados.
 */
import AsyncLock from 'async-lock';

const LOCK_KEY = 'whatsapp-send-global';

const lock = new AsyncLock({
  timeout: Number(process.env.WHATSAPP_SEND_LOCK_TIMEOUT_MS || 120_000),
  maxPending: 1000,
  domainReentrant: false
});

let pendingCount = 0;
let lastJitterMs: number | null = null;
let lastJobAt: Date | null = null;
let totalProcessed = 0;
let totalFailed = 0;

export interface WithWhatsappSendLockOptions {
  /** Rótulo curto pra logs (ex.: 'sendText', 'sendMedia'). */
  label?: string;
  /** Quando true, pula o jitter pós-job (use só pra envios de baixo risco). */
  skipJitter?: boolean;
}

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

function jitterMs(): number {
  const lo = envInt('WHATSAPP_SEND_JITTER_MS_MIN', 2_000);
  const hi = envInt('WHATSAPP_SEND_JITTER_MS_MAX', 5_000);
  const [min, max] = lo <= hi ? [lo, hi] : [hi, lo];
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/** Estatísticas leves pra debug/logs. Não persistido. */
export function getWhatsappSendQueueStats() {
  return {
    pending: pendingCount,
    lastJitterMs,
    lastJobAt: lastJobAt ? lastJobAt.toISOString() : null,
    totalProcessed,
    totalFailed,
    lockDisabled: process.env.WHATSAPP_SEND_LOCK_DISABLE === '1'
  };
}

/**
 * Serializa o envio de uma mensagem pelo provedor (Evolution Go).
 *
 * @example
 *   await withWhatsappSendLock({ label: 'sendText' }, async () => {
 *     await refreshContatoS3eFromWhatsappNumbers(chatId);
 *     return sendTextToEvolution(...);
 *   });
 */
export async function withWhatsappSendLock<T>(
  optsOrFn: WithWhatsappSendLockOptions | (() => Promise<T>),
  maybeFn?: () => Promise<T>
): Promise<T> {
  const opts: WithWhatsappSendLockOptions =
    typeof optsOrFn === 'function' ? {} : optsOrFn || {};
  const fn = typeof optsOrFn === 'function' ? optsOrFn : maybeFn;
  if (!fn) throw new Error('withWhatsappSendLock: callback ausente');

  if (process.env.WHATSAPP_SEND_LOCK_DISABLE === '1') {
    return fn();
  }

  pendingCount++;
  try {
    return await lock.acquire<T>(LOCK_KEY, async () => {
      const startedAt = Date.now();
      try {
        const out = await fn();
        totalProcessed++;
        return out;
      } catch (err) {
        totalFailed++;
        throw err;
      } finally {
        lastJobAt = new Date();
        if (!opts.skipJitter) {
          const ms = jitterMs();
          lastJitterMs = ms;
          if (process.env.WHATSAPP_SEND_DEBUG === '1') {
            const elapsed = Date.now() - startedAt;
            console.debug(
              '[WA-QUEUE] %s ok=%s elapsed=%dms jitter=%dms pending=%d',
              opts.label || 'send',
              totalFailed === 0,
              elapsed,
              ms,
              pendingCount - 1
            );
          }
          await sleep(ms);
        } else {
          lastJitterMs = 0;
        }
      }
    });
  } finally {
    pendingCount--;
  }
}
