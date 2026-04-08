import type { Result } from '../utils/result';
import { err } from '../utils/result';
import type { TryMellonError } from '../errors';
import { createError } from '../errors';

export async function waitWithAbort(
  intervalMs: number,
  signal?: AbortSignal
): Promise<'aborted' | 'completed'> {
  // Fast path when no signal is provided: simple sleep.
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    return 'completed';
  }

  if (signal.aborted) {
    return 'aborted';
  }

  return new Promise<'aborted' | 'completed'>((resolve) => {
    const onAbort = () => {
      cleanup();
      resolve('aborted');
    };

    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve('completed');
    }, intervalMs);

    signal.addEventListener('abort', onAbort);
  });
}

/**
 * Wraps a polling function with SSE-push acceleration.
 * Opens EventSource for real-time completion; falls back to pollFn on SSE error or constructor failure.
 * Correctly wires AbortSignal to both the SSE and polling paths.
 * Only call when EventSource is available (typeof EventSource !== 'undefined').
 */
export function withSseFallback<T>(
  url: string,
  pollFn: () => Promise<Result<T, TryMellonError>>,
  parseMessage: (event: MessageEvent) => Result<T, TryMellonError> | null,
  signal?: AbortSignal
): Promise<Result<T, TryMellonError>> {
  return new Promise((resolve) => {
    let settled = false;
    let es: EventSource | undefined;

    const onDone = (result: Result<T, TryMellonError>) => {
      if (settled) return;
      settled = true;
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const onAbort = () =>
      onDone(err(createError('ABORT_ERROR', 'Operation aborted by user or timeout')));
    signal?.addEventListener('abort', onAbort, { once: true });

    // Abort event only fires for future aborts — check if already aborted after registering
    if (signal?.aborted) {
      onAbort();
      return;
    }

    try {
      es = new EventSource(url);
    } catch {
      pollFn().then(onDone);
      return;
    }

    es.onmessage = (event: MessageEvent) => {
      const result = parseMessage(event);
      if (result !== null) onDone(result);
    };

    es.onerror = () => {
      if (settled) return;
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      pollFn().then(onDone);
    };
  });
}
