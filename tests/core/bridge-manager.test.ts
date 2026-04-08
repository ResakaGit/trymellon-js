import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BridgeManager,
  validateBridgeSessionId,
  toBridgeEnrollmentResult,
  toBridgeAuthResult,
} from '../../src/core/bridge-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

const FIXED_CONTEXT_HASH = 'a'.repeat(64);
vi.mock('../../src/core/context-hash', () => ({
  getOrCreateContextHash: vi.fn(() => FIXED_CONTEXT_HASH),
}));

const validContext = {
  type: 'registration' as const,
  options: {
    challenge: 'Y2hh',
    rp: { id: 'example.com' },
    user: { id: 'dX', name: 'u', displayName: 'U' },
    pubKeyCredParams: [],
  },
};
const validVerifyResponse = {
  session_id: '550e8400-e29b-41d4-a716-446655440000',
  challenge: 'Y2hhbGxlbmdl',
  registration_options: {
    challenge: 'Y2hhbGxlbmdl',
    rp: { id: 'example.com', name: 'Example' },
    user: { id: 'dXNlcl8x', name: 'u', displayName: 'U' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  },
  authentication_options: {
    challenge: 'Y2hh',
    rpId: 'example.com',
    allowCredentials: [],
  },
};

function createFakePublicKeyCredential(): PublicKeyCredential {
  const buf = new ArrayBuffer(8);
  return {
    id: 'cred_bridge_1',
    rawId: buf,
    response: {
      clientDataJSON: buf,
      attestationObject: buf,
    } as AuthenticatorAttestationResponse,
    type: 'public-key',
    getClientExtensionResults: () => ({}),
  } as PublicKeyCredential;
}

describe('validateBridgeSessionId', () => {
  it('returns ok for non-empty string', () => {
    const result = validateBridgeSessionId('sess-123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('sess-123');
  });

  it('returns ok for string with surrounding spaces (trimmed)', () => {
    const result = validateBridgeSessionId('  sess-123  ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('sess-123');
  });

  it('returns err for empty string', () => {
    const result = validateBridgeSessionId('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
  });

  it('returns err for null/undefined', () => {
    expect(validateBridgeSessionId(null).ok).toBe(false);
    expect(validateBridgeSessionId(undefined).ok).toBe(false);
  });
});

describe('toBridgeEnrollmentResult / toBridgeAuthResult', () => {
  it('toBridgeEnrollmentResult maps DTO to public shape', () => {
    const dto = {
      credential_id: 'c1',
      entity_id: 'e1',
      user_id: 'u1',
      session_token: 'st1',
    };
    const result = toBridgeEnrollmentResult(dto);
    expect(result.sessionToken).toBe('st1');
    expect(result.credentialId).toBe('c1');
    expect(result.userId).toBe('u1');
    expect(result.entityId).toBe('e1');
  });

  it('toBridgeAuthResult maps DTO to public shape', () => {
    const result = toBridgeAuthResult({ session_token: 'token_auth' });
    expect(result.sessionToken).toBe('token_auth');
  });
});

describe('BridgeManager', () => {
  let mockApiClient: {
    getBridgeContext: ReturnType<typeof vi.fn>;
    verifyBridgePin: ReturnType<typeof vi.fn>;
    completeBridgeEnrollment: ReturnType<typeof vi.fn>;
    completeBridgeAuth: ReturnType<typeof vi.fn>;
    getBridgeStatus: ReturnType<typeof vi.fn>;
    getBridgeStatusUrl: ReturnType<typeof vi.fn>;
  };
  let originalCredentials: typeof navigator.credentials;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = {
      getBridgeContext: vi.fn(),
      verifyBridgePin: vi.fn(),
      completeBridgeEnrollment: vi.fn(),
      completeBridgeAuth: vi.fn(),
      getBridgeStatus: vi.fn(),
      getBridgeStatusUrl: vi.fn(),
    };
    originalCredentials = navigator.credentials;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', { ...navigator, credentials: originalCredentials });
  });

  describe('getContext', () => {
    it('returns context when API returns ok (enrollment)', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(ok(validContext));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.getContext('sess-123', 'enrollment');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('registration');
        expect(result.value.options).toEqual(validContext.options);
      }
      expect(mockApiClient.getBridgeContext).toHaveBeenCalledWith('sess-123', 'enrollment');
    });

    it('returns err when sessionId is empty', async () => {
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.getContext('', 'auth');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(mockApiClient.getBridgeContext).not.toHaveBeenCalled();
    });

    it('returns err when API returns error', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(err(createError('SESSION_EXPIRED')));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.getContext('sess-123', 'auth');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('verifyPin', () => {
    it('returns challenge response when PIN is valid', async () => {
      mockApiClient.verifyBridgePin.mockResolvedValue(ok(validVerifyResponse));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.verifyPin('sess-123', '1234', 'enrollment');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe(validVerifyResponse.session_id);
        expect(result.value.registration_options).toEqual(validVerifyResponse.registration_options);
      }
      expect(mockApiClient.verifyBridgePin).toHaveBeenCalledWith('sess-123', '1234', 'enrollment');
    });

    it('returns err when API returns PIN_MISMATCH', async () => {
      mockApiClient.verifyBridgePin.mockResolvedValue(
        err(createError('PIN_MISMATCH', 'PIN does not match', { remaining_attempts: 2 }))
      );
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.verifyPin('sess-123', '0000', 'enrollment');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PIN_MISMATCH');
        expect((result.error.details as { remaining_attempts?: number })?.remaining_attempts).toBe(
          2
        );
      }
    });

    it('returns err when API returns PIN_LOCKED', async () => {
      mockApiClient.verifyBridgePin.mockResolvedValue(err(createError('PIN_LOCKED')));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.verifyPin('sess-123', '1234', 'auth');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('PIN_LOCKED');
    });

    it('returns err when sessionId is empty', async () => {
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.verifyPin('', '1234', 'enrollment');
      expect(result.ok).toBe(false);
      expect(mockApiClient.verifyBridgePin).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('returns INVALID_ARGUMENT when neither presencePin nor onPinRequired provided', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(ok(validContext));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-123', { kind: 'enrollment' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(mockApiClient.verifyBridgePin).not.toHaveBeenCalled();
    });

    it('returns INVALID_ARGUMENT when context.type does not match kind', async () => {
      const authContext = { type: 'auth' as const, options: {} };
      mockApiClient.getBridgeContext.mockResolvedValue(ok(authContext));
      mockApiClient.verifyBridgePin.mockResolvedValue(ok(validVerifyResponse));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-123', {
        kind: 'enrollment',
        presencePin: '1234',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_ARGUMENT');
        expect(result.error.message).toContain('does not match kind');
      }
    });

    it('complete enrollment with presencePin: verifyPin then create then completeBridgeEnrollment', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(ok(validContext));
      mockApiClient.verifyBridgePin.mockResolvedValue(ok(validVerifyResponse));
      mockApiClient.completeBridgeEnrollment.mockResolvedValue(
        ok({ credential_id: 'c1', entity_id: 'e1', user_id: 'u1', session_token: 'st1' })
      );
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          create: vi.fn().mockResolvedValue(createFakePublicKeyCredential()),
        },
      });

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-123', {
        kind: 'enrollment',
        presencePin: '1234',
        ticketId: 'ticket_1',
        entityId: 'entity_1',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('st1');
        expect('credentialId' in result.value && result.value.credentialId).toBe('c1');
      }
      expect(mockApiClient.verifyBridgePin).toHaveBeenCalledWith('sess-123', '1234', 'enrollment');
      expect(mockApiClient.completeBridgeEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'sess-123',
          ticket_id: 'ticket_1',
          entity_id: 'entity_1',
          context_hash: FIXED_CONTEXT_HASH,
          registration_response: expect.any(Object),
        })
      );
    });

    it('complete auth kind: verifyPin then credentials.get then completeBridgeAuth', async () => {
      const authContext = { type: 'auth' as const, options: {} };
      const authVerifyResponse = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        authentication_options: {
          challenge: 'Y2hhbGxlbmdl',
          rpId: 'example.com',
          allowCredentials: [],
          userVerification: 'preferred',
        },
      };
      mockApiClient.getBridgeContext.mockResolvedValue(ok(authContext));
      mockApiClient.verifyBridgePin.mockResolvedValue(ok(authVerifyResponse));
      mockApiClient.completeBridgeAuth.mockResolvedValue(ok({ session_token: 'auth_tok_1' }));

      const buf = new ArrayBuffer(8);
      const fakeAuthCredential = {
        id: 'cred_auth_1',
        rawId: buf,
        response: {
          clientDataJSON: buf,
          authenticatorData: buf,
          signature: buf,
          userHandle: null,
        } as AuthenticatorAssertionResponse,
        type: 'public-key',
        getClientExtensionResults: () => ({}),
      } as PublicKeyCredential;

      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(fakeAuthCredential) },
      });

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-auth', { kind: 'auth', presencePin: '9876' });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.sessionToken).toBe('auth_tok_1');
      expect(mockApiClient.verifyBridgePin).toHaveBeenCalledWith('sess-auth', '9876', 'auth');
      expect(mockApiClient.completeBridgeAuth).toHaveBeenCalledWith(
        expect.objectContaining({ session_id: 'sess-auth' })
      );
    });

    it('complete uses onPinRequired callback when presencePin is absent', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(ok(validContext));
      mockApiClient.verifyBridgePin.mockResolvedValue(ok(validVerifyResponse));
      mockApiClient.completeBridgeEnrollment.mockResolvedValue(
        ok({ credential_id: 'c2', entity_id: 'e2', user_id: 'u2', session_token: 'st2' })
      );
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { create: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });

      const onPinRequired = vi.fn().mockResolvedValue('5678');
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-pin-cb', {
        kind: 'enrollment',
        onPinRequired,
        ticketId: 'tick_2',
        entityId: 'ent_2',
      });

      expect(onPinRequired).toHaveBeenCalled();
      expect(mockApiClient.verifyBridgePin).toHaveBeenCalledWith(
        'sess-pin-cb',
        '5678',
        'enrollment'
      );
      expect(result.ok).toBe(true);
    });

    it('complete returns INVALID_ARGUMENT when onPinRequired returns empty string', async () => {
      mockApiClient.getBridgeContext.mockResolvedValue(ok(validContext));
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.complete('sess-no-pin', {
        kind: 'enrollment',
        onPinRequired: async () => '',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });
  });

  describe('waitForResult', () => {
    it('with useSse: false uses polling and resolves when status is terminal', async () => {
      mockApiClient.getBridgeStatus
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(ok({ status: 'completed', ts: '2026-03-15T12:00:00Z' }));

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.waitForResult('sess-123', {
        useSse: false,
        kind: 'enrollment',
        timeoutMs: 10_000,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('completed');
        expect(result.value.ts).toBe('2026-03-15T12:00:00Z');
      }
      expect(mockApiClient.getBridgeStatus).toHaveBeenCalledWith('sess-123', 'enrollment');
      expect(mockApiClient.getBridgeStatus).toHaveBeenCalledTimes(3);
    });

    it('when EventSource is mocked, useSse: true resolves on terminal status event', async () => {
      let capturedOnMessage: ((ev: { data: string }) => void) | null = null;
      const MockEventSource = vi.fn().mockImplementation(function (
        this: {
          url: string;
          close: ReturnType<typeof vi.fn>;
          onmessage: ((ev: { data: string }) => void) | null;
        },
        url: string
      ) {
        this.url = url;
        this.close = vi.fn();
        this.onmessage = null;
        Object.defineProperty(this, 'onmessage', {
          set: (fn: (ev: { data: string }) => void) => {
            capturedOnMessage = fn;
          },
          get: () => capturedOnMessage,
          configurable: true,
        });
      });
      vi.stubGlobal('EventSource', MockEventSource);
      mockApiClient.getBridgeStatusUrl.mockReturnValue(
        'https://api.example.com/v1/enrollment-bridge/status/sess-456'
      );

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const resultPromise = manager.waitForResult('sess-456', { useSse: true, kind: 'enrollment' });

      await vi.waitFor(() => expect(MockEventSource).toHaveBeenCalled());
      const instance = MockEventSource.mock.results[0]?.value;
      expect(instance).toBeDefined();
      expect(capturedOnMessage).not.toBeNull();
      if (!capturedOnMessage) {
        throw new Error('EventSource onmessage handler was not set');
      }
      capturedOnMessage({
        data: JSON.stringify({ status: 'completed', ts: '2026-03-15T12:00:00Z' }),
      });

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('completed');
        expect(result.value.ts).toBe('2026-03-15T12:00:00Z');
      }
      expect(mockApiClient.getBridgeStatusUrl).toHaveBeenCalledWith('sess-456', 'enrollment');
      expect(mockApiClient.getBridgeStatus).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('returns INVALID_ARGUMENT when sessionId is empty', async () => {
      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.waitForResult('', { useSse: false });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(mockApiClient.getBridgeStatus).not.toHaveBeenCalled();
    });

    it('when SSE onerror fires, falls back to polling and resolves', async () => {
      let capturedOnError: (() => void) | null = null;
      const MockEventSource = vi.fn().mockImplementation(function (this: {
        url: string;
        close: ReturnType<typeof vi.fn>;
        onerror: (() => void) | null;
      }) {
        this.close = vi.fn();
        this.onerror = null;
        Object.defineProperty(this, 'onerror', {
          set: (fn: () => void) => {
            capturedOnError = fn;
          },
          configurable: true,
        });
      });
      vi.stubGlobal('EventSource', MockEventSource);
      mockApiClient.getBridgeStatusUrl.mockReturnValue('https://api.example.com/bridge/status/s1');
      mockApiClient.getBridgeStatus.mockResolvedValue(ok({ status: 'pin_verified' }));

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const resultPromise = manager.waitForResult('sess-sse-err', {
        useSse: true,
        kind: 'auth',
        timeoutMs: 10_000,
      });

      await vi.waitFor(() => expect(capturedOnError).not.toBeNull());
      if (!capturedOnError) throw new Error('onerror handler was not set');
      capturedOnError();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe('pin_verified');
      expect(mockApiClient.getBridgeStatus).toHaveBeenCalledWith('sess-sse-err', 'auth');
      vi.unstubAllGlobals();
    });

    it('when EventSource constructor throws, falls back to polling', async () => {
      vi.stubGlobal(
        'EventSource',
        vi.fn().mockImplementation(() => {
          throw new Error('EventSource not supported');
        })
      );
      mockApiClient.getBridgeStatusUrl.mockReturnValue('https://api.example.com/bridge/status/s2');
      mockApiClient.getBridgeStatus.mockResolvedValue(ok({ status: 'completed' }));

      const manager = new BridgeManager(mockApiClient as unknown as ApiClient);
      const result = await manager.waitForResult('sess-no-eventsrc', {
        useSse: true,
        kind: 'enrollment',
        timeoutMs: 10_000,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe('completed');
      vi.unstubAllGlobals();
    });
  });
});
