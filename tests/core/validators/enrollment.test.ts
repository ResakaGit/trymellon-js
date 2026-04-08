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
    user_id: 'user_uuid_1',
    session_token: 'token_1',
  };

  it('returns ok for valid flat payload (credential_id, user_id, session_token)', () => {
    const result = validateEnrollmentFinishResponse(validFinishPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.credential_id).toBe('cred_1');
      expect(result.value.user_id).toBe('user_uuid_1');
      expect(result.value.session_token).toBe('token_1');
      expect(result.value.entity_id).toBeUndefined();
    }
  });

  it('returns ok and includes entity_id when present', () => {
    const result = validateEnrollmentFinishResponse({ ...validFinishPayload, entity_id: 'ent_1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.entity_id).toBe('ent_1');
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
    const result = validateEnrollmentFinishResponse({ user_id: 'u', session_token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('credential_id');
  });

  it('returns err when credential_id is not string', () => {
    const result = validateEnrollmentFinishResponse({ ...validFinishPayload, credential_id: 123 });
    expect(result.ok).toBe(false);
  });

  it('returns err when user_id is missing', () => {
    const result = validateEnrollmentFinishResponse({ credential_id: 'c', session_token: 't' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user_id');
  });

  it('returns err when user_id is not string', () => {
    const result = validateEnrollmentFinishResponse({ ...validFinishPayload, user_id: null });
    expect(result.ok).toBe(false);
  });

  it('returns err when session_token is missing', () => {
    const result = validateEnrollmentFinishResponse({ credential_id: 'c', user_id: 'u' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_token');
  });

  it('returns err when session_token is not string', () => {
    const result = validateEnrollmentFinishResponse({ ...validFinishPayload, session_token: null });
    expect(result.ok).toBe(false);
  });

  it('returns err when entity_id is present but not string', () => {
    const result = validateEnrollmentFinishResponse({ ...validFinishPayload, entity_id: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('entity_id');
  });
});
