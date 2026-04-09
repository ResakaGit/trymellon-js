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
 * When headers are provided uses fetch-based SSE (ReadableStream) so the token never
 * appears in the URL. Falls back to EventSource (no headers) when headers is empty/omitted
 * and EventSource is available. Falls back to pollFn on any SSE error.
 * Correctly wires AbortSignal to all paths.
 */
export function withSseFallback<T>(
  url: string,
  pollFn: () => Promise<Result<T, TryMellonError>>,
  parseMessage: (event: MessageEvent | { data: string }) => Result<T, TryMellonError> | null,
  signal?: AbortSignal,
  headers?: Record<string, string>
): Promise<Result<T, TryMellonError>> {
  return new Promise((resolve) => {
    let settled = false;
    let es: EventSource | undefined;

    const onDone = (result: Result<T, TryMellonError>) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const onAbort = () => {
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      onDone(err(createError('ABORT_ERROR', 'Operation aborted by user or timeout')));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    if (signal?.aborted) {
      onAbort();
      return;
    }

    const hasHeaders = headers != null && Object.keys(headers).length > 0;

    // Fetch-based SSE path: supports custom headers, token stays off the URL.
    if (hasHeaders && typeof fetch !== 'undefined') {
      fetch(url, { headers, signal })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            pollFn().then(onDone);
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!settled) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trimStart();
              const result = parseMessage({ data });
              if (result !== null) {
                onDone(result);
                return;
              }
            }
          }
          if (!settled) pollFn().then(onDone);
        })
        .catch(() => {
          if (!settled) pollFn().then(onDone);
        });
      return;
    }

    // EventSource path: no custom headers, token must be in URL if needed.
    if (typeof EventSource === 'undefined') {
      pollFn().then(onDone);
      return;
    }

    try {
      es = new EventSource(url);
    } catch {
      pollFn().then(onDone);
      return;
    }

    const cleanup = () => {
      try {
        es?.close();
      } catch {
        /* ignore */
      }
    };

    const origOnDone = onDone;
    const wrappedOnDone = (result: Result<T, TryMellonError>) => {
      cleanup();
      origOnDone(result);
    };

    es.onmessage = (event: MessageEvent) => {
      const result = parseMessage(event);
      if (result !== null) wrappedOnDone(result);
    };

    es.onerror = () => {
      if (settled) return;
      cleanup();
      pollFn().then(onDone);
    };
  });
}
