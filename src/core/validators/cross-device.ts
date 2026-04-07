import { ok } from '../../utils/result';
import type { Result } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { isObject, isString, validationError } from './helpers';
import type {
  CrossDeviceInitResult,
  CrossDeviceStatusResult,
  CrossDeviceContextResult,
} from '../../types';

/**
 * Validates the response for cross-device verify and verify-registration endpoints.
 * Backend returns 204 No Content; body may be undefined, null, or empty object.
 * Accepts only those; rejects any other shape to detect unexpected API responses.
 */
export function validateCrossDeviceVerifyResponse(data: unknown): Result<void, TryMellonError> {
  if (data === undefined || data === null) {
    return ok(undefined);
  }
  if (isObject(data) && Object.keys(data).length === 0) {
    return ok(undefined);
  }
  return validationError('Invalid API response: expected empty body (204)', {
    originalData: data,
  });
}

function isCreationOptionsShape(opts: unknown): opts is Record<string, unknown> {
  if (!opts || typeof opts !== 'object') return false;
  const o = opts as Record<string, unknown>;
  return (
    typeof o.challenge === 'string' &&
    o.rp != null &&
    typeof o.rp === 'object' &&
    o.user != null &&
    typeof o.user === 'object' &&
    Array.isArray((o as { pubKeyCredParams?: unknown }).pubKeyCredParams)
  );
}

function isRequestOptionsShape(opts: unknown): opts is Record<string, unknown> {
  if (!opts || typeof opts !== 'object') return false;
  const o = opts as Record<string, unknown>;
  return typeof o.challenge === 'string' && typeof o.rpId === 'string';
}

/**
 * Accepts either the unwrapped payload { session_id, qr_url, expires_at } or the fintech
 * envelope { ok: true, data: { session_id, qr_url, expires_at } } so the flow works
 * regardless of whether the fetch-client unwraps before calling this validator.
 */
export function validateCrossDeviceInitResponse(
  data: unknown
): Result<CrossDeviceInitResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const payload =
    'data' in data && isObject((data as { data: unknown }).data)
      ? (data as { data: Record<string, unknown> }).data
      : data;

  const session_id = payload.session_id;
  const qr_url = payload.qr_url;
  const expires_at = payload.expires_at;
  const polling_token = payload.polling_token;

  if (
    !isString(session_id) ||
    !isString(qr_url) ||
    !isString(expires_at) ||
    !isString(polling_token)
  ) {
    return validationError('Invalid API response: missing required fields', { originalData: data });
  }

  const result: CrossDeviceInitResult = {
    session_id,
    qr_url,
    expires_at,
    polling_token,
  };
  if (payload.external_user_id !== undefined && isString(payload.external_user_id)) {
    result.external_user_id = payload.external_user_id;
  }
  return ok(result);
}

/**
 * Accepts either the unwrapped payload { status, user_id?, session_token?, redirect_url? } or the
 * fintech envelope { ok: true, data: { ... } } so the flow works regardless of unwrapping.
 */
export function validateCrossDeviceStatusResponse(
  data: unknown
): Result<CrossDeviceStatusResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const payload =
    'data' in data && isObject((data as { data: unknown }).data)
      ? (data as { data: Record<string, unknown> }).data
      : data;

  const status = payload.status;
  if (!isString(status) || !['pending', 'authenticated', 'completed'].includes(status)) {
    return validationError('Invalid API response: invalid status', { originalData: data });
  }

  const user_id = payload.user_id;
  const session_token = payload.session_token;
  const redirect_url = payload.redirect_url;

  if (user_id !== undefined && !isString(user_id)) {
    return validationError('Invalid API response: user_id must be a string when present', {
      originalData: data,
    });
  }
  if (session_token !== undefined && !isString(session_token)) {
    return validationError('Invalid API response: session_token must be a string when present', {
      originalData: data,
    });
  }
  if (redirect_url !== undefined && !isString(redirect_url)) {
    return validationError('Invalid API response: redirect_url must be a string when present', {
      originalData: data,
    });
  }

  return ok({
    status: status as CrossDeviceStatusResult['status'],
    user_id: user_id as string | undefined,
    session_token: session_token as string | undefined,
    redirect_url: redirect_url as string | undefined,
  });
}

export function validateCrossDeviceContextResponse(
  data: unknown
): Result<CrossDeviceContextResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const rawType = data.type;
  const type =
    rawType === 'registration' ? 'registration' : rawType === 'auth' ? 'auth' : ('auth' as const);

  const options = data.options;
  if (!isObject(options)) {
    return validationError('Invalid API response: options are required', { originalData: data });
  }

  const MAX_CONTEXT_LENGTH = 200;
  const approval_context = optionalContextString(data.approval_context, MAX_CONTEXT_LENGTH);
  const application_name = optionalContextString(data.application_name, MAX_CONTEXT_LENGTH);
  if (approval_context === false || application_name === false) {
    return validationError(
      'Invalid API response: approval_context/application_name must be string max 200 chars',
      {
        originalData: data,
      }
    );
  }

  const extra: { approval_context?: string; application_name?: string } = {};
  if (typeof approval_context === 'string') extra.approval_context = approval_context;
  if (typeof application_name === 'string') extra.application_name = application_name;

  if (type === 'registration') {
    if (!isCreationOptionsShape(options)) {
      return validationError(
        'Invalid API response: registration options must have challenge, rp, user, pubKeyCredParams',
        { originalData: data }
      );
    }
    return ok({
      type: 'registration',
      options,
      ...extra,
    } as CrossDeviceContextResult);
  }

  if (!isRequestOptionsShape(options)) {
    return validationError('Invalid API response: auth options must have challenge and rpId', {
      originalData: data,
    });
  }
  return ok({ type: 'auth', options, ...extra } as CrossDeviceContextResult);
}

/** Returns string if valid (optional, max len), undefined if missing, false if invalid. */
function optionalContextString(value: unknown, maxLength: number): string | undefined | false {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return false;
  if (value.length > maxLength) return false;
  return value;
}
