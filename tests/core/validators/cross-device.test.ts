import { describe, it, expect } from 'vitest';
import {
  validateCrossDeviceInitResponse,
  validateCrossDeviceStatusResponse,
  validateCrossDeviceContextResponse,
  validateCrossDeviceVerifyResponse,
} from '../../../src/core/validators/cross-device';

describe('validateCrossDeviceInitResponse', () => {
  const validPayload = {
    session_id: 'sess_cd_123',
    qr_url: 'https://example.com/qr/abc',
    expires_at: '2026-02-12T12:00:00Z',
    polling_token: 'opaque_polling_token_abc',
  };

  it('should return ok for valid payload', () => {
    const result = validateCrossDeviceInitResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe('sess_cd_123');
      expect(result.value.qr_url).toBe('https://example.com/qr/abc');
      expect(result.value.expires_at).toBe('2026-02-12T12:00:00Z');
      expect(result.value.polling_token).toBe('opaque_polling_token_abc');
    }
  });

  it('should return ok for fintech envelope { ok: true, resultado: payload }', () => {
    const result = validateCrossDeviceInitResponse({
      ok: true,
      resultado: validPayload,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe(validPayload.session_id);
      expect(result.value.qr_url).toBe(validPayload.qr_url);
      expect(result.value.expires_at).toBe(validPayload.expires_at);
      expect(result.value.polling_token).toBe(validPayload.polling_token);
    }
  });

  it('should return err for null', () => {
    const result = validateCrossDeviceInitResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNKNOWN_ERROR');
  });

  it('should return err for undefined', () => {
    const result = validateCrossDeviceInitResponse(undefined);
    expect(result.ok).toBe(false);
  });

  it('should return err for non-object', () => {
    const result = validateCrossDeviceInitResponse('string');
    expect(result.ok).toBe(false);
  });

  it('should return err when polling_token is missing', () => {
    const result = validateCrossDeviceInitResponse({
      session_id: validPayload.session_id,
      qr_url: validPayload.qr_url,
      expires_at: validPayload.expires_at,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('required fields');
  });

  it('should return err when session_id is missing', () => {
    const result = validateCrossDeviceInitResponse({
      qr_url: validPayload.qr_url,
      expires_at: validPayload.expires_at,
      polling_token: validPayload.polling_token,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('required fields');
  });

  it('should return err when qr_url is missing', () => {
    const result = validateCrossDeviceInitResponse({
      session_id: validPayload.session_id,
      expires_at: validPayload.expires_at,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when expires_at is missing', () => {
    const result = validateCrossDeviceInitResponse({
      session_id: validPayload.session_id,
      qr_url: validPayload.qr_url,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is not string', () => {
    const result = validateCrossDeviceInitResponse({
      ...validPayload,
      session_id: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when qr_url is not string', () => {
    const result = validateCrossDeviceInitResponse({
      ...validPayload,
      qr_url: null,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when expires_at is not string', () => {
    const result = validateCrossDeviceInitResponse({
      ...validPayload,
      expires_at: {},
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateCrossDeviceStatusResponse', () => {
  it('should return ok for status pending', () => {
    const result = validateCrossDeviceStatusResponse({ status: 'pending' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('pending');
  });

  it('should return ok for status authenticated', () => {
    const result = validateCrossDeviceStatusResponse({ status: 'authenticated' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('authenticated');
  });

  it('should return ok for status completed with user_id and session_token', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 'user_1',
      session_token: 'st_abc',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.user_id).toBe('user_1');
      expect(result.value.session_token).toBe('st_abc');
    }
  });

  it('should return err for null', () => {
    const result = validateCrossDeviceStatusResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err for non-object', () => {
    const result = validateCrossDeviceStatusResponse([]);
    expect(result.ok).toBe(false);
  });

  it('should return err when status is missing', () => {
    const result = validateCrossDeviceStatusResponse({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('invalid status');
  });

  it('should return err when status is not string', () => {
    const result = validateCrossDeviceStatusResponse({ status: 123 });
    expect(result.ok).toBe(false);
  });

  it('should return err when status is invalid value', () => {
    const result = validateCrossDeviceStatusResponse({ status: 'invalid' });
    expect(result.ok).toBe(false);
  });

  it('should return err when status is empty string', () => {
    const result = validateCrossDeviceStatusResponse({ status: '' });
    expect(result.ok).toBe(false);
  });

  it('should return err when status is completed and user_id is not string (e.g. number)', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 123,
      session_token: 'st',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('user_id');
      expect(result.error.message).toContain('string');
    }
  });

  it('should return err when status is completed and session_token is null', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 'u',
      session_token: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('session_token');
      expect(result.error.message).toContain('string');
    }
  });

  it('should return ok for status completed with valid string user_id and session_token', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 'u',
      session_token: 'st',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.user_id).toBe('u');
      expect(result.value.session_token).toBe('st');
    }
  });

  it('should return ok for status completed with user_id and session_token both undefined (caller must reject)', () => {
    const result = validateCrossDeviceStatusResponse({ status: 'completed' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.user_id).toBeUndefined();
      expect(result.value.session_token).toBeUndefined();
    }
  });

  it('should return ok when status is completed and user_id is empty string (present but string; caller treats as falsy)', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: '',
      session_token: 'st',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user_id).toBe('');
      expect(result.value.session_token).toBe('st');
    }
  });

  it('should return ok for status completed with optional redirect_url string', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 'u',
      session_token: 'st',
      redirect_url: 'https://app.example.com/dashboard',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.redirect_url).toBe('https://app.example.com/dashboard');
    }
  });

  it('should return err when redirect_url is present but not a string', () => {
    const result = validateCrossDeviceStatusResponse({
      status: 'completed',
      user_id: 'u',
      session_token: 'st',
      redirect_url: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('redirect_url');
      expect(result.error.message).toContain('string');
    }
  });

  it('should return ok when envelope resultado contains status payload with redirect_url', () => {
    const result = validateCrossDeviceStatusResponse({
      ok: true,
      resultado: {
        status: 'completed',
        user_id: 'u2',
        session_token: 'st2',
        redirect_url: '/dashboard',
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
      expect(result.value.user_id).toBe('u2');
      expect(result.value.session_token).toBe('st2');
      expect(result.value.redirect_url).toBe('/dashboard');
    }
  });
});

describe('validateCrossDeviceContextResponse', () => {
  const validAuthOptions = { challenge: 'Y2hhbGxlbmdl', rpId: 'example.com' };
  const validRegistrationOptions = {
    challenge: 'c',
    rp: { id: 'example.com', name: 'Test' },
    user: { id: 'u1', name: 'u', displayName: 'U' },
    pubKeyCredParams: [],
  };

  it('should return ok for valid payload with type auth and options', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'auth',
      options: validAuthOptions,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('auth');
      expect(result.value.options).toEqual(validAuthOptions);
    }
  });

  it('should return ok for valid payload with type registration and options', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'registration',
      options: validRegistrationOptions,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('registration');
      expect(result.value.options).toEqual(validRegistrationOptions);
    }
  });

  it('should return ok for payload without type (defaults to auth) when options are auth shape', () => {
    const result = validateCrossDeviceContextResponse({ options: validAuthOptions });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe('auth');
  });

  it('should return err for null', () => {
    const result = validateCrossDeviceContextResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err for non-object', () => {
    const result = validateCrossDeviceContextResponse('string');
    expect(result.ok).toBe(false);
  });

  it('should return err when options is missing', () => {
    const result = validateCrossDeviceContextResponse({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('options are required');
  });

  it('should return err when options is not object', () => {
    const result = validateCrossDeviceContextResponse({ options: 'not-an-object' });
    expect(result.ok).toBe(false);
  });

  it('should return err when options is null', () => {
    const result = validateCrossDeviceContextResponse({ options: null });
    expect(result.ok).toBe(false);
  });

  it('should return err when type is registration but options lack creation shape', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'registration',
      options: { challenge: 'c', rpId: 'x.com' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('registration options');
  });

  it('should return err when type is auth but options lack request shape', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'auth',
      options: { rp: {}, user: {} },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('auth options');
  });

  it('should return ok and include approval_context and application_name when present', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'auth',
      options: validAuthOptions,
      approval_context: 'Access to orders',
      application_name: 'Acme Corp',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.approval_context).toBe('Access to orders');
      expect(result.value.application_name).toBe('Acme Corp');
    }
  });

  it('should return ok without approval_context/application_name when omitted', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'auth',
      options: validAuthOptions,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty('approval_context');
      expect(result.value).not.toHaveProperty('application_name');
    }
  });

  it('should return err when approval_context exceeds 200 chars', () => {
    const result = validateCrossDeviceContextResponse({
      type: 'auth',
      options: validAuthOptions,
      approval_context: 'x'.repeat(201),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('approval_context');
  });
});

describe('validateCrossDeviceVerifyResponse', () => {
  it('should return ok(undefined) for undefined', () => {
    const result = validateCrossDeviceVerifyResponse(undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it('should return ok(undefined) for null', () => {
    const result = validateCrossDeviceVerifyResponse(null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it('should return ok(undefined) for empty object', () => {
    const result = validateCrossDeviceVerifyResponse({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it('should return err for object with properties', () => {
    const result = validateCrossDeviceVerifyResponse({ foo: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toContain('empty body');
    }
  });

  it('should return err for string', () => {
    const result = validateCrossDeviceVerifyResponse('body');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('empty body');
  });

  it('should return err for number', () => {
    const result = validateCrossDeviceVerifyResponse(0);
    expect(result.ok).toBe(false);
  });

  it('should return err for array', () => {
    const result = validateCrossDeviceVerifyResponse([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('empty body');
  });
});
