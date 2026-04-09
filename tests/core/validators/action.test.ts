import { describe, it, expect } from 'vitest';
import {
  validateIssueActionChallengeResponse,
  validateVerifyActionSignatureResponse,
} from '../../../src/core/validators/action';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validIssueResponse = {
  challenge_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  expires_at: '2026-04-08T12:05:00.000Z',
  webauthn_options: {
    challenge: 'Y2hhbGxlbmdlQWN0aW9u',
    rpId: 'app.example.com',
    allowCredentials: [{ id: 'Y3JlZF8x', type: 'public-key' as const }],
    timeout: 60000,
    userVerification: 'required' as const,
  },
};

const validVerifyResponse = {
  token: 'eyJhbGciOiJFUzI1NiJ9.eyJ0eXBlIjoiYWN0aW9uX3Rva2VuIn0.sig',
  verified_at: '2026-04-08T12:04:01.000Z',
  action_type: 'approve:transfer',
  credential_id: 'Y3JlZF8x',
};

// ---------------------------------------------------------------------------
// validateIssueActionChallengeResponse
// ---------------------------------------------------------------------------

describe('validateIssueActionChallengeResponse', () => {
  describe('Given a valid issue response', () => {
    it('returns ok with all required fields', () => {
      const result = validateIssueActionChallengeResponse(validIssueResponse);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.challenge_id).toBe(validIssueResponse.challenge_id);
      expect(result.value.expires_at).toBe(validIssueResponse.expires_at);
      expect(result.value.webauthn_options.challenge).toBe(
        validIssueResponse.webauthn_options.challenge
      );
      expect(result.value.webauthn_options.rpId).toBe(validIssueResponse.webauthn_options.rpId);
    });

    it('preserves optional fields when present', () => {
      const result = validateIssueActionChallengeResponse(validIssueResponse);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.webauthn_options.timeout).toBe(60000);
      expect(result.value.webauthn_options.userVerification).toBe('required');
      expect(result.value.webauthn_options.allowCredentials).toHaveLength(1);
    });

    it('accepts response without optional fields (allowCredentials, timeout, userVerification)', () => {
      const minimal = {
        challenge_id: 'uuid-1234',
        expires_at: '2026-04-08T12:05:00.000Z',
        webauthn_options: {
          challenge: 'Y2hhbGxlbmdl',
          rpId: 'app.example.com',
        },
      };
      const result = validateIssueActionChallengeResponse(minimal);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.webauthn_options.timeout).toBeUndefined();
      expect(result.value.webauthn_options.allowCredentials).toBeUndefined();
    });
  });

  describe('Given invalid inputs', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['string', 'string'],
      [42, 'number'],
      [[], 'array'],
    ])('rejects %s as top-level value', (input) => {
      const result = validateIssueActionChallengeResponse(input);
      expect(result.ok).toBe(false);
    });

    it('rejects missing challenge_id', () => {
      const { challenge_id: _, ...rest } = validIssueResponse;
      const result = validateIssueActionChallengeResponse(rest);
      expect(result.ok).toBe(false);
    });

    it('rejects empty challenge_id', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        challenge_id: '   ',
      });
      expect(result.ok).toBe(false);
    });

    it('rejects missing expires_at', () => {
      const { expires_at: _, ...rest } = validIssueResponse;
      const result = validateIssueActionChallengeResponse(rest);
      expect(result.ok).toBe(false);
    });

    it('rejects missing webauthn_options', () => {
      const { webauthn_options: _, ...rest } = validIssueResponse;
      const result = validateIssueActionChallengeResponse(rest);
      expect(result.ok).toBe(false);
    });

    it('rejects webauthn_options without challenge', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: { rpId: 'app.example.com' },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects webauthn_options without rpId', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: { challenge: 'Y2hhbGxlbmdl' },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects allowCredentials with non-object item', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: {
          ...validIssueResponse.webauthn_options,
          allowCredentials: ['not-an-object'],
        },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects allowCredentials item with wrong type', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: {
          ...validIssueResponse.webauthn_options,
          allowCredentials: [{ id: 'abc', type: 'invalid-type' }],
        },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects timeout that is not a number', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: { ...validIssueResponse.webauthn_options, timeout: 'sixty' },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects unknown userVerification value', () => {
      const result = validateIssueActionChallengeResponse({
        ...validIssueResponse,
        webauthn_options: { ...validIssueResponse.webauthn_options, userVerification: 'optional' },
      });
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// validateVerifyActionSignatureResponse
// ---------------------------------------------------------------------------

describe('validateVerifyActionSignatureResponse', () => {
  describe('Given a valid verify response', () => {
    it('returns ok with all fields mapped', () => {
      const result = validateVerifyActionSignatureResponse(validVerifyResponse);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.token).toBe(validVerifyResponse.token);
      expect(result.value.verified_at).toBe(validVerifyResponse.verified_at);
      expect(result.value.action_type).toBe(validVerifyResponse.action_type);
      expect(result.value.credential_id).toBe(validVerifyResponse.credential_id);
    });
  });

  describe('Given invalid inputs', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [42, 'number'],
    ])('rejects %s as top-level value', (input) => {
      const result = validateVerifyActionSignatureResponse(input);
      expect(result.ok).toBe(false);
    });

    it('rejects missing token', () => {
      const { token: _, ...rest } = validVerifyResponse;
      expect(validateVerifyActionSignatureResponse(rest).ok).toBe(false);
    });

    it('rejects empty token string', () => {
      expect(validateVerifyActionSignatureResponse({ ...validVerifyResponse, token: '' }).ok).toBe(
        false
      );
    });

    it('rejects missing verified_at', () => {
      const { verified_at: _, ...rest } = validVerifyResponse;
      expect(validateVerifyActionSignatureResponse(rest).ok).toBe(false);
    });

    it('rejects missing action_type', () => {
      const { action_type: _, ...rest } = validVerifyResponse;
      expect(validateVerifyActionSignatureResponse(rest).ok).toBe(false);
    });

    it('rejects missing credential_id', () => {
      const { credential_id: _, ...rest } = validVerifyResponse;
      expect(validateVerifyActionSignatureResponse(rest).ok).toBe(false);
    });

    it('rejects empty credential_id', () => {
      expect(
        validateVerifyActionSignatureResponse({ ...validVerifyResponse, credential_id: '  ' }).ok
      ).toBe(false);
    });
  });
});
