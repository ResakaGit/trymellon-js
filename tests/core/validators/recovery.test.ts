import { describe, it, expect } from 'vitest';
import {
  validateRecoveryVerifyResponse,
  validateRecoveryCompleteResponse,
} from '../../../src/core/validators/recovery';

describe('validateRecoveryVerifyResponse', () => {
  const validVerifyPayload = {
    challenge: {
      rp: { name: 'App', id: 'example.com' },
      user: { id: 'dXNlcl8x' },
      challenge: 'Y2hh',
    },
    recovery_session_id: 'rs_550e8400-e29b-41d4-a716-446655440000',
  };

  it('returns ok for valid payload', () => {
    const result = validateRecoveryVerifyResponse(validVerifyPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recovery_session_id).toBe(validVerifyPayload.recovery_session_id);
      expect(result.value.challenge).toEqual(validVerifyPayload.challenge);
    }
  });

  it('returns err for null', () => {
    const result = validateRecoveryVerifyResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected object');
    }
  });

  it('returns err for non-object', () => {
    const result = validateRecoveryVerifyResponse('string');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('expected object');
  });

  it('returns err when challenge is missing', () => {
    const result = validateRecoveryVerifyResponse({
      recovery_session_id: 'rs_1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/challenge|required|missing/i);
  });

  it('returns err when recovery_session_id is missing', () => {
    const result = validateRecoveryVerifyResponse({
      challenge: validVerifyPayload.challenge,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/recovery_session_id|required|missing/i);
  });

  it('returns err when challenge is not an object', () => {
    const result = validateRecoveryVerifyResponse({
      challenge: 'not-an-object',
      recovery_session_id: 'rs_1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('challenge');
  });

  it('returns err when recovery_session_id is not a string', () => {
    const result = validateRecoveryVerifyResponse({
      challenge: validVerifyPayload.challenge,
      recovery_session_id: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('recovery_session_id');
  });
});

describe('validateRecoveryCompleteResponse', () => {
  const validCompletePayload = {
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

  it('returns ok for valid payload with all optional user fields', () => {
    const result = validateRecoveryCompleteResponse(validCompletePayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.session_token).toBe('sess_tok_abc');
      expect(result.value.credential_id).toBe('cred_123');
      expect(result.value.user.user_id).toBe('u_1');
      expect(result.value.user.external_user_id).toBe('ext_1');
      expect(result.value.user.email).toBe('u@example.com');
      expect(result.value.user.metadata).toEqual({ key: 'value' });
    }
  });

  it('returns ok for valid payload with minimal user (only user_id)', () => {
    const minimal = {
      status: 'completed',
      session_token: 'st',
      credential_id: 'c1',
      user: { user_id: 'u1' },
    };
    const result = validateRecoveryCompleteResponse(minimal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.user_id).toBe('u1');
      expect(result.value.user.external_user_id).toBeUndefined();
      expect(result.value.user.email).toBeUndefined();
      expect(result.value.user.metadata).toBeUndefined();
    }
  });

  it('returns err for null', () => {
    const result = validateRecoveryCompleteResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('expected object');
  });

  it('returns err for non-object', () => {
    const result = validateRecoveryCompleteResponse([]);
    expect(result.ok).toBe(false);
  });

  it('returns err when status is missing', () => {
    const result = validateRecoveryCompleteResponse({
      session_token: 'st',
      credential_id: 'c1',
      user: { user_id: 'u1' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/status|required|missing/i);
  });

  it('returns err when status is not string', () => {
    const result = validateRecoveryCompleteResponse({
      ...validCompletePayload,
      status: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('status');
  });

  it('returns err when session_token is not string', () => {
    const result = validateRecoveryCompleteResponse({
      ...validCompletePayload,
      session_token: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_token');
  });

  it('returns err when credential_id is not string', () => {
    const result = validateRecoveryCompleteResponse({
      ...validCompletePayload,
      credential_id: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('credential_id');
  });

  it('returns err when user is missing', () => {
    const result = validateRecoveryCompleteResponse({
      status: 'completed',
      session_token: 'st',
      credential_id: 'c1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/user|required|missing/i);
  });

  it('returns err when user is not an object', () => {
    const result = validateRecoveryCompleteResponse({
      ...validCompletePayload,
      user: 'not-object',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user');
  });

  it('returns err when user.user_id is not string', () => {
    const result = validateRecoveryCompleteResponse({
      ...validCompletePayload,
      user: { ...validCompletePayload.user, user_id: 999 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user_id');
  });

  it('omits optional user fields when not string or object', () => {
    const payload = {
      status: 'ok',
      session_token: 'st',
      credential_id: 'c1',
      user: {
        user_id: 'u1',
        external_user_id: 123,
        email: null,
        metadata: 'not-object',
      },
    };
    const result = validateRecoveryCompleteResponse(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.external_user_id).toBeUndefined();
      expect(result.value.user.email).toBeUndefined();
      expect(result.value.user.metadata).toBeUndefined();
    }
  });
});
