import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrossDeviceManager } from '../../src/core/cross-device-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

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

  /** Triggers onmessage with serialized data — simulates a server push. */
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  triggerError() {
    this.onerror?.();
  }
}

describe('CrossDeviceManager', () => {
  const mockApiClient = {
    initCrossDeviceAuth: vi.fn(),
    initCrossDeviceRegistration: vi.fn(),
    getCrossDeviceStatus: vi.fn(),
    getCrossDeviceStatusUrl: vi
      .fn()
      .mockReturnValue('https://api.example.com/v1/auth/cross-device/status/sess_1'),
    getCrossDeviceContext: vi.fn(),
    verifyCrossDeviceAuth: vi.fn(),
    verifyCrossDeviceRegistration: vi.fn(),
  };

  let manager: CrossDeviceManager;

  beforeEach(() => {
    vi.resetAllMocks();
    // Re-set default after resetAllMocks wipes implementation set at declaration time
    mockApiClient.getCrossDeviceStatusUrl.mockReturnValue(
      'https://api.example.com/v1/auth/cross-device/status/sess_1'
    );
    manager = new CrossDeviceManager(mockApiClient as unknown as ApiClient);
  });

  describe('init', () => {
    it('should delegate to apiClient.initCrossDeviceAuth and return result', async () => {
      mockApiClient.initCrossDeviceAuth.mockResolvedValue(
        ok({
          session_id: 'sess_cd_1',
          qr_url: 'https://example.com/qr',
          expires_at: '2026-02-12T12:00:00Z',
        })
      );
      const result = await manager.init();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('sess_cd_1');
        expect(result.value.qr_url).toBe('https://example.com/qr');
      }
      expect(mockApiClient.initCrossDeviceAuth).toHaveBeenCalledTimes(1);
    });

    it('should return err when apiClient.initCrossDeviceAuth fails', async () => {
      mockApiClient.initCrossDeviceAuth.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'API error'))
      );
      const result = await manager.init();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    });
  });

  describe('initRegistration', () => {
    it('should delegate to apiClient.initCrossDeviceRegistration with externalUserId', async () => {
      mockApiClient.initCrossDeviceRegistration.mockResolvedValue(
        ok({
          session_id: 'sess_reg_1',
          qr_url: 'https://example.com/qr/reg',
          expires_at: '2026-02-12T12:00:00Z',
        })
      );
      const result = await manager.initRegistration({ externalUserId: 'ext_123' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('sess_reg_1');
        expect(result.value.qr_url).toBe('https://example.com/qr/reg');
      }
      expect(mockApiClient.initCrossDeviceRegistration).toHaveBeenCalledTimes(1);
      expect(mockApiClient.initCrossDeviceRegistration).toHaveBeenCalledWith({
        externalUserId: 'ext_123',
      });
    });

    it('should return err when apiClient.initCrossDeviceRegistration fails', async () => {
      mockApiClient.initCrossDeviceRegistration.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'API error'))
      );
      const result = await manager.initRegistration({ externalUserId: 'ext_1' });
      expect(result.ok).toBe(false);
    });

    it('should delegate to API with undefined or empty options for anonymous init', async () => {
      mockApiClient.initCrossDeviceRegistration.mockResolvedValue(
        ok({
          session_id: 'sess_anon',
          qr_url: 'https://example.com/qr/anon',
          expires_at: '2026-02-12T12:00:00Z',
          polling_token: 'poll_anon',
        })
      );
      const resultUndef = await manager.initRegistration(undefined);
      expect(resultUndef.ok).toBe(true);
      expect(mockApiClient.initCrossDeviceRegistration).toHaveBeenCalledWith(undefined);
      vi.clearAllMocks();
      mockApiClient.initCrossDeviceRegistration.mockResolvedValue(
        ok({
          session_id: 'sess_anon2',
          qr_url: 'https://example.com/qr/anon2',
          expires_at: '2026-02-12T12:00:00Z',
        })
      );
      const resultEmpty = await manager.initRegistration({});
      expect(resultEmpty.ok).toBe(true);
      expect(mockApiClient.initCrossDeviceRegistration).toHaveBeenCalledWith({});
    });
  });

  describe('waitForSession', () => {
    beforeEach(() => {
      // Polling tests run without EventSource — SSE path is covered separately in 'waitForSession — SSE path'
      vi.stubGlobal('EventSource', undefined);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return ok when status is completed on first poll', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          session_token: 'st_1',
          user_id: 'user_1',
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('st_1');
        expect(result.value.userId).toBe('user_1');
        expect(result.value.redirectUrl).toBeUndefined();
      }
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledWith('sess_1', undefined);
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(1);
    });

    it('should return redirectUrl when status completed includes redirect_url from API', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          session_token: 'st_redir',
          user_id: 'user_redir',
          redirect_url: 'https://app.example.com/landing',
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('st_redir');
        expect(result.value.userId).toBe('user_redir');
        expect(result.value.redirectUrl).toBe('https://app.example.com/landing');
      }
    });

    it('should return err when status is completed but session_token is missing', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          user_id: 'user_1',
          session_token: undefined,
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain('Missing data');
    });

    it('should return err when status is completed but user_id is missing', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          session_token: 'st_1',
          user_id: undefined,
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
    });

    it('should return err when getCrossDeviceStatus fails', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'fail'))
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
    });

    it('should back off and retry when backend returns RATE_LIMIT_EXCEEDED, then succeed', async () => {
      vi.useFakeTimers();
      mockApiClient.getCrossDeviceStatus
        .mockResolvedValueOnce(
          err(
            createError(
              'RATE_LIMIT_EXCEEDED',
              'Rate limit exceeded for cross-device-status. Try again later.'
            )
          )
        )
        .mockResolvedValueOnce(
          ok({ status: 'completed', session_token: 'st_rl', user_id: 'u_rl' })
        );

      const resultPromise = manager.waitForSession('sess_rl');
      // Advance past the rate-limit backoff (8000ms)
      await vi.advanceTimersByTimeAsync(8001);
      const result = await resultPromise;
      vi.useRealTimers();

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('st_rl');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(2);
    });

    it('should abort during rate-limit backoff when signal fires', async () => {
      vi.useFakeTimers();
      const controller = new AbortController();
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        err(createError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded'))
      );

      const resultPromise = manager.waitForSession('sess_rl_abort', controller.signal);
      await vi.advanceTimersByTimeAsync(100);
      controller.abort();
      await vi.advanceTimersByTimeAsync(8001);
      const result = await resultPromise;
      vi.useRealTimers();

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
    });

    it('should return err when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await manager.waitForSession('sess_1', controller.signal);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
      expect(mockApiClient.getCrossDeviceStatus).not.toHaveBeenCalled();
    });

    it('should poll until completed then return ok', async () => {
      vi.useFakeTimers();
      mockApiClient.getCrossDeviceStatus
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(
          ok({ status: 'completed', session_token: 'st_2', user_id: 'user_2' })
        );
      const resultPromise = manager.waitForSession('sess_2');
      await vi.advanceTimersByTimeAsync(3000 * 3);
      const result = await resultPromise;
      vi.useRealTimers();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('st_2');
        expect(result.value.userId).toBe('user_2');
      }
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(3);
    });

    it('should return TIMEOUT when status never becomes completed', async () => {
      vi.useFakeTimers();
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(ok({ status: 'pending' }));
      const resultPromise = manager.waitForSession('sess_3');
      await vi.advanceTimersByTimeAsync(3000 * 61);
      const result = await resultPromise;
      vi.useRealTimers();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('TIMEOUT');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(60);
    });
  });

  describe('approve', () => {
    const validContextOptions = {
      challenge: 'Y2hhbGxlbmdl',
      rpId: 'example.com',
      userVerification: 'preferred' as const,
    };

    it('should get context, trigger credentials.get, and verify', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      mockApiClient.verifyCrossDeviceAuth.mockResolvedValue(ok(undefined));
      const result = await manager.approve('sess_approve');
      expect(result.ok).toBe(true);
      expect(mockApiClient.getCrossDeviceContext).toHaveBeenCalledWith('sess_approve');
      expect(mockApiClient.verifyCrossDeviceAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'sess_approve',
          credential: expect.objectContaining({
            type: 'public-key',
            id: expect.any(String),
            rawId: expect.any(String),
            response: expect.objectContaining({
              clientDataJSON: expect.any(String),
              authenticatorData: expect.any(String),
              signature: expect.any(String),
            }),
          }),
        })
      );
    });

    it('should return err when getCrossDeviceContext fails', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'fail'))
      );
      const result = await manager.approve('sess_fail');
      expect(result.ok).toBe(false);
      expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
    });

    it('should return err when verifyCrossDeviceAuth fails', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      mockApiClient.verifyCrossDeviceAuth.mockResolvedValue(
        err(createError('SESSION_EXPIRED', 'Session expired'))
      );
      const result = await manager.approve('sess_verify_fail');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SESSION_EXPIRED');
    });

    it('should return err when createAuthenticationOptions fails (invalid options)', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(
        ok({ options: { challenge: '', rpId: 'x.com' } })
      );
      const result = await manager.approve('sess_bad_options');
      expect(result.ok).toBe(false);
      expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
    });

    it('should return err when navigator.credentials.get throws', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      const originalGet = navigator.credentials.get;
      navigator.credentials.get = vi
        .fn()
        .mockRejectedValue(new DOMException('User cancelled', 'NotAllowedError'));
      try {
        const result = await manager.approve('sess_cred_fail');
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe('USER_CANCELLED');
        expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
      } finally {
        navigator.credentials.get = originalGet;
      }
    });

    it('should use credentials.create and verifyCrossDeviceRegistration when context type is registration', async () => {
      const registrationOptions = {
        challenge: 'Y2hhbGxlbmdl',
        rp: { id: 'example.com', name: 'Example' },
        user: { id: 'dXNlcl9pZA', name: 'user', displayName: 'User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      };
      mockApiClient.getCrossDeviceContext.mockResolvedValue(
        ok({ type: 'registration', options: registrationOptions })
      );
      mockApiClient.verifyCrossDeviceRegistration.mockResolvedValue(ok(undefined));
      const originalCreate = navigator.credentials.create;
      navigator.credentials.create = vi.fn().mockResolvedValue({
        id: 'cred_id',
        rawId: new ArrayBuffer(8),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(8),
          attestationObject: new ArrayBuffer(8),
        },
      });
      try {
        const result = await manager.approve('sess_reg');
        expect(result.ok).toBe(true);
        expect(mockApiClient.getCrossDeviceContext).toHaveBeenCalledWith('sess_reg');
        expect(mockApiClient.verifyCrossDeviceRegistration).toHaveBeenCalledWith(
          expect.objectContaining({
            session_id: 'sess_reg',
            credential: expect.objectContaining({
              type: 'public-key',
              response: expect.objectContaining({
                clientDataJSON: expect.any(String),
                attestationObject: expect.any(String),
              }),
            }),
          })
        );
        expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
      } finally {
        navigator.credentials.create = originalCreate;
      }
    });
  });

  describe('waitForSession — SSE path', () => {
    beforeEach(() => {
      MockEventSource.instances = [];
      vi.stubGlobal('EventSource', MockEventSource);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      MockEventSource.instances = [];
    });

    it('Given EventSource available and backend sends completed event, when waitForSession is called, then resolves ok with sessionToken and userId', async () => {
      const resultPromise = manager.waitForSession('sess_1');

      const es = MockEventSource.instances[0];
      expect(es).toBeDefined();
      expect(es.url).toContain('/v1/auth/cross-device/status/sess_1');

      es.emit({ status: 'completed', session_token: 'tok_sse', user_id: 'usr_sse' });

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('tok_sse');
        expect(result.value.userId).toBe('usr_sse');
        expect(result.value.redirectUrl).toBeUndefined();
      }
      expect(es.closeCalled).toBe(true);
      expect(mockApiClient.getCrossDeviceStatus).not.toHaveBeenCalled();
    });

    it('Given completed event includes redirect_url, when received, then redirectUrl is set', async () => {
      const resultPromise = manager.waitForSession('sess_1');
      const es = MockEventSource.instances[0];

      es.emit({
        status: 'completed',
        session_token: 'tok_redir',
        user_id: 'usr_redir',
        redirect_url: 'https://app.example.com/landing',
      });

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.redirectUrl).toBe('https://app.example.com/landing');
    });

    it('Given completed event without session_token, when received, then resolves err UNKNOWN_ERROR', async () => {
      const resultPromise = manager.waitForSession('sess_1');
      const es = MockEventSource.instances[0];

      es.emit({ status: 'completed', user_id: 'usr_1' }); // no session_token

      const result = await resultPromise;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('UNKNOWN_ERROR');
    });

    it('Given pending events before completed, when SSE streams them, then does not resolve early', async () => {
      const resultPromise = manager.waitForSession('sess_1');
      const es = MockEventSource.instances[0];

      es.emit({ status: 'pending' });
      es.emit({ status: 'authenticated' });
      es.emit({ status: 'completed', session_token: 'tok_late', user_id: 'usr_late' });

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('tok_late');
    });

    it('Given malformed JSON in SSE event, when received, then ignores it and continues waiting', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({ status: 'completed', session_token: 'tok_poll', user_id: 'usr_poll' })
      );
      const resultPromise = manager.waitForSession('sess_1');
      const es = MockEventSource.instances[0];

      // Emit malformed data then trigger error to fall back to polling
      es.onmessage?.(new MessageEvent('message', { data: 'not valid json {{{' }));
      es.triggerError();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('tok_poll');
    });

    it('Given SSE onerror fires, when it does, then falls back to polling and resolves', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({ status: 'completed', session_token: 'tok_fallback', user_id: 'usr_fallback' })
      );
      const resultPromise = manager.waitForSession('sess_1');
      const es = MockEventSource.instances[0];

      es.triggerError();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('tok_fallback');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalled();
    });

    it('Given EventSource is undefined (Node.js env), when waitForSession is called, then uses polling', async () => {
      vi.unstubAllGlobals(); // remove EventSource stub
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({ status: 'completed', session_token: 'tok_node', user_id: 'usr_node' })
      );

      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('tok_node');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalled();
    });

    it('Given opts.useSse is false, when called, then skips EventSource and uses polling', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({ status: 'completed', session_token: 'tok_forced_poll', user_id: 'usr_p' })
      );

      const result = await manager.waitForSession('sess_1', undefined, undefined, {
        useSse: false,
      });
      expect(result.ok).toBe(true);
      expect(MockEventSource.instances).toHaveLength(0);
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalled();
    });

    it('Given signal already aborted, when waitForSession is called, then resolves err ABORT_ERROR before opening EventSource', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await manager.waitForSession('sess_1', controller.signal);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('Given signal aborts while waiting for SSE, when abort fires, then resolves err ABORT_ERROR and closes EventSource', async () => {
      const controller = new AbortController();
      const resultPromise = manager.waitForSession('sess_1', controller.signal);

      const es = MockEventSource.instances[0];
      expect(es).toBeDefined();

      controller.abort();

      const result = await resultPromise;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
      expect(es.closeCalled).toBe(true);
    });

    it('Given pollingToken provided, when SSE opens, then URL includes polling_token as query param', async () => {
      mockApiClient.getCrossDeviceStatusUrl.mockReturnValue(
        'https://api.example.com/v1/auth/cross-device/status/sess_1?polling_token=tok_pt'
      );

      const resultPromise = manager.waitForSession('sess_1', undefined, 'tok_pt');
      const es = MockEventSource.instances[0];

      expect(mockApiClient.getCrossDeviceStatusUrl).toHaveBeenCalledWith('sess_1', 'tok_pt');
      expect(es.url).toContain('polling_token=tok_pt');

      es.emit({ status: 'completed', session_token: 'tok_ok', user_id: 'usr_ok' });
      await resultPromise;
    });
  });
});
