export type TryMellonErrorCode =
  | 'NOT_SUPPORTED'
  | 'USER_CANCELLED'
  | 'PASSKEY_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NETWORK_FAILURE'
  | 'INVALID_ARGUMENT'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'UNKNOWN_ERROR';

export class TryMellonError extends Error {
  readonly code: TryMellonErrorCode;
  readonly details?: unknown;
  readonly isTryMellonError = true;

  constructor(code: TryMellonErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'TryMellonError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TryMellonError);
    }
  }
}

const DEFAULT_MESSAGES: Record<TryMellonErrorCode, string> = {
  NOT_SUPPORTED: 'WebAuthn is not supported in this environment',
  USER_CANCELLED: 'User cancelled the operation',
  PASSKEY_NOT_FOUND: 'Passkey not found',
  SESSION_EXPIRED: 'Session has expired',
  NETWORK_FAILURE: 'Network request failed',
  INVALID_ARGUMENT: 'Invalid argument provided',
  TIMEOUT: 'Operation timed out',
  ABORTED: 'Operation was aborted',
  UNKNOWN_ERROR: 'An unknown error occurred',
};

export function createError(
  code: TryMellonErrorCode,
  message?: string,
  details?: unknown
): TryMellonError {
  return new TryMellonError(code, message ?? DEFAULT_MESSAGES[code], details);
}

export function isTryMellonError(error: unknown): error is TryMellonError {
  return (
    error instanceof TryMellonError ||
    (typeof error === 'object' &&
      error !== null &&
      'isTryMellonError' in error &&
      (error as TryMellonError).isTryMellonError === true)
  );
}

export function createNotSupportedError(): TryMellonError {
  return createError('NOT_SUPPORTED');
}

export function createUserCancelledError(): TryMellonError {
  return createError('USER_CANCELLED');
}

export function createNetworkError(cause?: Error): TryMellonError {
  return createError('NETWORK_FAILURE', undefined, {
    cause: cause?.message,
    originalError: cause,
  });
}

export function createTimeoutError(): TryMellonError {
  return createError('TIMEOUT');
}

export function createInvalidArgumentError(field: string, reason: string): TryMellonError {
  return createError('INVALID_ARGUMENT', `Invalid argument: ${field} - ${reason}`, {
    field,
    reason,
  });
}

export function createCredentialError(operation: 'create' | 'get'): TryMellonError {
  return createError('UNKNOWN_ERROR', `Failed to ${operation} credential`, { operation });
}

export function createEncodingError(type: 'encode' | 'decode'): TryMellonError {
  return createError(
    'NOT_SUPPORTED',
    `No base64 ${type === 'encode' ? 'encoding' : 'decoding'} available`,
    { type }
  );
}

export function validateNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw createInvalidArgumentError(fieldName, 'must be a non-empty string');
  }
}

export function validateUrl(url: string, fieldName: string): void {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      throw createInvalidArgumentError(fieldName, 'must use http or https protocol');
    }
  } catch (error) {
    if (isTryMellonError(error)) {
      throw error;
    }
    throw createInvalidArgumentError(fieldName, 'must be a valid URL');
  }
}

export function validateRange(value: number, fieldName: string, min: number, max: number): void {
  if (value < min || value > max) {
    throw createInvalidArgumentError(fieldName, `must be between ${min} and ${max}`);
  }
}

export function validateBase64Url(s: string, fieldName: string): void {
  if (typeof s !== 'string' || s.length === 0) {
    throw createInvalidArgumentError(fieldName, 'must be a non-empty string');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(s)) {
    throw createInvalidArgumentError(fieldName, 'must be a valid base64url string');
  }
}

const DOM_EXCEPTION_ERROR_MAP: Record<string, TryMellonErrorCode> = {
  NotAllowedError: 'USER_CANCELLED',
  AbortError: 'ABORTED',
  NotSupportedError: 'NOT_SUPPORTED',
  SecurityError: 'NOT_SUPPORTED',
  InvalidStateError: 'UNKNOWN_ERROR',
  UnknownError: 'UNKNOWN_ERROR',
};

export function mapWebAuthnError(error: unknown): TryMellonError {
  if (error instanceof DOMException) {
    const name = error.name;
    const message = error.message || 'WebAuthn operation failed';
    const errorCode = DOM_EXCEPTION_ERROR_MAP[name] ?? 'UNKNOWN_ERROR';
    return createError(errorCode, message, { originalError: error });
  }

  if (error instanceof Error) {
    return createError('UNKNOWN_ERROR', error.message, { originalError: error });
  }

  return createError('UNKNOWN_ERROR', 'An unknown error occurred', {
    originalError: error,
  });
}
