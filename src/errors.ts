export type TryMellonErrorCode =
  | 'NOT_SUPPORTED'
  | 'USER_CANCELLED'
  | 'PASSKEY_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NETWORK_FAILURE'
  | 'INVALID_ARGUMENT'
  | 'TIMEOUT'
  | 'ABORT_ERROR'
  | 'CHALLENGE_MISMATCH'
  | 'TICKET_NOT_FOUND'
  | 'TICKET_EXPIRED'
  | 'TICKET_ALREADY_USED'
  | 'PIN_MISMATCH'
  | 'PIN_LOCKED'
  | 'BRIDGE_SESSION_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TENANT_INACTIVE'
  | 'INVITATION_NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'
  // Action signing
  | 'ACTION_CHALLENGE_EXPIRED'
  | 'ACTION_ALREADY_CLAIMED'
  | 'ACTION_PAYLOAD_MISMATCH'
  // State violations (SDK-02) — attempting a stateful flow without prerequisites.
  | 'INVALID_STATE'
  // Email / OTP fallback + recovery
  | 'OTP_INVALID_OR_EXPIRED'
  // Application rotation · JWKS validation · custom claims · introspection
  | 'SECRET_ROTATION_FORBIDDEN'
  | 'JWT_KID_MISMATCH'
  | 'INTROSPECTION_FAILED'
  | 'CUSTOM_CLAIM_NOT_ALLOWED'
  | 'CUSTOM_CLAIMS_TOO_LARGE'
  // Identity linking (F1)
  | 'LINK_CHALLENGE_NOT_FOUND'
  | 'LINK_OTP_INVALID'
  | 'LINK_OTP_EXPIRED'
  | 'IDENTIFIER_ALREADY_LINKED'
  | 'IDENTIFIER_NOT_OWNED'
  | 'EMAIL_ALREADY_TAKEN'
  | 'UNLINK_LAST_IDENTIFIER_DENIED'
  // SIWE (F1)
  | 'SIWE_NONCE_EXPIRED'
  | 'SIWE_NONCE_REPLAY'
  | 'SIWE_SIGNATURE_INVALID'
  | 'SIWE_MESSAGE_MALFORMED'
  | 'SIWE_CHAIN_NOT_ALLOWED'
  | 'SIWE_DOMAIN_MISMATCH'
  | 'SIWE_ADDRESS_MISMATCH'
  // Anonymous recovery (F1)
  | 'ANONYMOUS_RECOVERY_NOT_AVAILABLE'
  // B2B recovery enrollment (F1-R.4, ADR-045)
  | 'RECOVERY_USER_NOT_FOUND'
  | 'RECOVERY_TICKET_LIMIT_EXCEEDED';

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
  ABORT_ERROR: 'Operation aborted by user or timeout',
  CHALLENGE_MISMATCH: 'This link was already used or expired. Please try again from your computer.',
  TICKET_NOT_FOUND: 'Enrollment ticket not found or invalid',
  TICKET_EXPIRED: 'Enrollment ticket has expired',
  TICKET_ALREADY_USED: 'Enrollment ticket was already used',
  PIN_MISMATCH: 'PIN does not match',
  PIN_LOCKED: 'PIN is locked due to too many failed attempts',
  BRIDGE_SESSION_EXPIRED: 'Bridge session has expired',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  TENANT_INACTIVE: 'The target tenant is inactive. Contact support to reactivate.',
  INVITATION_NOT_FOUND: 'The invitation was not found, already consumed, or revoked.',
  SERVER_ERROR: 'A server error occurred. Try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred',
  // Action signing
  ACTION_CHALLENGE_EXPIRED: 'Action challenge has expired. Request a new one.',
  ACTION_ALREADY_CLAIMED: 'Action challenge was already used. Request a new one.',
  ACTION_PAYLOAD_MISMATCH:
    'Payload mismatch — the signed data does not match the requested action.',
  INVALID_STATE:
    'Operation requires an active session — sign in first.',
  // Email / OTP fallback + recovery
  OTP_INVALID_OR_EXPIRED: 'The verification code is invalid or has expired. Request a new one.',
  // Application rotation · JWKS validation · custom claims · introspection
  SECRET_ROTATION_FORBIDDEN: 'You do not have permission to rotate this application secret.',
  JWT_KID_MISMATCH:
    'JWT key id (kid) does not match any key in the JWKS. The signing key may have rotated — refresh the JWKS cache.',
  INTROSPECTION_FAILED: 'Token introspection failed. Check credentials and token format.',
  CUSTOM_CLAIM_NOT_ALLOWED:
    'A custom claim key is not in the application custom_claims_schema. Add it in the dashboard or remove it from the request.',
  CUSTOM_CLAIMS_TOO_LARGE:
    'Custom claims exceed the allowed limits (max 10 keys, 2KB total serialized). Reduce payload and retry.',
  // Identity linking (F1)
  LINK_CHALLENGE_NOT_FOUND: 'Link challenge not found or expired. Request a new one.',
  LINK_OTP_INVALID: 'The link verification code is invalid. Check the code and try again.',
  LINK_OTP_EXPIRED: 'The link verification code has expired. Request a new one.',
  IDENTIFIER_ALREADY_LINKED: 'This identifier is already linked to an account.',
  IDENTIFIER_NOT_OWNED: 'This identifier belongs to a different user.',
  EMAIL_ALREADY_TAKEN: 'This email address is already associated with another account.',
  UNLINK_LAST_IDENTIFIER_DENIED:
    'Cannot unlink the last identifier of an anonymous account; link another identifier first.',
  // SIWE (F1)
  SIWE_NONCE_EXPIRED: 'SIWE nonce has expired. Request a new one.',
  SIWE_NONCE_REPLAY: 'SIWE nonce has already been used. Request a new one.',
  SIWE_SIGNATURE_INVALID:
    'SIWE signature verification failed. Ensure the message was signed correctly.',
  SIWE_MESSAGE_MALFORMED:
    'SIWE message is malformed. It must follow the EIP-4361 canonical format.',
  SIWE_CHAIN_NOT_ALLOWED: 'The specified chain is not allowed for this application.',
  SIWE_DOMAIN_MISMATCH: 'SIWE message domain does not match the expected domain.',
  SIWE_ADDRESS_MISMATCH:
    'SIWE recovered address does not match the address declared in the message.',
  // Anonymous recovery (F1)
  ANONYMOUS_RECOVERY_NOT_AVAILABLE: 'Account recovery is not available for anonymous accounts.',
  // B2B recovery enrollment (F1-R.4, ADR-045)
  RECOVERY_USER_NOT_FOUND: 'Recovery target user not found.',
  RECOVERY_TICKET_LIMIT_EXCEEDED: 'Recovery ticket limit reached for this user.',
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

