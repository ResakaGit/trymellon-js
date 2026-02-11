import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TryMellon } from '../../src/core/trymellon';
import '../../src/core/api';
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
});
