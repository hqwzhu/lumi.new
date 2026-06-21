import { describe, expect, it, vi } from 'vitest';
import { Scheduler } from '../server/scheduler';

describe('Scheduler', () => {
  it.each([
    ['every_10s', 10_000],
    ['every_1m', 60_000],
    ['every_10m', 10 * 60_000],
    ['every_hour', 60 * 60_000],
    ['every_24h', 24 * 60 * 60_000],
  ])('honors the %s interval alias', (cron, intervalMs) => {
    vi.useFakeTimers();

    const scheduler = new Scheduler();
    const handler = vi.fn(async () => null);

    scheduler.register({
      id: `task_${cron}`,
      cron,
      lastRun: null,
      handler,
    });

    vi.advanceTimersByTime(intervalMs - 1);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);

    scheduler.stop();
    vi.useRealTimers();
  });

  it('does not run far-future cron tasks early when their delay exceeds Node timeout limits', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T16:00:00.000Z'));

    const scheduler = new Scheduler();
    const handler = vi.fn(async () => null);

    scheduler.register({
      id: 'yearly_review',
      cron: '0 0 1 1 *',
      lastRun: null,
      handler,
    });

    vi.advanceTimersByTime(60_000);

    expect(handler).not.toHaveBeenCalled();

    scheduler.stop();
    vi.useRealTimers();
  });
});
