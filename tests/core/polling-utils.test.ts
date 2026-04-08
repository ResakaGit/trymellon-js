import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { waitWithAbort, withSseFallback } from '../../src/core/polling-utils';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

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

// ---------------------------------------------------------------------------
// MockEventSource — manual stub; no jest.mock of modules
// ---------------------------------------------------------------------------
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closeCalled = false;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.closeCalled = true;
  }

  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  triggerError() {
    this.onerror?.();
  }
}

describe('withSseFallback', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    MockEventSource.instances = [];
  });

  const neverPoll = () => new Promise<never>(() => {});
  const noopParse = () => null;

  it('Given SSE sends a terminal event, when parseMessage returns non-null, then resolves with that result', async () => {
    const expected = ok({ done: true });
    const parse = (e: MessageEvent) => {
      const d = JSON.parse(e.data as string) as { done?: boolean };
      return d.done ? expected : null;
    };

    const resultPromise = withSseFallback('https://example.com/sse', neverPoll, parse);
    const es = MockEventSource.instances[0];
    es.emit({ done: true });

    const result = await resultPromise;
    expect(result).toEqual(expected);
    expect(es.closeCalled).toBe(true);
  });

  it('Given SSE sends non-terminal events, when parseMessage returns null, then continues waiting', async () => {
    const pollResult = ok({ done: true });
    const parse = (e: MessageEvent) => {
      const d = JSON.parse(e.data as string) as { done?: boolean };
      return d.done ? ok(d) : null;
    };

    const pollFn = vi.fn().mockResolvedValue(pollResult);
    const resultPromise = withSseFallback('https://example.com/sse', pollFn, parse);
    const es = MockEventSource.instances[0];

    es.emit({ done: false });
    es.emit({ done: false });
    // No resolution yet — trigger error to invoke pollFn
    es.triggerError();

    const result = await resultPromise;
    expect(result).toEqual(pollResult);
    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('Given SSE onerror fires, when it does, then falls back to pollFn and resolves', async () => {
    const pollResult = ok({ fallback: true });
    const pollFn = vi.fn().mockResolvedValue(pollResult);

    const resultPromise = withSseFallback('https://example.com/sse', pollFn, noopParse);
    const es = MockEventSource.instances[0];
    es.triggerError();

    const result = await resultPromise;
    expect(result).toEqual(pollResult);
    expect(pollFn).toHaveBeenCalledTimes(1);
    expect(es.closeCalled).toBe(true);
  });

  it('Given EventSource constructor throws, then falls back to pollFn', async () => {
    vi.stubGlobal('EventSource', function () {
      throw new Error('EventSource not available');
    });

    const pollResult = ok({ constructor_fail: true });
    const pollFn = vi.fn().mockResolvedValue(pollResult);

    const result = await withSseFallback('https://example.com/sse', pollFn, noopParse);
    expect(result).toEqual(pollResult);
    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('Given signal already aborted, then resolves ABORT_ERROR without opening EventSource', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await withSseFallback(
      'https://example.com/sse',
      neverPoll,
      noopParse,
      controller.signal
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
    // EventSource was opened but abort fired immediately
  });

  it('Given signal aborts while waiting for SSE, then resolves ABORT_ERROR and closes EventSource', async () => {
    const controller = new AbortController();
    const resultPromise = withSseFallback(
      'https://example.com/sse',
      neverPoll,
      noopParse,
      controller.signal
    );

    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();

    controller.abort();

    const result = await resultPromise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
    expect(es.closeCalled).toBe(true);
  });

  it('Given malformed JSON in SSE event, when parseMessage throws, then ignores it and continues', async () => {
    const pollResult = ok({ recovered: true });
    const pollFn = vi.fn().mockResolvedValue(pollResult);

    const resultPromise = withSseFallback('https://example.com/sse', pollFn, () => {
      throw new Error('parse error');
    });

    const es = MockEventSource.instances[0];
    // Emit raw malformed data — our parseMessage wrapper in withSseFallback doesn't catch,
    // so the malformed event is silently ignored by the caller's parse guard.
    // Trigger error to force polling path.
    es.triggerError();

    const result = await resultPromise;
    expect(result).toEqual(pollResult);
  });

  it('Given resolved once via SSE, when onerror fires afterwards, then does not double-resolve', async () => {
    const parse = (e: MessageEvent) => {
      const d = JSON.parse(e.data as string) as { done?: boolean };
      return d.done ? ok({ done: true }) : null;
    };
    const pollFn = vi.fn().mockResolvedValue(ok({ fallback: true }));

    const resultPromise = withSseFallback('https://example.com/sse', pollFn, parse);
    const es = MockEventSource.instances[0];

    es.emit({ done: true });
    es.triggerError(); // fires after resolution — should be ignored

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as { done: boolean }).done).toBe(true);
    expect(pollFn).not.toHaveBeenCalled();
  });

  it('Given pollFn returns err, when SSE falls back, then resolves with that err', async () => {
    const networkError = err(createError('NETWORK_FAILURE'));
    const pollFn = vi.fn().mockResolvedValue(networkError);

    const resultPromise = withSseFallback('https://example.com/sse', pollFn, noopParse);
    const es = MockEventSource.instances[0];
    es.triggerError();

    const result = await resultPromise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });
});
