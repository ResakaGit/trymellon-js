import { describe, it, expect } from 'vitest';
import {
  TryMellonError,
  TryMellonErrorCode,
  createError,
  isTryMellonError,
  createNotSupportedError,
  createUserCancelledError,
  createTicketNotFoundError,
  createTicketExpiredError,
  createNetworkError,
  createTimeoutError,
  createInvalidArgumentError,
  createCredentialError,
  createEncodingError,
  validateNonEmptyString,
  validateUrl,
  validateBase64Url,
  validateRange,
  mapWebAuthnError,
  mapBackendErrorCodeToTryMellon,
  BACKEND_ORIGIN_NOT_ALLOWED_CODES,
  isOriginNotAllowedBackendCode,
} from '../src/errors';

describe('TryMellonError', () => {
  it('should create error with code and message', () => {
    const error = new TryMellonError('NOT_SUPPORTED', 'WebAuthn is not supported');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
    expect(error.message).toBe('WebAuthn is not supported');
    expect(error.name).toBe('TryMellonError');
    expect(error.isTryMellonError).toBe(true);
  });

  it('should include details when provided', () => {
    const details = { browser: 'IE11' };
    const error = new TryMellonError('NOT_SUPPORTED', 'Not supported', details);

    expect(error.details).toEqual(details);
  });

  it('should have all error codes', () => {
    const codes: TryMellonErrorCode[] = [
      'NOT_SUPPORTED',
      'USER_CANCELLED',
      'PASSKEY_NOT_FOUND',
      'SESSION_EXPIRED',
      'NETWORK_FAILURE',
      'INVALID_ARGUMENT',
      'TIMEOUT',
      'ABORT_ERROR',
      'UNKNOWN_ERROR',
    ];

    for (const code of codes) {
      const error = new TryMellonError(code, 'Test message');
      expect(error.code).toBe(code);
    }
  });

  it('should maintain stack trace', () => {
    const error = new TryMellonError('UNKNOWN_ERROR', 'Test');
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });

  it('should be serializable', () => {
    const error = new TryMellonError('NETWORK_FAILURE', 'Network error', {
      status: 500,
    });

    const serialized = JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      name: error.name,
    });
    const parsed = JSON.parse(serialized);

    expect(parsed.code).toBe('NETWORK_FAILURE');
    expect(parsed.message).toBe('Network error');
    expect(parsed.details).toEqual({ status: 500 });
    expect(parsed.name).toBe('TryMellonError');
  });
});

describe('createError', () => {
  it('should create error with code and message', () => {
    const error = createError('TIMEOUT', 'Operation timed out');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBe('Operation timed out');
  });

  it('should create error with default message when not provided', () => {
    const error = createError('ABORT_ERROR');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('ABORT_ERROR');
    expect(error.message).toBeTruthy();
  });

  it('should include details when provided', () => {
    const details = { userId: 'user_123' };
    const error = createError('INVALID_ARGUMENT', 'Invalid argument', details);

    expect(error.details).toEqual(details);
  });
});

describe('isTryMellonError', () => {
  it('should return true for TryMellonError instances', () => {
    const error = new TryMellonError('UNKNOWN_ERROR', 'Test');
    expect(isTryMellonError(error)).toBe(true);
  });

  it('should return true for errors created with createError', () => {
    const error = createError('NETWORK_FAILURE', 'Network error');
    expect(isTryMellonError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isTryMellonError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isTryMellonError(null)).toBe(false);
    expect(isTryMellonError(undefined)).toBe(false);
    expect(isTryMellonError('string')).toBe(false);
    expect(isTryMellonError(123)).toBe(false);
    expect(isTryMellonError({})).toBe(false);
  });

  it('should return true for duck-typed object with isTryMellonError: true', () => {
    const duckTyped = { isTryMellonError: true, code: 'TIMEOUT', message: 'Test' };
    expect(isTryMellonError(duckTyped)).toBe(true);
  });

  it('should work as type guard', () => {
    const error: unknown = new TryMellonError('TIMEOUT', 'Timeout');

    if (isTryMellonError(error)) {
      expect(error.code).toBe('TIMEOUT');
      expect(error.isTryMellonError).toBe(true);
    }
  });
});

