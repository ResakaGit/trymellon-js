import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/core/api';
import type { HttpClient } from '../../src/core/http-client';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';
import type {
  RegisterStartRequest,
  AuthStartRequest,
  RegisterFinishRequest,
  AuthFinishRequest,
  OnboardingRegisterPasskeyRequest,
} from '../../src/types';

describe('ApiClient', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with httpClient and baseUrl', () => {
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('should include default headers (X-App-Id, Authorization) in requests', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          challenge: {
            rp: { name: 'App', id: 'example.com' },
            user: { id: 'u', name: 'n', displayName: 'D' },
            challenge: 'c',
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          },
          session_id: 'sess_1',
        })
      );
      const defaultHeaders = {
        'X-App-Id': 'app_live_xxx',
        Authorization: 'Bearer sk_live_xxx',
      };
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com',
        defaultHeaders
      );
      await client.startRegister({ external_user_id: 'user_1' });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/passkeys/register/start',
        { external_user_id: 'user_1' },
        expect.objectContaining({
          'X-App-Id': 'app_live_xxx',
          Authorization: 'Bearer sk_live_xxx',
        })
      );
    });
  });

  describe('startRegister', () => {
    it('should request register start', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          challenge: {
            rp: { name: 'Example App', id: 'example.com' },
            user: { id: 'dXNlcl8xMjM', name: 'user_123', displayName: 'Test User' },
            challenge: 'Y2hhbGxlbmdlXzEyMw',
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            timeout: 30000,
          },
          session_id: '550e8400-e29b-41d4-a716-446655440000',
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: RegisterStartRequest = { external_user_id: 'user_123' };

      const result = await client.startRegister(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.value.challenge.rp.id).toBe('example.com');
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/passkeys/register/start',
        request,
        expect.any(Object)
      );
    });

    it('should handle HTTP errors', async () => {
      mockHttpClient.post.mockResolvedValue(err(createError('NETWORK_FAILURE', 'API error')));

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: RegisterStartRequest = { external_user_id: 'user_123' };

      const result = await client.startRegister(request);
      expect(result.ok).toBe(false);
    });
  });

  describe('startAuth', () => {
    it('should request auth start', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          challenge: {
            challenge: 'Y2hhbGxlbmdlXzQ1Ng',
            rpId: 'example.com',
            allowCredentials: [{ id: 'Y3JlZF8xMjM', type: 'public-key', transports: ['usb'] }],
            timeout: 30000,
            userVerification: 'required',
          },
          session_id: '660e8400-e29b-41d4-a716-446655440000',
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: AuthStartRequest = { external_user_id: 'user_123' };

      const result = await client.startAuth(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('660e8400-e29b-41d4-a716-446655440000');
      }
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/passkeys/auth/start',
        request,
        expect.any(Object)
      );
    });
  });

  describe('finishRegister', () => {
    it('should finish register successfully', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          credential_id: 'cred_123',
          status: 'verified',
          session_token: 'session_token_123',
          user: {
            user_id: 'user_uuid_123',
            external_user_id: 'user_123',
            email: 'user@example.com',
            metadata: {},
          },
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: RegisterFinishRequest = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        credential: {
          id: 'cred_123',
          rawId: 'cmF3X2lkXzEyMw',
          response: {
            clientDataJSON: 'Y2xpZW50X2RhdGFfanNvbg',
            attestationObject: 'YXR0ZXN0YXRpb25fb2JqZWN0',
          },
          type: 'public-key',
        },
      };

      const result = await client.finishRegister(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.credential_id).toBe('cred_123');
        expect(result.value.session_token).toBe('session_token_123');
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/passkeys/register/finish',
        request,
        expect.any(Object)
      );
    });
  });

  describe('finishAuthentication', () => {
    it('should finish auth successfully', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          authenticated: true,
          session_token: 'session_token_123',
          user: {
            user_id: 'user_uuid_123',
            external_user_id: 'user_123',
            email: 'user@example.com',
            metadata: {},
          },
          signals: { userVerification: true, backupEligible: true, backupStatus: false },
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: AuthFinishRequest = {
        session_id: '660e8400-e29b-41d4-a716-446655440000',
        credential: {
          id: 'cred_123',
          rawId: 'cmF3X2lkXzEyMw',
          response: {
            authenticatorData: 'YXV0aGVudGljYXRvcl9kYXRh',
            clientDataJSON: 'Y2xpZW50X2RhdGFfanNvbg',
            signature: 'c2lnbmF0dXJlXzEyMw',
          },
          type: 'public-key',
        },
      };

      const result = await client.finishAuthentication(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.authenticated).toBe(true);
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/passkeys/auth/finish',
        request,
        expect.any(Object)
      );
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      mockHttpClient.get.mockResolvedValue(
        ok({
          valid: true,
          user_id: 'user_uuid_123',
          external_user_id: 'user_123',
          tenant_id: 'tenant_uuid_123',
          app_id: 'app_uuid_123',
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.validateSession('session_token_123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(true);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/v1/sessions/validate',
        expect.objectContaining({ Authorization: 'Bearer session_token_123' })
      );
    });

    it('should handle invalid session token (API returns valid=false)', async () => {
      mockHttpClient.get.mockResolvedValue(
        ok({
          valid: false,
          user_id: '',
          external_user_id: '',
          tenant_id: '',
          app_id: '',
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.validateSession('invalid_token');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(false);
      }
    });

    it('should handle HTTP errors', async () => {
      mockHttpClient.get.mockResolvedValue(err(createError('NETWORK_FAILURE', 'Unauthorized')));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.validateSession('invalid_token');
      expect(result.ok).toBe(false);
    });
  });

  describe('startEmailFallback', () => {
    it('should start email fallback', async () => {
      mockHttpClient.post.mockResolvedValue(ok({}));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.startEmailFallback({
        userId: 'user_123',
        email: 'user@example.com',
      });
      expect(result.ok).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/fallback/email/start',
        { userId: 'user_123', email: 'user@example.com' },
        expect.any(Object)
      );
    });
  });

  describe('verifyEmailCode', () => {
    it('should verify email code', async () => {
      mockHttpClient.post.mockResolvedValue(ok({ sessionToken: 'session_123' }));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.verifyEmailCode('user_123', '123456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('session_123');
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/fallback/email/verify',
        { userId: 'user_123', code: '123456' },
        expect.any(Object)
      );
    });
  });

  describe('onboarding', () => {
    it('should start onboarding', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_1',
          onboarding_url: 'http://url',
          expires_in: 3600,
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.startOnboarding({ user_role: 'maintainer' });
      expect(result.ok).toBe(true);
    });

    it('should get onboarding status', async () => {
      mockHttpClient.get.mockResolvedValue(
        ok({
          status: 'pending_passkey',
          onboarding_url: 'http://url',
          expires_in: 3600,
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getOnboardingStatus('sess_1');
      expect(result.ok).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/onboarding/sess_1/status',
        expect.any(Object)
      );
    });

    it('should get onboarding register info', async () => {
      mockHttpClient.get.mockResolvedValue(
        ok({
          session_id: 'sess_1',
          status: 'pending_passkey',
          onboarding_url: 'http://url',
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getOnboardingRegister('sess_1');
      expect(result.ok).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/onboarding/sess_1/register',
        expect.any(Object)
      );
    });

    it('should register onboarding passkey', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_1',
          status: 'pending_data',
          user_id: 'u1',
          tenant_id: 't1',
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request: OnboardingRegisterPasskeyRequest = {
        challenge: 'chal',
        credential: {
          type: 'public-key',
          id: 'id',
          rawId: 'rid',
          response: { clientDataJSON: 'cdj', attestationObject: 'ao' },
        },
      };
      const result = await client.registerOnboardingPasskey('sess_1', request);
      expect(result.ok).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/onboarding/sess_1/register-passkey',
        request,
        expect.any(Object)
      );
    });

    it('should complete onboarding', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_1',
          status: 'completed',
          user_id: 'u1',
          tenant_id: 't1',
          session_token: 'tok_1',
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.completeOnboarding('sess_1', { company_name: 'acme' });
      expect(result.ok).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/onboarding/sess_1/complete',
        { company_name: 'acme' },
        expect.any(Object)
      );
    });
  });

  describe('initCrossDeviceAuth', () => {
    it('should request cross-device init and return session_id, qr_url, expires_at', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_cd_123',
          qr_url: 'https://example.com/qr/abc',
          expires_at: '2026-02-12T12:00:00Z',
        })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.initCrossDeviceAuth();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('sess_cd_123');
        expect(result.value.qr_url).toBe('https://example.com/qr/abc');
        expect(result.value.expires_at).toBe('2026-02-12T12:00:00Z');
      }
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/auth/cross-device/init',
        {},
        expect.any(Object)
      );
    });

    it('should return err when API fails', async () => {
      mockHttpClient.post.mockResolvedValue(err(createError('NETWORK_FAILURE', 'API error')));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.initCrossDeviceAuth();
      expect(result.ok).toBe(false);
    });
  });

  describe('getCrossDeviceStatus', () => {
    it('should request status for session and return result', async () => {
      mockHttpClient.get.mockResolvedValue(
        ok({ status: 'completed', user_id: 'u1', session_token: 'st_1' })
      );
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getCrossDeviceStatus('sess_cd_456');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('completed');
        expect(result.value.user_id).toBe('u1');
        expect(result.value.session_token).toBe('st_1');
      }
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/v1/auth/cross-device/status/sess_cd_456',
        expect.any(Object)
      );
    });

    it('should return err when API fails', async () => {
      mockHttpClient.get.mockResolvedValue(err(createError('NETWORK_FAILURE', 'fail')));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getCrossDeviceStatus('sess_cd_456');
      expect(result.ok).toBe(false);
    });
  });

  describe('getCrossDeviceContext', () => {
    it('should request context for session and return options', async () => {
      const options = { challenge: { rp: { id: 'x.com' }, challenge: 'c', pubKeyCredParams: [] } };
      mockHttpClient.get.mockResolvedValue(ok({ options }));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getCrossDeviceContext('sess_cd_789');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.options).toEqual(options);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/v1/auth/cross-device/context/sess_cd_789',
        expect.any(Object)
      );
    });

    it('should return err when API fails', async () => {
      mockHttpClient.get.mockResolvedValue(err(createError('NETWORK_FAILURE', 'fail')));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.getCrossDeviceContext('sess_cd_789');
      expect(result.ok).toBe(false);
    });
  });

  describe('verifyCrossDeviceAuth', () => {
    it('should post verify request with session_id and credential', async () => {
      mockHttpClient.post.mockResolvedValue(ok(undefined));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const request = {
        session_id: 'sess_cd_verify',
        credential: {
          type: 'public-key' as const,
          id: 'cred_id',
          rawId: 'raw_id',
          response: { clientDataJSON: 'cdj', authenticatorData: 'ad', signature: 'sig' },
        },
      };
      const result = await client.verifyCrossDeviceAuth(request);
      expect(result.ok).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/auth/cross-device/verify',
        request,
        expect.any(Object)
      );
    });

    it('should return err when API fails', async () => {
      mockHttpClient.post.mockResolvedValue(err(createError('NETWORK_FAILURE', 'fail')));
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.verifyCrossDeviceAuth({
        session_id: 's',
        credential: {
          type: 'public-key',
          id: 'id',
          rawId: 'rid',
          response: { clientDataJSON: 'cdj', authenticatorData: 'ad', signature: 'sig' },
        },
      });
      expect(result.ok).toBe(false);
    });
  });
});
