import { describe, it, expect } from 'vitest';
import { validateSessionValidateResponse } from '../../../src/core/validators/session';

describe('validateSessionValidateResponse', () => {
  const validPayload = {
    valid: true,
    user_id: 'u1',
    external_user_id: 'ext1',
    tenant_id: 'tenant_1',
    app_id: 'app_1',
  };

  it('should return ok for valid payload and map to camelCase', () => {
    const result = validateSessionValidateResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.valid).toBe(true);
      expect(result.value.appId).toBe('app_1');
      expect(result.value.userId).toBe('u1');
      expect(result.value.externalUserId).toBe('ext1');
      expect(result.value.tenantId).toBe('tenant_1');
    }
  });

  it('should return err for null', () => {
    const result = validateSessionValidateResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when app_id is missing', () => {
    const result = validateSessionValidateResponse({
      valid: true,
      user_id: 'u1',
      external_user_id: 'ext1',
      tenant_id: 't1',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when valid is not boolean', () => {
    const result = validateSessionValidateResponse({
      ...validPayload,
      valid: 'yes',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err for non-object', () => {
    const result = validateSessionValidateResponse('string');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('expected object');
  });

  it('should return err when user_id is not string', () => {
    const result = validateSessionValidateResponse({
      ...validPayload,
      user_id: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('user_id');
  });

  it('should return err when external_user_id is not string', () => {
    const result = validateSessionValidateResponse({
      ...validPayload,
      external_user_id: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('external_user_id');
  });

  it('should return err when tenant_id is not string', () => {
    const result = validateSessionValidateResponse({
      ...validPayload,
      tenant_id: 999,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('tenant_id');
  });

  it('should return err when app_id is not string', () => {
    const result = validateSessionValidateResponse({
      ...validPayload,
      app_id: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('app_id');
  });
});
