import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchHttpClient, getRetryDelayMs } from '../../src/core/fetch-client';
import type { Logger } from '../../src/core/ports/logger';

describe('getRetryDelayMs', () => {
  it('should return exponential backoff with cap', () => {
    expect(getRetryDelayMs(0, 1000)).toBe(1000);
    expect(getRetryDelayMs(1, 1000)).toBe(2000);
    expect(getRetryDelayMs(2, 1000)).toBe(4000);
    expect(getRetryDelayMs(3, 1000)).toBe(8000);
    expect(getRetryDelayMs(10, 1000)).toBe(30_000);
  });
});

describe('FetchHttpClient', () => {
  const mockFetch = vi.fn();
  const baseDelayMs = 100;
  const maxRetries = 3;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('retry behavior', () => {
    it('should retry GET on 5xx with exponential backoff and eventually succeed', async () => {
      const client = new FetchHttpClient(5000, maxRetries, baseDelayMs);
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'SERVER_ERROR' }), {
            status: 503,
            statusText: 'Service Unavailable',
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'SERVER_ERROR' }), {
            status: 502,
            statusText: 'Bad Gateway',
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: 'ok' }), {
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
          })
        );

      const resultPromise = client.get<{ data: string }>('https://api.example.com/foo');

      await vi.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(baseDelayMs);
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(baseDelayMs * 2);
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ data: 'ok' });
      }
    });

    it('should not retry POST on 5xx (only GET retries for now)', async () => {
      const client = new FetchHttpClient(5000, 2, baseDelayMs);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'SERVER_ERROR' }), {
          status: 503,
          statusText: 'Service Unavailable',
        })
      );

      const resultPromise = client.post<unknown>('https://api.example.com/foo', { x: 1 });
      await vi.advanceTimersByTimeAsync(0);

      const result = await resultPromise;
      expect(result.ok).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 4xx (e.g. 400)', async () => {
      const client = new FetchHttpClient(5000, 3, baseDelayMs);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Bad Request' }), {
          status: 400,
          statusText: 'Bad Request',
        })
      );

      const resultPromise = client.get<unknown>('https://api.example.com/foo');
      await vi.advanceTimersByTimeAsync(0);

      const result = await resultPromise;
      expect(result.ok).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logger and requestId', () => {
    it('should work without logger (no errors, no logger calls)', async () => {
      const client = new FetchHttpClient(5000, 0, baseDelayMs);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'ok' }), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        })
      );

      const result = await client.get<{ data: string }>('https://api.example.com/foo');
      expect(result.ok).toBe(true);
    });

    it('should call logger.debug with requestId in meta when logger is injected', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const client = new FetchHttpClient(5000, 0, baseDelayMs, mockLogger);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'ok' }), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        })
      );

      await client.get<{ data: string }>('https://api.example.com/bar');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          requestId: expect.any(String),
          url: 'https://api.example.com/bar',
          method: 'GET',
        })
      );
    });

    it('should include requestId in error.details on HTTP error when logger is present', async () => {
      const client = new FetchHttpClient(5000, 0, baseDelayMs);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
        })
      );

      const result = await client.get<unknown>('https://api.example.com/foo');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.details).toBeDefined();
        const details = result.error.details as Record<string, unknown>;
        expect(details.requestId).toBeDefined();
        expect(typeof details.requestId).toBe('string');
      }
    });

    it('should send X-Request-Id header in fetch request', async () => {
      const client = new FetchHttpClient(5000, 0, baseDelayMs);
      mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const headers = init?.headers;
        const requestId =
          headers instanceof Headers
            ? headers.get('X-Request-Id')
            : (headers as Record<string, string>)?.['X-Request-Id'];
        return Promise.resolve(
          new Response(JSON.stringify({ requestId }), {
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
          })
        );
      });

      const result = await client.get<{ requestId: string }>('https://api.example.com/foo');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.requestId).toBeDefined();
        expect(typeof result.value.requestId).toBe('string');
      }
      const call = mockFetch.mock.calls[0];
      const init = call?.[1] as RequestInit | undefined;
      const headers = init?.headers;
      if (headers instanceof Headers) {
        expect(headers.get('X-Request-Id')).toBeTruthy();
      } else {
        expect((headers as Record<string, string>)?.['X-Request-Id']).toBeTruthy();
      }
    });

    it('should use increasing delay between GET retries (exponential backoff)', async () => {
      const client = new FetchHttpClient(5000, 3, 100);
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler, ms?: number) => {
        if (typeof ms === 'number' && ms > 0 && ms < 5000) delays.push(ms);
        return originalSetTimeout(fn, ms);
      });

      mockFetch
        .mockResolvedValueOnce(new Response('', { status: 503, statusText: 'Unavailable' }))
        .mockResolvedValueOnce(new Response('', { status: 503, statusText: 'Unavailable' }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
          })
        );

      const resultPromise = client.get<{ ok: boolean }>('https://api.example.com/bar');

      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(delays).toContain(100);
      expect(delays).toContain(200);
    });
  });

  describe('204 No Content and empty body', () => {
    it('returns ok(undefined) for 204 without calling response.json()', async () => {
      const client = new FetchHttpClient(5000, 0, baseDelayMs);
      const jsonSpy = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: jsonSpy,
      });

      const result = await client.post<void>('https://api.example.com/verify', {});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('returns ok(undefined) when content-length is 0 and status 200', async () => {
      const client = new FetchHttpClient(5000, 0, baseDelayMs);
      mockFetch.mockResolvedValue(
        new Response('', {
          status: 200,
          headers: new Headers({ 'Content-Length': '0' }),
        })
      );

      const result = await client.post<void>('https://api.example.com/empty', {});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
    });
  });
});
