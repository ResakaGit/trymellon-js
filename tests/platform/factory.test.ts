import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlatform } from '../../src/platform';

/**
 * ADR-SDK-005 · SDK-01 — @trymellon/js/platform sub-path.
 * Sprint §399 — 4 obligatory BDDs:
 *  - createSignupLink happy path.
 *  - createSignupLink invalid returnUrl → INVALID_ARGUMENT.
 *  - awaitSignupCompletion happy path (polling fetch cycles pending → completed).
 *  - awaitSignupCompletion + AbortSignal mid-polling → ABORT_ERROR, zero HTTP calls post-abort.
 */

function stubFetch(responses: Array<{ status?: number; body: unknown }>): ReturnType<typeof vi.fn> {
  let call = 0;
  return vi.fn(async () => {
    const spec = responses[Math.min(call, responses.length - 1)]!;
    call += 1;
    return {
      ok: (spec.status ?? 200) < 400,
      status: spec.status ?? 200,
      json: async () => spec.body,
    } as Response;
  });
}

describe('createPlatform · createSignupLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Given valid https returnUrl, when createSignupLink, then 201 with hostedUrl+sessionId+expiresInSeconds', async () => {
    const mock = stubFetch([
      {
        status: 201,
        body: {
          ok: true,
          data: {
            session_id: 'sess-uuid',
            hosted_url: 'https://trymellon.com/signup/sess-uuid?return=https%3A%2F%2Fintegrator.com%2Fdone',
            expires_in: 900,
          },
        },
      },
    ]);
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform({ apiBaseUrl: 'https://api.trymellon.com' });
    const result = await platform.createSignupLink({
      returnUrl: 'https://integrator.com/done',
      userRole: 'maintainer',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sessionId).toBe('sess-uuid');
    expect(result.value.hostedUrl).toContain('/signup/sess-uuid');
    expect(result.value.expiresInSeconds).toBe(900);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('Given returnUrl with file:// scheme, when createSignupLink, then INVALID_ARGUMENT without HTTP', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform();
    const result = await platform.createSignupLink({
      returnUrl: 'file:///local/done',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ARGUMENT');
    expect(mock).not.toHaveBeenCalled();
  });

  it('Given returnUrl with http scheme (non-https), when createSignupLink, then INVALID_ARGUMENT', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform();
    const result = await platform.createSignupLink({
      returnUrl: 'http://integrator.com/done',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ARGUMENT');
    expect(mock).not.toHaveBeenCalled();
  });
});

describe('createPlatform · awaitSignupCompletion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Given status cycles pending_passkey → completed, when awaitSignupCompletion, then resolves to completed', async () => {
    const mock = stubFetch([
      { body: { ok: true, data: { status: 'pending_passkey' } } },
      { body: { ok: true, data: { status: 'completed', hosted_url: 'https://trymellon.com/signup/x' } } },
    ]);
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform();
    const result = await platform.awaitSignupCompletion('sess-x', { intervalMs: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('completed');
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('Given AbortSignal aborted mid-polling, when awaitSignupCompletion, then ABORT_ERROR with no HTTP calls post-abort', async () => {
    const controller = new AbortController();
    const mock = vi.fn(async () => {
      // Abort BEFORE this call returns (simulates the caller cancelling).
      controller.abort();
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: { status: 'pending_passkey' } }),
      } as Response;
    });
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform();
    const result = await platform.awaitSignupCompletion('sess-x', {
      signal: controller.signal,
      intervalMs: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ABORT_ERROR');
    // One status fetch was in-flight when abort hit; no further fetches after abort.
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('Given status terminal failed, when awaitSignupCompletion, then SERVER_ERROR', async () => {
    const mock = stubFetch([
      { body: { ok: true, data: { status: 'failed' } } },
    ]);
    vi.stubGlobal('fetch', mock);

    const platform = createPlatform();
    const result = await platform.awaitSignupCompletion('sess-x', { intervalMs: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SERVER_ERROR');
  });
});
