import { describe, it, expect } from 'vitest';
import {
  validateBridgeContextResponse,
  validateBridgeVerifyResponse,
  validateBridgeCompleteEnrollmentResponse,
  validateBridgeCompleteAuthResponse,
  validateBridgeStatusResponse,
} from '../../../src/core/validators/bridge';

describe('validateBridgeContextResponse', () => {
  const validContext = {
    type: 'registration' as const,
    options: { challenge: 'abc', rp: { id: 'example.com' } },
  };

  it('returns ok for valid payload (type registration, options object)', () => {
    const result = validateBridgeContextResponse(validContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('registration');
      expect(result.value.options).toEqual(validContext.options);
    }
  });

  it('returns ok for type auth', () => {
    const result = validateBridgeContextResponse({ type: 'auth', options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe('auth');
  });

  it('returns ok with optional application_name', () => {
    const result = validateBridgeContextResponse({
      ...validContext,
      application_name: 'My App',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.application_name).toBe('My App');
  });

  it('returns err for null', () => {
    const result = validateBridgeContextResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNKNOWN_ERROR');
  });

  it('returns err for non-object', () => {
    const result = validateBridgeContextResponse('string');
    expect(result.ok).toBe(false);
  });

  it('returns err when type is not auth or registration', () => {
    const result = validateBridgeContextResponse({
      type: 'other',
      options: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('type');
  });

  it('returns err when options is missing', () => {
    const result = validateBridgeContextResponse({ type: 'auth' });
    expect(result.ok).toBe(false);
  });

  it('returns err when options is not object', () => {
    const result = validateBridgeContextResponse({
      type: 'auth',
      options: 'invalid',
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateBridgeVerifyResponse', () => {
  const validVerify = {
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    challenge: 'Y2hhbGxlbmdl',
    registration_options: { rp: { id: 'example.com' }, challenge: 'abc' },
  };

  it('returns ok for valid payload (session_id, optional challenge and options)', () => {
    const result = validateBridgeVerifyResponse(validVerify);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe(validVerify.session_id);
      expect(result.value.challenge).toBe(validVerify.challenge);
      expect(result.value.registration_options).toEqual(validVerify.registration_options);
    }
  });

  it('returns ok with only session_id', () => {
    const result = validateBridgeVerifyResponse({ session_id: validVerify.session_id });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.session_id).toBe(validVerify.session_id);
  });

  it('returns err for null', () => {
    const result = validateBridgeVerifyResponse(null);
    expect(result.ok).toBe(false);
  });

  it('returns err when session_id is empty string', () => {
    const result = validateBridgeVerifyResponse({ session_id: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_id');
  });

  it('returns err when challenge is not string when present', () => {
    const result = validateBridgeVerifyResponse({
      session_id: validVerify.session_id,
      challenge: {},
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when registration_options is not object when present', () => {
    const result = validateBridgeVerifyResponse({
      session_id: validVerify.session_id,
      registration_options: 'invalid',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('registration_options');
  });

  it('returns ok with authentication_options when present', () => {
    const result = validateBridgeVerifyResponse({
      session_id: validVerify.session_id,
      authentication_options: { challenge: 'Y2hh', rpId: 'example.com' },
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.authentication_options).toEqual({
        challenge: 'Y2hh',
        rpId: 'example.com',
      });
  });

  it('returns err when authentication_options is not object when present', () => {
    const result = validateBridgeVerifyResponse({
      session_id: validVerify.session_id,
      authentication_options: 'invalid',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('authentication_options');
  });
});

describe('validateBridgeCompleteEnrollmentResponse', () => {
  const validComplete = {
    credential_id: 'cred_1',
    entity_id: 'ent_1',
    user_id: 'user_1',
    session_token: 'tok_1',
  };

  it('returns ok for valid payload', () => {
    const result = validateBridgeCompleteEnrollmentResponse(validComplete);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.credential_id).toBe('cred_1');
      expect(result.value.entity_id).toBe('ent_1');
      expect(result.value.user_id).toBe('user_1');
      expect(result.value.session_token).toBe('tok_1');
    }
  });

  it('returns err for null', () => {
    const result = validateBridgeCompleteEnrollmentResponse(null);
    expect(result.ok).toBe(false);
  });

  it('returns err when credential_id is missing', () => {
    const result = validateBridgeCompleteEnrollmentResponse({
      entity_id: validComplete.entity_id,
      user_id: validComplete.user_id,
      session_token: validComplete.session_token,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('credential_id');
  });

  it('returns err when session_token is not string', () => {
    const result = validateBridgeCompleteEnrollmentResponse({
      ...validComplete,
      session_token: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when entity_id is not string', () => {
    const result = validateBridgeCompleteEnrollmentResponse({
      ...validComplete,
      entity_id: 42,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('entity_id');
  });

  it('returns err when user_id is not string', () => {
    const result = validateBridgeCompleteEnrollmentResponse({
      ...validComplete,
      user_id: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user_id');
  });
});

describe('validateBridgeCompleteAuthResponse', () => {
  it('returns ok for valid payload (session_token)', () => {
    const result = validateBridgeCompleteAuthResponse({ session_token: 'tok_auth_1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.session_token).toBe('tok_auth_1');
  });

  it('returns err for null', () => {
    const result = validateBridgeCompleteAuthResponse(null);
    expect(result.ok).toBe(false);
  });

  it('returns err when session_token is missing', () => {
    const result = validateBridgeCompleteAuthResponse({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_token');
  });

  it('returns err when session_token is not string', () => {
    const result = validateBridgeCompleteAuthResponse({ session_token: null });
    expect(result.ok).toBe(false);
  });
});

describe('validateBridgeStatusResponse', () => {
  it('returns ok for valid status pending', () => {
    const result = validateBridgeStatusResponse({ status: 'pending' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('pending');
  });

  it('returns ok for status completed with optional ts', () => {
    const result = validateBridgeStatusResponse({
      status: 'completed',
      ts: '2026-03-15T12:00:00Z',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.ts).toBe('2026-03-15T12:00:00Z');
    }
  });

  it('returns ok for pin_verified status', () => {
    const result = validateBridgeStatusResponse({ status: 'pin_verified' });
    expect(result.ok).toBe(true);
  });

  it('returns ok for pin_locked status', () => {
    const result = validateBridgeStatusResponse({ status: 'pin_locked' });
    expect(result.ok).toBe(true);
  });

  it('returns err for null', () => {
    const result = validateBridgeStatusResponse(null);
    expect(result.ok).toBe(false);
  });

  it('returns err when status is an unknown value', () => {
    const result = validateBridgeStatusResponse({ status: 'unknown_status' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('status');
  });

  it('returns err when status is missing', () => {
    const result = validateBridgeStatusResponse({});
    expect(result.ok).toBe(false);
  });

  it('returns err when ts is not string when present', () => {
    const result = validateBridgeStatusResponse({ status: 'completed', ts: 12345 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('ts');
  });
});
