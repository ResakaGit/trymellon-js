import { describe, it, expect } from 'vitest';
import {
  validateEnrollmentStartResponse,
  validateEnrollmentFinishResponse,
} from '../../../src/core/validators/enrollment';

describe('validateEnrollmentStartResponse', () => {
  const validStartPayload = {
    session_id: 'sess_123',
    challenge: {
      rp: { name: 'Example', id: 'example.com' },
      user: { id: 'dXNlcl8x', name: 'user_1', displayName: 'User 1' },
      challenge: 'Y2hhbGxlbmdl',
      pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
    },
  };

  it('returns ok for valid payload (session_id, challenge like register)', () => {
    const result = validateEnrollmentStartResponse(validStartPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe('sess_123');
      expect(result.value.challenge.rp.id).toBe('example.com');
      expect(result.value.challenge.pubKeyCredParams).toHaveLength(1);
    }
  });

  it('returns err for null', () => {
    const result = validateEnrollmentStartResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNKNOWN_ERROR');
  });

  it('returns err for non-object', () => {
    const result = validateEnrollmentStartResponse('string');
    expect(result.ok).toBe(false);
  });

  it('returns err when session_id is missing', () => {
    const result = validateEnrollmentStartResponse({
      challenge: validStartPayload.challenge,
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when session_id is not string', () => {
    const result = validateEnrollmentStartResponse({
      ...validStartPayload,
      session_id: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_id');
  });

  it('returns err when challenge is missing', () => {
    const result = validateEnrollmentStartResponse({ session_id: 'sess_1' });
    expect(result.ok).toBe(false);
  });

  it('returns err when challenge is not object', () => {
    const result = validateEnrollmentStartResponse({
      session_id: 's',
      challenge: 'x',
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateEnrollmentFinishResponse', () => {
  const validFinishPayload = {
    credential_id: 'cred_1',
    status: 'verified',
    session_token: 'token_1',
    user: { user_id: 'user_uuid_1' },
  };

  it('returns ok for valid payload (credential_id, status, session_token, user with user_id)', () => {
    const result = validateEnrollmentFinishResponse(validFinishPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.credential_id).toBe('cred_1');
      expect(result.value.status).toBe('verified');
      expect(result.value.session_token).toBe('token_1');
      expect(result.value.user.user_id).toBe('user_uuid_1');
    }
  });

  it('returns err for null', () => {
    const result = validateEnrollmentFinishResponse(null);
    expect(result.ok).toBe(false);
  });

  it('returns err for non-object', () => {
    const result = validateEnrollmentFinishResponse(42);
    expect(result.ok).toBe(false);
  });

  it('returns err when credential_id is missing', () => {
    const result = validateEnrollmentFinishResponse({
      status: validFinishPayload.status,
      session_token: validFinishPayload.session_token,
      user: validFinishPayload.user,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('credential_id');
  });

  it('returns err when credential_id is not string', () => {
    const result = validateEnrollmentFinishResponse({
      ...validFinishPayload,
      credential_id: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when session_token is missing', () => {
    const result = validateEnrollmentFinishResponse({
      credential_id: validFinishPayload.credential_id,
      status: validFinishPayload.status,
      user: validFinishPayload.user,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_token');
  });

  it('returns err when session_token is not string', () => {
    const result = validateEnrollmentFinishResponse({
      ...validFinishPayload,
      session_token: null,
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when user is missing', () => {
    const result = validateEnrollmentFinishResponse({
      credential_id: validFinishPayload.credential_id,
      status: validFinishPayload.status,
      session_token: validFinishPayload.session_token,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user');
  });

  it('returns err when user is not object', () => {
    const result = validateEnrollmentFinishResponse({
      ...validFinishPayload,
      user: 'x',
    });
    expect(result.ok).toBe(false);
  });

  it('returns err when user lacks user_id', () => {
    const result = validateEnrollmentFinishResponse({
      ...validFinishPayload,
      user: {},
    });
    expect(result.ok).toBe(false);
  });
});
