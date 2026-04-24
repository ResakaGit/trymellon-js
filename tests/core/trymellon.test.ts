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

      await client.signUp({ external_user_id: 'user_123' });

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

      await client.signUp({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).toHaveBeenCalledTimes(1);
      expect(mockTelemetrySend).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'signUp',
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

      await client.signIn({ external_user_id: 'user_123' });

      expect(mockTelemetrySend).toHaveBeenCalledTimes(1);
      expect(mockTelemetrySend).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'signIn',
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

      await client.signUp({ external_user_id: 'user_123' });

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

  describe('signUp', () => {
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

      const result = await tryMellon.signUp(options);

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

      const result = await tryMellon.signUp(options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  describe('signIn', () => {
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

      const result = await tryMellon.signIn(options);

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

      const result = await tryMellon.signIn(options);

      expect(result.ok).toBe(false);
    });
  });

  describe('session.verify', () => {
    it('should call apiClient.validateSession', async () => {
      const mockApiClientInstance = (
        tryMellon as { apiClient: { validateSession: ReturnType<typeof vi.fn> } }
      ).apiClient;

      mockApiClientInstance.validateSession.mockResolvedValue(ok({ valid: true }));

      const result = await tryMellon.session.verify('token_123');

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
      // ADR-SDK-001 Amendment 2026-04-23 · SDK-02 — `X-App-Id` removed from
      // defaultHeaders (backend never read it). Asserting header shape without it.
      TryMellon.create({ ...config, origin: 'https://app.example.com' });
      expect(vi.mocked(ApiClient)).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          Authorization: `Bearer ${config.publishableKey}`,
          Origin: 'https://app.example.com',
        })
      );
      const firstCall = vi.mocked(ApiClient).mock.calls[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) return;
      const [, , headers] = firstCall;
      expect(headers).not.toHaveProperty('X-App-Id');
    });

    it('should default preset to "saas" when omitted', () => {
      const result = TryMellon.create(config);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.preset).toBe('saas');
    });

    it('should accept preset="saas" explicitly', () => {
      const result = TryMellon.create({ ...config, preset: 'saas' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.preset).toBe('saas');
    });

    it('should accept preset="web3" (F1 opt-in)', () => {
      const result = TryMellon.create({ ...config, preset: 'web3' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.preset).toBe('web3');
    });

    it('should reject unknown preset values with INVALID_ARGUMENT', () => {
      const result = TryMellon.create({
        ...config,
        // @ts-expect-error — deliberately unknown preset for runtime validation
        preset: 'trading',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });
  });

  describe('version', () => {
    it('should return a string', () => {
      const v = tryMellon.version();
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });

  describe('capabilities', () => {
    it('should return ClientStatus with isPasskeySupported and recommendedFlow', async () => {
      const status = await tryMellon.capabilities();
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

  describe('otp', () => {
    it('should call startEmailFallback with userId and email', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { startEmailFallback: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.startEmailFallback.mockResolvedValue(ok(undefined));

      const result = await tryMellon.otp.send({
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

      const result = await tryMellon.otp.verify({
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

    it('should return redirectUrl from otp.verify when API returns it', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { verifyEmailCode: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.verifyEmailCode.mockResolvedValue(
        ok({ sessionToken: 'st_abc', redirectUrl: 'https://app.example.com/dash' })
      );

      const result = await tryMellon.otp.verify({
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

      await tryMellon.otp.verify({
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

  describe('crossDevice', () => {
    it('should expose start returning Result', async () => {
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

      const result = await tryMellon.crossDevice.start();
      expect(result.ok).toBe(true);
    });

    it('should expose approve and waitForCompletion as functions', () => {
      expect(typeof tryMellon.crossDevice.approve).toBe('function');
      expect(typeof tryMellon.crossDevice.waitForCompletion).toBe('function');
    });

    it('startRegistration delegates to crossDeviceManager', async () => {
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
      const result = await tryMellon.crossDevice.startRegistration({
        externalUserId: 'ext_u1',
      });
      expect(result.ok).toBe(true);
    });

    it('startRegistration with {} or no options returns ok and delegates to API with that value', async () => {
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
      const resultEmpty = await tryMellon.crossDevice.startRegistration({});
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
      const resultNoArg = await tryMellon.crossDevice.startRegistration();
      expect(resultNoArg.ok).toBe(true);
      expect(mockInstance.initCrossDeviceRegistration).toHaveBeenCalledWith({});
    });

    it('waitForCompletion delegates to crossDeviceManager', async () => {
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
      const result = await tryMellon.crossDevice.waitForCompletion('sess_1', ac.signal, null);
      expect(typeof result.ok).toBe('boolean');
    });

    it('approve delegates to crossDeviceManager', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { getCrossDeviceContext: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.getCrossDeviceContext?.mockResolvedValue?.(
        err(createError('NETWORK_ERROR', 'mock failure'))
      );
      const result = await tryMellon.crossDevice.approve('sess_1');
      expect(result.ok).toBe(false);
    });

    it('getContext delegates to apiClient.getCrossDeviceContext', async () => {
      const mockInstance = (
        tryMellon as { apiClient: { getCrossDeviceContext: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.getCrossDeviceContext?.mockResolvedValue?.({ session_id: 's1' });
      const result = await tryMellon.crossDevice.getContext('sess_123');
      expect(mockInstance.getCrossDeviceContext).toHaveBeenCalledWith('sess_123');
      expect(result).toEqual({ session_id: 's1' });
    });
  });

  describe('passkey.recover', () => {
    it('calls recover and returns Result', async () => {
      const result = await tryMellon.passkey.recover({ otp: '123456' });
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

      const result = await client.signUp({ external_user_id: 'user_123' });

      expect(result.ok).toBe(true);
      expect(mockTelemetrySend).toHaveBeenCalled();
    });
  });

  describe('enroll', () => {
    it('Given startEnrollment fails, then emits error event with operation enroll and returns err', async () => {
      const mockApiClientInstance = (
        tryMellon as { apiClient: { startEnrollment: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockApiClientInstance.startEnrollment.mockResolvedValue(
        err(createError('UNKNOWN_ERROR', 'Enrollment start failed'))
      );

      const errorHandler = vi.fn();
      tryMellon.on('error', errorHandler);

      const result = await tryMellon.enroll({ ticketId: 'tk_1' });

      expect(result.ok).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', operation: 'enroll' })
      );
    });

    it('Given full enroll flow succeeds, then emits success event with operation enroll', async () => {
      const createAndSerializeSpy = vi.spyOn(
        webauthnUtils,
        'createAndSerializeCredentialForRegister'
      );
      const mockApiClientInstance = (
        tryMellon as {
          apiClient: {
            startEnrollment: ReturnType<typeof vi.fn>;
            finishEnrollment: ReturnType<typeof vi.fn>;
          };
        }
      ).apiClient;

      mockApiClientInstance.startEnrollment.mockResolvedValue(
        ok({
          challenge: {
            challenge: 'Y2hhbGxlbmdl',
            rp: { id: 'example.com', name: 'Example' },
            user: { id: 'dXNlcl8x', name: 'u', displayName: 'U' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          },
        })
      );
      createAndSerializeSpy.mockResolvedValue(
        ok({
          id: 'cred_enroll_1',
          rawId: 'rawId_base64',
          type: 'public-key',
          response: { clientDataJSON: 'cdata', attestationObject: 'aobj' },
        })
      );
      mockApiClientInstance.finishEnrollment.mockResolvedValue(
        ok({ session_token: 'enroll_tok_1' })
      );

      const successHandler = vi.fn();
      tryMellon.on('success', successHandler);

      const result = await tryMellon.enroll({ ticketId: 'tk_2' });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('enroll_tok_1');
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', operation: 'enroll' })
      );
    });
  });

  // ADR-SDK-005 · SDK-01 — `platform.signUp` was removed from the main client.
  // Hosted onboarding lives in `@trymellon/js/platform` (see platform/* tests).
  // This `describe` block was deleted atomically with the API surface change.

  // ---------------------------------------------------------------------------
  // Identity namespace (F1) — ADR-SDK-004 §2.1–§2.2
  // ---------------------------------------------------------------------------
  describe('identity (F1 namespace)', () => {
    const setSession = (userId: string): void => {
      (tryMellon as unknown as { currentUserId: string | null }).currentUserId = userId;
    };

    it('Given no authenticated session, when identity.linkEmail, then returns err INVALID_ARGUMENT', async () => {
      const result = await tryMellon.identity.linkEmail('alice@example.com');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('Given authenticated session, when identity.linkEmail, then delegates to apiClient.requestLinkEmail with userId+email', async () => {
      setSession('usr_1');
      const mockInstance = (
        tryMellon as { apiClient: { requestLinkEmail: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.requestLinkEmail.mockResolvedValue(
        ok({ identifierId: 'idf_abc', expiresAt: '2026-05-01T00:00:00Z' })
      );

      const result = await tryMellon.identity.linkEmail('alice@example.com');

      expect(result.ok).toBe(true);
      expect(mockInstance.requestLinkEmail).toHaveBeenCalledWith('usr_1', {
        email: 'alice@example.com',
      });
    });

    it('Given authenticated session, when identity.verifyEmailLink, then delegates to apiClient.confirmLinkEmail', async () => {
      setSession('usr_1');
      const mockInstance = (
        tryMellon as { apiClient: { confirmLinkEmail: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.confirmLinkEmail.mockResolvedValue(
        ok({
          id: 'idf_abc',
          type: 'email',
          value: 'alice@example.com',
          verified: true,
          linkedAt: '2026-04-17T00:00:00Z',
        })
      );

      const result = await tryMellon.identity.verifyEmailLink({
        identifierId: 'idf_abc',
        otp: '123456',
      });

      expect(result.ok).toBe(true);
      expect(mockInstance.confirmLinkEmail).toHaveBeenCalledWith('usr_1', {
        identifierId: 'idf_abc',
        otp: '123456',
      });
    });

    it('Given no session, when identity.verifyEmailLink, then returns err INVALID_ARGUMENT', async () => {
      const result = await tryMellon.identity.verifyEmailLink({
        identifierId: 'idf_abc',
        otp: '123456',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('Given authenticated session, when identity.list, then delegates to apiClient.listIdentifiers', async () => {
      setSession('usr_1');
      const mockInstance = (
        tryMellon as { apiClient: { listIdentifiers: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.listIdentifiers.mockResolvedValue(ok([]));

      const result = await tryMellon.identity.list();

      expect(result.ok).toBe(true);
      expect(mockInstance.listIdentifiers).toHaveBeenCalledWith('usr_1');
    });

    it('Given no session, when identity.list, then returns err INVALID_ARGUMENT', async () => {
      const result = await tryMellon.identity.list();
      expect(result.ok).toBe(false);
    });

    it('Given authenticated session, when identity.unlink, then delegates to apiClient.unlinkIdentifier with userId+identifierId', async () => {
      setSession('usr_1');
      const mockInstance = (
        tryMellon as { apiClient: { unlinkIdentifier: ReturnType<typeof vi.fn> } }
      ).apiClient;
      mockInstance.unlinkIdentifier.mockResolvedValue(ok(undefined));

      const result = await tryMellon.identity.unlink('idf_abc');

      expect(result.ok).toBe(true);
      expect(mockInstance.unlinkIdentifier).toHaveBeenCalledWith('usr_1', 'idf_abc');
    });

    it('Given no session, when identity.unlink, then returns err INVALID_ARGUMENT', async () => {
      const result = await tryMellon.identity.unlink('idf_abc');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });
  });

  // ---------------------------------------------------------------------------
  // SIWE namespace (F1) — ADR-SDK-004 §2.1
  // ---------------------------------------------------------------------------
  describe('siwe (F1 namespace)', () => {
    it('should expose getNonce that delegates to apiClient.getSiweNonce', async () => {
      const mockInstance = (tryMellon as { apiClient: { getSiweNonce: ReturnType<typeof vi.fn> } })
        .apiClient;
      mockInstance.getSiweNonce.mockResolvedValue(
        ok({ nonce: 'abc12345', expiresAt: '2026-04-17T00:05:00Z' })
      );

      const result = await tryMellon.siwe.getNonce();

      expect(result.ok).toBe(true);
      expect(mockInstance.getSiweNonce).toHaveBeenCalledTimes(1);
    });

    it('Given valid EIP-4361 inputs, when siwe.prepareMessage, then returns ok with canonical message', () => {
      const result = tryMellon.siwe.prepareMessage({
        domain: 'example.com',
        address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
        uri: 'https://example.com/login',
        chainId: 1,
        nonce: '32891757',
        issuedAt: '2026-04-17T00:00:00Z',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toContain('example.com wants you to sign in');
    });

    it('Given invalid address, when siwe.prepareMessage, then returns err INVALID_ARGUMENT', () => {
      const result = tryMellon.siwe.prepareMessage({
        domain: 'example.com',
        address: 'not-an-address',
        uri: 'https://example.com/login',
        chainId: 1,
        nonce: '32891757',
        issuedAt: '2026-04-17T00:00:00Z',
      });
      expect(result.ok).toBe(false);
    });

    it('Given verifySiwe succeeds, when siwe.verifyAndSignIn, then emits success event and returns ok', async () => {
      const mockInstance = (tryMellon as { apiClient: { verifySiwe: ReturnType<typeof vi.fn> } })
        .apiClient;
      mockInstance.verifySiwe.mockResolvedValue(
        ok({
          sessionToken: 'sess_tok',
          userId: 'u_1',
          walletAddress: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
        })
      );
      const successHandler = vi.fn();
      const startHandler = vi.fn();
      tryMellon.on('success', successHandler);
      tryMellon.on('start', startHandler);

      const result = await tryMellon.siwe.verifyAndSignIn({
        message: 'example.com wants ...',
        signature: '0xsig',
      });

      expect(result.ok).toBe(true);
      expect(startHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'start', operation: 'signIn' })
      );
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          operation: 'signIn',
          token: 'sess_tok',
          user: { userId: 'u_1' },
        })
      );
    });

    it('Given verifySiwe fails, when siwe.verifyAndSignIn, then emits error event and returns err', async () => {
      const mockInstance = (tryMellon as { apiClient: { verifySiwe: ReturnType<typeof vi.fn> } })
        .apiClient;
      mockInstance.verifySiwe.mockResolvedValue(
        err(createError('SIWE_SIGNATURE_INVALID', 'bad signature'))
      );
      const errorHandler = vi.fn();
      tryMellon.on('error', errorHandler);

      const result = await tryMellon.siwe.verifyAndSignIn({
        message: 'example.com wants ...',
        signature: '0xbadsig',
      });

      expect(result.ok).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', operation: 'signIn' })
      );
    });
  });
});