describe('createNotSupportedError', () => {
  it('should create NOT_SUPPORTED error', () => {
    const error = createNotSupportedError();

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
    expect(error.message).toBeTruthy();
  });
});

describe('createUserCancelledError', () => {
  it('should create USER_CANCELLED error', () => {
    const error = createUserCancelledError();

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('USER_CANCELLED');
    expect(error.message).toBeTruthy();
  });
});

describe('createTicketNotFoundError', () => {
  it('should create TICKET_NOT_FOUND error', () => {
    const error = createTicketNotFoundError();
    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('TICKET_NOT_FOUND');
    expect(error.message).toBeTruthy();
  });
});

describe('createTicketExpiredError', () => {
  it('should create TICKET_EXPIRED error', () => {
    const error = createTicketExpiredError();
    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('TICKET_EXPIRED');
    expect(error.message).toBeTruthy();
  });
});

describe('createNetworkError', () => {
  it('should create NETWORK_FAILURE error', () => {
    const error = createNetworkError();

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NETWORK_FAILURE');
    expect(error.message).toBeTruthy();
  });

  it('should include cause error in details', () => {
    const cause = new Error('Connection failed');
    const error = createNetworkError(cause);

    expect(error.code).toBe('NETWORK_FAILURE');
    expect(error.details).toBeDefined();
  });
});

describe('createTimeoutError', () => {
  it('should create TIMEOUT error', () => {
    const error = createTimeoutError();

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBeTruthy();
  });
});

describe('createInvalidArgumentError', () => {
  it('should create INVALID_ARGUMENT error with field and reason', () => {
    const error = createInvalidArgumentError('userId', 'must be a non-empty string');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('INVALID_ARGUMENT');
    expect(error.message).toContain('userId');
    expect(error.message).toContain('must be a non-empty string');
    expect(error.details).toBeDefined();
  });

  it('should include field and reason in details', () => {
    const error = createInvalidArgumentError('appId', 'required');

    expect(error.details).toEqual({
      field: 'appId',
      reason: 'required',
    });
  });
});

