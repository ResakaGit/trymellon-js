import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitWithAbort } from '../../src/core/polling-utils';

describe('waitWithAbort', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Given no signal, when timer elapses, then returns completed', async () => {
    vi.useFakeTimers();
    const promise = waitWithAbort(1000);
    vi.advanceTimersByTime(1000);
    const result = await promise;
    expect(result).toBe('completed');
  });

  it('Given signal already aborted before call, then returns aborted immediately', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await waitWithAbort(60_000, controller.signal);
    expect(result).toBe('aborted');
  });

  it('Given active signal, when signal aborts before timer, then returns aborted', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = waitWithAbort(5000, controller.signal);
    controller.abort();
    const result = await promise;
    expect(result).toBe('aborted');
  });

  it('Given active signal, when timer fires before any abort, then returns completed', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = waitWithAbort(1000, controller.signal);
    vi.advanceTimersByTime(1000);
    const result = await promise;
    expect(result).toBe('completed');
  });
});
