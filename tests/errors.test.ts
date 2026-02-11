import { describe, it, expect } from 'vitest';
import {
  TryMellonError,
  TryMellonErrorCode,
  createError,
  isTryMellonError,
  createNotSupportedError,
  createUserCancelledError,
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
      'ABORTED',
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
    const error = createError('ABORTED');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('ABORTED');
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

describe('mapWebAuthnError', () => {
  it('should map NotAllowedError to USER_CANCELLED', () => {
    const domError = new DOMException('User cancelled', 'NotAllowedError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('USER_CANCELLED');
  });

  it('should map AbortError to ABORTED', () => {
    const domError = new DOMException('Operation aborted', 'AbortError');
    const error = mapWebAuthnError(domError);

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('ABORTED');
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
});
