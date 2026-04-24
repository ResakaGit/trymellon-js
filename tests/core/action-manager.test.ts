import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionManager } from '../../src/core/action-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';
import type { IssueActionChallengeResponse, VerifyActionSignatureResponse } from '../../src/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_ACTION_TYPE = 'approve:transfer';
const VALID_PAYLOAD_HASH = 'a'.repeat(64); // 64-char lowercase hex
const VALID_RP_ID = 'app.example.com';

const validIssueResponse: IssueActionChallengeResponse = {
  challenge_id: 'challenge-uuid-1234',
  expires_at: '2026-04-08T12:05:00.000Z',
  webauthn_options: {
    challenge: 'Y2hhbGxlbmdlQWN0aW9u', // base64url
    rpId: VALID_RP_ID,
    allowCredentials: [],
    timeout: 60000,
    userVerification: 'required',
  },
};

const validVerifyResponse: VerifyActionSignatureResponse = {
  token: 'eyJhbGciOiJFUzI1NiJ9.action.sig',
  verified_at: '2026-04-08T12:04:01.000Z',
  action_type: VALID_ACTION_TYPE,
  credential_id: 'cred_abc123',
};

function createFakePublicKeyCredential(): PublicKeyCredential {
  const buf = new ArrayBuffer(16);
  return {
    id: 'cred_abc123',
    rawId: buf,
    response: {
      authenticatorData: buf,
      clientDataJSON: buf,
      signature: buf,
    } as AuthenticatorAssertionResponse,
    type: 'public-key',
    getClientExtensionResults: () => ({}),
  } as PublicKeyCredential;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockApiClient(
  overrides?: Partial<Pick<ApiClient, 'issueActionChallenge' | 'verifyActionSignature'>>
) {
  return {
    issueActionChallenge: vi.fn().mockResolvedValue(ok(validIssueResponse)),
    verifyActionSignature: vi.fn().mockResolvedValue(ok(validVerifyResponse)),
    ...overrides,
  } as unknown as ApiClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActionManager.sign', () => {
  let originalCredentials: typeof navigator.credentials;

  beforeEach(() => {
    originalCredentials = navigator.credentials;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.stubGlobal('navigator', { ...navigator, credentials: originalCredentials });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('Given valid inputs and a user who approves the WebAuthn prompt', () => {
    it('When sign() is called, Then returns ok(ActionSignResult) with token and metadata', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const manager = new ActionManager(apiClient, () => 'test-session-token');

      // When
      const result = await manager.sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.token).toBe(validVerifyResponse.token);
      expect(result.value.verifiedAt).toBe(validVerifyResponse.verified_at);
      expect(result.value.actionType).toBe(VALID_ACTION_TYPE);
      expect(result.value.credentialId).toBe(validVerifyResponse.credential_id);
    });

    it('When sign() is called, Then issueActionChallenge receives correct snake_case body', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const manager = new ActionManager(apiClient, () => 'test-session-token');

      // When
      await manager.sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
        ttlSeconds: 120,
      });

      // Then — ADR-SDK-001 Amendment · SDK-02 — session token is passed as 2nd arg.
      expect(apiClient.issueActionChallenge).toHaveBeenCalledWith(
        {
          action_type: VALID_ACTION_TYPE,
          payload_hash: VALID_PAYLOAD_HASH,
          rp_id: VALID_RP_ID,
          ttl_seconds: 120,
        },
        'test-session-token'
      );
    });

    it('When sign() is called, Then verifyActionSignature receives challengeId and serialized response', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const manager = new ActionManager(apiClient, () => 'test-session-token');

      // When
      await manager.sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then — session token passed as 3rd arg (ADR-SDK-001 Amendment · SDK-02).
      expect(apiClient.verifyActionSignature).toHaveBeenCalledWith(
        validIssueResponse.challenge_id,
        expect.objectContaining({
          rp_id: VALID_RP_ID,
          authentication_response: expect.objectContaining({
            id: 'cred_abc123',
            type: 'public-key',
          }),
        }),
        'test-session-token'
      );
    });

    it('Given no active session (getSessionToken returns null), when sign() is called, then INVALID_STATE without HTTP calls', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn() },
      });
      const manager = new ActionManager(apiClient, () => null);

      // When
      const result = await manager.sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_STATE');
      expect(apiClient.issueActionChallenge).not.toHaveBeenCalled();
      expect(apiClient.verifyActionSignature).not.toHaveBeenCalled();
      expect(navigator.credentials.get).not.toHaveBeenCalled();
    });

    it('When ttlSeconds is omitted, Then ttl_seconds is not sent to issueActionChallenge', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });

      // When
      await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then — no ttl_seconds key in the call
      const callArg = (apiClient.issueActionChallenge as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('ttl_seconds');
    });
  });

  // -------------------------------------------------------------------------
  // Input validation (client-side guards)
  // -------------------------------------------------------------------------

  describe('Given invalid inputs', () => {
    it('When actionType is empty, Then returns err(INVALID_ARGUMENT) before any HTTP call', async () => {
      // Given
      const apiClient = createMockApiClient();

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: '',
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(apiClient.issueActionChallenge).not.toHaveBeenCalled();
    });

    it('When actionType lacks namespace:verb format, Then returns err(INVALID_ARGUMENT)', async () => {
      // Given
      const apiClient = createMockApiClient();

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: 'invalid-format',
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('When payloadHash is not 64 lowercase hex chars, Then returns err(INVALID_ARGUMENT)', async () => {
      // Given
      const apiClient = createMockApiClient();

      for (const bad of ['', 'abc', 'A'.repeat(64), 'z'.repeat(64)]) {
        // When
        const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
          actionType: VALID_ACTION_TYPE,
          payloadHash: bad,
          rpId: VALID_RP_ID,
        });

        // Then
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('INVALID_ARGUMENT');
      }
      expect(apiClient.issueActionChallenge).not.toHaveBeenCalled();
    });

    it('When rpId is empty, Then returns err(INVALID_ARGUMENT)', async () => {
      // Given
      const apiClient = createMockApiClient();

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: '   ',
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(apiClient.issueActionChallenge).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Abort signal
  // -------------------------------------------------------------------------

  describe('Given an already-aborted signal', () => {
    it('When sign() is called, Then returns err(ABORT_ERROR) before any HTTP call', async () => {
      // Given
      const apiClient = createMockApiClient();
      const controller = new AbortController();
      controller.abort();

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
        signal: controller.signal,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('ABORT_ERROR');
      expect(apiClient.issueActionChallenge).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // WebAuthn ceremony errors
  // -------------------------------------------------------------------------

  describe('Given a user who dismisses the WebAuthn prompt', () => {
    it('When credentials.get throws NotAllowedError, Then returns err(USER_CANCELLED)', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new DOMException('User cancelled', 'NotAllowedError')),
        },
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('USER_CANCELLED');
      expect(apiClient.verifyActionSignature).not.toHaveBeenCalled();
    });

    it('When credentials.get throws NotSupportedError, Then returns err(NOT_SUPPORTED)', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new DOMException('Not supported', 'NotSupportedError')),
        },
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('NOT_SUPPORTED');
    });

    it('When credentials.get throws AbortError, Then returns err(ABORT_ERROR)', async () => {
      // Given
      const apiClient = createMockApiClient();
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: {
          get: vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
        },
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('ABORT_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Backend errors — action-specific
  // -------------------------------------------------------------------------

  describe('Given backend returns action-specific errors', () => {
    it('When issueActionChallenge returns ACTION_CHALLENGE_EXPIRED, Then propagates the error', async () => {
      // Given
      const apiClient = createMockApiClient({
        issueActionChallenge: vi
          .fn()
          .mockResolvedValue(err(createError('ACTION_CHALLENGE_EXPIRED'))),
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('ACTION_CHALLENGE_EXPIRED');
    });

    it('When verifyActionSignature returns ACTION_ALREADY_CLAIMED, Then propagates the error', async () => {
      // Given
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const apiClient = createMockApiClient({
        verifyActionSignature: vi
          .fn()
          .mockResolvedValue(err(createError('ACTION_ALREADY_CLAIMED'))),
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('ACTION_ALREADY_CLAIMED');
    });

    it('When verifyActionSignature returns ACTION_PAYLOAD_MISMATCH, Then propagates the error', async () => {
      // Given
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const apiClient = createMockApiClient({
        verifyActionSignature: vi
          .fn()
          .mockResolvedValue(err(createError('ACTION_PAYLOAD_MISMATCH'))),
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('ACTION_PAYLOAD_MISMATCH');
    });
  });

  // -------------------------------------------------------------------------
  // Backend errors — generic
  // -------------------------------------------------------------------------

  describe('Given backend returns generic errors', () => {
    it('When issueActionChallenge returns NETWORK_FAILURE, Then propagates without ceremony', async () => {
      // Given
      const apiClient = createMockApiClient({
        issueActionChallenge: vi.fn().mockResolvedValue(err(createError('NETWORK_FAILURE'))),
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('NETWORK_FAILURE');
      expect(apiClient.verifyActionSignature).not.toHaveBeenCalled();
    });

    it('When verifyActionSignature returns SERVER_ERROR, Then propagates the error', async () => {
      // Given
      vi.stubGlobal('navigator', {
        ...navigator,
        credentials: { get: vi.fn().mockResolvedValue(createFakePublicKeyCredential()) },
      });
      const apiClient = createMockApiClient({
        verifyActionSignature: vi.fn().mockResolvedValue(err(createError('SERVER_ERROR'))),
      });

      // When
      const result = await new ActionManager(apiClient, () => 'test-session-token').sign({
        actionType: VALID_ACTION_TYPE,
        payloadHash: VALID_PAYLOAD_HASH,
        rpId: VALID_RP_ID,
      });

      // Then
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('SERVER_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Error code mapping from backend raw codes
  // -------------------------------------------------------------------------

  describe('Given mapBackendErrorCodeToTryMellon', () => {
    it('maps action_challenge_expired → ACTION_CHALLENGE_EXPIRED', async () => {
      const { mapBackendErrorCodeToTryMellon } = await import('../../src/errors');
      expect(mapBackendErrorCodeToTryMellon('action_challenge_expired')).toBe(
        'ACTION_CHALLENGE_EXPIRED'
      );
    });

    it('maps challenge_already_claimed → ACTION_ALREADY_CLAIMED', async () => {
      const { mapBackendErrorCodeToTryMellon } = await import('../../src/errors');
      expect(mapBackendErrorCodeToTryMellon('challenge_already_claimed')).toBe(
        'ACTION_ALREADY_CLAIMED'
      );
    });

    it('maps action_payload_mismatch → ACTION_PAYLOAD_MISMATCH', async () => {
      const { mapBackendErrorCodeToTryMellon } = await import('../../src/errors');
      expect(mapBackendErrorCodeToTryMellon('action_payload_mismatch')).toBe(
        'ACTION_PAYLOAD_MISMATCH'
      );
    });
  });
});
