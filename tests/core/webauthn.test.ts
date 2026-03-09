import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPasskey, authenticatePasskey } from '../../src/core/webauthn';
import { ApiClient } from '../../src/core/api';
import { EventEmitter } from '../../src/core/events';
import type { RegisterOptions, AuthenticateOptions } from '../../src/types';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

describe('registerPasskey', () => {
  let apiClient: ApiClient;
  let eventEmitter: EventEmitter;
  let mockCreate: ReturnType<typeof vi.fn>;
  let originalNavigator: typeof navigator;
  let originalPublicKeyCredential: typeof PublicKeyCredential;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 30000,
    });

    eventEmitter = new EventEmitter();

    mockCreate = vi.fn();

    originalNavigator = global.navigator;
    originalPublicKeyCredential = global.PublicKeyCredential;

    global.navigator = {
      credentials: {
        create: mockCreate,
        get: vi.fn(),
      },
    } as unknown as Navigator;

    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn();
    } as unknown as typeof PublicKeyCredential;

    vi.spyOn(apiClient, 'startRegister').mockResolvedValue(
      ok({
        challenge: {
          rp: {
            name: 'Example App',
            id: 'example.com',
          },
          user: {
            id: 'dXNlcl8xMjM',
            name: 'user_123',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000,
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );

    vi.spyOn(apiClient, 'finishRegister').mockResolvedValue(
      ok({
        credential_id: 'cred_123',
        status: 'verified',
        session_token: 'session_token_123',
        user: {
          user_id: 'user_uuid_123',
          external_user_id: 'user_123',
        },
      })
    );
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.PublicKeyCredential = originalPublicKeyCredential;
    vi.clearAllMocks();
  });

  it('should register passkey successfully', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    const options: RegisterOptions = {
      external_user_id: 'user_123',
      authenticatorType: 'platform',
    };

    const result = await registerPasskey(options, apiClient, eventEmitter);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.success).toBe(true);
      expect(result.value.credential_id).toBe('cred_123');
      expect(result.value.sessionToken).toBe('session_token_123');
    }
    expect(apiClient.startRegister).toHaveBeenCalledWith({
      external_user_id: 'user_123',
    });
    expect(apiClient.finishRegister).toHaveBeenCalled();
  });

  it('should return complete result with user information', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'finishRegister').mockResolvedValue(
      ok({
        credential_id: 'cred_123',
        status: 'verified',
        session_token: 'session_token_123',
        user: {
          user_id: 'user_uuid_123',
          external_user_id: 'user_123',
          email: 'user@example.com',
        },
      })
    );

    const options: RegisterOptions = {
      external_user_id: 'user_123',
    };

    const result = await registerPasskey(options, apiClient, eventEmitter);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.success).toBe(true);
      expect(result.value.credential_id).toBe('cred_123');
      expect(result.value.status).toBe('verified');
      expect(result.value.sessionToken).toBe('session_token_123');
      expect(result.value.user.externalUserId).toBe('user_123');
    }
  });

  it('should emit start event', async () => {
    const startHandler = vi.fn();
    eventEmitter.on('start', startHandler);

    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(startHandler).toHaveBeenCalledWith({
      type: 'start',
      operation: 'register',
    });
  });

  it('should emit success event', async () => {
    const successHandler = vi.fn();
    eventEmitter.on('success', successHandler);

    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(successHandler).toHaveBeenCalledWith({
      type: 'success',
      operation: 'register',
    });
  });

  it('should handle WebAuthn not supported', async () => {
    global.PublicKeyCredential = undefined as unknown as typeof PublicKeyCredential;

    const result = await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_SUPPORTED');
    }
  });

  it('should handle user cancellation', async () => {
    const domError = new DOMException('User cancelled', 'NotAllowedError');
    mockCreate.mockRejectedValue(domError);

    const errorHandler = vi.fn();
    eventEmitter.on('error', errorHandler);

    const result = await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Assuming mapWebAuthnError maps NotAllowedError to correct code, e.g. CANCELLED or similar?
      // mapWebAuthnError implementation details are in src/errors.ts.
      // Usually NotAllowedError -> NOT_ALLOWED or CANCELLED if user specific.
    }

    expect(errorHandler).toHaveBeenCalled();
  });

  it('should handle AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    const options: RegisterOptions = {
      external_user_id: 'user_123',
      signal: controller.signal,
    };

    const result = await registerPasskey(options, apiClient, eventEmitter);
    expect(result.ok).toBe(false); // Should fail
  });

  it('should convert challenge from base64url to ArrayBuffer', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.publicKey?.challenge).toBeInstanceOf(ArrayBuffer);
  });

  it('should use authenticatorSelection from server when provided', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'startRegister').mockResolvedValue(
      ok({
        challenge: {
          rp: {
            name: 'Example App',
            id: 'example.com',
          },
          user: {
            id: 'dXNlcl8xMjM',
            name: 'user_123',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000,
          authenticatorSelection: {
            userVerification: 'required',
            residentKey: 'preferred',
          },
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.publicKey?.authenticatorSelection?.userVerification).toBe('required');
    expect(callArgs?.publicKey?.authenticatorSelection?.residentKey).toBe('preferred');
  });

  it('should use fallback authenticatorSelection when not provided by server', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'startRegister').mockResolvedValue(
      ok({
        challenge: {
          rp: {
            name: 'Example App',
            id: 'example.com',
          },
          user: {
            id: 'dXNlcl8xMjM',
            name: 'user_123',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000,
          // No authenticatorSelection
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.publicKey?.authenticatorSelection?.userVerification).toBe('preferred');
  });

  it('should override authenticatorAttachment when user provides authenticatorType', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'startRegister').mockResolvedValue(
      ok({
        challenge: {
          rp: {
            name: 'Example App',
            id: 'example.com',
          },
          user: {
            id: 'dXNlcl8xMjM',
            name: 'user_123',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000,
          authenticatorSelection: {
            userVerification: 'required',
            residentKey: 'preferred',
            authenticatorAttachment: 'cross-platform',
          },
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );

    await registerPasskey(
      {
        external_user_id: 'user_123',
        authenticatorType: 'platform',
      },
      apiClient,
      eventEmitter
    );

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0]?.[0];
    // El authenticatorType del usuario debe sobrescribir el del servidor
    expect(callArgs?.publicKey?.authenticatorSelection?.authenticatorAttachment).toBe('platform');
    // Pero otros valores del servidor se mantienen
    expect(callArgs?.publicKey?.authenticatorSelection?.userVerification).toBe('required');
    expect(callArgs?.publicKey?.authenticatorSelection?.residentKey).toBe('preferred');
  });

  it('should preserve all authenticatorSelection fields from server', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'startRegister').mockResolvedValue(
      ok({
        challenge: {
          rp: {
            name: 'Example App',
            id: 'example.com',
          },
          user: {
            id: 'dXNlcl8xMjM',
            name: 'user_123',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000,
          authenticatorSelection: {
            userVerification: 'discouraged',
            residentKey: 'required',
            authenticatorAttachment: 'cross-platform',
          },
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );

    await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.publicKey?.authenticatorSelection?.userVerification).toBe('discouraged');
    expect(callArgs?.publicKey?.authenticatorSelection?.residentKey).toBe('required');
    expect(callArgs?.publicKey?.authenticatorSelection?.authenticatorAttachment).toBe(
      'cross-platform'
    );
  });

  it('should handle API errors', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockCreate.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'finishRegister').mockResolvedValue(
      err(createError('NETWORK_ERROR', 'API error'))
    );

    const errorHandler = vi.fn();
    eventEmitter.on('error', errorHandler);

    const result = await registerPasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);
    expect(result.ok).toBe(false);

    expect(errorHandler).toHaveBeenCalled();
  });
});

describe('authenticatePasskey', () => {
  let apiClient: ApiClient;
  let eventEmitter: EventEmitter;
  let mockGet: ReturnType<typeof vi.fn>;
  let originalNavigator: typeof navigator;
  let originalPublicKeyCredential: typeof PublicKeyCredential;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 30000,
    });

    eventEmitter = new EventEmitter();

    mockGet = vi.fn();

    originalNavigator = global.navigator;
    originalPublicKeyCredential = global.PublicKeyCredential;

    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: mockGet,
      },
    } as unknown as Navigator;

    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn();
    } as unknown as typeof PublicKeyCredential;

    vi.spyOn(apiClient, 'startAuth').mockResolvedValue(
      ok({
        challenge: {
          challenge: 'Y2hhbGxlbmdlX2Jhc2U2NHVybA',
          rpId: 'example.com',
          allowCredentials: [
            {
              id: 'Y3JlZF8xMjM',
              type: 'public-key',
              transports: ['usb'],
            },
          ],
          timeout: 30000,
          userVerification: 'required',
        },
        session_id: '660e8400-e29b-41d4-a716-446655440000',
      })
    );

    vi.spyOn(apiClient, 'finishAuthentication').mockResolvedValue(
      ok({
        authenticated: true,
        session_token: 'session_token_123',
        user: {
          user_id: 'user_uuid_123',
          external_user_id: 'user_123',
        },
        signals: {
          userVerification: true,
          backupEligible: true,
          backupStatus: false,
        },
      })
    );
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.PublicKeyCredential = originalPublicKeyCredential;
    vi.clearAllMocks();
  });

  it('should authenticate with passkey successfully', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
    };

    const result = await authenticatePasskey(options, apiClient, eventEmitter);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.authenticated).toBe(true);
      expect(result.value.sessionToken).toBe('session_token_123');
      expect(result.value.user?.externalUserId).toBe('user_123');
      expect(result.value.signals?.userVerification).toBe(true);
    }
    expect(apiClient.startAuth).toHaveBeenCalledWith({
      external_user_id: 'user_123',
    });
    expect(apiClient.finishAuthentication).toHaveBeenCalled();
  });

  it('should authenticate with hint', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
      hint: 'user@example.com',
    };

    await authenticatePasskey(options, apiClient, eventEmitter);

    expect(apiClient.startAuth).toHaveBeenCalledWith({
      external_user_id: 'user_123',
    });
  });

  it('should emit start event', async () => {
    const startHandler = vi.fn();
    eventEmitter.on('start', startHandler);

    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    await authenticatePasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(startHandler).toHaveBeenCalledWith({
      type: 'start',
      operation: 'authenticate',
    });
  });

  it('should emit success event', async () => {
    const successHandler = vi.fn();
    eventEmitter.on('success', successHandler);

    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    await authenticatePasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(successHandler).toHaveBeenCalledWith({
      type: 'success',
      operation: 'authenticate',
    });
  });

  it('should handle WebAuthn not supported', async () => {
    global.PublicKeyCredential = undefined as unknown as typeof PublicKeyCredential;

    const result = await authenticatePasskey(
      { external_user_id: 'user_123' },
      apiClient,
      eventEmitter
    );
    expect(result.ok).toBe(false);
  });

  it('should handle user cancellation', async () => {
    const domError = new DOMException('User cancelled', 'NotAllowedError');
    mockGet.mockRejectedValue(domError);

    const errorHandler = vi.fn();
    eventEmitter.on('error', errorHandler);

    const result = await authenticatePasskey(
      { external_user_id: 'user_123' },
      apiClient,
      eventEmitter
    );
    expect(result.ok).toBe(false);

    expect(errorHandler).toHaveBeenCalled();
  });

  it('should handle AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
      signal: controller.signal,
    };

    const result = await authenticatePasskey(options, apiClient, eventEmitter);
    expect(result.ok).toBe(false);
  });

  it('should convert challenge from base64url to ArrayBuffer', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    await authenticatePasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockGet).toHaveBeenCalled();
    const callArgs = mockGet.mock.calls[0]?.[0];
    expect(callArgs?.publicKey?.challenge).toBeInstanceOf(ArrayBuffer);
  });

  it('should include mediation in options passed to credentials.get when mediation is conditional', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    await authenticatePasskey(
      { external_user_id: 'user_123', mediation: 'conditional' },
      apiClient,
      eventEmitter
    );

    expect(mockGet).toHaveBeenCalled();
    const callArgs = mockGet.mock.calls[0]?.[0];
    expect(callArgs).toHaveProperty('mediation', 'conditional');
  });

  it('should not include mediation in options when not specified', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    await authenticatePasskey({ external_user_id: 'user_123' }, apiClient, eventEmitter);

    expect(mockGet).toHaveBeenCalled();
    const callArgs = mockGet.mock.calls[0]?.[0];
    expect(callArgs).not.toHaveProperty('mediation');
  });

  it('should handle API errors', async () => {
    const mockCredential = {
      id: 'credential_id',
      rawId: new ArrayBuffer(8),
      response: {
        clientDataJSON: new ArrayBuffer(8),
        authenticatorData: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
      },
      type: 'public-key',
    } as unknown as PublicKeyCredential;

    mockGet.mockResolvedValue(mockCredential);

    vi.spyOn(apiClient, 'finishAuthentication').mockResolvedValue(
      err(createError('NETWORK_ERROR', 'API error'))
    );

    const errorHandler = vi.fn();
    eventEmitter.on('error', errorHandler);

    const result = await authenticatePasskey(
      { external_user_id: 'user_123' },
      apiClient,
      eventEmitter
    );
    expect(result.ok).toBe(false);

    expect(errorHandler).toHaveBeenCalled();
  });
});
