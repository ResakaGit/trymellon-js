import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnrollmentManager } from '../../src/core/enrollment-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';
import type { EnrollmentStartResponse, EnrollmentFinishResponse } from '../../src/types';

const FIXED_CONTEXT_HASH = 'f'.repeat(64);

vi.mock('../../src/core/context-hash', () => ({
  getOrCreateContextHash: vi.fn(() => FIXED_CONTEXT_HASH),
}));

function createFakePublicKeyCredential(): PublicKeyCredential {
  const buf = new ArrayBuffer(8);
  return {
    id: 'cred_test_1',
    rawId: buf,
    response: {
      clientDataJSON: buf,
      attestationObject: buf,
    } as AuthenticatorAttestationResponse,
    type: 'public-key',
    getClientExtensionResults: () => ({}),
  } as PublicKeyCredential;
}

const validStartResponse: EnrollmentStartResponse = {
  session_id: 'sess_enroll_1',
  challenge: {
    rp: { name: 'R', id: 'r.com' },
    user: { id: 'dXNlcl8x', name: 'u', displayName: 'U' },
    challenge: 'Y2hhbGxlbmdl',
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  },
};

const validFinishResponse: EnrollmentFinishResponse = {
  credential_id: 'cred_1',
  status: 'verified',
  session_token: 'session_tok_1',
  user: { user_id: 'user_uuid_1' },
};

describe('EnrollmentManager', () => {
  let mockApiClient: {
    startEnrollment: ReturnType<typeof vi.fn>;
    finishEnrollment: ReturnType<typeof vi.fn>;
  };
  let originalCredentials: typeof navigator.credentials;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = {
      startEnrollment: vi.fn(),
      finishEnrollment: vi.fn(),
    };
    originalCredentials = navigator.credentials;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', { ...navigator, credentials: originalCredentials });
  });

  describe('enroll', () => {
    it('happy path: startEnrollment with ticketId + contextHash, credentials.create, finishEnrollment with credential + context_hash, returns ok(EnrollmentResult)', async () => {
      mockApiClient.startEnrollment.mockResolvedValue(ok(validStartResponse));
      mockApiClient.finishEnrollment.mockResolvedValue(ok(validFinishResponse));
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          create: vi.fn().mockResolvedValue(createFakePublicKeyCredential()),
        },
      });

      const manager = new EnrollmentManager(mockApiClient as unknown as ApiClient);
      const result = await manager.enroll({ ticketId: 'ticket_abc' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('session_tok_1');
      }
      expect(mockApiClient.startEnrollment).toHaveBeenCalledWith('ticket_abc', FIXED_CONTEXT_HASH);
      expect(mockApiClient.finishEnrollment).toHaveBeenCalledWith(
        'ticket_abc',
        expect.objectContaining({
          context_hash: FIXED_CONTEXT_HASH,
          credential: expect.objectContaining({
            id: 'cred_test_1',
            type: 'public-key',
          }),
        })
      );
    });

    it('user cancels ceremony (create throws NotAllowedError) → err(USER_CANCELLED)', async () => {
      mockApiClient.startEnrollment.mockResolvedValue(ok(validStartResponse));
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          create: vi.fn().mockRejectedValue(new DOMException('User cancelled', 'NotAllowedError')),
        },
      });

      const manager = new EnrollmentManager(mockApiClient as unknown as ApiClient);
      const result = await manager.enroll({ ticketId: 'ticket_xyz' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('USER_CANCELLED');
      }
      expect(mockApiClient.finishEnrollment).not.toHaveBeenCalled();
    });

    it('API returns error on startEnrollment → err with mapped code', async () => {
      mockApiClient.startEnrollment.mockResolvedValue(
        err(createError('TICKET_EXPIRED', 'Enrollment ticket has expired'))
      );

      const manager = new EnrollmentManager(mockApiClient as unknown as ApiClient);
      const result = await manager.enroll({ ticketId: 'ticket_expired' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TICKET_EXPIRED');
      }
      expect(mockApiClient.finishEnrollment).not.toHaveBeenCalled();
    });

    it('context hash included in startEnrollment and finishEnrollment request body', async () => {
      mockApiClient.startEnrollment.mockResolvedValue(ok(validStartResponse));
      mockApiClient.finishEnrollment.mockResolvedValue(ok(validFinishResponse));
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          create: vi.fn().mockResolvedValue(createFakePublicKeyCredential()),
        },
      });

      const manager = new EnrollmentManager(mockApiClient as unknown as ApiClient);
      await manager.enroll({ ticketId: 'ticket_ctx' });

      expect(mockApiClient.startEnrollment).toHaveBeenCalledWith('ticket_ctx', FIXED_CONTEXT_HASH);
      const finishCall = mockApiClient.finishEnrollment.mock.calls[0];
      expect(finishCall[1].context_hash).toBe(FIXED_CONTEXT_HASH);
    });

    it('WebAuthn NotSupportedError → mapped via mapWebAuthnError', async () => {
      mockApiClient.startEnrollment.mockResolvedValue(ok(validStartResponse));
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          create: vi.fn().mockRejectedValue(new DOMException('Not supported', 'NotSupportedError')),
        },
      });

      const manager = new EnrollmentManager(mockApiClient as unknown as ApiClient);
      const result = await manager.enroll({ ticketId: 'ticket_ns' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_SUPPORTED');
      }
    });
  });
});