export function createTicketNotFoundError(): TryMellonError {
  return createError('TICKET_NOT_FOUND');
}

export function createTicketExpiredError(): TryMellonError {
  return createError('TICKET_EXPIRED');
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
  if (!Number.isFinite(value)) {
    throw createInvalidArgumentError(fieldName, 'must be a finite number');
  }
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
  AbortError: 'ABORT_ERROR',
  NotSupportedError: 'NOT_SUPPORTED',
  SecurityError: 'NOT_SUPPORTED',
  InvalidStateError: 'UNKNOWN_ERROR',
  UnknownError: 'UNKNOWN_ERROR',
};

/** Backend codes that mean "origin not allowed for application". Single source for SDK contract. */
export const BACKEND_ORIGIN_NOT_ALLOWED_CODES: readonly string[] = [
  'origin_not_allowed',
  'origin_not_allowed_for_application',
];

export function isOriginNotAllowedBackendCode(code: string): boolean {
  return BACKEND_ORIGIN_NOT_ALLOWED_CODES.includes(code);
}

/**
 * Backend wire code → SDK code lookup. Module-level so the literal is
 * allocated once at module init instead of per invocation (hot path for
 * every backend error response).
 */
const BACKEND_ERROR_MAP: Readonly<Record<string, TryMellonErrorCode>> = {
  challenge_mismatch: 'CHALLENGE_MISMATCH',
  session_expired: 'SESSION_EXPIRED',
  unauthorized: 'SESSION_EXPIRED',
  validation_error: 'INVALID_ARGUMENT',
  invalid_argument: 'INVALID_ARGUMENT',
  user_not_found: 'SESSION_EXPIRED',
  passkey_not_found: 'PASSKEY_NOT_FOUND',
  ticket_not_found: 'TICKET_NOT_FOUND',
  ticket_expired: 'TICKET_EXPIRED',
  ticket_already_consumed: 'TICKET_ALREADY_USED',
  // Backend enrollment domain codes (UPPERCASE -> normalized)
  not_found: 'TICKET_NOT_FOUND',
  expired: 'TICKET_EXPIRED',
  already_consumed: 'TICKET_ALREADY_USED',
  context_mismatch: 'CHALLENGE_MISMATCH',
  challenge_not_found: 'CHALLENGE_MISMATCH',
  invalid_ticket_id: 'INVALID_ARGUMENT',
  invalid_context_hash: 'INVALID_ARGUMENT',
  invalid_ticket_status: 'INVALID_ARGUMENT',
  invalid_config: 'INVALID_ARGUMENT',
  enrollment_not_enabled: 'INVALID_ARGUMENT',
  // Bridge (KP-BRIDGE)
  pin_mismatch: 'PIN_MISMATCH',
  pin_locked: 'PIN_LOCKED',
  bridge_not_enabled: 'FORBIDDEN',
  user_inactive: 'FORBIDDEN',
  forbidden: 'FORBIDDEN',
  internal_error: 'SERVER_ERROR',
  bridge_session_expired: 'BRIDGE_SESSION_EXPIRED',
  rate_limit_exceeded: 'RATE_LIMIT_EXCEEDED',
  too_many_requests: 'RATE_LIMIT_EXCEEDED',
  session_not_found: 'BRIDGE_SESSION_EXPIRED',
  origin_not_allowed: 'INVALID_ARGUMENT',
  origin_not_allowed_for_application: 'INVALID_ARGUMENT',
  // WebAuthn ceremony / credential
  credential_not_found: 'PASSKEY_NOT_FOUND',
  no_credentials: 'PASSKEY_NOT_FOUND',
  replay_detected: 'CHALLENGE_MISMATCH',
  gone: 'CHALLENGE_MISMATCH',
  application_not_found: 'NOT_FOUND',
  tenant_inactive: 'TENANT_INACTIVE',
  invitation_not_found: 'INVITATION_NOT_FOUND',
  // Email / OTP fallback + recovery
  invalid_or_expired_code: 'OTP_INVALID_OR_EXPIRED',
  too_many_attempts: 'RATE_LIMIT_EXCEEDED',
  email_required_for_fallback: 'INVALID_ARGUMENT',
  email_required_for_recovery: 'INVALID_ARGUMENT',
  // Action signing
  action_challenge_expired: 'ACTION_CHALLENGE_EXPIRED',
  challenge_already_claimed: 'ACTION_ALREADY_CLAIMED',
  action_payload_mismatch: 'ACTION_PAYLOAD_MISMATCH',
  // Application rotation / JWKS validation / custom claims / introspection
  application_rotation_not_allowed: 'SECRET_ROTATION_FORBIDDEN',
  session_jwt_kid_mismatch: 'JWT_KID_MISMATCH',
  session_introspection_failed: 'INTROSPECTION_FAILED',
  session_custom_claim_not_whitelisted: 'CUSTOM_CLAIM_NOT_ALLOWED',
  session_custom_claims_limit_exceeded: 'CUSTOM_CLAIMS_TOO_LARGE',
  // Identity linking (F1) — ADR-SDK-004 §2.6
  identity_link_challenge_not_found: 'LINK_CHALLENGE_NOT_FOUND',
  identity_link_otp_invalid: 'LINK_OTP_INVALID',
  identity_link_otp_expired: 'LINK_OTP_EXPIRED',
  identity_link_identifier_already_linked: 'IDENTIFIER_ALREADY_LINKED',
  identity_link_email_already_taken_in_tenant: 'EMAIL_ALREADY_TAKEN',
  identity_link_identifier_not_owned_by_user: 'IDENTIFIER_NOT_OWNED',
  identity_link_unlink_last_identifier_denied: 'UNLINK_LAST_IDENTIFIER_DENIED',
  identity_link_identifier_not_found: 'LINK_CHALLENGE_NOT_FOUND',
  // SIWE (F1) — ADR-SDK-004 §2.6
  siwe_nonce_expired: 'SIWE_NONCE_EXPIRED',
  siwe_nonce_already_used: 'SIWE_NONCE_REPLAY',
  siwe_signature_invalid: 'SIWE_SIGNATURE_INVALID',
  siwe_message_malformed: 'SIWE_MESSAGE_MALFORMED',
  siwe_chain_not_allowed: 'SIWE_CHAIN_NOT_ALLOWED',
  siwe_domain_mismatch: 'SIWE_DOMAIN_MISMATCH',
  siwe_address_mismatch: 'SIWE_ADDRESS_MISMATCH',
  // Anonymous recovery (F1)
  user_anonymous_recovery_not_available: 'ANONYMOUS_RECOVERY_NOT_AVAILABLE',
  // B2B recovery enrollment (F1-R.4) — ADR-045
  recovery_user_not_found: 'RECOVERY_USER_NOT_FOUND',
  recovery_ticket_limit_exceeded: 'RECOVERY_TICKET_LIMIT_EXCEEDED',
  // Cross-device QR domain errors (backend emits QR_ prefix)
  qr_expired: 'SESSION_EXPIRED',
  qr_session_not_found: 'SESSION_EXPIRED',
  qr_rate_limited: 'RATE_LIMIT_EXCEEDED',
  qr_origin_not_allowed: 'INVALID_ARGUMENT',
  qr_tenant_mismatch: 'INVALID_ARGUMENT',
  qr_polling_token_required: 'INVALID_ARGUMENT',
  qr_replay_detected: 'CHALLENGE_MISMATCH',
  qr_invalid_response: 'CHALLENGE_MISMATCH',
  qr_credential_not_found: 'PASSKEY_NOT_FOUND',
  qr_user_not_found: 'PASSKEY_NOT_FOUND',
  qr_invalid_state: 'UNKNOWN_ERROR',
  qr_no_challenge: 'UNKNOWN_ERROR',
  qr_internal_error: 'UNKNOWN_ERROR',
};

/**
 * Maps backend API error codes (fintech envelope) to TryMellonErrorCode.
 * Pure, testable. Unknown codes map to UNKNOWN_ERROR.
 * Defensive: non-string input returns UNKNOWN_ERROR (no throw).
 * Backend may send UPPERCASE (e.g. NOT_FOUND, EXPIRED) or snake_case (ticket_not_found); both normalized.
 */
export function mapBackendErrorCodeToTryMellon(backendCode: string): TryMellonErrorCode {
  if (typeof backendCode !== 'string') return 'UNKNOWN_ERROR';
  return BACKEND_ERROR_MAP[backendCode.toLowerCase().trim()] ?? 'UNKNOWN_ERROR';
}

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
