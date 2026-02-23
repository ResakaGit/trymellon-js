import type { HttpClient } from './http-client';
import type { Logger } from './ports/logger';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import {
  createError,
  mapBackendErrorCodeToTryMellon,
  type TryMellonError,
  type TryMellonErrorCode,
} from '../errors';

/** Fintech success envelope: { ok: true, resultado: T } */
function isEnvelopeSuccess(data: unknown): data is { ok: true; resultado: unknown } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).ok === true &&
    'resultado' in (data as Record<string, unknown>)
  );
}

/** Fintech error envelope: { ok: false, error: { code, message } } */
function isEnvelopeError(
  data: unknown
): data is { ok: false; error: { code: string; message: string; details?: unknown } } {
  if (typeof data !== 'object' || data === null) return false;
  const o = data as Record<string, unknown>;
  if (o.ok !== false || !o.error || typeof o.error !== 'object') return false;
  const err = o.error as Record<string, unknown>;
  return typeof err.code === 'string' && typeof err.message === 'string';
}

const RETRY_DELAY_CAP_MS = 30_000;

/**
 * Generates a unique request ID. Uses globalThis.crypto.randomUUID only (Elite: no Node crypto).
 * @throws Error when Web Crypto API is not available (Edge/browser must provide it).
 */
function generateRequestId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  throw new Error('Web Crypto API is required but not available.');
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

            let message: string;
            let code: TryMellonErrorCode;

            if (isEnvelopeError(errorData)) {
              message = errorData.error.message;
              code = mapBackendErrorCodeToTryMellon(errorData.error.code);
            } else {
              const body = errorData as
                | {
                    message?: string;
                    error?: string | { code?: string; message?: string };
                  }
                | undefined;
              const errObj = body?.error;
              if (
                typeof errObj === 'object' &&
                errObj !== null &&
                'code' in errObj &&
                typeof (errObj as { code: string }).code === 'string'
              ) {
                message =
                  (errObj as { message?: string }).message ?? body?.message ?? response.statusText;
                code = mapBackendErrorCodeToTryMellon((errObj as { code: string }).code);
              } else {
                message = body?.message ?? response.statusText;
                const rawCode = body?.error;
                code =
                  typeof rawCode === 'string'
                    ? mapBackendErrorCodeToTryMellon(rawCode)
                    : rawCode === undefined
                      ? 'NETWORK_FAILURE'
                      : mapBackendErrorCodeToTryMellon(String(rawCode));
              }
            }

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

          if (response.status === 204) {
            return ok(undefined as T);
          }
          const contentLength = response.headers.get('content-length');
          if (contentLength === '0') {
            return ok(undefined as T);
          }
          const raw = (await response.json()) as unknown;
          if (isEnvelopeSuccess(raw)) {
            return ok((raw as { ok: true; resultado: T }).resultado);
          }
          const o = raw as Record<string, unknown>;
          if (typeof raw === 'object' && raw !== null && o.ok === true && !('resultado' in o)) {
            return ok(undefined as T);
          }
          return ok(raw as T);
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
