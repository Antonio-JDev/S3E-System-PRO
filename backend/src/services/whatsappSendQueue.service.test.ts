import { getWhatsappSendQueueStats, sleep, withWhatsappSendLock } from './whatsappSendQueue.service';

const ORIGINAL_ENV = { ...process.env };

function resetEnv(): void {
  process.env = { ...ORIGINAL_ENV };
}

describe('whatsappSendQueue / withWhatsappSendLock', () => {
  beforeEach(() => {
    resetEnv();
    process.env.WHATSAPP_SEND_JITTER_MS_MIN = '10';
    process.env.WHATSAPP_SEND_JITTER_MS_MAX = '20';
    process.env.WHATSAPP_SEND_LOCK_DISABLE = '';
  });

  afterAll(() => {
    resetEnv();
  });

  it('executa jobs em SÉRIE mesmo quando agendados em paralelo', async () => {
    const events: string[] = [];

    const runJob = (label: string, durationMs: number) =>
      withWhatsappSendLock({ label }, async () => {
        events.push(`start:${label}`);
        await sleep(durationMs);
        events.push(`end:${label}`);
      });

    await Promise.all([runJob('A', 30), runJob('B', 30), runJob('C', 30)]);

    expect(events).toEqual([
      'start:A',
      'end:A',
      'start:B',
      'end:B',
      'start:C',
      'end:C'
    ]);
  });

  it('aplica jitter pós-job no intervalo configurado [MIN, MAX]', async () => {
    process.env.WHATSAPP_SEND_JITTER_MS_MIN = '40';
    process.env.WHATSAPP_SEND_JITTER_MS_MAX = '60';

    const t0 = Date.now();
    await withWhatsappSendLock({ label: 'first' }, async () => {});
    await withWhatsappSendLock({ label: 'second' }, async () => {});
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(60 * 2 + 200);

    const stats = getWhatsappSendQueueStats();
    expect(stats.lastJitterMs).not.toBeNull();
    expect(stats.lastJitterMs!).toBeGreaterThanOrEqual(40);
    expect(stats.lastJitterMs!).toBeLessThanOrEqual(60);
  });

  it('pula o jitter quando skipJitter=true', async () => {
    process.env.WHATSAPP_SEND_JITTER_MS_MIN = '200';
    process.env.WHATSAPP_SEND_JITTER_MS_MAX = '200';

    const t0 = Date.now();
    await withWhatsappSendLock({ label: 'no-jitter', skipJitter: true }, async () => {});
    await withWhatsappSendLock({ label: 'no-jitter-2', skipJitter: true }, async () => {});
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(150);
  });

  it('propaga erro do job e ainda aplica jitter antes de liberar o lock', async () => {
    process.env.WHATSAPP_SEND_JITTER_MS_MIN = '30';
    process.env.WHATSAPP_SEND_JITTER_MS_MAX = '30';

    const events: string[] = [];

    const failing = withWhatsappSendLock({ label: 'fail' }, async () => {
      events.push('start:fail');
      throw new Error('boom');
    }).catch((err) => {
      events.push(`caught:${(err as Error).message}`);
    });

    const next = failing.then(() =>
      withWhatsappSendLock({ label: 'next' }, async () => {
        events.push('start:next');
      })
    );

    await next;

    expect(events).toEqual(['start:fail', 'caught:boom', 'start:next']);
  });

  it('faz bypass total quando WHATSAPP_SEND_LOCK_DISABLE=1 (paralelismo livre)', async () => {
    process.env.WHATSAPP_SEND_LOCK_DISABLE = '1';

    const events: string[] = [];
    const runJob = (label: string, durationMs: number) =>
      withWhatsappSendLock({ label }, async () => {
        events.push(`start:${label}`);
        await sleep(durationMs);
        events.push(`end:${label}`);
      });

    await Promise.all([runJob('A', 30), runJob('B', 30)]);

    expect(events.slice(0, 2)).toEqual(expect.arrayContaining(['start:A', 'start:B']));
    expect(events.slice(2, 4)).toEqual(expect.arrayContaining(['end:A', 'end:B']));
  });

  it('aceita a assinatura curta (apenas callback) sem options', async () => {
    process.env.WHATSAPP_SEND_JITTER_MS_MIN = '5';
    process.env.WHATSAPP_SEND_JITTER_MS_MAX = '10';
    const out = await withWhatsappSendLock(async () => 42);
    expect(out).toBe(42);
  });
});
