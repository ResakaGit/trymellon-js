import type { HttpClient } from './http-client';
import type { Logger } from './ports/logger';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError, type TryMellonError, type TryMellonErrorCode } from '../errors';

const RETRY_DELAY_CAP_MS = 30_000;

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Exponential backoff delay for a given attempt (0-based).
 * Cap at RETRY_DELAY_CAP_MS.
 */
export function getRetryDelayMs(attempt: number, baseMs: number): number {
  const delay = baseMs * Math.pow(2, attempt);
  return Math.min(delay, RETRY_DELAY_CAP_MS);
}

function shouldRetryOnStatus(method: string, status: number): boolean {
  if (method !== 'GET') return false;
  return status >= 500 || status === 429;
}

export class FetchHttpClient implements HttpClient {
  constructor(
    private readonly timeoutMs: number,
    private readonly maxRetries: number = 0,
    private readonly retryDelayMs: number = 1000,
    private readonly logger?: Logger
  ) {}

  async get<T>(url: string, headers?: Record<string, string>): Promise<Result<T, TryMellonError>> {
    return this.request<T>(url, { method: 'GET', headers });
  }

  async post<T>(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<Result<T, TryMellonError>> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  }

  private async request<T>(url: string, config: RequestInit): Promise<Result<T, TryMellonError>> {
    const method = (config.method ?? 'GET').toUpperCase();
    const requestId = generateRequestId();
    const headers = new Headers(config.headers as HeadersInit);
    headers.set('X-Request-Id', requestId);

    if (this.logger) {
      this.logger.debug('request', { requestId, url, method });
    }

    let lastError: TryMellonError | Error | unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await fetch(url, {
            ...config,
            headers,
            signal: controller.signal,
          });

          if (!response.ok) {
            let errorData: unknown;
            try {
              errorData = await response.json();
            } catch {
              // Ignore JSON parse error
            }

            const body = errorData as { message?: string; error?: string } | undefined;
            const message = body?.message ?? response.statusText;
            const rawCode = body?.error;
            const code: TryMellonErrorCode =
              rawCode === 'challenge_mismatch'
                ? 'CHALLENGE_MISMATCH'
                : ((rawCode as TryMellonErrorCode | undefined) ?? 'NETWORK_FAILURE');
            const errResult = createError(code, message, {
              requestId,
              status: response.status,
              statusText: response.statusText,
              data: errorData,
            });

            if (shouldRetryOnStatus(method, response.status) && attempt < this.maxRetries) {
              lastError = errResult;
              await new Promise((resolve) =>
                setTimeout(resolve, getRetryDelayMs(attempt, this.retryDelayMs))
              );
              continue;
            }

            return err(errResult);
          }

          const data = (await response.json()) as T;
          return ok(data);
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error;
        const isGet = method === 'GET';
        if (isGet && attempt < this.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, getRetryDelayMs(attempt, this.retryDelayMs))
          );
        } else {
          break;
        }
      }
    }

    if (lastError instanceof Error && lastError.name === 'AbortError') {
      return err(createError('TIMEOUT', 'Request timed out', { requestId }));
    }

    return err(
      createError(
        'NETWORK_FAILURE',
        lastError instanceof Error ? lastError.message : 'Request failed',
        { requestId, cause: lastError }
      )
    );
  }
}
