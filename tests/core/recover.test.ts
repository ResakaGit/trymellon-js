import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recoverAccount } from '../../src/core/recover';
import type { ApiClient } from '../../src/core/api';
import type { EventEmitter } from '../../src/core/events';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

// Valid base64url for createRegistrationOptions
const validChallenge = {
  rp: { name: 'R', id: 'r.com' },
  user: { id: 'dXNlcl8x', name: 'n', displayName: 'D' },
  challenge: 'Y2hhbGxlbmdl',
  pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
};

const validVerifyResponse = {
  challenge: validChallenge,
  recovery_session_id: 'rs_550e8400-e29b-41d4-a716-446655440000',
};

const validCompleteResponse = {
  status: 'completed',
  session_token: 'sess_tok_abc',
  credential_id: 'cred_123',
  user: {
    user_id: 'u_1',
    external_user_id: 'ext_1',
    email: 'u@example.com',
    metadata: { key: 'value' },
  },
};

describe('recoverAccount', () => {
  let mockApiClient: {
    verifyAccountRecoveryOtp: ReturnType<typeof vi.fn>;
    completeAccountRecovery: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: EventEmitter;

  beforeEach(() => {
    mockApiClient = {
      verifyAccountRecoveryOtp: vi.fn(),
      completeAccountRecovery: vi.fn(),
    };
    mockEventEmitter = { emit: vi.fn() } as unknown as EventEmitter;
    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn().mockResolvedValue({
          id: 'cred_1',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          response: {
            clientDataJSON: new ArrayBuffer(8),
            attestationObject: new ArrayBuffer(8),
          },
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns err when WebAuthn is not supported', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(false);

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_SUPPORTED');
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('start', {
      type: 'start',
      operation: 'signUp',
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ type: 'error' })
    );
    expect(mockApiClient.verifyAccountRecoveryOtp).not.toHaveBeenCalled();
  });

  it('returns err when externalUserId is missing', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);

    const result = await recoverAccount(
      { otp: '123456' } as Parameters<typeof recoverAccount>[0],
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    if (!result.ok) expect(result.error.message).toMatch(/externalUserId|non-empty/);
    expect(mockApiClient.verifyAccountRecoveryOtp).not.toHaveBeenCalled();
  });

  it('returns err when externalUserId is empty string', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);

    const result = await recoverAccount(
      { externalUserId: '   ', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    expect(mockApiClient.verifyAccountRecoveryOtp).not.toHaveBeenCalled();
  });

  it('returns err when otp is not 6 digits', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '12345' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    if (!result.ok) expect(result.error.message).toMatch(/otp|6-digit/);
    expect(mockApiClient.verifyAccountRecoveryOtp).not.toHaveBeenCalled();
  });

  it('returns err when verifyAccountRecoveryOtp returns error', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(
      err(createError('INVALID_ARGUMENT', 'Invalid OTP'))
    );

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    expect(mockApiClient.verifyAccountRecoveryOtp).toHaveBeenCalledWith('user_1', '123456');
    expect(mockApiClient.completeAccountRecovery).not.toHaveBeenCalled();
  });

  it('returns err when createRegistrationOptions fails (invalid challenge shape)', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(
      ok({ challenge: { invalid: 'shape' }, recovery_session_id: 'rs_1' })
    );

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ type: 'error' })
    );
    expect(mockApiClient.completeAccountRecovery).not.toHaveBeenCalled();
  });

  it('returns err when credential fails validateCredentialStructure (missing response)', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn().mockResolvedValue({
          id: 'cred_1',
          rawId: new ArrayBuffer(8),
          type: 'public-key',
          // omit response so validateCredentialStructure throws
        }),
      },
    });

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ type: 'error' })
    );
    expect(mockApiClient.completeAccountRecovery).not.toHaveBeenCalled();
  });

  it('returns err when navigator.credentials.create returns null', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    vi.stubGlobal('navigator', {
      credentials: { create: vi.fn().mockResolvedValue(null) },
    });

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/creation failed|credential/);
    expect(mockApiClient.completeAccountRecovery).not.toHaveBeenCalled();
  });

  it('returns err when completeAccountRecovery returns error', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    mockApiClient.completeAccountRecovery.mockResolvedValue(
      err(createError('NETWORK_FAILURE', 'Server error'))
    );

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    expect(mockApiClient.completeAccountRecovery).toHaveBeenCalledWith(
      validVerifyResponse.recovery_session_id,
      expect.any(Object)
    );
  });

  it('returns ok and full result when flow succeeds', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    mockApiClient.completeAccountRecovery.mockResolvedValue(ok(validCompleteResponse));

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.success).toBe(true);
      expect(result.value.credentialId).toBe('cred_123');
      expect(result.value.status).toBe('completed');
      expect(result.value.sessionToken).toBe('sess_tok_abc');
      expect(result.value.user.userId).toBe('u_1');
      expect(result.value.user.externalUserId).toBe('ext_1');
      expect(result.value.user.email).toBe('u@example.com');
      expect(result.value.user.metadata).toEqual({ key: 'value' });
    }
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('success', {
      type: 'success',
      operation: 'signUp',
      token: 'sess_tok_abc',
      user: {
        userId: 'u_1',
        externalUserId: 'ext_1',
        email: 'u@example.com',
        metadata: { key: 'value' },
      },
    });
    expect(mockApiClient.verifyAccountRecoveryOtp).toHaveBeenCalledWith('user_1', '123456');
    expect(mockApiClient.completeAccountRecovery).toHaveBeenCalledWith(
      validVerifyResponse.recovery_session_id,
      expect.any(Object)
    );
  });

  it('exposes redirectUrl when API returns redirect_url', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    mockApiClient.completeAccountRecovery.mockResolvedValue(
      ok({ ...validCompleteResponse, redirect_url: 'https://app.example.com/welcome' })
    );

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.redirectUrl).toBe('https://app.example.com/welcome');
    }
  });

  it('returns err when verifyAccountRecoveryOtp throws (generic catch)', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockRejectedValue(new Error('Network error'));

    const result = await recoverAccount(
      { externalUserId: 'user_1', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(false);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ type: 'error' })
    );
    expect(mockApiClient.completeAccountRecovery).not.toHaveBeenCalled();
  });

  it('accepts external_user_id (legacy) as alias for externalUserId', async () => {
    const support = await import('../../src/utils/support');
    vi.spyOn(support, 'isWebAuthnSupported').mockReturnValue(true);
    mockApiClient.verifyAccountRecoveryOtp.mockResolvedValue(ok(validVerifyResponse));
    mockApiClient.completeAccountRecovery.mockResolvedValue(ok(validCompleteResponse));

    const result = await recoverAccount(
      { external_user_id: 'legacy_user', otp: '123456' },
      mockApiClient as unknown as ApiClient,
      mockEventEmitter
    );

    expect(result.ok).toBe(true);
    expect(mockApiClient.verifyAccountRecoveryOtp).toHaveBeenCalledWith('legacy_user', '123456');
  });
});