describe('mapBackendErrorCodeToTryMellon', () => {
  it('maps known backend codes to TryMellonErrorCode', () => {
    expect(mapBackendErrorCodeToTryMellon('challenge_mismatch')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('session_expired')).toBe('SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('unauthorized')).toBe('SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('validation_error')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('user_not_found')).toBe('SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('passkey_not_found')).toBe('PASSKEY_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('ticket_not_found')).toBe('TICKET_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('ticket_expired')).toBe('TICKET_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('ticket_already_consumed')).toBe('TICKET_ALREADY_USED');
  });

  it('maps backend enrollment codes (uppercase NOT_FOUND/EXPIRED/ALREADY_CONSUMED) to TICKET_*', () => {
    expect(mapBackendErrorCodeToTryMellon('NOT_FOUND')).toBe('TICKET_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('EXPIRED')).toBe('TICKET_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('ALREADY_CONSUMED')).toBe('TICKET_ALREADY_USED');
    expect(mapBackendErrorCodeToTryMellon('not_found')).toBe('TICKET_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('expired')).toBe('TICKET_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('already_consumed')).toBe('TICKET_ALREADY_USED');
  });

  it('maps enrollment validation and context codes to CHALLENGE_MISMATCH or INVALID_ARGUMENT', () => {
    expect(mapBackendErrorCodeToTryMellon('context_mismatch')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('challenge_not_found')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('invalid_ticket_id')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('invalid_context_hash')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('invalid_config')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('enrollment_not_enabled')).toBe('INVALID_ARGUMENT');
  });

  it('maps bridge session codes to BRIDGE_SESSION_EXPIRED', () => {
    expect(mapBackendErrorCodeToTryMellon('bridge_session_expired')).toBe('BRIDGE_SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('session_not_found')).toBe('BRIDGE_SESSION_EXPIRED');
  });

  it('maps origin_not_allowed and origin_not_allowed_for_application to INVALID_ARGUMENT', () => {
    expect(mapBackendErrorCodeToTryMellon('origin_not_allowed')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('origin_not_allowed_for_application')).toBe(
      'INVALID_ARGUMENT'
    );
  });

  it('BACKEND_ORIGIN_NOT_ALLOWED_CODES and isOriginNotAllowedBackendCode are the single contract', () => {
    expect(BACKEND_ORIGIN_NOT_ALLOWED_CODES).toContain('origin_not_allowed');
    expect(BACKEND_ORIGIN_NOT_ALLOWED_CODES).toContain('origin_not_allowed_for_application');
    for (const code of BACKEND_ORIGIN_NOT_ALLOWED_CODES) {
      expect(isOriginNotAllowedBackendCode(code)).toBe(true);
    }
    expect(isOriginNotAllowedBackendCode('other_code')).toBe(false);
  });

  it('maps QR_ prefixed cross-device domain error codes', () => {
    expect(mapBackendErrorCodeToTryMellon('QR_EXPIRED')).toBe('SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('QR_SESSION_NOT_FOUND')).toBe('SESSION_EXPIRED');
    expect(mapBackendErrorCodeToTryMellon('QR_RATE_LIMITED')).toBe('RATE_LIMIT_EXCEEDED');
    expect(mapBackendErrorCodeToTryMellon('QR_ORIGIN_NOT_ALLOWED')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('QR_TENANT_MISMATCH')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('QR_REPLAY_DETECTED')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('QR_CREDENTIAL_NOT_FOUND')).toBe('PASSKEY_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('QR_USER_NOT_FOUND')).toBe('PASSKEY_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('QR_POLLING_TOKEN_REQUIRED')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('QR_INVALID_RESPONSE')).toBe('CHALLENGE_MISMATCH');
  });

  it('maps internal_error to SERVER_ERROR and forbidden to FORBIDDEN', () => {
    expect(mapBackendErrorCodeToTryMellon('internal_error')).toBe('SERVER_ERROR');
    expect(mapBackendErrorCodeToTryMellon('forbidden')).toBe('FORBIDDEN');
  });

  it('maps WebAuthn / credential backend codes to semantic SDK codes', () => {
    expect(mapBackendErrorCodeToTryMellon('credential_not_found')).toBe('PASSKEY_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('no_credentials')).toBe('PASSKEY_NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('replay_detected')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('gone')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('application_not_found')).toBe('NOT_FOUND');
    expect(mapBackendErrorCodeToTryMellon('tenant_inactive')).toBe('TENANT_INACTIVE');
    expect(mapBackendErrorCodeToTryMellon('invitation_not_found')).toBe('INVITATION_NOT_FOUND');
  });

  it('maps email/OTP fallback + recovery backend codes', () => {
    expect(mapBackendErrorCodeToTryMellon('invalid_or_expired_code')).toBe(
      'OTP_INVALID_OR_EXPIRED'
    );
    expect(mapBackendErrorCodeToTryMellon('too_many_attempts')).toBe('RATE_LIMIT_EXCEEDED');
    expect(mapBackendErrorCodeToTryMellon('email_required_for_fallback')).toBe('INVALID_ARGUMENT');
    expect(mapBackendErrorCodeToTryMellon('email_required_for_recovery')).toBe('INVALID_ARGUMENT');
  });

  it('maps B2B recovery enrollment backend codes (F1-R.4)', () => {
    // Backend emits UPPERCASE enum values; mapper normalizes via toLowerCase
    expect(mapBackendErrorCodeToTryMellon('recovery_user_not_found')).toBe(
      'RECOVERY_USER_NOT_FOUND'
    );
    expect(mapBackendErrorCodeToTryMellon('RECOVERY_USER_NOT_FOUND')).toBe(
      'RECOVERY_USER_NOT_FOUND'
    );
    expect(mapBackendErrorCodeToTryMellon('recovery_ticket_limit_exceeded')).toBe(
      'RECOVERY_TICKET_LIMIT_EXCEEDED'
    );
    expect(mapBackendErrorCodeToTryMellon('RECOVERY_TICKET_LIMIT_EXCEEDED')).toBe(
      'RECOVERY_TICKET_LIMIT_EXCEEDED'
    );
  });

  it('maps application rotation, JWKS, introspection and custom-claims backend codes', () => {
    expect(mapBackendErrorCodeToTryMellon('application_rotation_not_allowed')).toBe(
      'SECRET_ROTATION_FORBIDDEN'
    );
    expect(mapBackendErrorCodeToTryMellon('session_jwt_kid_mismatch')).toBe('JWT_KID_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('session_introspection_failed')).toBe(
      'INTROSPECTION_FAILED'
    );
    expect(mapBackendErrorCodeToTryMellon('session_custom_claim_not_whitelisted')).toBe(
      'CUSTOM_CLAIM_NOT_ALLOWED'
    );
    expect(mapBackendErrorCodeToTryMellon('session_custom_claims_limit_exceeded')).toBe(
      'CUSTOM_CLAIMS_TOO_LARGE'
    );
  });

  it('returns UNKNOWN_ERROR for unknown backend codes', () => {
    expect(mapBackendErrorCodeToTryMellon('')).toBe('UNKNOWN_ERROR');
    expect(mapBackendErrorCodeToTryMellon('some_random_code')).toBe('UNKNOWN_ERROR');
  });

  it('normalizes case', () => {
    expect(mapBackendErrorCodeToTryMellon('CHALLENGE_MISMATCH')).toBe('CHALLENGE_MISMATCH');
    expect(mapBackendErrorCodeToTryMellon('Session_Expired')).toBe('SESSION_EXPIRED');
  });

  it('returns UNKNOWN_ERROR for non-string input (defensive)', () => {
    expect(mapBackendErrorCodeToTryMellon(null as unknown as string)).toBe('UNKNOWN_ERROR');
    expect(mapBackendErrorCodeToTryMellon(undefined as unknown as string)).toBe('UNKNOWN_ERROR');
    expect(mapBackendErrorCodeToTryMellon(42 as unknown as string)).toBe('UNKNOWN_ERROR');
  });
});

describe('mapWebAuthnError', () => {
  it('should map NotAllowedError to USER_CANCELLED', () => {
    const domError = new DOMException('User cancelled', 'NotAllowedError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('USER_CANCELLED');
  });

  it('should map AbortError to ABORT_ERROR', () => {
    const domError = new DOMException('Operation aborted', 'AbortError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('ABORT_ERROR');
  });

  it('should map NotSupportedError to NOT_SUPPORTED', () => {
    const domError = new DOMException('Not supported', 'NotSupportedError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
  });

  it('should map SecurityError to NOT_SUPPORTED', () => {
    const domError = new DOMException('Security error', 'SecurityError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
  });

  it('should map InvalidStateError to UNKNOWN_ERROR', () => {
    const domError = new DOMException('Invalid state', 'InvalidStateError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should map UnknownError to UNKNOWN_ERROR', () => {
    const domError = new DOMException('Unknown error', 'UnknownError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should map regular Error to UNKNOWN_ERROR', () => {
    const regularError = new Error('Some error');
    const error = mapWebAuthnError(regularError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should map unknown values to UNKNOWN_ERROR', () => {
    const error1 = mapWebAuthnError(null);
    const error2 = mapWebAuthnError(undefined);
    const error3 = mapWebAuthnError('string');
    const error4 = mapWebAuthnError(123);

    expect(error1.code).toBe('UNKNOWN_ERROR');
    expect(error2.code).toBe('UNKNOWN_ERROR');
    expect(error3.code).toBe('UNKNOWN_ERROR');
    expect(error4.code).toBe('UNKNOWN_ERROR');
  });

  it('should preserve original error message when available', () => {
    const domError = new DOMException('Custom message', 'NotAllowedError');
    const error = mapWebAuthnError(domError);

    expect(error.message).toBeTruthy();
  });

  it('should include original error in details', () => {
    const domError = new DOMException('Test', 'NotAllowedError');
    const error = mapWebAuthnError(domError);

    expect(error.details).toBeDefined();
  });

  it('should use default message when DOMException has empty message', () => {
    const domError = new DOMException('', 'NotAllowedError');
    const error = mapWebAuthnError(domError);
    expect(error.message).toBe('WebAuthn operation failed');
  });
});

describe('createCredentialError', () => {
  it('should create UNKNOWN_ERROR for create operation', () => {
    const error = createCredentialError('create');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).toContain('create');
  });
  it('should create UNKNOWN_ERROR for get operation', () => {
    const error = createCredentialError('get');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).toContain('get');
  });
});

describe('createEncodingError', () => {
  it('should create NOT_SUPPORTED for encode', () => {
    const error = createEncodingError('encode');
    expect(error.code).toBe('NOT_SUPPORTED');
    expect(error.message).toContain('encoding');
  });
  it('should create NOT_SUPPORTED for decode', () => {
    const error = createEncodingError('decode');
    expect(error.code).toBe('NOT_SUPPORTED');
    expect(error.message).toContain('decoding');
  });
});

describe('validateNonEmptyString', () => {
  it('should not throw for non-empty string', () => {
    expect(() => validateNonEmptyString('valid', 'field')).not.toThrow();
  });
  it('should throw for empty string', () => {
    expect(() => validateNonEmptyString('', 'field')).toThrow(TryMellonError);
  });
  it('should throw for whitespace-only string', () => {
    expect(() => validateNonEmptyString('  ', 'field')).toThrow(TryMellonError);
  });
  it('should throw for non-string', () => {
    expect(() => validateNonEmptyString(null as unknown as string, 'field')).toThrow(
      TryMellonError
    );
  });
});

describe('validateUrl', () => {
  it('should not throw for https URL', () => {
    expect(() => validateUrl('https://example.com', 'field')).not.toThrow();
  });
  it('should not throw for http URL', () => {
    expect(() => validateUrl('http://localhost', 'field')).not.toThrow();
  });
  it('should throw for non-http(s) protocol', () => {
    expect(() => validateUrl('ftp://example.com', 'field')).toThrow(TryMellonError);
    expect(() => validateUrl('file:///tmp', 'field')).toThrow(TryMellonError);
  });
  it('should throw for invalid URL', () => {
    expect(() => validateUrl('not-a-url', 'field')).toThrow(TryMellonError);
  });
});

describe('validateBase64Url', () => {
  it('should not throw for valid base64url', () => {
    expect(() => validateBase64Url('dXNlci1pZA', 'field')).not.toThrow();
  });
  it('should throw for invalid characters', () => {
    expect(() => validateBase64Url('invalid+chars/', 'field')).toThrow(TryMellonError);
  });
  it('should throw for empty string', () => {
    expect(() => validateBase64Url('', 'field')).toThrow(TryMellonError);
  });
});

describe('validateRange', () => {
  it('should not throw for value in range', () => {
    expect(() => validateRange(5, 'field', 0, 10)).not.toThrow();
  });
  it('should throw when value below min', () => {
    expect(() => validateRange(-1, 'field', 0, 10)).toThrow(TryMellonError);
  });
  it('should throw when value above max', () => {
    expect(() => validateRange(11, 'field', 0, 10)).toThrow(TryMellonError);
  });
  it('should throw for NaN', () => {
    expect(() => validateRange(Number.NaN, 'field', 0, 10)).toThrow(TryMellonError);
  });
  it('should throw for Infinity', () => {
    expect(() => validateRange(Number.POSITIVE_INFINITY, 'field', 0, 10)).toThrow(TryMellonError);
  });
});
