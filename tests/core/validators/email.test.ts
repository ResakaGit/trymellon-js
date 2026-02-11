import { describe, it, expect } from 'vitest';
import { validateEmailVerifyResponse } from '../../../src/core/validators/email';

describe('validateEmailVerifyResponse', () => {
  it('should return ok for valid payload with sessionToken', () => {
    const result = validateEmailVerifyResponse({ sessionToken: 'st_abc123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionToken).toBe('st_abc123');
    }
  });

  it('should return err for null', () => {
    const result = validateEmailVerifyResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });

  it('should return err for non-object', () => {
    const result = validateEmailVerifyResponse('string');
    expect(result.ok).toBe(false);
  });

  it('should return err when sessionToken is missing', () => {
    const result = validateEmailVerifyResponse({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('sessionToken');
  });

  it('should return err when sessionToken is not string', () => {
    const result = validateEmailVerifyResponse({ sessionToken: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('sessionToken');
  });
});
