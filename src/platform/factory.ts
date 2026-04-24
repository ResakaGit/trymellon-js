import { ok, err, type Result } from '../utils/result';
import { createError, createInvalidArgumentError, type TryMellonError } from '../errors';
import type {
  TryMellonPlatform,
  TryMellonPlatformConfig,
  CreateSignupLinkOptions,
  CreateSignupLinkResult,
  SignupStatusResult,
  SignupStatus,
  AwaitSignupCompletionOptions,
  AwaitSignupCompletionResult,
} from './types';

const DEFAULT_API_BASE_URL = 'https://api.trymellon.com';
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_MAX_ATTEMPTS = 60;

function assertHttpsUrl(field: string, value: string): Result<void, TryMellonError> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return err(createInvalidArgumentError(field, 'must be a valid URL'));
  }
  if (parsed.protocol !== 'https:') {
    return err(createInvalidArgumentError(field, 'must use https scheme'));
  }
  return ok(undefined);
}

function terminal(status: SignupStatus): status is 'completed' | 'expired' | 'failed' {
  return status === 'completed' || status === 'expired' || status === 'failed';
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<'ok' | 'aborted'> {
  if (signal?.aborted) return Promise.resolve('aborted');
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve('ok');
    }, ms);
    const onAbort = (): void => {
      cleanup();
      resolve('aborted');
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

interface FintechEnvelopeOk<T> {
  readonly ok: true;
  readonly data: T;
}

interface FintechEnvelopeErr {
  readonly ok: false;
  readonly error: { readonly code?: string; readonly message?: string };
}

type FintechEnvelope<T> = FintechEnvelopeOk<T> | FintechEnvelopeErr;

async function fetchJson<T>(url: string, init: RequestInit): Promise<Result<T, TryMellonError>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    return err(createError('NETWORK_FAILURE', e instanceof Error ? e.message : 'fetch failed'));
  }

  let body: FintechEnvelope<T> | null = null;
  try {
    body = (await response.json()) as FintechEnvelope<T>;
  } catch {
    // fall through — treat non-JSON as server error below.
  }

  if (!response.ok || !body || body.ok === false) {
    const code = body && body.ok === false ? body.error?.code : undefined;
    const message =
      (body && body.ok === false ? body.error?.message : undefined) ?? 'Request failed';
    return err(createError(mapBackendCode(code), message));
  }
  return ok(body.data);
}

function mapBackendCode(code?: string): TryMellonError['code'] {
  if (!code) return 'SERVER_ERROR';
  if (code === 'invalid_return_url' || code === 'invalid_refresh_url') return 'INVALID_ARGUMENT';
  if (code === 'rate_limit_exceeded') return 'RATE_LIMIT_EXCEEDED';
  if (code === 'forbidden') return 'FORBIDDEN';
  if (code === 'not_found') return 'NOT_FOUND';
  return 'SERVER_ERROR';
}

export function createPlatform(config: TryMellonPlatformConfig = {}): TryMellonPlatform {
  const apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

  return {
    async createSignupLink(
      opts: CreateSignupLinkOptions
    ): Promise<Result<CreateSignupLinkResult, TryMellonError>> {
      // B1 fix 2026-04-23 — returnUrl opcional. Si se provee, validar client-side.
      if (opts.returnUrl !== undefined) {
        const returnCheck = assertHttpsUrl('returnUrl', opts.returnUrl);
        if (!returnCheck.ok) return returnCheck;
      }
      if (opts.refreshUrl !== undefined) {
        const refreshCheck = assertHttpsUrl('refreshUrl', opts.refreshUrl);
        if (!refreshCheck.ok) return refreshCheck;
      }

      const body: Record<string, unknown> = {
        user_role: opts.userRole ?? 'maintainer',
      };
      if (opts.returnUrl !== undefined) body.return_url = opts.returnUrl;
      if (opts.refreshUrl) body.refresh_url = opts.refreshUrl;
      if (opts.prefill) {
        body.prefill = {
          ...(opts.prefill.companyName && { company_name: opts.prefill.companyName }),
          ...(opts.prefill.email && { email: opts.prefill.email }),
        };
      }

      const result = await fetchJson<{
        session_id: string;
        hosted_url: string;
        expires_in: number;
      }>(`${apiBaseUrl}/v1/onboarding/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!result.ok) return result;
      return ok({
        sessionId: result.value.session_id,
        hostedUrl: result.value.hosted_url,
        expiresInSeconds: result.value.expires_in,
      });
    },

    async getSignupStatus(sessionId: string): Promise<Result<SignupStatusResult, TryMellonError>> {
      if (!sessionId || typeof sessionId !== 'string') {
        return err(createInvalidArgumentError('sessionId', 'must be a non-empty string'));
      }
      const result = await fetchJson<{
        status: SignupStatus;
        hosted_url?: string;
        expires_in?: number;
      }>(`${apiBaseUrl}/v1/onboarding/${encodeURIComponent(sessionId)}/status`, { method: 'GET' });
      if (!result.ok) return result;
      return ok({
        status: result.value.status,
        ...(result.value.hosted_url !== undefined && { hostedUrl: result.value.hosted_url }),
        ...(result.value.expires_in !== undefined && { expiresInSeconds: result.value.expires_in }),
      });
    },

    async awaitSignupCompletion(
      sessionId: string,
      opts: AwaitSignupCompletionOptions = {}
    ): Promise<Result<AwaitSignupCompletionResult, TryMellonError>> {
      const intervalMs = opts.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
      const maxAttempts = opts.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;
      const signal = opts.signal;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (signal?.aborted) return err(createError('ABORT_ERROR'));

        const snapshot = await this.getSignupStatus(sessionId);
        if (!snapshot.ok) return snapshot;

        const status = snapshot.value.status;
        if (status === 'completed') {
          return ok({
            status: 'completed',
            hostedUrl: snapshot.value.hostedUrl ?? '',
          });
        }
        if (terminal(status)) {
          return err(
            createError(
              status === 'expired' ? 'SESSION_EXPIRED' : 'SERVER_ERROR',
              `Signup session reached terminal state: ${status}`
            )
          );
        }

        const waited = await waitWithAbort(intervalMs, signal);
        if (waited === 'aborted') return err(createError('ABORT_ERROR'));
      }

      return err(createError('TIMEOUT'));
    },
  };
}
