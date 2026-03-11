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
