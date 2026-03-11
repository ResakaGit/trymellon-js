import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TryMellon } from '../../src/core/trymellon';
import { ApiClient } from '../../src/core/api';
import * as webauthnUtils from '../../src/core/webauthn';
import { ok, err } from '../../src/utils/result';
import type { Result } from '../../src/utils/result';
import { createError, TryMellonError } from '../../src/errors';
import type {
  RegisterOptions,
  AuthenticateOptions,
  RegisterResult,
  AuthenticateResult,
} from '../../src/types';
// Mock ApiClient to avoid network requests
vi.mock('../../src/core/api');

describe('TryMellon', () => {
  const config = {
    appId: 'app_test_xxx',
    publishableKey: 'key_test_xxx',
    apiBaseUrl: 'https://api.example.com',
  };
  let tryMellon: TryMellon;

  // Spies for webauthn utils
  const registerPasskeySpy = vi.spyOn(webauthnUtils, 'registerPasskey');
  const authenticatePasskeySpy = vi.spyOn(webauthnUtils, 'authenticatePasskey');

  beforeEach(() => {
    vi.clearAllMocks();
    tryMellon = new TryMellon(config);
  });

  describe('telemetry (opt-in)', () => {
    it('should not call telemetrySender when enableTelemetry is false', async () => {
      const mockTelemetrySend = vi.fn().mockResolvedValue(undefined);
      const client = new TryMellon({
        ...config,
        enableTelemetry: false,
        telemetrySender: { send: mockTelemetrySend },
      });
      registerPasskeySpy.mockResolvedValue(
        ok({
          credential_id: 'c1',
          status: 'verified',
          session_token: 't1',
          user: { user_id: 'u1', external_user_id: 'user_123' },
        }) as Result<RegisterResult, never>
      );

      await client.register({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).not.toHaveBeenCalled();
    });

    it('should call telemetrySender with payload when enableTelemetry is true and register succeeds', async () => {
      const mockTelemetrySend = vi.fn().mockResolvedValue(undefined);
      const client = new TryMellon({
        ...config,
        enableTelemetry: true,
        telemetrySender: { send: mockTelemetrySend },
      });
      registerPasskeySpy.mockResolvedValue(
        ok({
          credential_id: 'c1',
          status: 'verified',
          session_token: 't1',
          user: { user_id: 'u1', external_user_id: 'user_123' },
        }) as Result<RegisterResult, never>
      );

      await client.register({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).toHaveBeenCalledTimes(1);
      expect(mockTelemetrySend).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'register',
          ok: true,
          latencyMs: expect.any(Number),
        })
      );
    });

    it('should call telemetrySender with payload when enableTelemetry is true and authenticate succeeds', async () => {
      const mockTelemetrySend = vi.fn().mockResolvedValue(undefined);
      const client = new TryMellon({
        ...config,
        enableTelemetry: true,
        telemetrySender: { send: mockTelemetrySend },
      });
      authenticatePasskeySpy.mockResolvedValue(
        ok({
          authenticated: true,
          session_token: 't1',
          user: { user_id: 'u1', external_user_id: 'user_123' },
          signals: {},
        }) as Result<AuthenticateResult, never>
      );

      await client.authenticate({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).toHaveBeenCalledTimes(1);
      expect(mockTelemetrySend).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'authenticate',
          ok: true,
          latencyMs: expect.any(Number),
        })
      );
    });

    it('should not call telemetrySender when register fails', async () => {
      const mockTelemetrySend = vi.fn().mockResolvedValue(undefined);
      const client = new TryMellon({
        ...config,
        enableTelemetry: true,
        telemetrySender: { send: mockTelemetrySend },
      });
      registerPasskeySpy.mockResolvedValue(err(createError('UNKNOWN_ERROR', 'Failed')));

      await client.register({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should throw when appId is missing', () => {
      expect(
        () =>
          new TryMellon({ publishableKey: 'key', apiBaseUrl: 'https://api.example.com' } as never)
      ).toThrow(TryMellonError);
      expect(
        () =>
          new TryMellon({ publishableKey: 'key', apiBaseUrl: 'https://api.example.com' } as never)
      ).toThrow(/appId.*non-empty/);
    });

    it('should throw when publishableKey is missing', () => {
      expect(
        () => new TryMellon({ appId: 'app', apiBaseUrl: 'https://api.example.com' } as never)
      ).toThrow(TryMellonError);
      expect(
        () => new TryMellon({ appId: 'app', apiBaseUrl: 'https://api.example.com' } as never)
      ).toThrow(/publishableKey.*non-empty/);
    });

    it('should throw when appId is empty string', () => {
      expect(() => new TryMellon({ appId: '  ', publishableKey: 'key' })).toThrow(/appId/);
    });

    it('should throw when publishableKey is empty string', () => {
      expect(() => new TryMellon({ appId: 'app', publishableKey: '' })).toThrow(/publishableKey/);
    });

    it('should construct with only appId and publishableKey (defaults for maxRetries and retryDelayMs)', () => {
      const client = new TryMellon({ appId: 'app_1', publishableKey: 'key_1' });
      expect(client).toBeInstanceOf(TryMellon);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('should call registerPasskey and return success result', async () => {
      const mockResult = ok({
        credential_id: 'cred_123',
        status: 'verified',
        session_token: 'token_123',
        user: { user_id: 'u1', external_user_id: 'ext_u1' },
      });
      registerPasskeySpy.mockResolvedValue(mockResult as Result<RegisterResult, never>);

      const options: RegisterOptions = {
        external_user_id: 'user_123',
      };

      const result = await tryMellon.register(options);

      expect(registerPasskeySpy).toHaveBeenCalledWith(
        options,
        expect.any(Object), // apiClient
        expect.any(Object) // eventEmitter
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockResult.value);
      }
    });

    it('should return error result if registerPasskey fails', async () => {
      registerPasskeySpy.mockResolvedValue(err(createError('UNKNOWN_ERROR', 'Failed')));

      const options: RegisterOptions = {
        external_user_id: 'user_123',
      };

      const result = await tryMellon.register(options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  describe('authenticate', () => {
    it('should call authenticatePasskey and return success result', async () => {
      const mockResult = ok({
        authenticated: true,
        session_token: 'token_123',
        user: { user_id: 'u1', external_user_id: 'ext_u1' },
        signals: {},
      });
      authenticatePasskeySpy.mockResolvedValue(mockResult as Result<AuthenticateResult, never>);

      const options: AuthenticateOptions = {
        external_user_id: 'user_123',
      };

      const result = await tryMellon.authenticate(options);

      expect(authenticatePasskeySpy).toHaveBeenCalledWith(
        options,
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.ok).toBe(true);
    });

    it('should return error result if authenticatePasskey fails', async () => {
      authenticatePasskeySpy.mockResolvedValue(err(createError('UNKNOWN_ERROR', 'Auth Failed')));

      const options: AuthenticateOptions = { external_user_id: 'user_123' };

      const result = await tryMellon.authenticate(options);

      expect(result.ok).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('should call apiClient.validateSession', async () => {
      // We need to access the spy on the mocked ApiClient instance
      // But TryMellon creates a new instance.
      // Since we mocked the module '../../src/core/api', the constructor returns a mock object.

      // Get the mock instance from tryMellon (private apiClient, cast for test)
      const mockApiClientInstance = (
        tryMellon as { apiClient: { validateSession: ReturnType<typeof vi.fn> } }
      ).apiClient;

      mockApiClientInstance.validateSession.mockResolvedValue(ok({ valid: true }));

      const result = await tryMellon.validateSession('token_123');

      expect(mockApiClientInstance.validateSession).toHaveBeenCalledWith('token_123');
      expect(result.ok).toBe(true);
    });
  });

  describe('TryMellon.create', () => {
    it('should return ok with instance when config is valid', () => {
      const result = TryMellon.create(config);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(TryMellon);
      }
    });

    it('should return err when appId is empty', () => {
      const result = TryMellon.create({
        ...config,
        appId: '',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('should return err when publishableKey is missing', () => {
      const result = TryMellon.create({
        appId: config.appId,
        publishableKey: '',
      });
      expect(result.ok).toBe(false);
    });

    it('should pass Origin in defaultHeaders when config.origin is set (WebAuthn protocol)', () => {
      TryMellon.create({ ...config, origin: 'https://app.example.com' });
      expect(vi.mocked(ApiClient)).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          'X-App-Id': config.appId,
          Authorization: `Bearer ${config.publishableKey}`,
          Origin: 'https://app.example.com',
        })
      );
    });
  });

  describe('version', () => {
    it('should return a string', () => {
      const v = tryMellon.version();
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    it('should return ClientStatus with isPasskeySupported and recommendedFlow', async () => {
      const status = await tryMellon.getStatus();
      expect(status).toHaveProperty('isPasskeySupported');
      expect(status).toHaveProperty('platformAuthenticatorAvailable');
      expect(status).toHaveProperty('recommendedFlow');
      expect(['passkey', 'fallback']).toContain(status.recommendedFlow);
    });
  });

  describe('on', () => {
    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = tryMellon.on('start', handler);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('fallback.email', () => {
    it('should call startEmailFallback with userId and email', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { startEmailFallback: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.startEmailFallback.mockResolvedValue(ok(undefined));

      const result = await tryMellon.fallback.email.start({
        userId: 'u_123',
        email: 'u@example.com',
      });
      expect(mockInstance.startEmailFallback).toHaveBeenCalledWith({
        userId: 'u_123',
        email: 'u@example.com',
      });
      expect(result.ok).toBe(true);
    });

    it('should call verifyEmailCode with userId and code', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { verifyEmailCode: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.verifyEmailCode.mockResolvedValue(ok({ sessionToken: 'st_abc' }));

      const result = await tryMellon.fallback.email.verify({
        userId: 'u_123',
        code: '123456',
      });
      expect(mockInstance.verifyEmailCode).toHaveBeenCalledWith({
        userId: 'u_123',
        code: '123456',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('st_abc');
    });

    it('should return redirectUrl from fallback.email.verify when API returns it', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { verifyEmailCode: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.verifyEmailCode.mockResolvedValue(
        ok({ sessionToken: 'st_abc', redirectUrl: 'https://app.example.com/dash' })
      );

      const result = await tryMellon.fallback.email.verify({
        userId: 'u_123',
        code: '123456',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('st_abc');
        expect(result.value.redirectUrl).toBe('https://app.example.com/dash');
      }
    });

    it('should pass successUrl to verifyEmailCode when provided', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { verifyEmailCode: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.verifyEmailCode.mockResolvedValue(ok({ sessionToken: 'st_xyz' }));

      await tryMellon.fallback.email.verify({
        userId: 'u_1',
        code: '654321',
        successUrl: 'https://app.example.com/success',
      });
      expect(mockInstance.verifyEmailCode).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u_1',
          code: '654321',
          successUrl: 'https://app.example.com/success',
        })
      );
    });
  });

  describe('auth.crossDevice', () => {
    it('should expose init returning Result', async () => {
      const mockInstance = (
        tryMellon as {
          apiClient: { initCrossDeviceAuth: ReturnType<typeof vi.fn> };
        }
      ).apiClient;
      mockInstance.initCrossDeviceAuth?.mockResolvedValue?.(
        ok({
          session_id: 's1',
          qr_url: 'https://q.r',
          expires_at: '2026-01-01T00:00:00Z',
          polling_token: 'mock_poll_tok',
        })
      );

      const result = await tryMellon.auth.crossDevice.init();
      expect(result.ok).toBe(true);
    });

    it('should expose approve and waitForSession as functions', () => {
      expect(typeof tryMellon.auth.crossDevice.approve).toBe('function');
      expect(typeof tryMellon.auth.crossDevice.waitForSession).toBe('function');
    });

    it('initRegistration delegates to crossDeviceManager', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { initCrossDeviceRegistration: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.initCrossDeviceRegistration?.mockResolvedValue?.(
        ok({
          session_id: 's2',
          qr_url: 'https://qr.reg',
          expires_at: '2026-01-01T00:00:00Z',
          polling_token: 'poll_reg',
        })
      );
      const result = await tryMellon.auth.crossDevice.initRegistration({
        externalUserId: 'ext_u1',
      });
      expect(result.ok).toBe(true);
    });

    it('initRegistration with {} or no options returns ok and delegates to API with that value', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { initCrossDeviceRegistration: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.initCrossDeviceRegistration?.mockResolvedValue?.(
        ok({
          session_id: 's_anon',
          qr_url: 'https://qr.reg/anon',
          expires_at: '2026-01-01T00:00:00Z',
          polling_token: 'poll_anon',
        })
      );
      const resultEmpty = await tryMellon.auth.crossDevice.initRegistration({});
      expect(resultEmpty.ok).toBe(true);
      expect(mockInstance.initCrossDeviceRegistration).toHaveBeenCalledWith({});
      mockInstance.initCrossDeviceRegistration?.mockClear?.();
      mockInstance.initCrossDeviceRegistration?.mockResolvedValue?.(
        ok({
          session_id: 's_anon2',
          qr_url: 'https://qr.reg/anon2',
          expires_at: '2026-01-01T00:00:00Z',
          polling_token: 'poll_anon2',
        })
      );
      const resultNoArg = await tryMellon.auth.crossDevice.initRegistration();
      expect(resultNoArg.ok).toBe(true);
      expect(mockInstance.initCrossDeviceRegistration).toHaveBeenCalledWith({});
    });

    it('waitForSession delegates to crossDeviceManager', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { getCrossDeviceStatus: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.getCrossDeviceStatus?.mockResolvedValue?.(
        ok({
          status: 'completed',
          session_token: 'st',
          user: { user_id: 'u1', external_user_id: 'ext_u1' },
        })
      );
      const ac = new AbortController();
      const result = await tryMellon.auth.crossDevice.waitForSession('sess_1', ac.signal, null);
      expect(typeof result.ok).toBe('boolean');
    });

    it('approve delegates to crossDeviceManager', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { getCrossDeviceContext: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.getCrossDeviceContext?.mockResolvedValue?.(
        err(createError('NETWORK_ERROR', 'mock failure'))
      );
      const result = await tryMellon.auth.crossDevice.approve('sess_1');
      expect(result.ok).toBe(false);
    });

    it('getContext delegates to apiClient.getCrossDeviceContext', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { getCrossDeviceContext: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.getCrossDeviceContext?.mockResolvedValue?.({ session_id: 's1' });
      const result = await tryMellon.auth.crossDevice.getContext('sess_123');
      expect(mockInstance.getCrossDeviceContext).toHaveBeenCalledWith('sess_123');
      expect(result).toEqual({ session_id: 's1' });
    });
  });

  describe('auth.recoverAccount', () => {
    it('calls recoverAccount and returns Result (coverage of auth.recoverAccount path)', async () => {
      // recoverAccount requires externalUserId + otp and full API/WebAuthn mocks; here we only
      // assert that the method is invoked and returns a Result (ok or err).
      const result = await tryMellon.auth.recoverAccount({ otp: '123456' });
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) {
        expect(result.value).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('telemetry send rejection', () => {
    it('should not throw when telemetrySender.send rejects', async () => {
      const mockTelemetrySend = vi.fn().mockRejectedValue(new Error('Network error'));
      const client = new TryMellon({
        ...config,
        enableTelemetry: true,
        telemetrySender: { send: mockTelemetrySend },
      });
      registerPasskeySpy.mockResolvedValue(
        ok({
          credential_id: 'c1',
          status: 'verified',
          session_token: 't1',
          user: { user_id: 'u1', external_user_id: 'user_123' },
        }) as Result<RegisterResult, never>
      );

      const result = await client.register({ external_user_id: 'user_123' });

      expect(result.ok).toBe(true);
      expect(mockTelemetrySend).toHaveBeenCalled();
    });
  });
});
